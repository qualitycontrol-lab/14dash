import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { isAdminEmail } from "@/lib/auth";
import {
  columnLetter,
  ensureHiddenColumns,
  getGoogleSheetsClient,
  getSpreadsheetId,
  GoogleSheetsConfigurationError,
  GoogleSheetsDataError,
  readSheetValues,
  quoteSheetName,
} from "@/lib/google-sheets";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const CSG_TABS = [
  "Apprentice",
  "Journeyman",
  "Professional",
  "Individual Self-Governance",
  "Discussion Group",
] as const;

type PassportCourse = {
  id: string;
  title: string;
  type: "CSG" | "HCA";
  date: string;
  status: "Confirmed" | "Not Started";
};

function response(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "private, no-store" },
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function googleSheetsErrorDetails(error: unknown): string {
  if (!isRecord(error)) {
    return JSON.stringify({ message: String(error) });
  }

  const response = isRecord(error.response) ? error.response : undefined;
  const data = isRecord(response?.data) ? response.data : undefined;
  const apiError = isRecord(data?.error) ? data.error : undefined;
  const cause = isRecord(error.cause) ? error.cause : undefined;
  const apiErrors = Array.isArray(apiError?.errors)
    ? apiError.errors
    : Array.isArray(cause?.errors)
      ? cause.errors
      : [];

  return JSON.stringify({
    status: error.status ?? response?.status ?? cause?.status,
    code: error.code ?? cause?.code,
    message: apiError?.message ?? cause?.message ?? error.message,
    errors: apiErrors.map((item) => {
      if (!isRecord(item)) return item;
      return {
        domain: item.domain,
        reason: item.reason,
        message: item.message,
      };
    }),
  });
}

