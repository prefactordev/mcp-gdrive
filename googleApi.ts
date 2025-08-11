import { google } from "googleapis";
import { Credentials } from "google-auth-library";
import { ClientAuth } from "./tools/types.js";
import { exchangeToken } from "./authMiddleware.js";

async function fetchApiAuth(authInfo: ClientAuth): Promise<Credentials> {
  const response = await exchangeToken(authInfo.token, "oidc_google");

  return {
    access_token: response.access_token,
    scope: response.scope,
    token_type: response.token_type,
    expiry_date: Date.now() + response.expires_in * 1000
  };
}

function buildApiAuth(credentials: Credentials) {
  const auth = new google.auth.OAuth2();
  auth.setCredentials(credentials);
  return auth;
}

async function getApiAuth(authInfo: ClientAuth) {
  // TODO actually use authInfo
  const credentials = await fetchApiAuth(authInfo);
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
