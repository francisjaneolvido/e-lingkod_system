import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight, ArrowUpRight, BellRing, BriefcaseBusiness, Building2,
  CheckCircle2, ChevronRight, ClipboardList, Clock3, FileClock,
  Inbox, MapPinned, ShieldCheck, UsersRound,
} from "lucide-react";
import { requirePageViewer } from "@/lib/access";
import { grantedModules } from "@/lib/staff-access";
import { StaffWorkspace } from "@/components/admin/staff-workspace";
import { prisma } from "@/lib/prisma";
import { listReports } from "@/features/civic/server/repository";
import { categoryLabel, formatReportDate, STATUS_META, type ReportStatus } from "@/features/civic/config";
import { serviceDashboardCounts } from "@/features/services/server/data";

// Dynamic LGU counts and session data must only be rendered for the current request.
export const instant = false;
export const metadata: Metadata = { title: "Operations Overview | E-Lingkod Bayan" };

const moduleLinks = [
  { title: "Civic reporting", description: "Review reports and document the response", href: "/admin/reports", icon: ClipboardList, available: true },
  { title: "LGU services", description: "Permits, clearances, assistance and tracked requests", href: "/admin/services", icon: Building2, available: true },
  { title: "Emergency & alerts", description: "Emergency contacts and advisories", href: "/admin/emergency", icon: BellRing, available: true },
  { title: "Municipal projects", description: "Services, project plans, and milestones", href: "/admin/projects", icon: MapPinned, available: false },
  { title: "Job Matching & opportunities", description: "Employment profiling, insights and PESO-reviewed opportunities", href: "/admin/jobs", icon: BriefcaseBusiness, available: true },
  { title: "Community Census", description: "Separate census workflow planned for a future phase", href: "/admin/census", icon: UsersRound, available: false },
];

const reportStatusBars: { label: string; status: ReportStatus; className: string }[] = [
  { label: "Submitted", status: "SUBMITTED", className: "bg-primary" },
  { label: "Under review", status: "UNDER_REVIEW", className: "bg-brand-gold" },
  { label: "In progress", status: "IN_PROGRESS", className: "bg-accent" },
  { label: "Awaiting verification", status: "PENDING_VERIFICATION", className: "bg-brand-gold" },
  { label: "Resolved", status: "RESOLVED", className: "bg-success-solid" },
  { label: "Rejected", status: "REJECTED", className: "bg-danger-solid" },
  { label: "Reopened", status: "REOPENED", className: "bg-brand-gold" },
];

