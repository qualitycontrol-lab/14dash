import { getServerSession } from "next-auth";
import { google } from "googleapis";
import { NextResponse } from "next/server";
import {
  createGoogleOAuthClient,
  GoogleOAuthConfigurationError,
} from "@/lib/google";

type CheckInPayload = {
  name: string;
  email: string;
  training?: string;
};

function isCheckInPayload(value: unknown): value is CheckInPayload {
  return (
    typeof value === "object" &&
    value !== null &&
    "name" in value &&
    typeof value.name === "string" &&
    "email" in value &&
    typeof value.email === "string" &&
    (!("training" in value) || typeof value.training === "string")
  );
}

export async function POST(request: Request) {
  const session = await getServerSession();

  if (!session?.user?.email?.trim().toLowerCase().endsWith("@bonadmin.com")) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "A valid JSON body is required." }, { status: 400 });
  }

  if (!isCheckInPayload(payload)) {
    return NextResponse.json({ error: "Invalid attendance details." }, { status: 400 });
  }

  const name = payload.name.trim();
  const email = payload.email.trim().toLowerCase();
  const training = payload.training?.trim() || "Training check-in";

  if (
    !name ||
    name.length > 150 ||
    !/^[^\s@]+@bonadmin\.com$/.test(email) ||
    training.length > 200
  ) {
    return NextResponse.json({ error: "Invalid attendance details." }, { status: 400 });
  }

  const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
  const sheetName = process.env.GOOGLE_SHEETS_ATTENDANCE_SHEET || "Attendance";

  if (!spreadsheetId) {
    console.error("Attendance logging is not configured: GOOGLE_SHEETS_SPREADSHEET_ID is missing.");
    return NextResponse.json(
      { error: "Attendance logging is not configured." },
      { status: 503 },
    );
  }

  try {
    const sheets = google.sheets({ version: "v4", auth: createGoogleOAuthClient() });
    const escapedSheetName = sheetName.replaceAll("'", "''");

    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: `'${escapedSheetName}'!A:D`,
      valueInputOption: "RAW",
      insertDataOption: "INSERT_ROWS",
      requestBody: {
        values: [[new Date().toISOString(), training, name, email]],
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof GoogleOAuthConfigurationError) {
      console.error("Attendance logging is not configured:", error.message);
      return NextResponse.json(
        { error: "Attendance logging is not configured." },
        { status: 503 },
      );
    }

    console.error("Attendance logging failed:", error);
    return NextResponse.json(
      { error: "Unable to record attendance. Please try again." },
      { status: 502 },
    );
  }
}
