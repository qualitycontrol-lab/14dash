import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { isAdminEmail } from "@/lib/auth";
import {
  ensureSheetTab,
  getGoogleSheetsClient,
  getSpreadsheetId,
  GoogleSheetsConfigurationError,
  GoogleSheetsDataError,
  quoteSheetName,
  readSheetValues,
} from "@/lib/google-sheets";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const SHEET_NAME = "Training Goals";
const HEADERS = [
  "Goal UUID",
  "Employee Email",
  "Employee Name",
  "Goal",
  "Created At",
];

type TrainingGoal = {
  id: string;
  title: string;
};

function response(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "private, no-store" },
  });
}

function isBonEmail(value: unknown): value is string {
  return typeof value === "string" && /^[^\s@]+@bonadmin\.com$/i.test(value.trim());
}

function isGoalPayload(value: unknown): value is { email: string; name: string; title: string } {
  return (
    typeof value === "object" &&
    value !== null &&
    "email" in value &&
    isBonEmail(value.email) &&
    "name" in value &&
    typeof value.name === "string" &&
    "title" in value &&
    typeof value.title === "string"
  );
}

function isGoalReference(value: unknown): value is { email: string; id: string } {
  return (
    typeof value === "object" &&
    value !== null &&
    "email" in value &&
    isBonEmail(value.email) &&
    "id" in value &&
    typeof value.id === "string"
  );
}

function spreadsheetId(): string {
  return getSpreadsheetId("trainingProgress");
}

async function ensureGoalsSheet(): Promise<string> {
  const id = spreadsheetId();
  await ensureSheetTab(id, SHEET_NAME, HEADERS);
  return id;
}

async function goalsForEmail(email: string): Promise<TrainingGoal[]> {
  const id = await ensureGoalsSheet();
  const values = await readSheetValues(id, `${quoteSheetName(SHEET_NAME)}!A:E`);
  const normalizedEmail = email.trim().toLowerCase();
  return values.slice(1).flatMap((row) => {
    if ((row[1] ?? "").trim().toLowerCase() !== normalizedEmail) return [];
    const [goalId, , , title] = row;
    if (!goalId || !title) return [];
    return [{ id: goalId, title }];
  });
}

export async function GET(request: Request) {
  const session = await getServerSession();
  if (!isAdminEmail(session?.user?.email)) return response({ error: "Unauthorized." }, 401);

  const email = new URL(request.url).searchParams.get("email")?.trim() ?? "";
  if (!isBonEmail(email)) return response({ error: "A valid employee email is required." }, 400);

  try {
    return response(await goalsForEmail(email));
  } catch (error) {
    if (error instanceof GoogleSheetsConfigurationError) {
      console.error("Training goals are not configured:", error.message);
      return response({ error: "Training goals are not configured." }, 503);
    }
    console.error("Training goals lookup failed:", error);
    return response({ error: "Unable to load training goals." }, 502);
  }
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
    !isGoalPayload(payload) ||
    !payload.name.trim() ||
    payload.name.trim().length > 150 ||
    !payload.title.trim() ||
    payload.title.trim().length > 200
  ) {
    return response({ error: "Invalid training goal." }, 400);
  }

  try {
    const id = await ensureGoalsSheet();
    const goal: TrainingGoal = { id: randomUUID(), title: payload.title.trim() };
    await getGoogleSheetsClient().spreadsheets.values.append({
      spreadsheetId: id,
      range: `${quoteSheetName(SHEET_NAME)}!A:E`,
      valueInputOption: "RAW",
      insertDataOption: "INSERT_ROWS",
      requestBody: {
        values: [[
          goal.id,
          payload.email.trim().toLowerCase(),
          payload.name.trim(),
          goal.title,
          new Date().toISOString(),
        ]],
      },
    });
    return response(goal, 201);
  } catch (error) {
    if (error instanceof GoogleSheetsConfigurationError) {
      console.error("Training goal write is not configured:", error.message);
      return response({ error: "Training goals are not configured." }, 503);
    }
    console.error("Training goal write failed:", error);
    return response({ error: "Unable to save the training goal." }, 502);
  }
}

export async function DELETE(request: Request) {
  const session = await getServerSession();
  if (!isAdminEmail(session?.user?.email)) return response({ error: "Unauthorized." }, 401);

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return response({ error: "A valid JSON body is required." }, 400);
  }
  if (!isGoalReference(payload)) {
    return response({ error: "Invalid training goal reference." }, 400);
  }

  try {
    const id = await ensureGoalsSheet();
    const values = await readSheetValues(id, `${quoteSheetName(SHEET_NAME)}!A:E`);
    const matchingRows = values.flatMap((row, index) =>
      index > 0 &&
      row[0] === payload.id &&
      row[1]?.toLowerCase() === payload.email.trim().toLowerCase()
        ? [index + 1]
        : [],
    );
    if (matchingRows.length !== 1) {
      return response({ error: "The training goal was not found or is ambiguous." }, 404);
    }
    const metadata = await getGoogleSheetsClient().spreadsheets.get({
      spreadsheetId: id,
      fields: "sheets(properties(sheetId,title))",
    });
    const sheetId = metadata.data.sheets
      ?.map((sheet) => sheet.properties)
      .find((sheet) => sheet?.title === SHEET_NAME)
      ?.sheetId;
    if (sheetId === undefined) {
      throw new GoogleSheetsDataError(`The "${SHEET_NAME}" tab was not found.`);
    }
    await getGoogleSheetsClient().spreadsheets.batchUpdate({
      spreadsheetId: id,
      requestBody: {
        requests: [{
          deleteDimension: {
            range: {
              sheetId,
              dimension: "ROWS",
              startIndex: matchingRows[0] - 1,
              endIndex: matchingRows[0],
            },
          },
        }],
      },
    });
    return response({ ok: true });
  } catch (error) {
    if (error instanceof GoogleSheetsConfigurationError) {
      console.error("Training goal deletion is not configured:", error.message);
      return response({ error: "Training goals are not configured." }, 503);
    }
    console.error("Training goal deletion failed:", error);
    return response({ error: "Unable to remove the training goal." }, 502);
  }
}