export default async function AdminDashboard() {
  const viewer = await requirePageViewer("/admin");
  if (viewer.role === "STAFF") {
    const modules = await grantedModules(viewer);
    return <StaffWorkspace viewer={viewer} modules={modules} />;
  }
  if (viewer.role !== "ADMIN") return null;

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const agingThreshold = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const [statusCounts, recentReports, citizenCount, pendingVacancies, importIssues, recentSurveys, serviceCounts, unassignedServices, agingServices, activeAssignments] = await Promise.all([
    prisma.civicReport.groupBy({ by: ["status"], _count: { _all: true } }),
    listReports(viewer, true, 5),
    prisma.user.count({ where: { role: "CITIZEN" } }),
    prisma.jobOpportunity.count({ where: { status: "PENDING_REVIEW" } }),
    prisma.communityImportBatch.count({ where: { status: "ACTIVE", OR: [{ warningCount: { gt: 0 } }, { invalidCount: { gt: 0 } }, { duplicateCount: { gt: 0 } }] } }),
    prisma.communitySurvey.count({ where: { status: "SUBMITTED", consentAggregated: true, updatedAt: { gte: sevenDaysAgo } } }),
    serviceDashboardCounts(viewer),
    prisma.serviceRequest.count({ where: { assignedStaffId: null, status: { in: ["FOR_TRIAGE","SUBMITTED","ASSIGNED","UNDER_REVIEW"] } } }),
    prisma.serviceRequest.count({ where: { updatedAt: { lt: agingThreshold }, status: { notIn: ["COMPLETED","DECLINED","CANCELLED"] } } }),
    prisma.workAssignment.count({ where: { status: { in: ["OFFERED","ACCEPTED"] } } }),
  ]);

  const counts = Object.fromEntries(statusCounts.map(row => [row.status, row._count._all])) as Partial<Record<ReportStatus, number>>;
  const total = statusCounts.reduce((sum, row) => sum + row._count._all, 0);
  const submitted = counts.SUBMITTED ?? 0;
  const underAction = (counts.UNDER_REVIEW ?? 0) + (counts.IN_PROGRESS ?? 0) + (counts.PENDING_VERIFICATION ?? 0) + (counts.REOPENED ?? 0);
  const resolved = counts.RESOLVED ?? 0;
  const performance = total ? Math.round((resolved / total) * 100) : 0;
  const metrics = [
    { title: "Total reports", value: total, description: "All received concerns", icon: ClipboardList, border: "border-t-[#207aa8]", iconBg: "bg-muted", iconColor: "text-foreground" },
    { title: "Awaiting review", value: submitted, description: "New submissions", icon: Inbox, border: "border-t-[#e7aa41]", iconBg: "bg-muted", iconColor: "text-warning-foreground" },
    { title: "Under action", value: underAction, description: "Being reviewed or addressed", icon: Clock3, border: "border-t-[#8e7bc6]", iconBg: "bg-muted", iconColor: "text-muted-foreground" },
    { title: "Resolved", value: resolved, description: "Completed citizen concerns", icon: CheckCircle2, border: "border-t-[#29a587]", iconBg: "bg-muted", iconColor: "text-success" },
  ];

  return <div className="space-y-7 lg:space-y-8">
    <section className="relative isolate overflow-hidden rounded-[20px] border border-border bg-muted px-6 py-7 sm:px-8 sm:py-8">
      <div aria-hidden="true" className="pointer-events-none absolute -right-12 -top-20 z-[-1] size-[260px] rounded-full border-[35px] border-border/60 sm:size-[330px]" />
      <div aria-hidden="true" className="pointer-events-none absolute right-[11%] top-[-58px] z-[-1] size-44 rounded-full border-[2px] border-border/45" />
      <div className="flex flex-wrap items-center justify-between gap-5">
        <div className="max-w-[710px]">
          <p className="flex items-center gap-2 text-xs font-bold tracking-[.17em] text-foreground"><span className="h-1.5 w-1.5 rounded-full bg-brand-gold" /> LINGKOD SA BAYAN <span className="text-muted-foreground">/</span> OPERATIONS CENTER</p>
          <h1 className="mt-3 text-[26px] font-extrabold leading-tight tracking-[-.045em] text-foreground sm:text-[34px]">Every concern deserves a response.</h1>
          <p className="mt-3 max-w-[610px] text-[13px] leading-7 text-muted-foreground">Welcome, {viewer.name}. Monitor citizen reports, follow up on pending concerns, and keep the community informed—all from one workspace.</p>
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <Link href="/admin/reports" className="inline-flex min-h-11 items-center gap-2 rounded-[10px] bg-primary px-5 py-3 text-[12px] font-bold text-white shadow-[0_4px_14px_rgba(22,78,116,.13)] hover:bg-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-border">Open report queue <ArrowRight size={17}/></Link>
            <Link href="/" className="inline-flex min-h-11 items-center gap-2 rounded-[10px] border border-border bg-card/80 px-4 py-3 text-[12px] font-bold text-foreground hover:bg-card">Citizen portal <ArrowUpRight size={16}/></Link>
          </div>
        </div>
        <div className="flex min-w-[170px] items-center gap-3 rounded-xl border border-border bg-card/80 px-4 py-3 shadow-[0_7px_30px_rgba(35,101,131,.055)] sm:self-end">
          <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-muted text-success"><ShieldCheck size={19}/></span>
          <div><div className="text-xs font-extrabold text-foreground">Live workspace</div><div className="mt-1 text-xs text-muted-foreground">Connected database records</div></div>
        </div>
      </div>
    </section>

    <section aria-labelledby="admin-action-title" className="space-y-3"><div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[.16em] text-muted-foreground">Action queue</p><h2 id="admin-action-title" className="mt-1 text-[17px] font-extrabold text-foreground">What needs attention</h2></div><Link href="/admin/pulse" className="text-xs font-extrabold text-foreground">Open Community Pulse →</Link></div><div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4"><Link href="/admin/services" className="rounded-2xl border border-border bg-card p-5 transition hover:border-border"><span className="text-xs font-bold text-muted-foreground">Unassigned / needs routing</span><strong className="mt-2 block text-3xl text-foreground">{unassignedServices}</strong><p className="mt-2 text-xs text-muted-foreground">Service cases without an accepted staff owner</p></Link><Link href="/admin/services?status=FOR_FINAL_VERIFICATION" className="rounded-2xl border border-border bg-card p-5 transition hover:border-border"><span className="text-xs font-bold text-muted-foreground">Final verification</span><strong className="mt-2 block text-3xl text-foreground">{serviceCounts.finalCount}</strong><p className="mt-2 text-xs text-muted-foreground">Service requests waiting for Super Admin</p></Link><Link href="/admin/services" className="rounded-2xl border border-border bg-card p-5 transition hover:border-border"><span className="text-xs font-bold text-muted-foreground">Aging service cases</span><strong className="mt-2 block text-3xl text-foreground">{agingServices}</strong><p className="mt-2 text-xs text-muted-foreground">Active requests unchanged for more than 7 days</p></Link><Link href="/admin/staff" className="rounded-2xl border border-border bg-card p-5 transition hover:border-border"><span className="text-xs font-bold text-muted-foreground">Distributed workload</span><strong className="mt-2 block text-3xl text-foreground">{activeAssignments}</strong><p className="mt-2 text-xs text-muted-foreground">Tasks currently offered or accepted across modules</p></Link></div><div className="grid gap-3 md:grid-cols-2 xl:grid-cols-2"><Link href="/admin/jobs?view=review" className="rounded-2xl border border-border bg-card p-4 transition hover:border-border"><span className="text-xs font-bold text-muted-foreground">Opportunity verification</span><strong className="ml-2 text-lg text-foreground">{pendingVacancies}</strong></Link><Link href="/admin/jobs/insights" className="rounded-2xl border border-border bg-card p-4 transition hover:border-border"><span className="text-xs font-bold text-muted-foreground">Employment survey responses · 7d</span><strong className="ml-2 text-lg text-foreground">{recentSurveys}</strong><span className="ml-2 text-xs text-muted-foreground">· {importIssues} data-quality flags</span></Link></div></section>

    <section className="grid gap-3 md:grid-cols-2" aria-label="Team and citizens"><Link href="/admin/citizens" className="group flex items-center justify-between gap-4 rounded-[16px] border border-border bg-card px-5 py-4 transition hover:border-border"><span className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-xl bg-muted text-foreground"><UsersRound size={20}/></span><span><strong className="block text-[12px] text-foreground">Registered citizens</strong><small className="mt-1 block text-xs text-muted-foreground">{citizenCount.toLocaleString()} accounts · secured contact directory</small></span></span><ArrowUpRight size={17} className="text-muted-foreground"/></Link><Link href="/admin/staff" className="group flex items-center justify-between gap-4 rounded-[16px] border border-border bg-card px-5 py-4 transition hover:border-border"><span className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-xl bg-muted text-success"><ShieldCheck size={20}/></span><span><strong className="block text-[12px] text-foreground">LGU staff permissions</strong><small className="mt-1 block text-xs text-muted-foreground">Manage departments, people, and module access</small></span></span><ArrowUpRight size={17} className="text-muted-foreground"/></Link></section>

    <section aria-labelledby="admin-metrics-title" className="space-y-3">
      <div className="flex items-end justify-between gap-2"><div><p className="text-xs font-bold uppercase tracking-[.16em] text-muted-foreground">Community pulse</p><h2 id="admin-metrics-title" className="mt-1 text-[17px] font-extrabold text-foreground">Reports at a glance</h2></div><p className="text-xs text-muted-foreground">Live totals · Civic reporting</p></div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map(metric => <article key={metric.title} className={`relative overflow-hidden rounded-2xl border border-border border-t-[3px] bg-card px-5 py-5 shadow-[0_5px_20px_rgba(37,78,104,.035)] ${metric.border}`}>
          <div className="flex items-start justify-between gap-4"><span className="text-[12px] font-bold text-muted-foreground">{metric.title}</span><span className={`grid size-10 shrink-0 place-items-center rounded-xl ${metric.iconBg} ${metric.iconColor}`}><metric.icon size={20} strokeWidth={2}/></span></div>
          <p className="mt-0 text-[35px] font-extrabold tracking-[-.055em] tabular-nums text-foreground">{metric.value.toLocaleString()}</p>
          <p className="mt-1 text-xs text-muted-foreground">{metric.description}</p>
        </article>)}
      </div>
    </section>

    <section aria-label="Reports activity" className="grid gap-4 xl:grid-cols-[minmax(0,1.7fr)_minmax(310px,1fr)]">
      <article className="overflow-hidden rounded-[17px] border border-border bg-card shadow-[0_5px_22px_rgba(32,74,103,.027)]">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-5 sm:px-6"><div><div className="flex items-center gap-2"><span className="grid size-8 place-items-center rounded-lg bg-muted text-foreground"><FileClock size={17}/></span><h2 className="text-[16px] font-extrabold text-foreground">Recent citizen reports</h2></div><p className="mt-2 text-xs text-muted-foreground">Latest submitted concerns and their current progress</p></div><Link href="/admin/reports" className="inline-flex items-center gap-1 text-xs font-bold text-foreground hover:underline">See all reports <ArrowRight size={14}/></Link></div>
        {recentReports.length ? <div className="divide-y divide-border">{recentReports.map(report => <Link key={report.id} href={`/admin/reports/${report.id}`} className="group flex items-center justify-between gap-3 px-5 py-4 hover:bg-card sm:px-6"><div className="min-w-0"><div className="flex items-center gap-2"><p className="truncate text-[12px] font-bold text-foreground">{report.title}</p></div><p className="mt-1 truncate text-xs text-muted-foreground">{report.trackingId} · {categoryLabel(report.category)} · {report.barangay}</p></div><div className="shrink-0 text-right"><p className="text-xs font-bold text-foreground">{STATUS_META[report.status].label}</p><p className="mt-1 text-xs text-muted-foreground">{formatReportDate(report.createdAt)}</p></div><ChevronRight className="hidden text-muted-foreground group-hover:text-foreground sm:block" size={17}/></Link>)}</div> : <div className="flex min-h-[220px] flex-col items-center justify-center px-5 py-10 text-center"><span className="grid size-14 place-items-center rounded-[16px] bg-muted text-muted-foreground"><Inbox size={27}/></span><h3 className="mt-4 text-[14px] font-extrabold text-foreground">Your report inbox is clear</h3><p className="mt-2 max-w-[330px] text-xs leading-6 text-muted-foreground">When citizens submit a concern, their reports and status history will appear here automatically.</p><Link href="/admin/reports" className="mt-3 text-xs font-bold text-foreground hover:underline">Go to report queue →</Link></div>}
      </article>

      <article className="rounded-[17px] border border-border bg-card p-5 shadow-[0_5px_22px_rgba(32,74,103,.027)] sm:p-6">
        <div className="flex items-center justify-between"><h2 className="text-[16px] font-extrabold text-foreground">Status distribution</h2><span className="text-xs font-bold text-muted-foreground tabular-nums">{total} total</span></div>
        <p className="mt-1 text-xs text-muted-foreground">How reported concerns are progressing</p>
        <div className="mt-5 grid grid-cols-[70px_1fr] items-center gap-4 rounded-xl bg-card px-4 py-3"><p className="text-[27px] font-extrabold tracking-tight text-success tabular-nums">{performance}%</p><div><p className="text-xs font-extrabold text-foreground">Resolved share</p><p className="mt-0.5 text-xs leading-4 text-muted-foreground">Share of all reports currently resolved</p></div></div>
        <div className="mt-5 space-y-4">{reportStatusBars.map(item => { const count = counts[item.status] ?? 0; const percent = total ? (count / total) * 100 : 0; return <div key={item.status}><div className="mb-1.5 flex justify-between gap-3 text-xs"><span className="font-semibold text-muted-foreground">{item.label}</span><span className="font-bold tabular-nums text-foreground">{count} <span className="font-normal text-muted-foreground">({Math.round(percent)}%)</span></span></div><div className="h-1.5 overflow-hidden rounded-full bg-muted"><div className={`h-full rounded-full ${item.className}`} style={{width: `${percent}%`}}/></div></div>; })}</div>
        <div className="mt-6 flex items-center justify-between gap-2 rounded-xl border border-border px-4 py-3"><div className="flex items-center gap-2"><UsersRound size={18} className="text-foreground"/><span className="text-xs font-semibold text-muted-foreground">Registered citizens</span></div><strong className="text-[15px] font-extrabold tabular-nums">{citizenCount.toLocaleString()}</strong></div>
      </article>
    </section>

    <section aria-labelledby="admin-modules-title" className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[.17em] text-muted-foreground">Digital public service roadmap</p><h2 id="admin-modules-title" className="mt-1 text-[18px] font-extrabold text-foreground">LGU modules</h2><p className="mt-1 text-[12px] text-muted-foreground">One integrated platform for more accessible community services.</p></div><span className="inline-flex gap-2 rounded-full border border-border bg-muted px-3 py-1.5 text-xs font-bold text-success">3 of 6 modules available</span></div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{moduleLinks.map((module,index) => <Link href={module.href} key={module.href} className="group flex min-h-[114px] items-start gap-3 rounded-2xl border border-border bg-card p-4 transition hover:border-border hover:shadow-[0_8px_24px_rgba(30,83,112,.07)]"><span className={`grid size-10 shrink-0 place-items-center rounded-xl ${module.available ? "bg-muted text-success" : "bg-muted text-muted-foreground"}`}><module.icon size={19}/></span><div className="min-w-0 flex-1"><div className="flex items-center justify-between gap-2"><span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">MODULE {String(index+1).padStart(2, "0")}</span><span className={`rounded-full px-2 py-1 text-xs font-bold ${module.available ? "bg-muted text-success" : "bg-muted text-muted-foreground"}`}>{module.available ? "ACTIVE" : "PLANNED"}</span></div><h3 className="mt-1 text-[12px] font-extrabold text-foreground group-hover:text-foreground">{module.title}</h3><p className="mt-1 text-xs leading-5 text-muted-foreground">{module.description}</p></div><ArrowUpRight size={15} className="mt-1 shrink-0 text-muted-foreground group-hover:text-foreground"/></Link>)}</div>
    </section>
    <p className="flex items-center gap-2 text-xs text-muted-foreground"><ShieldCheck size={13}/> Figures are based on your connected database. Planned modules contain no live government data. LGU service requests and job listings follow role-based verification workflows.</p>
  </div>;
}