function normalizeName(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function isChecked(value: string | undefined): boolean {
  return ["true", "yes", "1", "✓"].includes((value ?? "").trim().toLowerCase());
}

function formatMonthYear(value: string): string {
  const [year, month] = value.split("-").map(Number);
  return `${month}/${String(year).slice(-2)}`;
}

async function findCsgCourses(name: string): Promise<PassportCourse[]> {
  const spreadsheetId = getSpreadsheetId("csgTracker");
  const normalizedName = normalizeName(name);
  const courses: PassportCourse[] = [];

  for (const tab of CSG_TABS) {
    const metadataColumns = await ensureHiddenColumns(
      spreadsheetId,
      tab,
      2,
      ["Employee Email", "Completion Dates ISO JSON"],
    );
    const values = await readSheetValues(spreadsheetId, `${quoteSheetName(tab)}!A:ZZ`);
    const headers = values[1] ?? [];
    const exactDateColumn = metadataColumns.get("Completion Dates ISO JSON");
    if (exactDateColumn === undefined) {
      throw new GoogleSheetsDataError(`The "${tab}" tab has no completion date metadata column.`);
    }
    const employeeRows = values.flatMap((row, rowIndex) =>
      rowIndex >= 2 &&
      normalizeName(`${row[1] ?? ""} ${row[0] ?? ""}`) === normalizedName
        ? [rowIndex]
        : [],
    );
    if (employeeRows.length > 1) {
      throw new GoogleSheetsDataError(
        `The employee appears in multiple rows on the "${tab}" tab.`,
      );
    }

    for (const rowIndex of employeeRows) {
      const row = values[rowIndex] ?? [];

      for (let checkboxColumn = 3; checkboxColumn + 1 < headers.length; checkboxColumn += 2) {
        const title = headers[checkboxColumn]?.trim();
        if (!title || normalizeName(title) === "date") continue;
        const completed = isChecked(row[checkboxColumn]);
        let exactDates: Record<string, string> = {};
        const storedDates = row[exactDateColumn] ?? "";
        if (storedDates) {
          try {
            const parsed: unknown = JSON.parse(storedDates);
            if (
              typeof parsed !== "object" ||
              parsed === null ||
              Object.values(parsed).some((value) => typeof value !== "string")
            ) {
              throw new Error("invalid completion date metadata");
            }
            exactDates = parsed as Record<string, string>;
          } catch (error) {
            throw new GoogleSheetsDataError(
              `The completion date metadata for "${title}" on "${tab}" is invalid: ${
                error instanceof Error ? error.message : "invalid JSON"
              }`,
            );
          }
        }
        const completionDate = exactDates[String(checkboxColumn)] || row[checkboxColumn + 1] || "";
        courses.push({
          id: `csg|${tab}|${rowIndex + 1}|${checkboxColumn}|${encodeURIComponent(title)}`,
          title,
          type: "CSG",
          date: completionDate,
          status: completed ? "Confirmed" : "Not Started",
        });
      }
    }
  }

  return courses;
}

async function findHcaCourses(name: string): Promise<PassportCourse[]> {
  const spreadsheetId = getSpreadsheetId("hcaCourses");
  const metadataColumns = await ensureHiddenColumns(
    spreadsheetId,
    "Sheet1",
    1,
    ["BON Employee Email", "Associated Employee Email", "Record UUID", "Completion Date ISO"],
    7,
  );
  const completionDateColumn = metadataColumns.get("Completion Date ISO");
  if (completionDateColumn === undefined) {
    throw new GoogleSheetsDataError("The HCA tracker has no completion date column.");
  }
  const values = await readSheetValues(spreadsheetId, "'Sheet1'!A:K");
  const normalizedName = normalizeName(name);
  const courses: PassportCourse[] = [];

  for (let rowIndex = 0; rowIndex < values.length; rowIndex += 1) {
    const row = values[rowIndex] ?? [];
    for (const [nameColumn, titleColumn, checkColumn] of [
      [2, 3, 1],
      [5, 6, 4],
    ]) {
      if (normalizeName(row[nameColumn] ?? "") !== normalizedName) continue;
      const title = row[titleColumn]?.trim();
      if (!title) continue;
      courses.push({
        id: `hca|Sheet1|${rowIndex + 1}|${checkColumn}|${encodeURIComponent(title)}`,
        title,
        type: "HCA",
        date: row[completionDateColumn] ?? "",
        status: isChecked(row[checkColumn]) ? "Confirmed" : "Not Started",
      });
    }
  }
  return courses;
}

async function updateCsgCourse(
  name: string,
  email: string,
  tab: string,
  rowNumber: number,
  classTitle: string,
  completed: boolean,
  date: string,
): Promise<void> {
  if (!CSG_TABS.includes(tab as (typeof CSG_TABS)[number])) {
    throw new GoogleSheetsDataError("Unknown CSG tracker tab.");
  }
  const spreadsheetId = getSpreadsheetId("csgTracker");
  const metadataColumns = await ensureHiddenColumns(
    spreadsheetId,
    tab,
    2,
    ["Employee Email", "Completion Dates ISO JSON"],
  );
  const values = await readSheetValues(spreadsheetId, `${quoteSheetName(tab)}!A:ZZ`);
  const row = values[rowNumber - 1];
  if (
    !row ||
    normalizeName(`${row[1] ?? ""} ${row[0] ?? ""}`) !== normalizeName(name)
  ) {
    throw new GoogleSheetsDataError("The employee row changed. Refresh the passport and try again.");
  }

  const headers = values[1] ?? [];
  const column = Number(classTitle.split("|").at(-1));
  if (
    !Number.isInteger(column) ||
    column < 3 ||
    headers[column]?.trim() !== classTitle.slice(0, classTitle.lastIndexOf("|"))
  ) {
    throw new GoogleSheetsDataError("The selected CSG course no longer matches the sheet.");
  }

  const exactDateColumn = metadataColumns.get("Completion Dates ISO JSON");
  const emailColumn = metadataColumns.get("Employee Email");
  if (exactDateColumn === undefined || emailColumn === undefined) {
    throw new GoogleSheetsDataError("The CSG tracker is missing its hidden metadata columns.");
  }
  const datesJson = row[exactDateColumn] ?? "";
  let exactDates: Record<string, string> = {};
  if (datesJson) {
    const parsed: unknown = JSON.parse(datesJson);
    if (
      typeof parsed !== "object" ||
      parsed === null ||
      Object.values(parsed).some((value) => typeof value !== "string")
    ) {
      throw new GoogleSheetsDataError("The CSG completion date metadata is invalid.");
    }
    exactDates = parsed as Record<string, string>;
  }
  if (completed) exactDates[String(column)] = date;
  else delete exactDates[String(column)];

  const dateValue = completed ? formatMonthYear(date) : "";
  const extraUpdates = [
    {
      range: `${quoteSheetName(tab)}!${columnLetter(exactDateColumn)}${rowNumber}`,
      values: [[JSON.stringify(exactDates)]],
    },
  ];
  if (email) {
    extraUpdates.push({
      range: `${quoteSheetName(tab)}!${columnLetter(emailColumn)}${rowNumber}`,
      values: [[email.trim().toLowerCase()]],
    });
  }
  await getGoogleSheetsClient().spreadsheets.values.batchUpdate({
    spreadsheetId,
    requestBody: {
      valueInputOption: "USER_ENTERED",
      data: [
        {
          range: `${quoteSheetName(tab)}!${columnLetter(column)}${rowNumber}`,
          values: [[completed]],
        },
        {
          range: `${quoteSheetName(tab)}!${columnLetter(column + 1)}${rowNumber}`,
          values: [[dateValue]],
        },
        ...extraUpdates,
      ],
    },
  });
}

async function updateHcaCourse(
  name: string,
  rowNumber: number,
  nameColumn: number,
  titleColumn: number,
  checkColumn: number,
  expectedTitle: string,
  completed: boolean,
  date: string,
  email: string,
): Promise<void> {
  const spreadsheetId = getSpreadsheetId("hcaCourses");
  const metadataColumns = await ensureHiddenColumns(
    spreadsheetId,
    "Sheet1",
    1,
    ["BON Employee Email", "Associated Employee Email", "Record UUID", "Completion Date ISO"],
    7,
  );
  const values = await readSheetValues(spreadsheetId, "'Sheet1'!A:K");
  const row = values[rowNumber - 1];
  if (
    !row ||
    normalizeName(row[nameColumn] ?? "") !== normalizeName(name) ||
    (row[titleColumn] ?? "").trim() !== expectedTitle
  ) {
    throw new GoogleSheetsDataError("The HCA course row changed. Refresh the passport and try again.");
  }

  const emailHeader = nameColumn === 2 ? "BON Employee Email" : "Associated Employee Email";
  const emailColumn = metadataColumns.get(emailHeader);
  const completionDateColumn = metadataColumns.get("Completion Date ISO");
  if (emailColumn === undefined || completionDateColumn === undefined) {
    throw new GoogleSheetsDataError("The HCA tracker is missing its hidden metadata columns.");
  }
  const updates = [
    {
      range: `'Sheet1'!${columnLetter(checkColumn)}${rowNumber}`,
      values: [[completed]],
    },
    {
      range: `'Sheet1'!${columnLetter(completionDateColumn)}${rowNumber}`,
      values: [[completed ? date : ""]],
    },
  ];
  if (email) {
    updates.push({
      range: `'Sheet1'!${columnLetter(emailColumn)}${rowNumber}`,
      values: [[email.trim().toLowerCase()]],
    });
  }
  await getGoogleSheetsClient().spreadsheets.values.batchUpdate({
    spreadsheetId,
    requestBody: { valueInputOption: "USER_ENTERED", data: updates },
  });
}

async function assignHcaCourse(
  name: string,
  courseTitle: string,
  team: "bon" | "associated",
  month: string,
): Promise<void> {
  const spreadsheetId = getSpreadsheetId("hcaCourses");
  const values = await readSheetValues(spreadsheetId, "'Sheet1'!A:J");
  const [year, monthNumber] = month.split("-").map(Number);
  const monthLabel = new Intl.DateTimeFormat("en", {
    month: "long",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, monthNumber - 1, 1)));
  const targetMonth = normalizeName(`${monthLabel} ${year}`);
  const bannerPattern =
    /^(january|february|march|april|may|june|july|august|september|october|november|december)\s+20\d{2}$/i;
  const bannerRows = values.flatMap((row, index) =>
    row.slice(1, 7).some((cell) => bannerPattern.test(normalizeName(cell)))
      ? [index]
      : [],
  );
  const bannerRow = bannerRows.find((index) =>
    values[index]?.slice(1, 7).some((cell) => normalizeName(cell) === targetMonth),
  );
  if (bannerRow === undefined) {
    throw new GoogleSheetsDataError(
      `The HCA tracker has no ${monthLabel} ${year} section.`,
    );
  }
  return finishHcaAssignment(
    name,
    courseTitle,
    team,
    monthLabel,
    year,
    spreadsheetId,
    values,
    bannerRows,
    bannerRow,
  );
}

