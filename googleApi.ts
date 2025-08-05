import { google } from "googleapis";
import { Credentials } from "google-auth-library";
import { getValidCredentials, ClientAuth } from "./auth.js";

function buildApiAuth(credentials: Credentials) {
  const auth = new google.auth.OAuth2();
  auth.setCredentials(credentials);
  return auth;
}

async function getApiAuth(authInfo: ClientAuth) {
  // TODO actually use authInfo
  const credentials = await getValidCredentials();
  return buildApiAuth(credentials);
}

export async function buildDrive(authInfo: ClientAuth) {
  const auth = await getApiAuth(authInfo);
  return google.drive({ version: "v3", auth });
}

export async function buildSheets(authInfo: ClientAuth) {
  const auth = await getApiAuth(authInfo);
  return google.sheets({ version: "v4", auth });
}
