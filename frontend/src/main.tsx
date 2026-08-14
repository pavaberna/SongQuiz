import { createRoot } from "react-dom/client";
import { GoogleOAuthProvider } from "@react-oauth/google";

import App from "./App.tsx";
import { AuthGate } from "./features/auth/AuthGate.tsx";
import { AuthProvider } from "./features/auth/AuthProvider.tsx";
import {
  installGlobalErrorLogging,
  reportFrontendError,
} from "./services/frontendErrorLogger.ts";
import "./index.css";

installGlobalErrorLogging();

const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

if (!googleClientId) {
  throw new Error("VITE_GOOGLE_CLIENT_ID is not configured.");
}

createRoot(document.getElementById("root")!, {
  onCaughtError(error, errorInfo) {
    reportFrontendError(error, "react_caught_error", errorInfo.componentStack);
  },
  onRecoverableError(error, errorInfo) {
    reportFrontendError(
      error,
      "react_recoverable_error",
      errorInfo.componentStack,
    );
  },
  onUncaughtError(error, errorInfo) {
    reportFrontendError(
      error,
      "react_uncaught_error",
      errorInfo.componentStack,
    );
  },
}).render(
  <GoogleOAuthProvider clientId={googleClientId}>
    <AuthProvider>
      <AuthGate>
        <App />
      </AuthGate>
    </AuthProvider>
  </GoogleOAuthProvider>,
);
