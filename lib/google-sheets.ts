import "server-only";
import { google, type sheets_v4 } from "googleapis";

export type AdminSpreadsheet =
  | "trainingProgress"
  | "tttSystem"
  | "hcaCourses"
  | "csgTracker";

const spreadsheetEnvironmentVariables: Record<AdminSpreadsheet, string> = {
  trainingProgress: "GOOGLE_SHEETS_TRAINING_PROGRESS_ID",
  tttSystem: "GOOGLE_SHEETS_TTT_SYSTEM_ID",
  hcaCourses: "GOOGLE_SHEETS_HCA_COURSES_ID",
  csgTracker: "GOOGLE_SHEETS_CSG_TRACKER_ID",
};

export class GoogleSheetsConfigurationError extends Error {
  constructor(missingVariables: string[]) {
    super(`Missing Google Sheets configuration: ${missingVariables.join(", ")}`);
    this.name = "GoogleSheetsConfigurationError";
  }
}

export class GoogleSheetsDataError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GoogleSheetsDataError";
  }
}

export type SheetTable = {
  headers: string[];
  rows: string[][];
  idColumn: number;
};

let sheetsClient: sheets_v4.Sheets | undefined;

export function getGoogleSheetsClient(): sheets_v4.Sheets {
  if (sheetsClient) return sheetsClient;

  const rawCredentials = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!rawCredentials) {
    throw new GoogleSheetsConfigurationError(["GOOGLE_SERVICE_ACCOUNT_JSON"]);
  }

  let credentials: unknown;
  try {
    credentials = JSON.parse(rawCredentials);
  } catch {
    throw new GoogleSheetsConfigurationError([
      "GOOGLE_SERVICE_ACCOUNT_JSON must contain valid JSON",
    ]);
  }

  if (
    typeof credentials !== "object" ||
    credentials === null ||
    !("client_email" in credentials) ||
    typeof credentials.client_email !== "string" ||
    !("private_key" in credentials) ||
    typeof credentials.private_key !== "string"
  ) {
    throw new GoogleSheetsConfigurationError([
      "GOOGLE_SERVICE_ACCOUNT_JSON must include client_email and private_key",
    ]);
  }

  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: credentials.client_email,
      private_key: credentials.private_key.replaceAll("\\n", "\n"),
    },
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
  sheetsClient = google.sheets({ version: "v4", auth });
  return sheetsClient;
}

export function getSpreadsheetId(spreadsheet: AdminSpreadsheet): string {
  const environmentVariable = spreadsheetEnvironmentVariables[spreadsheet];
  const spreadsheetId = process.env[environmentVariable];
  if (!spreadsheetId) {
    throw new GoogleSheetsConfigurationError([environmentVariable]);
  }
  return spreadsheetId;
}

export function quoteSheetName(sheetName: string): string {
  return `'${sheetName.replaceAll("'", "''")}'`;
}

export async function readSheetValues(
  spreadsheetId: string,
  range: string,
): Promise<string[][]> {
  const response = await getGoogleSheetsClient().spreadsheets.values.get({
    spreadsheetId,
    range,
  });
  return (response.data.values ?? []).map((row) =>
    row.map((value) => String(value ?? "").trim()),
  );
}

export async function writeSheetValues(
  spreadsheetId: string,
  range: string,
  values: string[][],
): Promise<void> {
  await getGoogleSheetsClient().spreadsheets.values.update({
    spreadsheetId,
    range,
    valueInputOption: "USER_ENTERED",
    requestBody: { values },
  });
}

