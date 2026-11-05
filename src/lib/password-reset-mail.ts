import "server-only";
import { mkdir, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import path from "node:path";
import { passwordResetLink } from "@/features/auth/password-recovery";

type ResetMessage = { email: string; token: string; origin: string };

function capturedMailDirectory(): string | null {
  const configured = process.env.PASSWORD_RESET_CAPTURE_DIR;
  if (!configured) return null;
  const database = new URL(process.env.DATABASE_URL || "mysql://invalid/invalid");
  const directory = path.resolve(configured);
  const root = path.resolve(".scratch/site-release");
  if (process.env.NODE_ENV === "production" || process.env.ELB_SITE_RELEASE_TEST_DATABASE !== "true"
    || database.protocol !== "mysql:" || !["localhost", "127.0.0.1", "[::1]"].includes(database.hostname)
    || !/^elb_site_release_test_[a-z0-9_]+$/.test(database.pathname.slice(1))
    || !directory.startsWith(root + path.sep)) {
    throw new Error("Captured password-reset mail requires a guarded local disposable test database and private site-release directory.");
  }
  return directory;
}

/** Reuses the installed application's Resend HTTP transport; no client credential or development link. */
export async function deliverPasswordReset({ email, token, origin }: ResetMessage): Promise<void> {
  const url = passwordResetLink(origin, token);
  const text = `Reset your eLingkod Bayan password using this one-time link:\n\n${url}\n\nThis link expires in 30 minutes. If you did not request it, ignore this email. Password recovery does not change your account's role or ID review status.`;
  const capture = capturedMailDirectory();
  if (capture) {
    await mkdir(capture, { recursive: true, mode: 0o700 });
    await writeFile(path.join(capture, `${randomUUID()}.json`), JSON.stringify({ to: email, subject: "Reset your eLingkod Bayan password", text, url }), { flag: "wx", mode: 0o600 });
    return;
  }
  const from = process.env.PASSWORD_RESET_FROM || process.env.STAFF_INVITE_FROM;
  if (!process.env.RESEND_API_KEY || !from) throw new Error("Password reset sender is not configured.");
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to: [email], subject: "Reset your eLingkod Bayan password", text }),
    cache: "no-store",
    signal: AbortSignal.timeout(12000),
  });
  if (!response.ok) throw new Error("Password reset email delivery failed.");
}
