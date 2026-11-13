import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { isAdminEmail } from "@/lib/auth";
import {
  appendRecordIfMissing,
  ensureIdColumn,
  ensureHiddenColumns,
  findHeaderIndex,
  columnLetter,
  getGoogleSheetsClient,
  getSpreadsheetId,
  GoogleSheetsConfigurationError,
  GoogleSheetsDataError,
  readCell,
  readSheetValues,
  readSheetTable,
  quoteSheetName,
  type AdminSpreadsheet,
  type SheetTable,
} from "@/lib/google-sheets";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type TrainingType = "HCA" | "CSG" | "TTT" | "LF" | "OTA" | "WS" | "Misc";
type TrainingStatus = "Upcoming" | "Completed";

type Training = {
  id: string;
  title: string;
  type: TrainingType;
  date: string;
  attendees: number;
  status: TrainingStatus;
};

const typeNames: Record<TrainingType, string[]> = {
  HCA: ["HCA", "Hubbard College of Administration"],
  CSG: ["CSG", "Center for Self Governance"],
  TTT: ["TTT", "Train the Trainer"],
  LF: ["LF", "Learning Forum"],
  OTA: ["OTA", "Online Training Academy"],
  WS: ["WS", "Workshop"],
  Misc: ["Misc", "Miscellaneous"],
};

function noStoreJson(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "private, no-store" },
  });
}

function parseType(value: string, fallback?: TrainingType): TrainingType | null {
  const normalized = value.trim().toLowerCase();
  for (const [type, names] of Object.entries(typeNames) as [TrainingType, string[]][]) {
    if (names.some((name) => name.toLowerCase() === normalized)) return type;
  }
  return fallback ?? null;
}

function parseDate(value: string): string {
  const trimmed = value.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;

  const usDate = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(trimmed);
  if (usDate) {
    return `${usDate[3]}-${usDate[1].padStart(2, "0")}-${usDate[2].padStart(2, "0")}`;
  }

  const parsed = new Date(trimmed);
  return Number.isNaN(parsed.getTime()) ? "" : parsed.toISOString().slice(0, 10);
}

function parseTable(
  table: SheetTable,
  sheetName: string,
  fallbackType?: TrainingType,
): Training[] {
  const titleAliases = ["training", "training title", "session", "event", "event name", "title", "topic"];
  const dateAliases = ["date", "training date", "session date", "scheduled date"];
  if (
    findHeaderIndex(table.headers, titleAliases) < 0 ||
    findHeaderIndex(table.headers, dateAliases) < 0
  ) {
    throw new GoogleSheetsDataError(
      `The "${sheetName}" tab must have a training title and date column.`,
    );
  }

  return table.rows.flatMap((row, index) => {
    const title = readCell(table.headers, row, titleAliases);
    const date = parseDate(readCell(table.headers, row, dateAliases));
    const type = parseType(
      readCell(table.headers, row, ["training type", "category", "type"]),
      fallbackType,
    );
    if (!title || !date || !type) return [];

    const storedId = table.idColumn < 0 ? "" : row[table.idColumn] ?? "";
    const attendeeCount = Number(
      readCell(table.headers, row, ["attendees", "attendee count", "total attendees"]),
    );
    const statusValue = readCell(table.headers, row, ["status"]).toLowerCase();
    const status: TrainingStatus =
      statusValue === "completed" || date < new Date().toISOString().slice(0, 10)
        ? "Completed"
        : "Upcoming";

    return [{
      id: storedId || `${sheetName}-${index + 2}`,
      title,
      type,
      date,
      attendees: Number.isFinite(attendeeCount) ? attendeeCount : 0,
      status,
    }];
  });
}