function dateInSameWorkWeek(value: string, targetValue: string): boolean {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || !/^\d{4}-\d{2}-\d{2}$/.test(targetValue)) {
      return false;
    }
    const startOfWeek = (date: string) => {
      const parsed = new Date(`${date}T00:00:00Z`);
      const day = parsed.getUTCDay();
      const offset = day === 0 ? -6 : 1 - day;
      return Date.UTC(
        parsed.getUTCFullYear(),
        parsed.getUTCMonth(),
        parsed.getUTCDate() + offset,
      );
    };
    return startOfWeek(value) === startOfWeek(targetValue);
  }

function isValidBonEmail(value: string): boolean {
    return /^[^\s@]+@bonadmin\.com$/i.test(value.trim());
  }

function isIsoDate(value: string): boolean {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const parsed = new Date(`${value}T00:00:00Z`);
    return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
  }

async function backfillEmployeeEmail(name: string, email: string): Promise<void> {
    if (!isValidBonEmail(email)) {
      throw new GoogleSheetsDataError("Employee email must be a BON Google Workspace address.");
    }
    const normalizedName = normalizeName(name);
    const normalizedEmail = email.trim().toLowerCase();

    const progressId = getSpreadsheetId("trainingProgress");
    const progressValues = await readSheetValues(
      progressId,
      "'2026 Q4 Training Progress'!A:ZZ",
    );
    const progressRows = progressValues.flatMap((row, index) =>
      index >= 54 &&
      normalizeName(`${row[1] ?? ""} ${row[0] ?? ""}`) === normalizedName
        ? [index + 1]
        : [],
    );
    if (progressRows.length > 1) {
      throw new GoogleSheetsDataError(
        "More than one training progress row matches this employee name.",
      );
    }
    if (progressRows.length === 1) {
      await getGoogleSheetsClient().spreadsheets.values.update({
        spreadsheetId: progressId,
        range: `'2026 Q4 Training Progress'!D${progressRows[0]}`,
        valueInputOption: "RAW",
        requestBody: { values: [[normalizedEmail]] },
      });
    }

    const csgId = getSpreadsheetId("csgTracker");
    for (const tab of CSG_TABS) {
      const columns = await ensureHiddenColumns(
        csgId,
        tab,
        2,
        ["Employee Email", "Completion Dates ISO JSON"],
      );
      const emailColumn = columns.get("Employee Email");
      if (emailColumn === undefined) {
        throw new GoogleSheetsDataError(`The "${tab}" tab has no employee email column.`);
      }
      const values = await readSheetValues(csgId, `${quoteSheetName(tab)}!A:ZZ`);
      const matches = values.flatMap((row, index) =>
        index >= 2 &&
        normalizeName(`${row[1] ?? ""} ${row[0] ?? ""}`) === normalizedName
          ? [index + 1]
          : [],
      );
      if (matches.length > 1) {
        throw new GoogleSheetsDataError(
          `More than one matching employee row exists on the "${tab}" CSG tab.`,
        );
      }
      if (matches.length === 1) {
        await getGoogleSheetsClient().spreadsheets.values.update({
          spreadsheetId: csgId,
          range: `${quoteSheetName(tab)}!${columnLetter(emailColumn)}${matches[0]}`,
          valueInputOption: "RAW",
          requestBody: { values: [[normalizedEmail]] },
        });
      }
    }

    const hcaId = getSpreadsheetId("hcaCourses");
    const hcaColumns = await ensureHiddenColumns(
      hcaId,
      "Sheet1",
      1,
      ["BON Employee Email", "Associated Employee Email", "Record UUID", "Completion Date ISO"],
      7,
    );
    const bonEmailColumn = hcaColumns.get("BON Employee Email");
    if (bonEmailColumn === undefined) {
      throw new GoogleSheetsDataError("The HCA tracker has no BON employee email column.");
    }
    const hcaValues = await readSheetValues(hcaId, "'Sheet1'!A:K");
    const hcaRows = hcaValues.flatMap((row, index) =>
      normalizeName(row[2] ?? "") === normalizedName ? [index + 1] : [],
    );
    if (hcaRows.length) {
      await getGoogleSheetsClient().spreadsheets.values.batchUpdate({
        spreadsheetId: hcaId,
        requestBody: {
          valueInputOption: "RAW",
          data: hcaRows.map((row) => ({
            range: `'Sheet1'!${columnLetter(bonEmailColumn)}${row}`,
            values: [[normalizedEmail]],
          })),
        },
      });
    }

    const tttId = getSpreadsheetId("tttSystem");
    for (const tab of ["2025 TTT Attendance", "2026 TTT Attendance"]) {
      await ensureHiddenColumns(
        tttId,
        tab,
        1,
        ["Session UUID / Employee Email"],
        10,
      );
      const values = await readSheetValues(tttId, `${quoteSheetName(tab)}!A:K`);
      const updates = values.flatMap((row, index) =>
        index > 0 &&
        Boolean(row[0]?.trim()) &&
        Boolean(row[1]?.trim()) &&
        normalizeName(`${row[1]} ${row[0]}`) === normalizedName
          ? [{
              range: `${quoteSheetName(tab)}!K${index + 1}`,
              values: [[normalizedEmail]],
            }]
          : [],
      );
      if (updates.length) {
        await getGoogleSheetsClient().spreadsheets.values.batchUpdate({
          spreadsheetId: tttId,
          requestBody: { valueInputOption: "RAW", data: updates },
        });
      }
    }
  }

