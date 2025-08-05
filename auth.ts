import { authenticate } from "@google-cloud/local-auth";
import { Credentials } from "google-auth-library";
import fs from "fs";
import path from "path";

export interface ClientAuth {
  token: string;
  clientId: string;
  scopes: string[];
  expiresAt: number;
  subject: string;
}

const SCOPES = [
  "https://www.googleapis.com/auth/drive.readonly",
  "https://www.googleapis.com/auth/spreadsheets.readonly",
];

// Get credentials directory from environment variable or use default
// .. is because we're in the dist folder after compilation
const CREDS_DIR =
  process.env.GDRIVE_CREDS_DIR ||
  path.join(path.dirname(new URL(import.meta.url).pathname), "../.creds");

const CREDENTIALS_PATH = path.join(CREDS_DIR, ".gdrive-server-credentials.json");

function readCredentials(credentialsPath: string) {
  if (!fs.existsSync(credentialsPath)) {
    console.warn("No credentials file found at ", credentialsPath);
    return null;
  }

  console.log("Reading credentials from ", credentialsPath);

  const credentials = JSON.parse(fs.readFileSync(credentialsPath, "utf-8")) as Credentials;

  return {
    access_token: credentials.access_token,
    expiry_date: credentials.expiry_date,
    scope: credentials.scope,
    token_type: credentials.token_type,
  };
}

function writeCredentials(credentialsPath: string, credentials: Credentials) {
  // Ensure directory exists before saving
  fs.mkdirSync(path.dirname(credentialsPath), { recursive: true });

  console.log("Writing credentials to ", credentialsPath);
  fs.writeFileSync(credentialsPath, JSON.stringify(credentials, null, 2));
}

async function authenticateAndSaveCredentials(credentialsPath: string) {
  const keyfilePath = path.join(path.dirname(credentialsPath), "gcp-oauth.keys.json");
  console.log("Launching auth flow using keyfile at ", keyfilePath);

  const auth = await authenticate({
    keyfilePath,
    scopes: SCOPES,
  });

  writeCredentials(credentialsPath, auth.credentials);

  return auth.credentials;
}

// Try to load credentials without prompting for auth
// export async function loadCredentialsQuietly() {
//   const credentials = readCredentials();
//   if (!credentials) {
//     return null;
//   }

//   return credentials;

// try {

//   const savedCreds = JSON.parse(fs.readFileSync(credentialsPath, "utf-8"));
//   console.error("Loaded existing credentials with scopes:", savedCreds.scope);
//   oauth2Client.setCredentials(savedCreds);

//   const expiryDate = new Date(savedCreds.expiry_date);
//   const now = new Date();
//   const fiveMinutes = 5 * 60 * 1000;
//   const timeToExpiry = expiryDate.getTime() - now.getTime();

//   console.error("Token expiry status:", {
//     expiryDate: expiryDate.toISOString(),
//     timeToExpiryMinutes: Math.floor(timeToExpiry / (60 * 1000)),
//     hasRefreshToken: !!savedCreds.refresh_token,
//   });

//   if (timeToExpiry < fiveMinutes && savedCreds.refresh_token) {
//     console.error("Attempting to refresh token using refresh_token");
//     try {
//       const response = await oauth2Client.refreshAccessToken();
//       const newCreds = response.credentials;
//       ensureCredsDirectory();
//       fs.writeFileSync(credentialsPath, JSON.stringify(newCreds, null, 2));
//       oauth2Client.setCredentials(newCreds);
//       console.error("Token refreshed and saved successfully");
//     } catch (error) {
//       console.error("Failed to refresh token:", error);
//       return null;
//     }
//   }

//   return oauth2Client;
// } catch (error) {
//   console.error("Error loading credentials:", error);
//   return null;
// }
// }

// Get valid credentials, prompting for auth if necessary
export async function getValidCredentials() {
  const auth = readCredentials(CREDENTIALS_PATH);
  if (auth) {
    return auth;
  }

  return await authenticateAndSaveCredentials(CREDENTIALS_PATH);
}