function normalizeHeader(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

export function columnLetter(index: number): string {
  let value = index + 1;
  let result = "";
  while (value > 0) {
    const remainder = (value - 1) % 26;
    result = String.fromCharCode(65 + remainder) + result;
    value = Math.floor((value - 1) / 26);
  }
  return result;
}

export async function readSheetTable(
  spreadsheetId: string,
  sheetName: string,
): Promise<SheetTable> {
  const response = await getGoogleSheetsClient().spreadsheets.values.get({
    spreadsheetId,
    range: `${quoteSheetName(sheetName)}!A:ZZ`,
  });
  const values = response.data.values ?? [];
  const headers = (values[0] ?? []).map((value) => String(value ?? "").trim());
  if (headers.length === 0) {
    throw new GoogleSheetsDataError(`The "${sheetName}" tab has no header row.`);
  }

  const idColumn = headers.findIndex((header) =>
    ["session uuid", "record uuid"].includes(normalizeHeader(header)),
  );
  return {
    headers,
    rows: values.slice(1).map((row) =>
      headers.map((_, index) => String(row[index] ?? "").trim()),
    ),
    idColumn,
  };
}

export async function ensureIdColumn(
  spreadsheetId: string,
  sheetName: string,
  headerName: "Session UUID" | "Record UUID",
): Promise<SheetTable> {
  const table = await readSheetTable(spreadsheetId, sheetName);
  if (table.idColumn >= 0) return table;

  const sheets = getGoogleSheetsClient();
  const metadata = await sheets.spreadsheets.get({
    spreadsheetId,
    fields: "sheets(properties(sheetId,title,gridProperties(columnCount)))",
  });
  const properties = metadata.data.sheets
    ?.map((sheet) => sheet.properties)
    .find((sheet) => sheet?.title === sheetName);
  if (properties?.sheetId === undefined) {
    throw new GoogleSheetsDataError(`The "${sheetName}" tab was not found.`);
  }

  const index = table.headers.length;
  const columnCount = properties.gridProperties?.columnCount ?? 0;
  if (index >= columnCount) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [
          {
            appendDimension: {
              sheetId: properties.sheetId,
              dimension: "COLUMNS",
              length: index - columnCount + 1,
            },
          },
        ],
      },
    });
  }

  const column = columnLetter(index);
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${quoteSheetName(sheetName)}!${column}1`,
    valueInputOption: "RAW",
    requestBody: { values: [[headerName]] },
  });
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: [
        {
          updateDimensionProperties: {
            range: {
              sheetId: properties.sheetId,
              dimension: "COLUMNS",
              startIndex: index,
              endIndex: index + 1,
            },
            properties: { hiddenByUser: true },
            fields: "hiddenByUser",
          },
        },
      ],
    },
  });

  return readSheetTable(spreadsheetId, sheetName);
}

export async function ensureHiddenColumns(
  spreadsheetId: string,
  sheetName: string,
  headerRow: number,
  headerNames: string[],
  startColumnIndex = 0,
): Promise<Map<string, number>> {
  const sheets = getGoogleSheetsClient();
  const quotedName = quoteSheetName(sheetName);
  const values = await readSheetValues(spreadsheetId, `${quotedName}!A:ZZ`);
  const headers = values[headerRow - 1] ?? [];
  const metadata = await sheets.spreadsheets.get({
    spreadsheetId,
    fields: "sheets(properties(sheetId,title,gridProperties(columnCount)))",
  });
  const properties = metadata.data.sheets
    ?.map((sheet) => sheet.properties)
    .find((sheet) => sheet?.title === sheetName);
  if (properties?.sheetId === undefined) {
    throw new GoogleSheetsDataError(`The "${sheetName}" tab was not found.`);
  }

  const result = new Map<string, number>();
  const toAdd: Array<{ name: string; index: number }> = [];
  let nextIndex = Math.max(headers.length, startColumnIndex);
  for (const headerName of headerNames) {
    const existingIndex = headers.findIndex(
      (header) => normalizeHeader(header) === normalizeHeader(headerName),
    );
    if (existingIndex >= 0) {
      result.set(headerName, existingIndex);
      continue;
    }

    while (headers[nextIndex]?.trim()) nextIndex += 1;
    result.set(headerName, nextIndex);
    toAdd.push({ name: headerName, index: nextIndex });
    nextIndex += 1;
  }

  const requiredColumnCount = nextIndex;
  const columnCount = properties.gridProperties?.columnCount ?? 0;
  if (requiredColumnCount > columnCount) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [{
          appendDimension: {
            sheetId: properties.sheetId,
            dimension: "COLUMNS",
            length: requiredColumnCount - columnCount,
          },
        }],
      },
    });
  }

  if (toAdd.length) {
    await sheets.spreadsheets.values.batchUpdate({
      spreadsheetId,
      requestBody: {
        valueInputOption: "RAW",
        data: toAdd.map(({ name, index }) => ({
          range: `${quotedName}!${columnLetter(index)}${headerRow}`,
          values: [[name]],
        })),
      },
    });
  }

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: headerNames.map((headerName) => {
        const index = result.get(headerName);
        if (index === undefined) {
          throw new GoogleSheetsDataError(`Could not resolve column "${headerName}".`);
        }
        return {
          updateDimensionProperties: {
            range: {
              sheetId: properties.sheetId,
              dimension: "COLUMNS",
              startIndex: index,
              endIndex: index + 1,
            },
            properties: { hiddenByUser: true },
            fields: "hiddenByUser",
          },
        };
      }),
    },
  });

  return result;
}

export async function ensureSheetTab(
  spreadsheetId: string,
  sheetName: string,
  headers: string[],
): Promise<void> {
  const sheets = getGoogleSheetsClient();
  const metadata = await sheets.spreadsheets.get({
    spreadsheetId,
    fields: "sheets(properties(title,sheetId))",
  });
  const existing = metadata.data.sheets?.find(
    (sheet) => sheet.properties?.title === sheetName,
  );
  if (existing?.properties?.sheetId !== undefined) {
    const currentHeaders = await readSheetValues(spreadsheetId, `${quoteSheetName(sheetName)}!A1:Z1`);
    if (headers.some((header, index) => currentHeaders[0]?.[index] !== header)) {
      throw new GoogleSheetsDataError(
        `The "${sheetName}" tab exists but does not have the expected header row.`,
      );
    }
    return;
  }

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: [{
        addSheet: {
          properties: { title: sheetName, gridProperties: { rowCount: 1000, columnCount: headers.length } },
        },
      }],
    },
  });
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${quoteSheetName(sheetName)}!A1`,
    valueInputOption: "RAW",
    requestBody: { values: [headers] },
  });
}

export async function appendRecordIfMissing(
  spreadsheetId: string,
  sheetName: string,
  table: SheetTable,
  uuid: string,
  row: string[],
): Promise<void> {
  if (table.idColumn < 0) {
    throw new GoogleSheetsDataError(`The "${sheetName}" tab has no UUID column.`);
  }
  if (table.rows.some((existingRow) => existingRow[table.idColumn] === uuid)) {
    return;
  }

  await getGoogleSheetsClient().spreadsheets.values.append({
    spreadsheetId,
    range: `${quoteSheetName(sheetName)}!A:ZZ`,
    valueInputOption: "RAW",
    insertDataOption: "INSERT_ROWS",
    requestBody: { values: [row] },
  });
}

export function findHeaderIndex(headers: string[], aliases: string[]): number {
  const normalizedAliases = new Set(aliases.map(normalizeHeader));
  return headers.findIndex((header) => normalizedAliases.has(normalizeHeader(header)));
}

export function readCell(
  headers: string[],
  row: string[],
  aliases: string[],
): string {
  const index = findHeaderIndex(headers, aliases);
  return index < 0 ? "" : row[index] ?? "";
}
