"use client";

import { useState } from "react";
import { Activity, MailPlus, UserRoundPlus, UsersRound, ShieldCheck, ArrowRight } from "lucide-react";
import { StaffInviteManager } from "@/components/admin/staff-invite-manager";
import { StaffManager, type Staff } from "@/components/admin/staff-manager";
import type { StaffModule } from "@/lib/staff-modules";

type Invite = { id: string; name: string; email: string; department: string; designation: string; modules: StaffModule[]; expiresAt: string; createdAt: string; status: "PENDING" | "EXPIRED" | "REVOKED" | "ACTIVATED" };
type ActivityEntry = { id: string; actor: string; target: string; action: string; time: string };
type Tab = "directory" | "invite" | "assign" | "activity";

const TABS: { id: Tab; label: string; help: string; Icon: typeof UsersRound }[] = [
  { id: "directory", label: "Staff directory", help: "View & manage access", Icon: UsersRound },
  { id: "invite", label: "Invite new staff", help: "Activation link & invitations", Icon: MailPlus },
  { id: "assign", label: "Assign existing", help: "Grant access to an account", Icon: UserRoundPlus },
  { id: "activity", label: "Activity history", help: "Permission changes", Icon: Activity },
];

export function StaffManagementWorkspace({ staff, invitations, activity, deliveryMode }: { staff: Staff[]; invitations: Invite[]; activity: ActivityEntry[]; deliveryMode: "EMAIL" | "DEMO" | "DISABLED" }) {
  const [tab, setTab] = useState<Tab>("directory");
  const pending = invitations.filter(i => i.status === "PENDING").length;
  return <div className="space-y-6">
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div><span className="elb-admin-eyebrow">PEOPLE & PERMISSIONS</span><h1 className="mt-2 text-[27px] font-extrabold tracking-tight text-[#18435f]">LGU Staff Management</h1><p className="mt-1 max-w-2xl text-[13px] leading-6 text-[#67869a]">Manage personnel, onboarding, and access to LGU service modules.</p></div>
      <button type="button" onClick={() => setTab("invite")} className="elb-admin-primary min-h-11"><MailPlus size={17}/> Invite LGU staff <ArrowRight size={15}/></button>
    </div>
    <div className="grid gap-3 sm:grid-cols-3">
      {[{ title: "Active staff", value: staff.length, icon: UsersRound }, { title: "Pending invitations", value: pending, icon: MailPlus }, { title: "LGU service modules", value: 6, icon: ShieldCheck }].map(item => <div key={item.title} className="rounded-2xl border border-[#dbe7ef] bg-white px-5 py-4"><div className="flex items-center justify-between"><span className="text-[12px] font-semibold text-[#657f91]">{item.title}</span><item.icon size={19} className="text-[#2b819d]"/></div><strong className="mt-3 block text-[28px] font-extrabold leading-none text-[#164968]">{item.value}</strong></div>)}
    </div>
    <div className="rounded-2xl border border-[#dbe8ef] bg-white p-2">
      <div role="tablist" aria-label="LGU staff management" className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">{TABS.map(item => <button key={item.id} type="button" id={`staff-tab-${item.id}`} role="tab" aria-selected={tab === item.id} aria-controls={`staff-panel-${item.id}`} onClick={() => setTab(item.id)} className={`flex min-h-[72px] items-center gap-3 rounded-xl px-4 py-3 text-left transition focus-visible:outline-2 focus-visible:outline-[#217a9e] ${tab === item.id ? "bg-[#15577c] text-white shadow-sm" : "text-[#315a73] hover:bg-[#f0f7fa]"}`}><item.Icon size={20} className="shrink-0"/><span><span className="block text-[13px] font-extrabold">{item.label}</span><span className={`mt-1 block text-[11px] leading-4 ${tab === item.id ? "text-[#d1e6f0]" : "text-[#7d95a6]"}`}>{item.help}</span></span></button>)}</div>
    </div>
    <div id="staff-tab-content" className="min-w-0">
      <div role="tabpanel" id="staff-panel-" aria-labelledby="staff-tab-directory" className={tab === "directory" ? "" : "hidden"}><StaffManager initialStaff={staff} view="directory"/></div>
      <div role="tabpanel" id="staff-panel-" aria-labelledby="staff-tab-invite" className={tab === "invite" ? "" : "hidden"}><StaffInviteManager initialInvites={invitations} deliveryMode={deliveryMode}/></div>
      <div role="tabpanel" id="staff-panel-" aria-labelledby="staff-tab-assign" className={tab === "assign" ? "" : "hidden"}><StaffManager initialStaff={staff} view="assign"/></div>
      <div role="tabpanel" id="staff-panel-" aria-labelledby="staff-tab-activity" className={tab === "activity" ? "" : "hidden"}><section className="rounded-2xl border border-[#dbe8ef] bg-white p-5 sm:p-7"><h2 className="text-[18px] font-extrabold text-[#214b68]">Recent permission activity</h2><p className="mt-1 text-[13px] text-[#67869a]">Latest LGU staff access changes, recorded for accountability.</p>{activity.length ? <ul className="mt-5 divide-y divide-[#e9eff3]">{activity.map(item => <li key={item.id} className="flex flex-wrap items-center justify-between gap-3 py-4"><div className="flex items-center gap-3"><span className="grid size-9 place-items-center rounded-xl bg-[#edf6f9] text-[#28728c]"><Activity size={17}/></span><p className="text-[13px] leading-6 text-[#46677d]"><strong>{item.actor}</strong> {item.action === "REVOKE" ? "revoked access for" : item.action === "INVITE_ACTIVATED" ? "activated invitation for" : "updated permissions for"} <strong>{item.target}</strong></p></div><time className="text-[12px] text-[#7893a4]">{item.time}</time></li>)}</ul> : <p className="mt-6 rounded-xl bg-[#f5f9fb] p-6 text-[13px] text-[#6c879a]">No permission changes recorded yet.</p>}</section></div>
    </div>
  </div>;
}
