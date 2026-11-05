import { google } from "googleapis";

export class GoogleOAuthConfigurationError extends Error {
  constructor(missingVariables: string[]) {
    super(`Missing Google OAuth configuration: ${missingVariables.join(", ")}`);
    this.name = "GoogleOAuthConfigurationError";
  }
}

export function createGoogleOAuthClient() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken) {
    throw new GoogleOAuthConfigurationError([
      ...(!clientId ? ["GOOGLE_CLIENT_ID"] : []),
      ...(!clientSecret ? ["GOOGLE_CLIENT_SECRET"] : []),
      ...(!refreshToken ? ["GOOGLE_REFRESH_TOKEN"] : []),
    ]);
  }

  const oauth2Client = new google.auth.OAuth2(
    clientId,
    clientSecret,
    "https://developers.google.com/oauthplayground",
  );
  oauth2Client.setCredentials({ refresh_token: refreshToken });
  return oauth2Client;
}