function weeklyTallyCell(
    values: string[][],
    date: string,
    employeeName: string,
    category: "CSG" | "HCA",
  ): { row: number; column: number } {
    const weekHeaders = (values[11] ?? [])
      .map((value, column) => ({ value, column }))
      .filter(({ value }) => /^week\s+\d+/i.test(value));
    const targetWeek = weekHeaders.filter(({ value }) => {
      const match =
        /([A-Za-z]+)\s+(\d{1,2})\s*-\s*(?:([A-Za-z]+)\s+)?(\d{1,2})/.exec(value);
      if (!match) return false;
      const target = new Date(`${date}T00:00:00Z`);
      const year = target.getUTCFullYear();
      const startMonth = new Date(`${match[1]} 1, ${year} UTC`).getUTCMonth();
      const endMonth = new Date(`${match[3] ?? match[1]} 1, ${year} UTC`).getUTCMonth();
      const start = Date.UTC(year, startMonth, Number(match[2]));
      const end = Date.UTC(year, endMonth, Number(match[4]));
      return target.getTime() >= start && target.getTime() <= end;
    });
    if (targetWeek.length !== 1) {
      throw new GoogleSheetsDataError(`Could not resolve one weekly tally block for ${date}.`);
    }

    const startColumn = targetWeek[0].column;
    const nextWeekColumn = weekHeaders.find(
      ({ column }) => column > startColumn,
    )?.column ?? Number.MAX_SAFE_INTEGER;
    const categoryColumns = (values[1] ?? []).flatMap((value, column) =>
      column >= startColumn &&
      column < nextWeekColumn &&
      value.trim().toUpperCase() === category
        ? [column]
        : [],
    );
    if (categoryColumns.length !== 1) {
      throw new GoogleSheetsDataError(
        `Could not resolve one ${category} column for the week of ${date}.`,
      );
    }

    const normalizedName = normalizeName(employeeName);
    const employeeRows = values.flatMap((row, index) =>
      index >= 54 &&
      normalizeName(`${row[1] ?? ""} ${row[0] ?? ""}`) === normalizedName
        ? [index]
        : [],
    );
    if (employeeRows.length !== 1) {
      throw new GoogleSheetsDataError(
        "Could not uniquely resolve the employee in the training progress sheet.",
      );
    }
    return { row: employeeRows[0], column: categoryColumns[0] };
  }

