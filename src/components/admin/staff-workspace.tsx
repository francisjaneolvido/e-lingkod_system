import "server-only";
import Link from "next/link";
import { ArrowRight, ArrowUpRight, BellRing, BriefcaseBusiness, Building2, CheckCircle2, ClipboardList, Clock3, Inbox, MapPinned, ShieldCheck, Siren, UsersRound } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { reportAdminScope } from "@/lib/report-scope";
import { formatReportDate, STATUS_META } from "@/features/civic/config";
import { STAFF_MODULE_LABELS, type StaffModule } from "@/lib/staff-modules";
import type { CivicViewer } from "@/features/civic/types";

const destinations: Record<StaffModule, { href: string; description: string; icon: typeof ClipboardList; live: boolean }> = {
  REPORTS: { href: "/admin/reports", description: "Review, claim and resolve routed cases", icon: ClipboardList, live: true },
  SERVICES: { href: "/admin/services", description: "Permits and clearances · planned", icon: Building2, live: false },
  EMERGENCY: { href: "/admin/emergency", description: "Emergency desk · planned", icon: BellRing, live: false },
  PROJECTS: { href: "/admin/projects", description: "Municipal projects · planned", icon: MapPinned, live: false },
  JOBS: { href: "/admin/jobs", description: "SPES and job matching · planned", icon: BriefcaseBusiness, live: false },
  CENSUS: { href: "/admin/census", description: "Worker profiling · planned", icon: UsersRound, live: false },
};

const priorityColors: Record<string, string> = {
  URGENT: "bg-[#fde9ea] text-[#ad3d4a]", HIGH: "bg-[#fff2dc] text-[#a57119]",
  NORMAL: "bg-[#e7f3fa] text-[#286f93]", LOW: "bg-[#eef2f5] text-[#667f91]",
};

