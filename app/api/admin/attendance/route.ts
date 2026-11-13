import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { isAdminEmail } from "@/lib/auth";
import {
  getGoogleSheetsClient,
  getSpreadsheetId,
  GoogleSheetsConfigurationError,
  readSheetValues,
  quoteSheetName,
} from "@/lib/google-sheets";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function isChecked(value: string | undefined): boolean {
  return ["true", "yes", "1", "✓"].includes((value ?? "").trim().toLowerCase());
}

function isSessionHeading(row: string[]): boolean {
  return Boolean(row[0]?.trim()) && !row[1]?.trim() && !/^last name$/i.test(row[0].trim());
}

function sessionDate(value: string): Date | null {
  const match =
    /\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2})(?:,?\s+(\d{4}))?/i.exec(
      value,
    );
  if (!match) return null;
  const parsed = new Date(`${match[1]} ${match[2]}, ${match[3] ?? "2026"} UTC`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

async function readTttAttendance() {
  const spreadsheetId = getSpreadsheetId("tttSystem");
  const sessions = await Promise.all(
    ["2025 TTT Attendance", "2026 TTT Attendance"].map(async (sheetName) => {
      const values = await readSheetValues(
        spreadsheetId,
        `${quoteSheetName(sheetName)}!A:K`,
      );
      const entries: Array<{
        checkedInAt: string;
        training: string;
        category: string;
        name: string;
        email: string;
      }> = [];
      for (let index = 0; index < values.length; index += 1) {
        const row = values[index] ?? [];
        if (!isSessionHeading(row)) continue;
        const date = sessionDate(row[0] ?? "");
        if (!date) continue;

        for (let attendeeIndex = index + 1; attendeeIndex < values.length; attendeeIndex += 1) {
          const attendee = values[attendeeIndex] ?? [];
          if (isSessionHeading(attendee)) break;
          if (isChecked(attendee[5])) {
            const name = `${attendee[1] ?? ""} ${attendee[0] ?? ""}`.trim();
            if (name) {
              entries.push({
                checkedInAt: date.toISOString(),
                training: row[0],
                category: "Train the Trainer",
                name,
                email: (attendee[10] ?? "").toLowerCase(),
              });
            }
          }
          const walkIn = attendee[7]?.trim();
          if (walkIn) {
            entries.push({
              checkedInAt: date.toISOString(),
              training: row[0],
              category: "Train the Trainer",
              name: walkIn,
              email: (attendee[10] ?? "").toLowerCase(),
            });
          }
        }
      }
      return entries;
    }),
  );
  return sessions.flat();
}

export async function GET() {
  const session = await getServerSession();

  if (!isAdminEmail(session?.user?.email)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
  const sheetName = process.env.GOOGLE_SHEETS_ATTENDANCE_SHEET || "Attendance";

  if (!spreadsheetId) {
    console.error("Attendance reporting is not configured: GOOGLE_SHEETS_SPREADSHEET_ID is missing.");
    return NextResponse.json(
      { error: "Attendance reporting is not configured." },
      { status: 503 },
    );
  }

  try {
    const sheets = getGoogleSheetsClient();
    const escapedSheetName = sheetName.replaceAll("'", "''");
    const [attendanceResponse, tttEntries] = await Promise.all([
      sheets.spreadsheets.values.get({
        spreadsheetId,
        range: `'${escapedSheetName}'!A:E`,
      }),
      readTttAttendance(),
    ]);

    const entries = (attendanceResponse.data.values ?? []).flatMap((row) => {
      const [timestamp, training, name, email, category = ""] = row.map((value) => String(value ?? "").trim());
      const checkedInAt = new Date(timestamp);

      if (
        !timestamp ||
        Number.isNaN(checkedInAt.getTime()) ||
        !training ||
        !name ||
        !/^[^\s@]+@bonadmin\.com$/i.test(email)
      ) {
        return [];
      }

      return [{
        checkedInAt: checkedInAt.toISOString(),
        training,
        category,
        name,
        email: email.toLowerCase(),
      }];
    });

    return NextResponse.json([...entries, ...tttEntries]);
  } catch (error) {
    if (error instanceof GoogleSheetsConfigurationError) {
      console.error("Attendance reporting is not configured:", error.message);
      return NextResponse.json(
        { error: "Attendance reporting is not configured." },
        { status: 503 },
      );
    }

    console.error("Attendance report lookup failed:", error);
    return NextResponse.json(
      { error: "Unable to load attendance records." },
      { status: 502 },
    );
  }
}
