import "@/styles/admin-workflows.css";
import "server-only";
import {PageHeading} from "@/components/shared/page-layout";
import Link from "next/link";
import {
  ArrowRight, ArrowUpRight, BarChart3, BellRing, BriefcaseBusiness, Building2,
  CheckCircle2, ClipboardList, Clock3, FileSpreadsheet, Inbox, MapPinned,
  ShieldCheck, Siren,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { reportAdminScope } from "@/lib/report-scope";
import { formatReportDate, STATUS_META } from "@/features/civic/config";
import { STAFF_MODULE_LABELS, type StaffModule } from "@/lib/staff-modules";
import type { CivicViewer } from "@/features/civic/types";
import { serviceDashboardCounts } from "@/features/services/server/data";
import { staffWorkOffers } from "@/lib/work-distribution/server";
import { WorkOfferPanel } from "@/components/admin/work-offer-panel";

const destinations: Record<StaffModule, { href: string; description: string; icon: typeof ClipboardList; live: boolean }> = {
  REPORTS: { href: "/admin/reports", description: "Review, claim and resolve routed cases", icon: ClipboardList, live: true },
  SERVICES: { href: "/admin/services", description: "Review assigned permits, clearances and assistance requests", icon: Building2, live: true },
  EMERGENCY: { href: "/admin/emergency", description: "Local emergency contacts, review queues and advisory drafting", icon: BellRing, live: true },
  PROJECTS: { href: "/admin/projects", description: "Draft, review and publish official projects", icon: MapPinned, live: true },
  JOBS: { href: "/admin/jobs", description: "Maintain your PESO opportunity listings", icon: BriefcaseBusiness, live: true },
  CENSUS: { href: "/admin/census", description: "Protected census records, imports and scoped workforce analytics", icon: BarChart3, live: true },
  COMMUNITY_DATA: { href: "/admin/jobs/data", description: "Import and encode authorized Job Matching activity data", icon: FileSpreadsheet, live: true },
};

const priorityColors: Record<string, string> = {
  URGENT: "bg-muted text-destructive", HIGH: "bg-warning-soft text-warning-foreground",
  NORMAL: "bg-muted text-foreground", LOW: "bg-muted text-muted-foreground",
};

type FocusTask = { title: string; value: number | string; detail: string; href: string; icon: typeof ClipboardList; tone: string };

export async function StaffWorkspace({ viewer, modules }: { viewer: CivicViewer; modules: StaffModule[] }) {
  const canManageCases = modules.includes("REPORTS") && !!viewer.department?.trim();
  const canManageServices = modules.includes("SERVICES");
  const canManageJobs = modules.includes("JOBS");
  const canViewInsights = modules.includes("CENSUS");
  const canManageCommunityData = modules.includes("CENSUS");
  const visibleModules=modules.filter(module=>module!=="COMMUNITY_DATA");
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

  const [myDraftJobs, returnedJobs, workOffers] = await Promise.all([
    canManageJobs ? prisma.jobOpportunity.count({ where: { createdById: viewer.id, status: "DRAFT" } }) : Promise.resolve(0),
    canManageJobs ? prisma.jobOpportunity.count({ where: { createdById: viewer.id, status: "RETURNED" } }) : Promise.resolve(0),
    staffWorkOffers(viewer.id),
  ]);

  const serviceCounts = canManageServices ? await serviceDashboardCounts(viewer) : {newCount:0,assignedCount:0,actionCount:0,scheduledCount:0,finalCount:0,completedCount:0,offeredCount:0};

  const serviceTasks: FocusTask[] = canManageServices ? [
    { title: "New service requests", value: serviceCounts.newCount, detail: "New intake or submitted requests in your accessible queue", href: "/admin/services?view=new", icon: Building2, tone: "bg-muted text-foreground" },
    { title: "Services in review", value: serviceCounts.assignedCount, detail: "Assigned or validated requests needing LGU action", href: "/admin/services?view=review&mine=1", icon: ClipboardList, tone: "bg-muted text-success" },
    { title: "Citizen corrections", value: serviceCounts.actionCount, detail: "Requests waiting for citizen corrections or replacement documents", href: "/admin/services?view=action", icon: Inbox, tone: "bg-muted text-warning-foreground" },
    { title: "Scheduled services", value: serviceCounts.scheduledCount, detail: "Appointments awaiting confirmation or completion", href: "/admin/services?view=schedule", icon: Clock3, tone: "bg-muted text-muted-foreground" },
  ] : [];

  const reportMetrics = [
    { title: "My active cases", value: mineCount, detail: "Cases assigned to you", icon: ClipboardList, tone: "bg-muted text-foreground" },
    { title: "Legacy office queue", value: unclaimedCount, detail: "Older/unrouted cases not yet auto-offered", icon: Inbox, tone: "bg-warning-soft text-warning-foreground" },
    { title: "Urgent concerns", value: urgentCount, detail: "Urgent in your accessible queue", icon: Siren, tone: "bg-muted text-destructive" },
    { title: "Cases resolved", value: completedCount, detail: "Resolved cases assigned to you", icon: CheckCircle2, tone: "bg-muted text-success" },
  ];

  const employmentTasks: FocusTask[] = [
    ...(canManageJobs ? [
      { title: "My opportunity drafts", value: myDraftJobs, detail: "Draft listings waiting for your next step", href: "/admin/jobs?view=my-work", icon: BriefcaseBusiness, tone: "bg-muted text-foreground" },
      { title: "Returned for correction", value: returnedJobs, detail: "Listings sent back by Super Admin", href: "/admin/jobs?view=returned", icon: ClipboardList, tone: "bg-muted text-warning-foreground" },
    ] : []),
    ...(canViewInsights ? [{ title: "Protected workforce analytics", value: "View", detail: "Survey populations within your authorized census scope", href: "/admin/census/analytics", icon: BarChart3, tone: "bg-muted text-success" }] : []),
    ...(canManageCommunityData ? [{ title: "Census imports and provenance", value: "Open", detail: "Validate and review source records within your census scope", href: "/admin/census/imports", icon: FileSpreadsheet, tone: "bg-muted text-muted-foreground" }] : []),
  ];

  return <div className="elb-admin-workflow space-y-6">
    <PageHeading context={office} title={'Your work, '+viewer.name} description="Review incoming offers and move your assigned cases forward." actions={<Link href={canManageCases?'/admin/reports':(serviceTasks[0]?.href||employmentTasks[0]?.href||'/admin/profile')} className="elb-button elb-button-primary">{canManageCases?'Open my action desk':serviceTasks.length||employmentTasks.length?'Open priority work':'View my profile'}<ArrowRight size={18} aria-hidden="true"/></Link>}/>
    <p className="elb-help"><ShieldCheck size={16} className="mr-2 inline" aria-hidden="true"/>{viewer.designation||'LGU staff'} · {office}. Only your authorized workspaces and records are shown.</p>

    {workOffers.length > 0 && <section aria-label="Work offers awaiting acceptance"><div className="mb-4"><h2 className="mt-1 text-xl font-semibold text-foreground">Work offers waiting for you</h2><p className="mt-2 text-xs text-muted-foreground">These cases were offered using balanced workload distribution. Accept them before the deadline or decline with a short reason so the system can re-route fairly.</p></div><div className="grid gap-3 xl:grid-cols-2">{workOffers.map(offer=><div key={offer.id}><WorkOfferPanel offer={offer}/><Link href={offer.entityType === "CIVIC_REPORT" ? `/admin/reports/${offer.entityId}` : offer.entityType === "SERVICE_REQUEST" ? `/admin/services/${offer.entityId}` : "/admin"} className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-foreground">Open case <ArrowRight size={12}/></Link></div>)}</div></section>}

    {serviceTasks.length > 0 && <section aria-label="Online LGU services focus">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3"><div><h2 className="mt-1 text-xl font-semibold text-foreground">Service requests that need attention</h2><p className="mt-2 text-xs text-muted-foreground">Only requests routed to your department or assigned directly to you are shown.</p></div></div>
      <div className="elb-admin-task-band">{serviceTasks.map(item => <Link key={item.title} href={item.href} className="group"><div className="flex items-start justify-between gap-2"><div><p className="text-xs font-semibold text-muted-foreground">{item.title}</p><strong className="mt-2 block text-[30px] font-semibold tracking-tight text-foreground">{item.value}</strong></div><span className={`grid size-10 place-items-center rounded-xl ${item.tone}`}><item.icon size={20}/></span></div><p className="mt-3 text-xs leading-5 text-muted-foreground">{item.detail}</p></Link>)}</div>
    </section>}

    {employmentTasks.length > 0 && <section aria-label="Employment and livelihood focus">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3"><div><h2 className="mt-1 text-xl font-semibold text-foreground">What needs attention</h2><p className="mt-2 text-xs text-muted-foreground">Task-oriented signals from the modules assigned to you.</p></div></div>
      <div className="elb-admin-task-band">{employmentTasks.map(item => <Link key={item.title} href={item.href} className="group"><div className="flex items-start justify-between gap-2"><div><p className="text-xs font-semibold text-muted-foreground">{item.title}</p><strong className="mt-2 block text-[30px] font-semibold tracking-tight text-foreground">{item.value}</strong></div><span className={`grid size-10 place-items-center rounded-xl ${item.tone}`}><item.icon size={20}/></span></div><p className="mt-3 text-xs leading-5 text-muted-foreground">{item.detail}</p></Link>)}</div>
    </section>}

    {canManageCases ? <>
      <section aria-label="Workload summary"><div className="mb-4 flex flex-wrap items-end justify-between gap-3"><div><h2 className="mt-1 text-xl font-semibold text-foreground">My reporting workload</h2></div><span className="text-xs text-muted-foreground">Live counts from assigned records</span></div>
        <div className="elb-admin-task-band">{reportMetrics.map(item => <Link key={item.title} href="/admin/reports" className="group"><div className="flex items-start justify-between gap-2"><div><p className="text-xs font-semibold text-muted-foreground">{item.title}</p><strong className="mt-2 block text-[30px] font-semibold tracking-tight text-foreground">{item.value}</strong></div><span className={`grid size-10 place-items-center rounded-xl ${item.tone}`}><item.icon size={20}/></span></div><p className="mt-3 text-xs text-muted-foreground">{item.detail}</p></Link>)}</div>
      </section>
      <div className="grid gap-4 xl:grid-cols-2">
        <CasePanel title="My assigned cases" description="Cases waiting for your next action" href="/admin/reports" empty="No active cases are assigned to you yet." cases={myCases}/>
        <CasePanel title="Legacy / unassigned office queue" description={`New routed cases use balanced offers; this shows older or manually unassigned ${office} cases`} href="/admin/reports" empty="Your department has no legacy unassigned cases." cases={unclaimedCases}/>
      </div>
      <div className="flex items-start gap-3 rounded-xl border border-border bg-muted p-4 text-xs leading-6 text-muted-foreground"><Clock3 size={18} className="mt-0.5 shrink-0 text-foreground"/><p><strong className="text-foreground">Workflow:</strong> New cases are offered fairly based on active workload. Accept your offer first, then add inspection or action notes and update the status. Internal notes remain visible only to authorized LGU personnel; citizen-facing updates appear in the citizen tracking timeline.</p></div>
    </> : <section className="rounded-2xl border border-border bg-card p-6"><h2 className="text-lg font-semibold text-foreground">Civic reporting</h2><p className="mt-2 text-xs leading-6 text-muted-foreground">Civic Reporting is not assigned to your account. Your other authorized service modules remain available below.</p></section>}

    <section><div className="mb-4"><p className="elb-admin-eyebrow">AUTHORIZED MODULES</p><h2 className="mt-1 text-xl font-semibold text-foreground">My service tools</h2><p className="mt-2 text-xs text-muted-foreground">Only approved modules appear here. Census records, analytics and imports require CENSUS and an authorized record scope; opportunity maintenance uses JOBS.</p></div>
      {visibleModules.length ? <div className="elb-module-directory">{visibleModules.map(module => { const item = destinations[module]; const Icon = item.icon; return <Link key={module} href={item.href} className="group flex items-start justify-between gap-3"><div className="flex items-start gap-3"><span className="grid size-10 shrink-0 place-items-center rounded-xl bg-muted text-foreground"><Icon size={19}/></span><div><h3 className="text-sm font-semibold text-foreground">{STAFF_MODULE_LABELS[module]}</h3><p className="mt-1.5 text-xs leading-5 text-muted-foreground">{item.description}</p><span className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${item.live ? "bg-muted text-success" : "bg-muted text-muted-foreground"}`}>{item.live ? "Available" : "Planned"}</span></div></div><ArrowUpRight size={17} className="shrink-0 text-muted-foreground"/></Link>;})}</div>
        : <div className="rounded-2xl border border-dashed border-border bg-card px-5 py-10 text-center text-sm text-muted-foreground">No modules have been assigned yet.</div>}
    </section>
  </div>;
}

type CaseRow = { id: string; title: string; trackingId: string; priority: string; status: keyof typeof STATUS_META; barangay: string; updatedAt: Date };
function CasePanel({ title, description, href, cases, empty }: { title: string; description: string; href: string; cases: readonly CaseRow[]; empty: string }) {
  return <section className="elb-admin-sheet"><div className="flex flex-wrap items-start justify-between gap-3 border-b border-border px-5 py-4"><div><h3 className="text-[15px] font-semibold text-foreground">{title}</h3><p className="mt-1 text-xs text-muted-foreground">{description}</p></div><Link href={href} className="inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-foreground">View queue <ArrowUpRight size={14}/></Link></div>
    {cases.length ? <ul className="divide-y divide-border">{cases.map(row => <li key={row.id}><Link href={`/admin/reports/${row.id}`} className="group flex items-start justify-between gap-4 px-5 py-4 hover:bg-card"><div className="min-w-0"><span className="text-xs font-bold text-foreground">{row.trackingId}</span><p className="mt-1 text-sm font-semibold text-foreground" title={row.title}>{row.title}</p><p className="mt-1 text-xs text-muted-foreground">{row.barangay} · {STATUS_META[row.status].label} · {formatReportDate(row.updatedAt.toISOString())}</p></div><span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${priorityColors[row.priority] || priorityColors.NORMAL}`}>{row.priority}</span></Link></li>)}</ul>
      : <div className="flex flex-col items-center px-5 py-10 text-center"><Inbox className="text-muted-foreground" size={28}/><p className="mt-3 text-xs text-muted-foreground">{empty}</p></div>}
  </section>;
}
