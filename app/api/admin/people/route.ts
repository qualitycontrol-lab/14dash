import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { isAdminEmail } from "@/lib/auth";
import {
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

function formatMonthYear(value: string): string {
  const [year, month] = value.split("-").map(Number);
  return `${month}/${String(year).slice(-2)}`;
}

async function findCsgCourses(name: string): Promise<PassportCourse[]> {
  const spreadsheetId = getSpreadsheetId("csgTracker");
  const normalizedName = normalizeName(name);
  const courses: PassportCourse[] = [];

  for (const tab of CSG_TABS) {
    const values = await readSheetValues(spreadsheetId, `${quoteSheetName(tab)}!A:ZZ`);
    const headers = values[1] ?? [];
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
        const completionDate = row[checkboxColumn + 1] ?? "";
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
  const values = await readSheetValues(spreadsheetId, "'Sheet1'!A:G");
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
        date: "",
        status: isChecked(row[checkColumn]) ? "Confirmed" : "Not Started",
      });
    }
  }
  return courses;
}

async function updateCsgCourse(
  name: string,
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

  const dateValue = completed ? formatMonthYear(date) : "";
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
): Promise<void> {
  const spreadsheetId = getSpreadsheetId("hcaCourses");
  const values = await readSheetValues(spreadsheetId, "'Sheet1'!A:G");
  const row = values[rowNumber - 1];
  if (
    !row ||
    normalizeName(row[nameColumn] ?? "") !== normalizeName(name) ||
    (row[titleColumn] ?? "").trim() !== expectedTitle
  ) {
    throw new GoogleSheetsDataError("The HCA course row changed. Refresh the passport and try again.");
  }

  await getGoogleSheetsClient().spreadsheets.values.update({
    spreadsheetId,
    range: `'Sheet1'!${columnLetter(checkColumn)}${rowNumber}`,
    valueInputOption: "USER_ENTERED",
    requestBody: { values: [[completed]] },
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
  if (!name || name.length > 150) {
    return response({ error: "A valid employee name is required." }, 400);
  }

  try {
    const [csg, hca] = await Promise.all([findCsgCourses(name), findHcaCourses(name)]);
    return response([...csg, ...hca]);
  } catch (error) {
    if (error instanceof GoogleSheetsConfigurationError) {
      console.error("Employee passport is not configured:", error.message);
      return response({ error: "Employee passport is not configured." }, 503);
    }
    console.error("Employee passport lookup failed:", error);
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
  if (payload.completed && !/^\d{4}-(0[1-9]|1[0-2])$/.test(payload.date)) {
    return response({ error: "Choose a completion month." }, 400);
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

  try {
    if (kind === "csg") {
      await updateCsgCourse(
        payload.name,
        tab,
        rowNumber,
        `${decodeURIComponent(encodedTitle ?? "")}|${column}`,
        payload.completed,
        payload.date,
      );
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
      );
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
      return response({ error: error.message }, 409);
    }
    console.error("Employee course update failed:", error);
    return response({ error: "Unable to update the employee course." }, 502);
  }
}
