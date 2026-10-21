import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { requireSuperAdminPage } from "@/lib/access";
import { StaffManagementWorkspace } from "@/components/admin/staff-management-workspace";
import { invitationDeliveryMode } from "@/lib/staff-invitations";
import { STAFF_MODULES, type StaffModule } from "@/lib/staff-access";

export const instant = false;
export const metadata: Metadata = { title: "LGU Staff Management | eLingkod Bayan" };

export default async function StaffManagementPage() {
  await requireSuperAdminPage("/admin/staff");
  const [staff, log, invitations] = await Promise.all([
    prisma.user.findMany({ where: { role: "STAFF" }, select: { id: true, name: true, email: true, department: true, designation: true, staffPermissions: { select: { module: true } }, createdAt: true }, orderBy: { name: "asc" }, take: 200 }),
    prisma.staffAccessAudit.findMany({ take: 8, orderBy: { createdAt: "desc" }, select: { id: true, action: true, createdAt: true, actor: { select: { name: true } }, target: { select: { name: true } } } }),
    prisma.staffInvitation.findMany({ take: 100, orderBy: { createdAt: "desc" }, select: { id: true, name: true, email: true, department: true, designation: true, modulesJson: true, expiresAt: true, createdAt: true, activatedAt: true, revokedAt: true } }),
  ]);
  const safeStaff = staff.map(user => ({ ...user, createdAt: user.createdAt.toISOString(), modules: user.staffPermissions.flatMap(row => STAFF_MODULES.includes(row.module as StaffModule) ? [row.module as StaffModule] : []) }));
  const now = new Date();
  const safeInvitations = invitations.map(invitation => ({
    id: invitation.id, name: invitation.name, email: invitation.email,
    department: invitation.department, designation: invitation.designation,
    modules: (JSON.parse(invitation.modulesJson) as string[]).flatMap(m => STAFF_MODULES.includes(m as StaffModule) ? [m as StaffModule] : []),
    expiresAt: invitation.expiresAt.toISOString(), createdAt: invitation.createdAt.toISOString(),
    status: invitation.activatedAt ? "ACTIVATED" as const : invitation.revokedAt ? "REVOKED" as const : invitation.expiresAt <= now ? "EXPIRED" as const : "PENDING" as const,
  }));
  const activity = log.map(record => ({ id: record.id, actor: record.actor.name, target: record.target.name, action: record.action, time: record.createdAt.toLocaleString("en-PH", { timeZone: "Asia/Manila", dateStyle: "medium", timeStyle: "short" }) }));
  return <StaffManagementWorkspace staff={safeStaff} invitations={safeInvitations} activity={activity} deliveryMode={invitationDeliveryMode()}/>;
}
