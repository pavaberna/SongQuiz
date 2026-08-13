import { createRoot } from "react-dom/client";
import { GoogleOAuthProvider } from "@react-oauth/google";

import App from "./App.tsx";
import { AuthGate } from "./features/auth/AuthGate.tsx";
import { AuthProvider } from "./features/auth/AuthProvider.tsx";
import "./index.css";

const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

if (!googleClientId) {
  throw new Error("VITE_GOOGLE_CLIENT_ID is not configured.");
}

createRoot(document.getElementById("root")!).render(
  <GoogleOAuthProvider clientId={googleClientId}>
    <AuthProvider>
      <AuthGate>
        <App />
      </AuthGate>
    </AuthProvider>
  </GoogleOAuthProvider>,
);
