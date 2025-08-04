import { google } from "googleapis";
import { getValidCredentials } from "./auth.js";
import { ToolAuth } from "./tools/types.js";

export async function buildDrive(authInfo: ToolAuth) {
  // TODO actually use authInfo
  const auth = await getValidCredentials();
  return google.drive({ version: "v3", auth });
}

export async function buildSheets(authInfo: ToolAuth) {
  // TODO actually use authInfo
  const auth = await getValidCredentials();
  return google.sheets({ version: "v4", auth });
}
