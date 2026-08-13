import type { NextFunction, Request, Response } from "express";

import { AUTH_COOKIE_NAME } from "../config/authConfig";
import { runWithAuthenticatedUser } from "../lib/requestContext";
import { verifyAuthSessionToken } from "../services/authService";
import type { AuthUser } from "../types/auth";

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

  let user: AuthUser;

  try {
    user = verifyAuthSessionToken(sessionToken);
  } catch {
    res.clearCookie(AUTH_COOKIE_NAME, { path: "/" });
    res.status(401).json({ error: "The authentication session is invalid." });
    return;
  }

  res.locals.authUser = user;
  runWithAuthenticatedUser(user, next);
}

export function restoreAuthenticatedUserContext(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const user = res.locals.authUser as AuthUser | undefined;

  if (!user) {
    res.status(401).json({ error: "Authentication is required." });
    return;
  }

  runWithAuthenticatedUser(user, next);
}
