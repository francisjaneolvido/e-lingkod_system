import { randomUUID } from "node:crypto";
import { hashPassword } from "better-auth/crypto";
import { prisma } from "@/lib/prisma";
import { CivicError } from "@/features/civic/validation";
import { apiFailure, assertSameOrigin, json, readJson } from "@/features/civic/server/http";
import { hashInvitationToken, STAFF_INVITE_TOKEN_RE, validateStaffPassword, validStaffModules } from "@/lib/staff-invitations";



export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const body = await readJson(request);
    if (!body || typeof body !== "object" || Array.isArray(body)) throw new CivicError("Invalid activation form.", 400);
    const data = body as Record<string, unknown>;
    const token = typeof data.token === "string" ? data.token : "";
    if (!STAFF_INVITE_TOKEN_RE.test(token)) throw new CivicError("Invalid or expired activation link.", 400);
    const password = validateStaffPassword(data.password);
    if (password !== data.confirmPassword) throw new CivicError("Passwords do not match.", 400);
    const digest = hashInvitationToken(token);
    const invite = await prisma.staffInvitation.findUnique({ where: { tokenHash: digest } });
    if (!invite || invite.activatedAt || invite.revokedAt || invite.expiresAt <= new Date()) throw new CivicError("This activation link is expired or has already been used. Ask your Super Admin to resend an invitation.", 410);
    const modules = validStaffModules(JSON.parse(invite.modulesJson) as unknown);
    const hashedPassword = await hashPassword(password);

    await prisma.$transaction(async tx => {
      // Claims token atomically, preventing duplicate redemptions during concurrent requests.
      const claimed = await tx.staffInvitation.updateMany({
        where: { id: invite.id, tokenHash: digest, activatedAt: null, revokedAt: null, expiresAt: { gt: new Date() } },
        data: { activatedAt: new Date() },
      });
      if (claimed.count !== 1) throw new CivicError("This activation link has already been used or expired.", 410);
      const issuer = await tx.user.findUnique({ where: { id: invite.issuedById }, select: { role: true } });
      if (issuer?.role !== "ADMIN") throw new CivicError("The invitation issuer no longer has administrator access. Ask an active Super Admin to resend the invitation.", 403);
      if (await tx.user.findUnique({ where: { email: invite.email }, select: { id: true } })) throw new CivicError("An account already exists for this email. Contact your LGU administrator.", 409);
      const userId = randomUUID();
      await tx.user.create({ data: {
        id: userId, name: invite.name, email: invite.email,
        role: "STAFF", department: invite.department, designation: invite.designation,
        // Proof of email possession depends on actual email delivery. Keep false in demo mode.
        emailVerified: false,
      } });
      await tx.account.create({ data: {
        id: randomUUID(), accountId: userId, providerId: "credential", userId,
        password: hashedPassword,
      } });
      await tx.staffPermission.createMany({ data: modules.map(module => ({ userId, module })) });
      await tx.staffAccessAudit.create({ data: {
        actorId: invite.issuedById, targetUserId: userId, action: "INVITE_ACTIVATED",
        details: JSON.stringify({ department: invite.department, designation: invite.designation, modules }),
      } });
    });
    return json({ success: true, message: "Your staff account is active. Sign in using your email and new password." });
  } catch (error) { return apiFailure(error); }
}
