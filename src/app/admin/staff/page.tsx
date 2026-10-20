import type { Metadata } from "next";
import { BriefcaseBusiness, ShieldCheck, UsersRound, LockKeyhole } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireSuperAdminPage } from "@/lib/access";
import { StaffManager } from "@/components/admin/staff-manager";
import { StaffInviteManager } from "@/components/admin/staff-invite-manager";
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
  return <div className="space-y-5"><header className="flex flex-wrap items-start justify-between gap-4"><div><span className="elb-admin-eyebrow">PEOPLE & PERMISSIONS</span><h1 className="mt-2 text-[25px] font-extrabold tracking-tight text-[#16415e]">LGU staff management</h1><p className="mt-1 max-w-2xl text-[12px] leading-6 text-[#7591a4]">Invite new LGU personnel, activate accounts securely, or manage permissions for existing staff.</p></div><div className="flex gap-3"><div className="rounded-2xl border border-[#dce9ee] bg-white px-5 py-3"><UsersRound size={17} className="mb-1 text-[#2f88a7]"/><strong className="block text-xl font-extrabold text-[#144e72]">{staff.length}</strong><span className="text-[10px] text-[#8298a8]">Active staff listed</span></div><div className="rounded-2xl border border-[#dce9ee] bg-white px-5 py-3"><ShieldCheck size={17} className="mb-1 text-[#3c9b87]"/><strong className="block text-xl font-extrabold text-[#144e72]">6</strong><span className="text-[10px] text-[#8298a8]">Module permissions</span></div></div></header>
    <div className="flex items-start gap-3 rounded-xl border border-[#d7e6ec] bg-[#eff7fa] p-4 text-[#416478]"><LockKeyhole size={19} className="mt-0.5 shrink-0"/><p className="text-[12px] leading-6"><strong>How staff onboarding works:</strong> For new personnel, create a staff invitation below. They choose their own password through a one-time link before becoming active. If an account already exists as a citizen, you can assign access without changing its password.</p></div>
    <StaffInviteManager initialInvites={safeInvitations} deliveryMode={invitationDeliveryMode()}/>
    <StaffManager initialStaff={safeStaff}/>
    <section className="rounded-[18px] border border-[#e0e9ef] bg-white p-5 sm:p-6"><div className="flex items-center gap-3"><BriefcaseBusiness size={18} className="text-[#267d9f]"/><h2 className="font-extrabold text-[#1e4d6b]">Recent permission activity</h2></div>{log.length ? <ul className="mt-4 divide-y divide-[#eef1f5]">{log.map(record => <li key={record.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-xs"><span className="text-[#496b81]"><strong>{record.actor.name}</strong> {record.action === "REVOKE" ? "revoked access for" : record.action === "INVITE_ACTIVATED" ? "issued the invitation activated by" : "updated access for"} <strong>{record.target.name}</strong></span><time className="text-[#879bab]">{record.createdAt.toLocaleString("en-PH", { timeZone: "Asia/Manila", dateStyle: "medium", timeStyle: "short" })}</time></li>)}</ul> : <p className="mt-3 text-xs text-[#8398a6]">No staff role changes yet.</p>}</section>
  </div>;
}
