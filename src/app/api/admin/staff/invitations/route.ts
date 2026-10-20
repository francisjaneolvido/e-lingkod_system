import { prisma } from "@/lib/prisma";
import { requireApiViewer } from "@/lib/access";
import { CivicError } from "@/features/civic/validation";
import { apiFailure, assertSameOrigin, json, readJson } from "@/features/civic/server/http";
import { deliverStaffInvitation, hashInvitationToken, invitationDeliveryMode, invitationExpiry, invitationToken, invitationUrl, parseInvitationInput, invitationDatabaseFields } from "@/lib/staff-invitations";



type InviteAction = "INVITE" | "RESEND" | "REVOKE";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const actor = await requireApiViewer(request, true);
    const body = await readJson(request);
    if (!body || typeof body !== "object" || Array.isArray(body)) throw new CivicError("Invalid invitation action.", 400);
    const data = body as Record<string, unknown>;
    const action: InviteAction | null = data.action === "INVITE" || data.action === "RESEND" || data.action === "REVOKE" ? data.action : null;
    if (!action) throw new CivicError("Unknown invitation action.", 400);
    const mode = invitationDeliveryMode();
    if (action !== "REVOKE" && mode === "DISABLED") throw new CivicError("Configure RESEND_API_KEY + STAFF_INVITE_FROM to email staff, or enable STAFF_INVITE_DEMO_LINKS=true in local development.", 503);

    if (action === "REVOKE") {
      const id = typeof data.id === "string" ? data.id : "";
      const changed = await prisma.staffInvitation.updateMany({ where: { id, activatedAt: null, revokedAt: null }, data: { revokedAt: new Date() } });
      if (!changed.count) throw new CivicError("This invitation cannot be revoked. Refresh the list.", 409);
      return json({ success: true, message: "Invitation revoked. Its activation link is no longer valid." });
    }

    const token = invitationToken();
    const tokenHash = hashInvitationToken(token);
    const expiresAt = invitationExpiry();
    const url = invitationUrl(request, token);
    let invite: { name: string; email: string; department: string };

    if (action === "INVITE") {
      const input = parseInvitationInput(data);
      await prisma.$transaction(async tx => {
        const account = await tx.user.findUnique({ where: { email: input.email }, select: { id: true } });
        if (account) throw new CivicError("This email already has an account. Use 'Assign LGU staff' for registered citizens or edit an existing staff member.", 409);
        const old = await tx.staffInvitation.findUnique({ where: { email: input.email } });
        if (old && !old.revokedAt && !old.activatedAt && old.expiresAt > new Date()) throw new CivicError("An invitation is already pending for this email. Use 'Resend link' to replace the activation link.", 409);
        const changes = { ...invitationDatabaseFields(input), tokenHash, expiresAt, issuedById: actor.id, revokedAt: null, activatedAt: null };
        await tx.staffInvitation.upsert({ where: { email: input.email }, create: changes, update: changes });
      });
      invite = input;
    } else {
      const id = typeof data.id === "string" ? data.id : "";
      invite = await prisma.$transaction(async tx => {
        const row = await tx.staffInvitation.findUnique({ where: { id } });
        if (!row || row.activatedAt || row.revokedAt) throw new CivicError("Only pending invitations can be resent.", 409);
        if (await tx.user.findUnique({ where: { email: row.email }, select: { id: true } })) throw new CivicError("A user account already exists for this email; do not resend.", 409);
        await tx.staffInvitation.update({ where: { id }, data: { tokenHash, expiresAt, issuedById: actor.id } });
        return { name: row.name, email: row.email, department: row.department };
      });
    }

    if (mode === "EMAIL") {
      try { await deliverStaffInvitation({ ...invite, url }); }
      catch {
        // Invitation remains pending, but there is NO false claim of email delivery.
        return json({ success: false, error: "Invitation saved but email delivery failed. Check sender-domain / email-provider configuration, then use Resend link.", delivery: "FAILED" }, 502);
      }
      return json({ success: true, delivery: "EMAIL", message: `Invitation email sent to ${invite.email}. Expires in 48 hours.` });
    }
    // Development-only, explicit opt-in. Never return bearer activation tokens in production.
    return json({ success: true, delivery: "DEMO", activationUrl: url, message: "Development demo link generated. Copy it securely to the invited staff member. No email was sent." });
  } catch (error) { return apiFailure(error); }
}
