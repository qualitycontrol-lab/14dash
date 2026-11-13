import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { isAdminEmail } from "@/lib/auth";
import {
  getGoogleSheetsClient,
  getSpreadsheetId,
  GoogleSheetsConfigurationError,
  GoogleSheetsDataError,
  quoteSheetName,
  readSheetValues,
} from "@/lib/google-sheets";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type AttendancePayload = {
  title: string;
  date: string;
  employeeName?: string;
  employeeEmail?: string;
  attended?: boolean;
  additionalAttendee?: string;
};

function response(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "private, no-store" },
  });
}

function normalizeName(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function isChecked(value: string | undefined): boolean {
  return ["true", "yes", "1", "✓"].includes((value ?? "").trim().toLowerCase());
}

function columnLetter(index: number): string {
  let value = index + 1;
  let result = "";
  while (value > 0) {
    const remainder = (value - 1) % 26;
    result = String.fromCharCode(65 + remainder) + result;
    value = Math.floor((value - 1) / 26);
  }
  return result;
}

function monthNumber(month: string): number | null {
  const parsed = new Date(`${month} 1, 2026`).getMonth();
  return Number.isNaN(parsed) ? null : parsed;
}

function headingDate(value: string): Date | null {
  const match =
    /\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2})(?:,?\s+(\d{4}))?/i.exec(
      value,
    );
  if (!match) return null;
  const date = new Date(`${match[1]} ${match[2]}, ${match[3] ?? "2026"} UTC`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function sameWorkWeek(left: Date, right: Date): boolean {
  const weekStart = (date: Date) => {
    const day = date.getUTCDay();
    const mondayOffset = day === 0 ? -6 : 1 - day;
    return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + mondayOffset);
  };
  return weekStart(left) === weekStart(right);
}

function rangeContainsDate(banner: string, value: string): boolean {
  const target = new Date(`${value}T00:00:00Z`);
  const match = /([A-Za-z]+)\s+(\d{1,2})\s*-\s*(?:([A-Za-z]+)\s+)?(\d{1,2})/.exec(banner);
  if (!match) return false;
  const year = target.getUTCFullYear();
  const startMonth = monthNumber(match[1]);
  const endMonth = monthNumber(match[3] ?? match[1]);
  if (startMonth === null || endMonth === null) return false;
  const start = Date.UTC(year, startMonth, Number(match[2]));
  const end = Date.UTC(year, endMonth, Number(match[4]));
  const time = target.getTime();
  return time >= start && time <= end;
}

function sessionHeading(row: string[]): boolean {
  return Boolean(row[0]?.trim()) && !row[1]?.trim() && !/^last name$/i.test(row[0].trim());
}

function findSessionBlock(
  values: string[][],
  title: string,
  date: string,
): { headerRow: number; endRow: number } {
  const titleKey = normalizeName(title);
  const target = new Date(`${date}T00:00:00Z`);
  const day = target.getUTCDate();
  const monthLong = new Intl.DateTimeFormat("en", { month: "long", timeZone: "UTC" }).format(target);
  const monthShort = new Intl.DateTimeFormat("en", { month: "short", timeZone: "UTC" }).format(target);
  const year = target.getUTCFullYear();
  const headerRows = values.flatMap((row, index) => {
    if (!sessionHeading(row)) return [];
    const key = normalizeName(row[0]);
    const hasTitle = key.includes(titleKey);
    const keyHasDate =
      key.includes(normalizeName(`${monthLong} ${day} ${year}`)) ||
      key.includes(normalizeName(`${monthShort} ${day} ${year}`)) ||
      key.includes(normalizeName(`${monthLong} ${day}`)) ||
      key.includes(normalizeName(`${monthShort} ${day}`));
    return hasTitle && keyHasDate ? [index] : [];
  });
  if (headerRows.length !== 1) {
    throw new GoogleSheetsDataError(
      headerRows.length
        ? `More than one TTT attendance section matches "${title}" on ${date}.`
        : `Could not find a TTT attendance section for "${title}" on ${date}.`,
    );
  }
  const headerRow = headerRows[0];
  let endRow = values.length;
  for (let index = headerRow + 1; index < values.length; index += 1) {
    if (sessionHeading(values[index] ?? [])) {
      endRow = index;
      break;
    }
  }
  return { headerRow, endRow };
}

