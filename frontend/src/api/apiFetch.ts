export const AUTHENTICATION_EXPIRED_EVENT = "songquiz:authentication-expired";

export async function apiFetch(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  const response = await fetch(input, {
    ...init,
    credentials: "include",
  });

  if (response.status === 401) {
    window.dispatchEvent(new Event(AUTHENTICATION_EXPIRED_EVENT));
  }

  return response;
}
