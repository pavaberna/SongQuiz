import { OAuth2Client } from "google-auth-library";
import jwt from "jsonwebtoken";

import {
  AUTH_SESSION_DURATION_SECONDS,
  getAllowedGoogleEmails,
  isAdminGoogleEmail,
} from "../config/authConfig";
import type { AuthUser } from "../types/auth";

const googleClient = new OAuth2Client();
const SESSION_ISSUER = "songquiz-api";
const SESSION_AUDIENCE = "songquiz-web";

type AuthSessionPayload = {
  email: string;
  name: string | null;
  picture: string | null;
};

export class GoogleAccountNotAllowedError extends Error {
  constructor() {
    super("This Google account is not allowed to use Song Quiz.");
    this.name = "GoogleAccountNotAllowedError";
  }
}

export async function authenticateGoogleCredential(
  credential: string,
): Promise<AuthUser> {
  const googleClientId = getRequiredEnvironmentValue("GOOGLE_CLIENT_ID");
  const ticket = await googleClient.verifyIdToken({
    audience: googleClientId,
    idToken: credential,
  });
  const payload = ticket.getPayload();

  if (!payload?.sub || !payload.email || payload.email_verified !== true) {
    throw new Error("Google did not return a verified account.");
  }

  const email = payload.email.trim().toLowerCase();

  if (!getAllowedGoogleEmails().has(email)) {
    throw new GoogleAccountNotAllowedError();
  }

  return {
    email,
    googleSubject: payload.sub,
    isAdmin: isAdminGoogleEmail(email),
    name: payload.name ?? null,
    picture: payload.picture ?? null,
  };
}

export function createAuthSessionToken(user: AuthUser): string {
  const sessionSecret = getRequiredEnvironmentValue("AUTH_SESSION_SECRET");
  const payload: AuthSessionPayload = {
    email: user.email,
    name: user.name,
    picture: user.picture,
  };

  return jwt.sign(payload, sessionSecret, {
    algorithm: "HS256",
    audience: SESSION_AUDIENCE,
    expiresIn: AUTH_SESSION_DURATION_SECONDS,
    issuer: SESSION_ISSUER,
    subject: user.googleSubject,
  });
}

export function verifyAuthSessionToken(token: string): AuthUser {
  const sessionSecret = getRequiredEnvironmentValue("AUTH_SESSION_SECRET");
  const decoded = jwt.verify(token, sessionSecret, {
    algorithms: ["HS256"],
    audience: SESSION_AUDIENCE,
    issuer: SESSION_ISSUER,
  });

  if (
    typeof decoded === "string" ||
    typeof decoded.sub !== "string" ||
    typeof decoded.email !== "string"
  ) {
    throw new Error("The authentication session is invalid.");
  }

  const email = decoded.email.trim().toLowerCase();

  if (!getAllowedGoogleEmails().has(email)) {
    throw new GoogleAccountNotAllowedError();
  }

  return {
    email,
    googleSubject: decoded.sub,
    isAdmin: isAdminGoogleEmail(email),
    name: typeof decoded.name === "string" ? decoded.name : null,
    picture: typeof decoded.picture === "string" ? decoded.picture : null,
  };
}

function getRequiredEnvironmentValue(name: string): string {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`${name} is missing.`);
  }

  return value;
}
