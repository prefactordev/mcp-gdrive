import { GSheetsUpdateCellInput, InternalToolResponse } from "./types.js";
import { buildSheets } from "../googleApi.js";
import { ClientAuth } from "../auth.js";

export const schema = {
  name: "gsheets_update_cell",
  description: "Update a cell value in a Google Spreadsheet",
  inputSchema: {
    type: "object",
    properties: {
      fileId: {
        type: "string",
        description: "ID of the spreadsheet",
      },
      range: {
        type: "string",
        description: "Cell range in A1 notation (e.g. 'Sheet1!A1')",
      },
      value: {
        type: "string",
        description: "New cell value",
      },
    },
    required: ["fileId", "range", "value"],
  },
} as const;

export async function updateCell(
  authInfo: ClientAuth,
  args: GSheetsUpdateCellInput,
): Promise<InternalToolResponse> {
  const { fileId, range, value } = args;
  const sheets = await buildSheets(authInfo);

  await sheets.spreadsheets.values.update({
    spreadsheetId: fileId,
    range: range,
    valueInputOption: "RAW",
    requestBody: {
      values: [[value]],
    },
  });

  return {
    content: [
      {
        type: "text",
        text: `Updated cell ${range} to value: ${value}`,
      },
    ],
    isError: false,
  };
}