async function recalculateWeeklyTally(
    employeeName: string,
    date: string,
    category: "CSG" | "HCA",
  ): Promise<void> {
    const csgId = getSpreadsheetId("csgTracker");
    const hcaId = getSpreadsheetId("hcaCourses");
    let count = 0;

    if (category === "CSG") {
      for (const tab of CSG_TABS) {
        const columns = await ensureHiddenColumns(
          csgId,
          tab,
          2,
          ["Employee Email", "Completion Dates ISO JSON"],
        );
        const dateColumn = columns.get("Completion Dates ISO JSON");
        if (dateColumn === undefined) continue;
        const values = await readSheetValues(csgId, `${quoteSheetName(tab)}!A:ZZ`);
        const matches = values.flatMap((row, index) =>
          index >= 2 &&
          normalizeName(`${row[1] ?? ""} ${row[0] ?? ""}`) === normalizeName(employeeName)
            ? [row]
            : [],
        );
        if (matches.length > 1) {
          throw new GoogleSheetsDataError(
            `Duplicate employee rows prevent rebuilding the CSG weekly total on "${tab}".`,
          );
        }
        const row = matches[0];
        if (!row?.[dateColumn]) continue;
        const parsed: unknown = JSON.parse(row[dateColumn]);
        if (typeof parsed !== "object" || parsed === null) {
          throw new GoogleSheetsDataError("The CSG completion date metadata is invalid.");
        }
        const completionDates = Object.values(parsed);
        if (completionDates.some((value) => typeof value !== "string")) {
          throw new GoogleSheetsDataError("The CSG completion date metadata is invalid.");
        }
        count += completionDates.filter((value) =>
          dateInSameWorkWeek(value, date),
        ).length;
      }
    } else {
      const columns = await ensureHiddenColumns(
        hcaId,
        "Sheet1",
        1,
        ["BON Employee Email", "Associated Employee Email", "Record UUID", "Completion Date ISO"],
        7,
      );
      const dateColumn = columns.get("Completion Date ISO");
      if (dateColumn === undefined) {
        throw new GoogleSheetsDataError("The HCA tracker has no completion date column.");
      }
      const values = await readSheetValues(hcaId, "'Sheet1'!A:K");
      count = values.reduce((total, row) => {
        const bonRecord =
          normalizeName(row[2] ?? "") === normalizeName(employeeName) && isChecked(row[1]);
        const associatedRecord =
          normalizeName(row[5] ?? "") === normalizeName(employeeName) && isChecked(row[4]);
        return total +
          ((bonRecord || associatedRecord) && dateInSameWorkWeek(row[dateColumn] ?? "", date)
            ? 1
            : 0);
      }, 0);
    }

    const progressId = getSpreadsheetId("trainingProgress");
    const progress = await readSheetValues(
      progressId,
      "'2026 Q4 Training Progress'!A:ZZ",
    );
    const target = weeklyTallyCell(progress, date, employeeName, category);
    await getGoogleSheetsClient().spreadsheets.values.update({
      spreadsheetId: progressId,
      range: `'2026 Q4 Training Progress'!${columnLetter(target.column)}${target.row + 1}`,
      valueInputOption: "USER_ENTERED",
      requestBody: { values: [[count]] },
    });
  }

