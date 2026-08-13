import type { ApiErrorResponse } from "../types/api";
import type { AuthResponse, AuthUser } from "../types/auth";
import { API_BASE_URL } from "./apiConfig";
import { apiFetch } from "./apiFetch";

export async function getAuthenticatedUser(): Promise<AuthUser | null> {
  const url = new URL("/api/auth/me", API_BASE_URL);
  const response = await apiFetch(url);

  if (response.status === 401) {
    return null;
  }

  if (!response.ok) {
    throw new Error("The authentication status could not be checked.");
  }

  const data = (await response.json()) as AuthResponse;
  return data.user;
}

export async function loginWithGoogle(
  credential: string,
): Promise<AuthUser> {
  const url = new URL("/api/auth/google", API_BASE_URL);
  const response = await apiFetch(url, {
    body: JSON.stringify({ credential }),
    headers: { "Content-Type": "application/json" },
    method: "POST",
  });

  if (!response.ok) {
    const errorData = (await response
      .json()
      .catch(() => null)) as ApiErrorResponse | null;

    throw new Error(errorData?.error ?? "Google authentication failed.");
  }

  const data = (await response.json()) as AuthResponse;
  return data.user;
}

export async function logout(): Promise<void> {
  const url = new URL("/api/auth/logout", API_BASE_URL);
  const response = await apiFetch(url, { method: "POST" });

  if (!response.ok) {
    throw new Error("Logout failed.");
  }
}
