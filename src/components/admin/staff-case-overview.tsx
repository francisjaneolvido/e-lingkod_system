import "server-only";
import Link from "next/link";
import { ArrowUpRight, ClipboardCheck, Inbox, Siren } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { reportAdminScope } from "@/lib/report-scope";
import type { CivicViewer } from "@/features/civic/types";
import { hasModuleAccess } from "@/lib/staff-access";

export async function StaffCaseOverview({ viewer }: { viewer: CivicViewer }) {
  if (!viewer.department || !(await hasModuleAccess(viewer, "REPORTS"))) return null;
  const scope = reportAdminScope(viewer);
  const [mine, unclaimed, urgent] = await Promise.all([
    prisma.civicReport.count({ where: { assignedOffice: viewer.department, assignedStaffId: viewer.id, status: { notIn: ["RESOLVED", "REJECTED"] } } }),
    prisma.civicReport.count({ where: { ...scope, assignedStaffId: null, status: { notIn: ["RESOLVED", "REJECTED"] } } }),
    prisma.civicReport.count({ where: { ...scope, priority: "URGENT", status: { notIn: ["RESOLVED", "REJECTED"] } } }),
  ]);
  const metrics = [
    { label: "My active cases", count: mine, icon: ClipboardCheck, color: "text-foreground", background: "bg-muted" },
    { label: "Office cases to claim", count: unclaimed, icon: Inbox, color: "text-warning-foreground", background: "bg-muted" },
    { label: "Urgent in my queue", count: urgent, icon: Siren, color: "text-destructive", background: "bg-card" },
  ];
  return <section aria-label="My civic cases"><div className="flex flex-wrap items-end justify-between gap-3"><div><span className="elb-admin-eyebrow">CIVIC REPORTS WORKLOAD</span><h2 className="mt-2 text-[18px] font-extrabold text-foreground">Your action desk</h2><p className="mt-1 text-[12px] text-muted-foreground">Live cases routed to {viewer.department}.</p></div><Link href="/admin/reports" className="inline-flex items-center gap-2 text-xs font-bold text-foreground">Go to case queue <ArrowUpRight size={15}/></Link></div><div className="mt-4 grid gap-3 sm:grid-cols-3">{metrics.map(m => <Link key={m.label} href="/admin/reports" className="group flex justify-between gap-3 rounded-2xl border border-border bg-card p-5 hover:border-border"><div><span className="text-xs font-semibold text-muted-foreground">{m.label}</span><strong className="mt-2 block text-[27px] font-extrabold text-foreground">{m.count}</strong></div><span className={`grid size-10 place-items-center rounded-xl ${m.background} ${m.color}`}><m.icon size={20}/></span></Link>)}</div></section>;
}