function findWeeklyCell(
  values: string[][],
  date: string,
  employeeName: string,
): { row: number; column: number } {
  const weekHeaders = (values[11] ?? [])
    .map((value, column) => ({ value, column }))
    .filter(({ value }) => /^week\s+\d+/i.test(value));
  const weekIndex = weekHeaders.findIndex(({ value }) => rangeContainsDate(value, date));
  if (weekIndex < 0) {
    throw new GoogleSheetsDataError(`No weekly tally block covers ${date}.`);
  }
  const startColumn = weekHeaders[weekIndex].column;
  const endColumn = weekHeaders[weekIndex + 1]?.column ?? (values[1]?.length ?? 0);
  const column = (values[1] ?? []).findIndex(
    (value, index) =>
      index >= startColumn &&
      index < endColumn &&
      value.trim().toUpperCase() === "TTT",
  );
  if (column < 0) {
    throw new GoogleSheetsDataError("No TTT tally column exists for the selected week.");
  }

  const employeeKey = normalizeName(employeeName);
  const employeeRows = values.flatMap((cells, index) =>
    index >= 54 &&
    normalizeName(`${cells[1] ?? ""} ${cells[0] ?? ""}`) === employeeKey
      ? [index]
      : [],
  );
  if (employeeRows.length !== 1) {
    throw new GoogleSheetsDataError("The employee was not found in the BON training progress sheet.");
  }
  return { row: employeeRows[0], column };
}

async function countWeeklyTttAttendance(
  attendanceValues: string[][],
  employeeName: string,
  date: string,
): Promise<number> {
  const employeeKey = normalizeName(employeeName);
  const targetDate = new Date(`${date}T00:00:00Z`);
  let count = 0;
  for (let rowIndex = 0; rowIndex < attendanceValues.length; rowIndex += 1) {
    const row = attendanceValues[rowIndex] ?? [];
    if (!sessionHeading(row)) continue;
    const eventDate = headingDate(row[0] ?? "");
    if (!eventDate || !sameWorkWeek(eventDate, targetDate)) {
      continue;
    }

    for (let attendeeRow = rowIndex + 1; attendeeRow < attendanceValues.length; attendeeRow += 1) {
      const attendee = attendanceValues[attendeeRow] ?? [];
      if (sessionHeading(attendee)) break;
      if (
        normalizeName(`${attendee[1] ?? ""} ${attendee[0] ?? ""}`) === employeeKey &&
        isChecked(attendee[5])
      ) {
        count += 1;
        break;
      }
    }
  }
  return count;
}

function isPayload(value: unknown): value is AttendancePayload {
  return (
    typeof value === "object" &&
    value !== null &&
    "title" in value &&
    typeof value.title === "string" &&
    "date" in value &&
    typeof value.date === "string" &&
    (!("employeeName" in value) || typeof value.employeeName === "string") &&
    (!("employeeEmail" in value) || typeof value.employeeEmail === "string") &&
    (!("attended" in value) || typeof value.attended === "boolean") &&
    (!("additionalAttendee" in value) || typeof value.additionalAttendee === "string")
  );
}