async function finishHcaAssignment(
  name: string,
  courseTitle: string,
  team: "bon" | "associated",
  monthLabel: string,
  year: number,
  spreadsheetId: string,
  values: string[][],
  bannerRows: number[],
  bannerRow: number,
): Promise<void> {
  const nextBanner = bannerRows.find((index) => index > bannerRow) ?? values.length;
  let headerRow = -1;
  for (let index = bannerRow + 1; index < nextBanner; index += 1) {
    const row = values[index] ?? [];
    if (
      normalizeName(row[2] ?? "") === "bon team members" ||
      normalizeName(row[5] ?? "") === "associated company team members"
    ) {
      headerRow = index;
      break;
    }
  }
  if (headerRow < 0) {
    throw new GoogleSheetsDataError("The HCA month section has no team-member headers.");
  }

  const [nameColumn, titleColumn, checkColumn] =
    team === "bon" ? [2, 3, 1] : [5, 6, 4];
  for (let index = headerRow + 1; index < nextBanner; index += 1) {
    const row = values[index] ?? [];
    if (
      normalizeName(row[nameColumn] ?? "") === normalizeName(name) &&
      normalizeName(row[titleColumn] ?? "") === normalizeName(courseTitle)
    ) {
      return;
    }
  }

  const availableRow = values.findIndex((row, index) =>
    index > headerRow &&
    index < nextBanner &&
    !(row[nameColumn] ?? "").trim() &&
    !(row[titleColumn] ?? "").trim(),
  );
  if (availableRow < 0) {
    throw new GoogleSheetsDataError(
      `There is no empty course row in the ${monthLabel} ${year} section.`,
    );
  }

  await getGoogleSheetsClient().spreadsheets.values.batchUpdate({
    spreadsheetId,
    requestBody: {
      valueInputOption: "USER_ENTERED",
      data: [
        {
          range: `'Sheet1'!${columnLetter(checkColumn)}${availableRow + 1}`,
          values: [[false]],
        },
        {
          range: `'Sheet1'!${columnLetter(nameColumn)}${availableRow + 1}`,
          values: [[name]],
        },
        {
          range: `'Sheet1'!${columnLetter(titleColumn)}${availableRow + 1}`,
          values: [[courseTitle]],
        },
      ],
    },
  });
}

