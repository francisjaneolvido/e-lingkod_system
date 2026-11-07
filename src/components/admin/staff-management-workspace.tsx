"use client";
import "@/styles/admin-workflows.css";

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
  return <div className="elb-admin-workflow space-y-6">
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div><h1 className="mt-2 text-[27px] font-semibold tracking-tight text-foreground">LGU Staff Management</h1><p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">Recommended Admin → Staff workflow: select the office, grant the required modules, then assign incoming cases. Reassign open requests before revoking access.</p></div>
      <button type="button" onClick={() => setTab("invite")} className="elb-admin-primary min-h-11"><MailPlus size={17}/> Invite LGU staff <ArrowRight size={15}/></button>
    </div>
    <div className="elb-kpi-band elb-kpi-band-three">
      {[{ title: "Active staff", value: staff.length, icon: UsersRound }, { title: "Pending invitations", value: pending, icon: MailPlus }, { title: "LGU service modules", value: 6, icon: ShieldCheck }].map(item => <div key={item.title} className="py-2"><div className="flex items-center justify-between"><span className="text-sm font-semibold text-muted-foreground">{item.title}</span><item.icon size={19} className="text-foreground"/></div><strong className="mt-3 block text-[28px] font-semibold leading-none text-foreground">{item.value}</strong></div>)}
    </div>
    <div>
      <div role="tablist" aria-label="LGU staff management" className="elb-admin-staff-tabs">{TABS.map(item => <button key={item.id} type="button" id={`staff-tab-${item.id}`} role="tab" aria-selected={tab === item.id} aria-controls={`staff-panel-${item.id}`} tabIndex={tab===item.id?0:-1} onClick={() => setTab(item.id)} onKeyDown={event=>{const directions=["ArrowLeft","ArrowRight","Home","End"];if(!directions.includes(event.key))return;event.preventDefault();const index=TABS.findIndex(value=>value.id===tab),position=event.key==="Home"?0:event.key==="End"?TABS.length-1:(index+(event.key==="ArrowLeft"?-1:1)+TABS.length)%TABS.length,next=TABS[position].id;setTab(next);document.getElementById("staff-tab-"+next)?.focus();}} className={`flex min-h-11 items-center gap-3 rounded-xl px-4 py-3 text-left transition focus-visible:outline-2 focus-visible:outline-ring ${tab === item.id ? "bg-primary text-primary-foreground shadow-sm" : "text-foreground hover:bg-muted"}`}><item.Icon size={20} className="shrink-0"/><span><span className="block text-sm font-semibold">{item.label}</span></span></button>)}</div>
    </div>
    <div id="staff-tab-content" className="min-w-0">
      <div role="tabpanel" id="staff-panel-directory" aria-labelledby="staff-tab-directory" className={tab === "directory" ? "" : "hidden"}><StaffManager initialStaff={staff} view="directory"/></div>
      <div role="tabpanel" id="staff-panel-invite" aria-labelledby="staff-tab-invite" className={tab === "invite" ? "" : "hidden"}><StaffInviteManager initialInvites={invitations} deliveryMode={deliveryMode}/></div>
      <div role="tabpanel" id="staff-panel-assign" aria-labelledby="staff-tab-assign" className={tab === "assign" ? "" : "hidden"}><StaffManager initialStaff={staff} view="assign"/></div>
      <div role="tabpanel" id="staff-panel-activity" aria-labelledby="staff-tab-activity" className={tab === "activity" ? "" : "hidden"}><section className="elb-admin-detail-section"><h2 className="text-[18px] font-semibold text-foreground">Recent permission activity</h2><p className="mt-1 text-sm text-muted-foreground">Latest LGU staff access changes, recorded for accountability.</p>{activity.length ? <ul className="mt-5 divide-y divide-border">{activity.map(item => <li key={item.id} className="flex flex-wrap items-center justify-between gap-3 py-4"><div className="flex items-center gap-3"><span className="grid size-9 place-items-center rounded-xl bg-muted text-foreground"><Activity size={17}/></span><p className="text-sm leading-6 text-foreground"><strong>{item.actor}</strong> {item.action === "REVOKE" ? "revoked access for" : item.action === "INVITE_ACTIVATED" ? "activated invitation for" : "updated permissions for"} <strong>{item.target}</strong></p></div><time className="text-sm text-muted-foreground">{item.time}</time></li>)}</ul> : <p className="mt-6 rounded-xl bg-card p-6 text-sm text-muted-foreground">No permission changes recorded yet.</p>}</section></div>
    </div>
  </div>;
}