export async function POST(request: Request) {
  const session = await getServerSession();
  if (!isAdminEmail(session?.user?.email)) return response({ error: "Unauthorized." }, 401);

  let payload: unknown;
  let primaryWriteSucceeded = false;
  try {
    payload = await request.json();
  } catch {
    return response({ error: "A valid JSON body is required." }, 400);
  }
  if (
    !isPayload(payload) ||
    !payload.title.trim() ||
    !/^(2025|2026)-\d{2}-\d{2}$/.test(payload.date) ||
    (!payload.employeeName?.trim() && !payload.additionalAttendee?.trim()) ||
    (payload.employeeName !== undefined && typeof payload.attended !== "boolean") ||
    payload.title.length > 200 ||
    (payload.employeeName?.length ?? 0) > 150 ||
    (payload.employeeEmail?.length ?? 0) > 254 ||
    (payload.employeeEmail &&
      !/^[^\s@]+@bonadmin\.com$/i.test(payload.employeeEmail.trim())) ||
    (payload.additionalAttendee?.length ?? 0) > 150
  ) {
    return response({ error: "Invalid TTT attendance details." }, 400);
  }

  try {
    const spreadsheetId = getSpreadsheetId("tttSystem");
    const sheetName = payload.date.startsWith("2025") ? "2025 TTT Attendance" : "2026 TTT Attendance";
    const values = await readSheetValues(spreadsheetId, `${quoteSheetName(sheetName)}!A:K`);
    const { headerRow, endRow } = findSessionBlock(values, payload.title, payload.date);
    const updates: Array<{ range: string; values: Array<Array<string | boolean>> }> = [];
    let attendanceChanged = false;

    if (payload.employeeName) {
      const employeeKey = normalizeName(payload.employeeName);
      const attendeeRows = values.flatMap((row, index) =>
        index > headerRow &&
        index < endRow &&
        normalizeName(`${row[1] ?? ""} ${row[0] ?? ""}`) === employeeKey
          ? [index]
          : [],
      );
      if (attendeeRows.length !== 1) {
        throw new GoogleSheetsDataError("The employee is not listed in this TTT attendance section.");
      }
      const attendeeRow = attendeeRows[0];
      const wasAttending = isChecked(values[attendeeRow]?.[5]);
      attendanceChanged = wasAttending !== payload.attended;
      updates.push({
        range: `${quoteSheetName(sheetName)}!F${attendeeRow + 1}`,
        values: [[payload.attended ?? false]],
      });
      if (payload.employeeEmail?.trim()) {
        updates.push({
          range: `${quoteSheetName(sheetName)}!K${attendeeRow + 1}`,
          values: [[payload.employeeEmail.trim().toLowerCase()]],
        });
        const metadata = await getGoogleSheetsClient().spreadsheets.get({
          spreadsheetId,
          fields: "sheets(properties(sheetId,title,gridProperties(columnCount)))",
        });
        const sheet = metadata.data.sheets
          ?.map((item) => item.properties)
          .find((item) => item?.title === sheetName);
        if (sheet?.sheetId === undefined) {
          throw new GoogleSheetsDataError(`The "${sheetName}" tab was not found.`);
        }
        const columnCount = sheet.gridProperties?.columnCount ?? 0;
        if (columnCount < 11) {
          await getGoogleSheetsClient().spreadsheets.batchUpdate({
            spreadsheetId,
            requestBody: {
              requests: [{
                appendDimension: {
                  sheetId: sheet.sheetId,
                  dimension: "COLUMNS",
                  length: 11 - columnCount,
                },
              }],
            },
          });
        }
        await getGoogleSheetsClient().spreadsheets.batchUpdate({
          spreadsheetId,
          requestBody: {
            requests: [{
              updateDimensionProperties: {
                range: {
                  sheetId: sheet.sheetId,
                  dimension: "COLUMNS",
                  startIndex: 10,
                  endIndex: 11,
                },
                properties: { hiddenByUser: true },
                fields: "hiddenByUser",
              },
            }],
          },
        });
      }
    }

    const walkIn = payload.additionalAttendee?.trim();
    if (walkIn) {
      const alreadyExists = values
        .slice(headerRow + 1, endRow)
        .some((row) => normalizeName(row[7] ?? "") === normalizeName(walkIn));
      if (!alreadyExists) {
        const emptyRow = values.findIndex((row, index) =>
          index > headerRow &&
          index < endRow &&
          !(row[7] ?? "").trim(),
        );
        if (emptyRow < 0) {
          throw new GoogleSheetsDataError("There is no blank walk-in row in this session block.");
        }
        updates.push({
          range: `${quoteSheetName(sheetName)}!H${emptyRow + 1}`,
          values: [[walkIn]],
        });
      }
    }

    if (updates.length) {
      await getGoogleSheetsClient().spreadsheets.values.batchUpdate({
        spreadsheetId,
        requestBody: { valueInputOption: "USER_ENTERED", data: updates },
      });
      primaryWriteSucceeded = true;
    }

    if (payload.employeeName && payload.date.startsWith("2026")) {
      const progressId = getSpreadsheetId("trainingProgress");
      const progressValues = await readSheetValues(
        progressId,
        "'2026 Q4 Training Progress'!A:ZZ",
      );
      const { row, column } = findWeeklyCell(progressValues, payload.date, payload.employeeName);
      const currentAttendance = await readSheetValues(
        spreadsheetId,
        `${quoteSheetName(sheetName)}!A:K`,
      );
      const weeklyCount = await countWeeklyTttAttendance(
        currentAttendance,
        payload.employeeName,
        payload.date,
      );
      await getGoogleSheetsClient().spreadsheets.values.update({
        spreadsheetId: progressId,
        range: `'2026 Q4 Training Progress'!${columnLetter(column)}${row + 1}`,
        valueInputOption: "USER_ENTERED",
        requestBody: { values: [[weeklyCount]] },
      });
    }

    return response({ ok: true, attendanceChanged });
  } catch (error) {
    if (error instanceof GoogleSheetsConfigurationError) {
      console.error("TTT attendance is not configured:", error.message);
      return response({ error: "TTT attendance is not configured." }, 503);
    }
    if (error instanceof GoogleSheetsDataError) {
      return response({
        error: error.message,
        primaryUpdateMayHaveSucceeded: primaryWriteSucceeded,
      }, 409);
    }
    console.error("TTT attendance update failed:", error);
    return response({
      error: "TTT attendance could not be fully synchronized. Refresh the records before retrying.",
      primaryUpdateMayHaveSucceeded: primaryWriteSucceeded,
    }, 502);
  }
}