type UpdatePayload = {
  name: string;
  email: string;
  id: string;
  completed: boolean;
  date: string;
};

function isUpdatePayload(value: unknown): value is UpdatePayload {
  return (
    typeof value === "object" &&
    value !== null &&
    "name" in value &&
    typeof value.name === "string" &&
    "email" in value &&
    typeof value.email === "string" &&
    "id" in value &&
    typeof value.id === "string" &&
    "completed" in value &&
    typeof value.completed === "boolean" &&
    "date" in value &&
    typeof value.date === "string"
  );
}

export async function GET(request: Request) {
  const session = await getServerSession();
  if (!isAdminEmail(session?.user?.email)) return response({ error: "Unauthorized." }, 401);

  const name = new URL(request.url).searchParams.get("name")?.trim() ?? "";
  const email = new URL(request.url).searchParams.get("email")?.trim() ?? "";
  if (!name || name.length > 150) {
    return response({ error: "A valid employee name is required." }, 400);
  }

  try {
    if (email) await backfillEmployeeEmail(name, email);
    const [csg, hca] = await Promise.all([findCsgCourses(name), findHcaCourses(name)]);
    return response([...csg, ...hca]);
  } catch (error) {
    if (error instanceof GoogleSheetsConfigurationError) {
      console.error("Employee passport is not configured:", error.message);
      return response({ error: "Employee passport is not configured." }, 503);
    }
    if (error instanceof GoogleSheetsDataError) {
      return response({ error: error.message }, 409);
    }
    console.error(
      "Employee passport lookup failed:",
      error instanceof Error ? error.message : String(error),
      `Google API details=${googleSheetsErrorDetails(error)}`,
    );
    return response({ error: "Unable to load employee course records." }, 502);
  }
}

type AssignmentPayload = {
  name: string;
  courseTitle: string;
  team: "bon" | "associated";
  month: string;
};

function isAssignmentPayload(value: unknown): value is AssignmentPayload {
  return (
    typeof value === "object" &&
    value !== null &&
    "name" in value &&
    typeof value.name === "string" &&
    "courseTitle" in value &&
    typeof value.courseTitle === "string" &&
    "team" in value &&
    (value.team === "bon" || value.team === "associated") &&
    "month" in value &&
    typeof value.month === "string"
  );
}

