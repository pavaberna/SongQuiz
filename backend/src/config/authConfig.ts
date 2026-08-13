import type { CookieOptions } from "express";

export const AUTH_COOKIE_NAME = "songquiz_session";
export const AUTH_SESSION_DURATION_SECONDS = 12 * 60 * 60;

export function getAllowedGoogleEmails(): Set<string> {
  const rawEmails = process.env.ALLOWED_GOOGLE_EMAILS;

  if (!rawEmails) {
    throw new Error("ALLOWED_GOOGLE_EMAILS is missing.");
  }

  const emails = rawEmails
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);

  if (emails.length === 0) {
    throw new Error("ALLOWED_GOOGLE_EMAILS must contain at least one email.");
  }

  return new Set(emails);
}

export function getAuthCookieOptions(): CookieOptions {
  return {
    httpOnly: true,
    maxAge: AUTH_SESSION_DURATION_SECONDS * 1000,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  };
}
