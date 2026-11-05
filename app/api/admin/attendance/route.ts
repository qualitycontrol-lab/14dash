import { getServerSession } from "next-auth";
import { google } from "googleapis";
import { NextResponse } from "next/server";
import { isAdminEmail } from "@/lib/auth";
import {
  createGoogleOAuthClient,
  GoogleOAuthConfigurationError,
} from "@/lib/google";

export const dynamic = "force-dynamic";

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
    const sheets = google.sheets({ version: "v4", auth: createGoogleOAuthClient() });
    const escapedSheetName = sheetName.replaceAll("'", "''");
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `'${escapedSheetName}'!A:E`,
    });

    const entries = (response.data.values ?? []).flatMap((row) => {
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

    return NextResponse.json(entries);
  } catch (error) {
    if (error instanceof GoogleOAuthConfigurationError) {
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