function deduplicateTrainings(trainings: Training[]): Training[] {
  const seen = new Set<string>();
  return trainings.filter((training) => {
    const key = `${training.title.trim().toLowerCase()}|${training.date}|${training.type}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function trainingRow(
  table: SheetTable,
  training: { title: string; date: string; type: TrainingType; requestId: string },
  fallbackType?: TrainingType,
): string[] {
  const titleIndex = findHeaderIndex(table.headers, [
    "training", "training title", "session", "event", "event name", "title", "topic",
  ]);
  const dateIndex = findHeaderIndex(table.headers, [
    "date", "training date", "session date", "scheduled date",
  ]);
  if (titleIndex < 0 || dateIndex < 0) {
    throw new GoogleSheetsDataError(
      "The destination tab must have a training title and date column.",
    );
  }

  const typeIndex = findHeaderIndex(table.headers, ["training type", "category", "type"]);
  const idIndex = table.idColumn;
  const row = table.headers.map(() => "");
  row[titleIndex] = training.title;
  row[dateIndex] = training.date;
  if (typeIndex >= 0) row[typeIndex] = typeNames[training.type][0];
  if (idIndex >= 0) row[idIndex] = training.requestId;
  if (!fallbackType && typeIndex < 0) {
    throw new GoogleSheetsDataError(
      "The main Training Schedule tab must have a category or type column.",
    );
  }
  return row;
}

async function appendTraining(
  spreadsheet: AdminSpreadsheet,
  tab: string,
  record: { title: string; date: string; type: TrainingType; requestId: string },
  fallbackType?: TrainingType,
) {
  const spreadsheetId = getSpreadsheetId(spreadsheet);
  const table = await ensureIdColumn(spreadsheetId, tab, "Session UUID");
  await appendRecordIfMissing(
    spreadsheetId,
    tab,
    table,
    record.requestId,
    trainingRow(table, record, fallbackType),
  );
}

function isTttSessionBanner(row: string[]): boolean {
  return (
    Boolean(row[0]?.trim()) &&
    !row[1]?.trim() &&
    /\b(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2}(?:,?\s+20\d{2})?/i.test(
      row[0],
    )
  );
}

async function createTttAttendanceBlock(record: {
  title: string;
  date: string;
  requestId: string;
}): Promise<void> {
  const year = Number(record.date.slice(0, 4));
  if (year !== 2025 && year !== 2026) {
    throw new GoogleSheetsDataError(
      "TTT attendance blocks can currently be created for 2025 and 2026 only.",
    );
  }

  const spreadsheetId = getSpreadsheetId("tttSystem");
  const sheetName = `${year} TTT Attendance`;
  await ensureHiddenColumns(
    spreadsheetId,
    sheetName,
    1,
    ["Session UUID / Employee Email"],
    10,
  );
  const values = await readSheetValues(
    spreadsheetId,
    `${quoteSheetName(sheetName)}!A:K`,
  );
  if (values.some((row) => row[10] === record.requestId)) return;

  const sessionRows = values.flatMap((row, index) =>
    isTttSessionBanner(row) ? [index] : [],
  );
  if (!sessionRows.length) {
    throw new GoogleSheetsDataError(
      `The "${sheetName}" sheet has no session block to use as a template.`,
    );
  }
  const sourceStart = sessionRows[sessionRows.length - 1];
  const sourceEnd = values.length;
  const blockLength = sourceEnd - sourceStart;
  if (
    blockLength < 4 ||
    !values.slice(sourceStart, sourceEnd).some((row) =>
      (row[0] ?? "").trim().toLowerCase() === "last name" &&
      (row[1] ?? "").trim().toLowerCase() === "first name",
    )
  ) {
    throw new GoogleSheetsDataError(
      `The final "${sheetName}" session block is incomplete and cannot be used as a template.`,
    );
  }

  const metadata = await getGoogleSheetsClient().spreadsheets.get({
    spreadsheetId,
    fields: "sheets(properties(sheetId,title),merges)",
  });
  const sheet = metadata.data.sheets?.find(
    (candidate) => candidate.properties?.title === sheetName,
  );
  if (!sheet || sheet.properties?.sheetId === undefined) {
    throw new GoogleSheetsDataError(`The "${sheetName}" tab was not found.`);
  }
  const sheetId = sheet.properties.sheetId;
  const copiedMerges = (sheet.merges ?? []).filter(
    (merge) =>
      merge.startRowIndex !== undefined &&
      merge.startRowIndex !== null &&
      merge.endRowIndex !== undefined &&
      merge.endRowIndex !== null &&
      merge.startRowIndex >= sourceStart &&
      merge.endRowIndex <= sourceEnd,
  );
  const insertionIndex = values.length;
  const targetIndex = insertionIndex;
  const targetTitle = `${record.title} - ${new Intl.DateTimeFormat("en", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${record.date}T00:00:00Z`))}`;
  const mergeRequests = copiedMerges.map((merge) => ({
    mergeCells: {
      range: {
        sheetId,
        startRowIndex: targetIndex + (merge.startRowIndex ?? sourceStart) - sourceStart,
        endRowIndex: targetIndex + (merge.endRowIndex ?? sourceStart) - sourceStart,
        startColumnIndex: merge.startColumnIndex,
        endColumnIndex: merge.endColumnIndex,
      },
      mergeType: "MERGE_ALL" as const,
    },
  }));
  const metadataColumn = 10;

  await getGoogleSheetsClient().spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: [
        {
          insertDimension: {
            range: {
              sheetId,
              dimension: "ROWS",
              startIndex: insertionIndex,
              endIndex: insertionIndex + blockLength,
            },
            inheritFromBefore: false,
          },
        },
        {
          copyPaste: {
            source: {
              sheetId,
              startRowIndex: sourceStart,
              endRowIndex: sourceEnd,
              startColumnIndex: 0,
              endColumnIndex: 11,
            },
            destination: {
              sheetId,
              startRowIndex: targetIndex,
              endRowIndex: targetIndex + blockLength,
              startColumnIndex: 0,
              endColumnIndex: 11,
            },
            pasteType: "PASTE_NORMAL",
            pasteOrientation: "NORMAL",
          },
        },
        ...mergeRequests,
      ],
    },
  });

  const clonedRows = values.slice(sourceStart, sourceEnd);
  const cellUpdates: Array<{ range: string; values: Array<Array<string | boolean>> }> = [
    {
      range: `${quoteSheetName(sheetName)}!A${targetIndex + 1}`,
      values: [[targetTitle]],
    },
    {
      range: `${quoteSheetName(sheetName)}!${columnLetter(metadataColumn)}${targetIndex + 1}`,
      values: [[record.requestId]],
    },
  ];
  clonedRows.forEach((row, offset) => {
    const targetRow = targetIndex + offset + 1;
    const lastName = (row[0] ?? "").trim();
    const firstName = (row[1] ?? "").trim();
    if (
      lastName &&
      firstName &&
      lastName.toLowerCase() !== "last name" &&
      firstName.toLowerCase() !== "first name"
    ) {
      cellUpdates.push({
        range: `${quoteSheetName(sheetName)}!F${targetRow}`,
        values: [[false]],
      });
    }
    if (
      (row[7] ?? "").trim() &&
      (row[7] ?? "").trim().toLowerCase() !== "additional attendees:"
    ) {
      cellUpdates.push({
        range: `${quoteSheetName(sheetName)}!H${targetRow}`,
        values: [[""]],
      });
    }
  });
  await getGoogleSheetsClient().spreadsheets.values.batchUpdate({
    spreadsheetId,
    requestBody: { valueInputOption: "USER_ENTERED", data: cellUpdates },
  });
}

function isTrainingType(value: unknown): value is TrainingType {
  return typeof value === "string" && value in typeNames;
}

function isTrainingPayload(
  value: unknown,
): value is { title: string; date: string; type: TrainingType; requestId: string } {
  return (
    typeof value === "object" &&
    value !== null &&
    "title" in value &&
    typeof value.title === "string" &&
    "date" in value &&
    typeof value.date === "string" &&
    "type" in value &&
    isTrainingType(value.type) &&
    "requestId" in value &&
    typeof value.requestId === "string"
  );
}

export async function GET() {
  const session = await getServerSession();
  if (!isAdminEmail(session?.user?.email)) {
    return noStoreJson({ error: "Unauthorized." }, 401);
  }

  try {
    const trainingProgressId = getSpreadsheetId("trainingProgress");
    const tttSystemId = getSpreadsheetId("tttSystem");
    const [mainSchedule, tttSchedule, upcomingTtt, tttLog, lfSchedule] =
      await Promise.all([
        readSheetTable(trainingProgressId, "Training Schedule"),
        readSheetTable(tttSystemId, "Schedule"),
        readSheetTable(tttSystemId, "Upcoming TTT"),
        readSheetTable(trainingProgressId, "TTT"),
        readSheetTable(trainingProgressId, "LF"),
      ]);
    const trainings = deduplicateTrainings([
      ...parseTable(mainSchedule, "Training Schedule"),
      ...parseTable(tttSchedule, "Schedule", "TTT"),
      ...parseTable(upcomingTtt, "Upcoming TTT", "TTT"),
      ...parseTable(tttLog, "TTT", "TTT"),
      ...parseTable(lfSchedule, "LF", "LF"),
    ]).sort((left, right) => left.date.localeCompare(right.date));
    return noStoreJson(trainings);
  } catch (error) {
    if (error instanceof GoogleSheetsConfigurationError) {
      console.error("Admin training data is not configured:", error.message);
      return noStoreJson({ error: "Training data is not configured." }, 503);
    }
    console.error("Admin training lookup failed:", error);
    return noStoreJson({ error: "Unable to load training data from Google Sheets." }, 502);
  }
}

export async function POST(request: Request) {
  const session = await getServerSession();
  if (!isAdminEmail(session?.user?.email)) {
    return noStoreJson({ error: "Unauthorized." }, 401);
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return noStoreJson({ error: "A valid JSON body is required." }, 400);
  }
  if (!isTrainingPayload(payload)) {
    return noStoreJson({ error: "Invalid training details." }, 400);
  }

  const title = payload.title.trim();
  const date = parseDate(payload.date);
  if (
    !title ||
    title.length > 200 ||
    !date ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(payload.requestId)
  ) {
    return noStoreJson({ error: "Invalid training details." }, 400);
  }

  const record = { title, date, type: payload.type, requestId: payload.requestId };
  const destinations: Array<[AdminSpreadsheet, string, TrainingType?]> = [
    ["trainingProgress", "Training Schedule"],
  ];
  if (record.type === "TTT") {
    destinations.push(
      ["tttSystem", "Upcoming TTT", "TTT"],
      ["tttSystem", "Schedule", "TTT"],
      ["trainingProgress", "TTT", "TTT"],
    );
  } else if (record.type === "LF") {
    destinations.push(["trainingProgress", "LF", "LF"]);
  }

  const completedDestinations: string[] = [];
  try {
    for (const [spreadsheet, tab, fallbackType] of destinations) {
      await appendTraining(spreadsheet, tab, record, fallbackType);
      completedDestinations.push(tab);
    }
    if (record.type === "TTT") {
      await createTttAttendanceBlock(record);
      completedDestinations.push(`${record.date.slice(0, 4)} TTT Attendance`);
    }
    return noStoreJson({
      training: {
        id: record.requestId,
        title: record.title,
        type: record.type,
        date: record.date,
        attendees: 0,
        status: record.date < new Date().toISOString().slice(0, 10) ? "Completed" : "Upcoming",
      } satisfies Training,
    });
  } catch (error) {
    if (error instanceof GoogleSheetsConfigurationError) {
      console.error("Admin training write is not configured:", error.message);
      return noStoreJson({ error: "Training data is not configured." }, 503);
    }
    console.error("Admin training write failed:", {
      completedDestinations,
      error,
    });
    return noStoreJson(
      {
        error: "Training could not be synchronized to every sheet. Retry to finish syncing.",
        completedDestinations,
      },
      502,
    );
  }
}