export async function POST(request: Request) {
  const session = await getServerSession();
  if (!isAdminEmail(session?.user?.email)) return response({ error: "Unauthorized." }, 401);

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return response({ error: "A valid JSON body is required." }, 400);
  }
  if (
    !isAssignmentPayload(payload) ||
    !payload.name.trim() ||
    payload.name.length > 150 ||
    !payload.courseTitle.trim() ||
    payload.courseTitle.length > 200 ||
    !/^\d{4}-(0[1-9]|1[0-2])$/.test(payload.month)
  ) {
    return response({ error: "Invalid HCA course assignment." }, 400);
  }

  try {
    await assignHcaCourse(
      payload.name.trim(),
      payload.courseTitle.trim(),
      payload.team,
      payload.month,
    );
    return response({ ok: true });
  } catch (error) {
    if (error instanceof GoogleSheetsConfigurationError) {
      console.error("HCA course assignment is not configured:", error.message);
      return response({ error: "HCA course assignments are not configured." }, 503);
    }
    if (error instanceof GoogleSheetsDataError) {
      return response({ error: error.message }, 409);
    }
    console.error("HCA course assignment failed:", error);
    return response({ error: "Unable to assign the HCA course." }, 502);
  }
}

export async function PATCH(request: Request) {
  const session = await getServerSession();
  if (!isAdminEmail(session?.user?.email)) return response({ error: "Unauthorized." }, 401);

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return response({ error: "A valid JSON body is required." }, 400);
  }
  if (!isUpdatePayload(payload) || !payload.name.trim() || payload.name.length > 150) {
    return response({ error: "Invalid course update." }, 400);
  }
  if (
    !isValidBonEmail(payload.email) ||
    !isIsoDate(payload.date)
  ) {
    return response({ error: "Provide a BON email and an exact completion date." }, 400);
  }

  const [kind, tab, rowValue, columnValue, encodedTitle] = payload.id.split("|");
  const rowNumber = Number(rowValue);
  const column = Number(columnValue);
  if (!Number.isSafeInteger(rowNumber) || rowNumber < 1 || !Number.isSafeInteger(column)) {
    return response({ error: "Invalid course reference." }, 400);
  }
  if (
    (kind === "hca" && column !== 1 && column !== 4) ||
    (kind === "csg" && column < 3)
  ) {
    return response({ error: "Invalid course reference." }, 400);
  }

  let primaryWriteSucceeded = false;
  try {
    if (kind === "csg") {
      await updateCsgCourse(
        payload.name,
        payload.email,
        tab,
        rowNumber,
        `${decodeURIComponent(encodedTitle ?? "")}|${column}`,
        payload.completed,
        payload.date,
      );
      primaryWriteSucceeded = true;
      await recalculateWeeklyTally(payload.name, payload.date, "CSG");
    } else if (kind === "hca") {
      const nameColumn = column === 1 ? 2 : 5;
      const titleColumn = column === 1 ? 3 : 6;
      await updateHcaCourse(
        payload.name,
        rowNumber,
        nameColumn,
        titleColumn,
        column,
        decodeURIComponent(encodedTitle ?? ""),
        payload.completed,
        payload.date,
        payload.email,
      );
      primaryWriteSucceeded = true;
      await recalculateWeeklyTally(payload.name, payload.date, "HCA");
    } else {
      return response({ error: "Unknown course type." }, 400);
    }
    return response({ ok: true });
  } catch (error) {
    if (error instanceof GoogleSheetsConfigurationError) {
      console.error("Employee course update is not configured:", error.message);
      return response({ error: "Employee course updates are not configured." }, 503);
    }
    if (error instanceof GoogleSheetsDataError) {
      return response({
        error: error.message,
        primaryUpdateMayHaveSucceeded: primaryWriteSucceeded,
      }, 409);
    }
    console.error("Employee course update failed:", error);
    return response({
      error: "Unable to fully synchronize the employee course and weekly tally.",
      primaryUpdateMayHaveSucceeded: primaryWriteSucceeded,
    }, 502);
  }
}
