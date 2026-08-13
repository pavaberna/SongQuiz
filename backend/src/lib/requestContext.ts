import { createHash } from "node:crypto";
import { AsyncLocalStorage } from "node:async_hooks";

import type { AuthUser } from "../types/auth";

type RequestContext = {
  userStorageKey: string;
};

const requestContext = new AsyncLocalStorage<RequestContext>();

export function runWithAuthenticatedUser<T>(
  user: AuthUser,
  operation: () => T,
): T {
  const userStorageKey = createHash("sha256")
    .update(user.googleSubject)
    .digest("hex");

  return requestContext.run({ userStorageKey }, operation);
}

export function getCurrentUserStorageKey(): string {
  const context = requestContext.getStore();

  if (!context) {
    throw new Error("Authenticated user context is missing.");
  }

  return context.userStorageKey;
}
