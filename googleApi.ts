import { google } from "googleapis";
import { getValidCredentials } from "./auth.js";
import { AuthInfo } from "@modelcontextprotocol/sdk/server/auth/types.js";

export async function buildDrive(authInfo: AuthInfo | undefined) {
  if (!authInfo) {
    throw new Error("No auth info provided (this should be handled by the auth middleware");
  }

  // TODO actually use authInfo
  const auth = await getValidCredentials();
  return google.drive({ version: "v3", auth });
}

export async function buildSheets(authInfo: AuthInfo | undefined) {
  if (!authInfo) {
    throw new Error("No auth info provided (this should be handled by the auth middleware");
  }

  // TODO actually use authInfo
  const auth = await getValidCredentials();
  return google.sheets({ version: "v4", auth });
}