export async function StaffWorkspace({ viewer, modules }: { viewer: CivicViewer; modules: StaffModule[] }) {
  const canManageCases = modules.includes("REPORTS") && !!viewer.department?.trim();
  const office = viewer.department?.trim() || "Your department";
  const scope = reportAdminScope(viewer);
  const active = { status: { notIn: ["RESOLVED", "REJECTED"] as ("RESOLVED" | "REJECTED")[] } };
  const [mineCount, unclaimedCount, urgentCount, completedCount, myCases, unclaimedCases] = canManageCases
    ? await Promise.all([
      prisma.civicReport.count({ where: { ...scope, ...active, assignedStaffId: viewer.id } }),
      prisma.civicReport.count({ where: { ...scope, ...active, assignedStaffId: null } }),
      prisma.civicReport.count({ where: { ...scope, ...active, priority: "URGENT" } }),
      prisma.civicReport.count({ where: { ...scope, status: "RESOLVED", assignedStaffId: viewer.id } }),
      prisma.civicReport.findMany({ where: { ...scope, ...active, assignedStaffId: viewer.id }, orderBy: [{ priority: "desc" }, { updatedAt: "desc" }], take: 5,
        select: { id: true, title: true, trackingId: true, priority: true, status: true, barangay: true, updatedAt: true } }),
      prisma.civicReport.findMany({ where: { ...scope, ...active, assignedStaffId: null }, orderBy: [{ priority: "desc" }, { createdAt: "asc" }], take: 5,
        select: { id: true, title: true, trackingId: true, priority: true, status: true, barangay: true, updatedAt: true } }),
    ])
    : [0, 0, 0, 0, [], []] as const;
  const metrics = [
    { title: "My active cases", value: mineCount, detail: "Cases assigned to you", icon: ClipboardList, tone: "bg-[#e7f3fa] text-[#246e94]" },
    { title: "Office queue", value: unclaimedCount, detail: "Unclaimed cases in your office", icon: Inbox, tone: "bg-[#fff1dd] text-[#a97b24]" },
    { title: "Urgent concerns", value: urgentCount, detail: "Urgent in your accessible queue", icon: Siren, tone: "bg-[#fce9ed] text-[#af4b5d]" },
    { title: "Cases resolved", value: completedCount, detail: "Resolved cases assigned to you", icon: CheckCircle2, tone: "bg-[#e5f7ef] text-[#25866b]" },
  ];
  return <div className="space-y-7 lg:space-y-8">
    <header className="relative overflow-hidden rounded-[20px] border border-[#cddfe9] bg-[linear-gradient(115deg,#eaf5fa_0%,#f8fbff_68%,#fffaf0_100%)] px-6 py-7 sm:px-8 sm:py-9">
      <div aria-hidden="true" className="pointer-events-none absolute -right-16 -top-24 size-72 rounded-full border-[38px] border-[#d7ebf3]/60" />
      <div className="relative flex flex-wrap items-center justify-between gap-4"><div className="max-w-2xl"><p className="elb-admin-eyebrow">LGU OPERATIONS / MY WORKSPACE</p>
        <h1 className="mt-3 text-[27px] font-extrabold tracking-tight text-[#143f60] sm:text-[33px]">Good to see you, {viewer.name}.</h1>
        <p className="mt-3 max-w-xl text-[13px] leading-7 text-[#567a8e]">Manage the concerns entrusted to {office}. Your workspace uses the same eLingkod Bayan tools, with access limited to your assigned responsibilities.</p>
        <div className="mt-5 flex flex-wrap gap-2"><span className="inline-flex items-center gap-2 rounded-full border border-[#cce5e7] bg-white/85 px-3 py-2 text-[11px] font-bold text-[#285f76]"><ShieldCheck size={15}/> {viewer.designation || "LGU staff"}</span><span className="inline-flex items-center rounded-full border border-[#cce5e7] bg-white/85 px-3 py-2 text-[11px] font-bold text-[#285f76]">{office}</span></div>
      </div><Link href={canManageCases ? "/admin/reports" : "/admin/profile"} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#174f74] px-5 py-3 text-xs font-extrabold text-white hover:bg-[#0e688f]">{canManageCases ? "Open my action desk" : "View my profile"}<ArrowRight size={16}/></Link></div>
    </header>
    {canManageCases ? <>
      <section aria-label="Workload summary"><div className="mb-4 flex flex-wrap items-end justify-between gap-3"><div><p className="elb-admin-eyebrow">TODAY'S FOCUS</p><h2 className="mt-1 text-xl font-extrabold text-[#194966]">Civic reporting workload</h2></div><span className="text-xs text-[#7391a2]">Live counts from assigned records</span></div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{metrics.map(item => <Link key={item.title} href="/admin/reports" className="group rounded-2xl border border-[#dce9f0] bg-white p-5 transition hover:border-[#a9cddb] hover:shadow-sm"><div className="flex items-start justify-between gap-2"><div><p className="text-[11px] font-semibold text-[#7390a2]">{item.title}</p><strong className="mt-2 block text-[30px] font-extrabold tracking-tight text-[#174969]">{item.value}</strong></div><span className={`grid size-10 place-items-center rounded-xl ${item.tone}`}><item.icon size={20}/></span></div><p className="mt-3 text-[11px] text-[#8aa0ae]">{item.detail}</p></Link>)}</div>
      </section>
      <div className="grid gap-4 xl:grid-cols-2">
        <CasePanel title="My assigned cases" description="Cases waiting for your next action" href="/admin/reports" empty="No active cases are assigned to you yet." cases={myCases}/>
        <CasePanel title="Unclaimed office queue" description={`Available for an authorized ${office} officer to claim`} href="/admin/reports" empty="Your department has no unclaimed cases." cases={unclaimedCases}/>
      </div>
      <div className="flex items-start gap-3 rounded-xl border border-[#d8e6ed] bg-[#f0f7fa] p-4 text-xs leading-6 text-[#5e7f91]"><Clock3 size={18} className="mt-0.5 shrink-0 text-[#2f799c]"/><p><strong className="text-[#245a74]">Workflow:</strong> Open an office-queue case to claim it, then add inspection or action notes and update the status. Internal notes remain visible only to authorized LGU personnel; citizen-facing updates appear in the citizen tracking timeline.</p></div>
    </> : <section className="rounded-2xl border border-[#d9e7ee] bg-white p-6"><h2 className="text-lg font-extrabold text-[#174969]">Your service assignments</h2><p className="mt-2 text-xs leading-6 text-[#6c899c]">Civic Reporting is not assigned to your account. Contact your Super Admin if you need access to the action desk.</p></section>}
    <section><div className="mb-4"><p className="elb-admin-eyebrow">AUTHORIZED MODULES</p><h2 className="mt-1 text-xl font-extrabold text-[#194966]">My service tools</h2><p className="mt-2 text-xs text-[#8199a9]">Only approved modules appear in your workspace. Under-development modules are identified as previews.</p></div>
      {modules.length ? <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{modules.map(module => { const item = destinations[module]; const Icon = item.icon; return <Link key={module} href={item.href} className="group flex items-start justify-between gap-3 rounded-2xl border border-[#e0e9ee] bg-white p-5 transition hover:border-[#accfdd] hover:shadow-sm"><div className="flex items-start gap-3"><span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#eaf4f8] text-[#2e7395]"><Icon size={19}/></span><div><h3 className="text-[13px] font-extrabold text-[#214e6a]">{STAFF_MODULE_LABELS[module]}</h3><p className="mt-1.5 text-[11px] leading-5 text-[#7792a4]">{item.description}</p><span className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold ${item.live ? "bg-[#e7f6ee] text-[#277c63]" : "bg-[#f0f3f6] text-[#73889a]"}`}>{item.live ? "Available" : "Planned"}</span></div></div><ArrowUpRight size={17} className="shrink-0 text-[#4386a2]"/></Link>;})}</div>
        : <div className="rounded-2xl border border-dashed border-[#cbdfe9] bg-white px-5 py-10 text-center text-sm text-[#7b92a3]">No modules have been assigned yet.</div>}
    </section>
  </div>;
}

type CaseRow = { id: string; title: string; trackingId: string; priority: string; status: keyof typeof STATUS_META; barangay: string; updatedAt: Date };
function CasePanel({ title, description, href, cases, empty }: { title: string; description: string; href: string; cases: readonly CaseRow[]; empty: string }) {
  return <section className="overflow-hidden rounded-[18px] border border-[#deeaef] bg-white"><div className="flex flex-wrap items-start justify-between gap-3 border-b border-[#ecf1f5] px-5 py-4"><div><h3 className="text-[15px] font-extrabold text-[#1d4c6b]">{title}</h3><p className="mt-1 text-[11px] text-[#8198a8]">{description}</p></div><Link href={href} className="inline-flex items-center gap-1 text-xs font-bold text-[#267a9e]">View queue <ArrowUpRight size={14}/></Link></div>
    {cases.length ? <ul className="divide-y divide-[#edf1f5]">{cases.map(row => <li key={row.id}><Link href={`/admin/reports/${row.id}`} className="group flex items-start justify-between gap-4 px-5 py-4 hover:bg-[#f7fafc]"><div className="min-w-0"><span className="text-[10px] font-bold text-[#277aa0]">{row.trackingId}</span><p className="mt-1 truncate text-[13px] font-bold text-[#23516d]" title={row.title}>{row.title}</p><p className="mt-1 text-[11px] text-[#8197a7]">{row.barangay} · {STATUS_META[row.status].label} · {formatReportDate(row.updatedAt.toISOString())}</p></div><span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-extrabold ${priorityColors[row.priority] || priorityColors.NORMAL}`}>{row.priority}</span></Link></li>)}</ul>
      : <div className="flex flex-col items-center px-5 py-10 text-center"><Inbox className="text-[#95b8c7]" size={28}/><p className="mt-3 text-xs text-[#829aaa]">{empty}</p></div>}
  </section>;
}
