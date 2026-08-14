import { saveGameError } from "./gameLogStore";

let isInstalled = false;
const reportedErrors = new WeakSet<object>();

export function reportFrontendError(
  error: unknown,
  source: string,
  componentStack?: string,
): void {
  if (typeof error === "object" && error !== null) {
    if (reportedErrors.has(error)) {
      return;
    }

    reportedErrors.add(error);
  }

  saveGameError(error, source, {
    ...(componentStack ? { componentStack } : {}),
  });
}

export function installGlobalErrorLogging(): void {
  if (isInstalled) {
    return;
  }

  isInstalled = true;

  window.addEventListener("error", (event) => {
    const error =
      event.error instanceof Error
        ? event.error
        : new Error(
            `${event.message} (${event.filename}:${event.lineno}:${event.colno})`,
          );

    reportFrontendError(error, "window_error");
  });

  window.addEventListener("unhandledrejection", (event) => {
    reportFrontendError(event.reason, "unhandled_promise_rejection");
  });
}
