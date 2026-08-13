import type { NextFunction, Request, Response } from "express";

import { AUTH_COOKIE_NAME } from "../config/authConfig";
import { verifyAuthSessionToken } from "../services/authService";

export function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const sessionToken = req.cookies?.[AUTH_COOKIE_NAME];

  if (typeof sessionToken !== "string") {
    res.status(401).json({ error: "Authentication is required." });
    return;
  }

  try {
    res.locals.authUser = verifyAuthSessionToken(sessionToken);
    next();
  } catch {
    res.clearCookie(AUTH_COOKIE_NAME, { path: "/" });
    res.status(401).json({ error: "The authentication session is invalid." });
  }
}
