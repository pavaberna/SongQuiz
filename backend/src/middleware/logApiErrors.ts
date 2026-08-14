import type { NextFunction, Request, Response } from "express";

import { appendGameLogEntry } from "../services/gameLogStore";

function getErrorMessage(body: unknown, statusCode: number): string {
  if (
    typeof body === "object" &&
    body !== null &&
    "error" in body
  ) {
    const error = body.error;

    if (typeof error === "string") {
      return error;
    }

    if (
      typeof error === "object" &&
      error !== null &&
      "message" in error &&
      typeof error.message === "string"
    ) {
      return error.message;
    }
  }

  return `Request failed with status ${statusCode}.`;
}

export function logApiErrors(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const originalJson = res.json.bind(res);

  res.json = ((body: unknown) => {
    if (res.statusCode >= 400) {
      void appendGameLogEntry({
        createdAt: new Date().toISOString(),
        kind: "error",
        message: getErrorMessage(body, res.statusCode),
        method: req.method,
        path: req.originalUrl,
        source: "backend_api",
        statusCode: res.statusCode,
      }).catch((error: unknown) => {
        console.error("Failed to save an API error to the test log.", error);
      });
    }

    return originalJson(body);
  }) as Response["json"];

  next();
}
