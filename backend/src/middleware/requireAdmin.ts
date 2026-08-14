import type { NextFunction, Request, Response } from "express";

import type { AuthUser } from "../types/auth";

export function requireAdmin(
  _req: Request,
  res: Response,
  next: NextFunction,
): void {
  const user = res.locals.authUser as AuthUser | undefined;

  if (!user?.isAdmin) {
    res.status(403).json({ error: "Administrator access is required." });
    return;
  }

  next();
}
