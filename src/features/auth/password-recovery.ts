import { passwordChecks } from "./registration-validation";

export const PASSWORD_RESET_PUBLIC_MESSAGE = "If that address has an account, a password reset email will arrive shortly. Check your spam folder. You can request another link if needed.";

export function isValidResetPassword(value: unknown): value is string {
  return typeof value === "string" && Object.values(passwordChecks(value)).every(Boolean);
}

/** Server configuration is a single exact origin, never a client-provided redirect. */
export function resetDestination(baseURL: string): string {
  const origin = new URL(baseURL);
  const loopback = ["localhost", "127.0.0.1", "[::1]"].includes(origin.hostname);
  if (origin.username || origin.password || origin.pathname !== "/" || origin.search || origin.hash || (origin.protocol !== "https:" && !(origin.protocol === "http:" && loopback))) {
    throw new Error("BETTER_AUTH_URL must be an HTTPS origin (HTTP loopback is supported locally).");
  }
  return `${origin.origin}/reset-password`;
}

export function passwordResetLink(baseURL: string, token: string): string {
  if (!/^[A-Za-z0-9_-]{20,256}$/.test(token)) throw new Error("Invalid password reset token format.");
  // Fragments are not sent in HTTP requests, access logs, or Referer headers.
  return `${resetDestination(baseURL)}#token=${encodeURIComponent(token)}`;
}
