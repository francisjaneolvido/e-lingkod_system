import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { CivicError } from "@/features/civic/validation";
import { STAFF_MODULES, isStaffModule, type StaffModule } from "@/lib/staff-modules";

export const STAFF_INVITE_HOURS = 48;
export const STAFF_INVITE_TOKEN_RE = /^[A-Za-z0-9_-]{43}$/;
export const STAFF_EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function invitationToken() { return randomBytes(32).toString("base64url"); }
export function hashInvitationToken(token: string) { return createHash("sha256").update(token).digest("hex"); }
export function invitationExpiry() { return new Date(Date.now() + STAFF_INVITE_HOURS * 60 * 60 * 1000); }
export function validStaffModules(value: unknown): StaffModule[] {
  if (!Array.isArray(value) || !value.length || value.length > STAFF_MODULES.length || value.some(m => typeof m !== "string" || !isStaffModule(m))) throw new CivicError("Select at least one valid LGU module.", 400);
  return [...new Set(value as StaffModule[])];
}
export function parseInvitationInput(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new CivicError("Invalid invitation request.", 400);
  const data = value as Record<string, unknown>;
  const name = typeof data.name === "string" ? data.name.trim().replace(/\s+/g, " ") : "";
  const email = typeof data.email === "string" ? data.email.trim().toLowerCase() : "";
  const department = typeof data.department === "string" ? data.department.trim().replace(/\s+/g, " ") : "";
  const designation = typeof data.designation === "string" ? data.designation.trim().replace(/\s+/g, " ") : "";
  if (!name || name.length > 191) throw new CivicError("Enter a staff name (up to 191 characters).", 400);
  if (!STAFF_EMAIL_RE.test(email) || email.length > 191) throw new CivicError("Enter a valid work email (up to 191 characters).", 400);
  if (!department || department.length > 120 || !designation || designation.length > 120) throw new CivicError("Department and job title are required (up to 120 characters each).", 400);
  return { name, email, department, designation, modules: validStaffModules(data.modules) };
}
/** Only Prisma model fields belong in create/update payloads.
 *  Never spread form input: `modules` is not a StaffInvitation column. */
export function invitationDatabaseFields(input: ReturnType<typeof parseInvitationInput>) {
  return {
    name: input.name,
    email: input.email,
    department: input.department,
    designation: input.designation,
    modulesJson: JSON.stringify(input.modules),
  };
}

export function validateStaffPassword(value: unknown): string {
  if (typeof value !== "string" || value.length < 12 || value.length > 128 || /[\u0000-\u001f\u007f]/.test(value)) throw new CivicError("Use a password of 12–128 characters without control characters.", 400);
  return value;
}
export function invitationUrl(request: Request, token: string): string {
  // Production must have a configured canonical domain to prevent Host header injection.
  const base = process.env.BETTER_AUTH_URL;
  if (process.env.NODE_ENV === "production" && !base) throw new CivicError("Set BETTER_AUTH_URL before sending invitations.", 503);
  const origin = new URL(base || request.url).origin;
  if (process.env.NODE_ENV === "production" && !origin.startsWith("https://")) throw new CivicError("Use an HTTPS BETTER_AUTH_URL for invitations.", 503);
  return `${origin}/staff/activate/${token}`;
}
function htmlEscape(value: string) {
  return value.replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

/** No fake delivery: when no provider is configured, only an explicitly enabled development mode returns the link. */
export function invitationDeliveryMode(): "EMAIL" | "DEMO" | "DISABLED" {
  if (process.env.RESEND_API_KEY && process.env.STAFF_INVITE_FROM) return "EMAIL";
  if (process.env.NODE_ENV !== "production" && process.env.STAFF_INVITE_DEMO_LINKS === "true") return "DEMO";
  return "DISABLED";
}

export async function deliverStaffInvitation(args: { email: string; name: string; url: string; department: string }) {
  if (invitationDeliveryMode() !== "EMAIL") return;
  const displayName = htmlEscape(args.name);
  const department = htmlEscape(args.department);
  const safeUrl = htmlEscape(args.url);
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: process.env.STAFF_INVITE_FROM,
      to: [args.email],
      subject: "Activate your eLingkod Bayan LGU staff account",
      html: `<div style="font-family:Arial,sans-serif;max-width:580px;margin:auto;color:#143d5b"><h2>Welcome to eLingkod Bayan</h2><p>Hello ${displayName},</p><p>You have been invited to join <strong>${department}</strong> as LGU personnel.</p><p><a href="${safeUrl}" style="background:#145a82;color:white;padding:12px 20px;text-decoration:none;border-radius:8px;display:inline-block">Activate my staff account</a></p><p>This one-time link expires after 48 hours. You will choose your own password. If you did not expect this invite, ignore this email.</p><p style="font-size:12px;color:#647b91">Do not share this link with anyone.</p></div>`,
    }),
    cache: "no-store",
    signal: AbortSignal.timeout(12000),
  });
  if (!response.ok) throw new Error(`Email provider rejected invitation (${response.status})`);
}
