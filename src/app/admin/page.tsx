import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight, ArrowUpRight, BellRing, BriefcaseBusiness, Building2,
  CheckCircle2, ClipboardList, Clock3,
  Inbox, MapPinned, UsersRound,
} from "lucide-react";
import { requirePageViewer } from "@/lib/access";
import { grantedModules } from "@/lib/staff-access";
import { StaffWorkspace } from "@/components/admin/staff-workspace";
import { prisma } from "@/lib/prisma";
import { listReports } from "@/features/civic/server/repository";
import { categoryLabel, formatReportDate, STATUS_META, type ReportStatus } from "@/features/civic/config";
import { serviceDashboardCounts } from "@/features/services/server/data";
import {PageHeading,EmptyState} from "@/components/shared/page-layout";
import {OverviewChart} from "@/components/insights/overview-chart";

// Dynamic LGU counts and session data must only be rendered for the current request.
export const instant = false;
export const metadata: Metadata = { title: "Operations Overview | E-Lingkod Bayan" };

const moduleLinks = [
  { title: "Civic reporting", description: "Review reports and document the response", href: "/admin/reports", icon: ClipboardList, available: true },
  { title: "LGU services", description: "Permits, clearances, assistance and tracked requests", href: "/admin/services", icon: Building2, available: true },
  { title: "Emergency & alerts", description: "Emergency contacts and advisories", href: "/admin/emergency", icon: BellRing, available: true },
  { title: "Municipal projects", description: "Services, project plans, and milestones", href: "/admin/projects", icon: MapPinned, available: true },
  { title: "Job Matching & opportunities", description: "Employment profiling, insights and PESO-reviewed opportunities", href: "/admin/jobs", icon: BriefcaseBusiness, available: true },
  { title: "Community Census", description: "Manage protected census records and analytics", href: "/admin/census", icon: UsersRound, available: true },
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

  const attention=[
    {label:'Unassigned service cases',value:unassignedServices,href:'/admin/services?view=new'},
    {label:'Service cases awaiting final verification',value:serviceCounts.finalCount,href:'/admin/services?status=FOR_FINAL_VERIFICATION'},
    {label:'Service cases unchanged for 7 days',value:agingServices,href:'/admin/services'},
    {label:'Opportunities awaiting review',value:pendingVacancies,href:'/admin/jobs?status=PENDING_REVIEW'},
    {label:'Import batches with quality flags',value:importIssues,href:'/admin/census/imports'},
    {label:'Offered or accepted work assignments',value:activeAssignments,href:'/admin/services'},
  ];
  return <div className="space-y-7">
    <PageHeading context="Operations overview" title="Your community service desk" description={<>Welcome, {viewer.name}. Start with outstanding work, then follow each case through its review.</>} actions={<><Link className="elb-button elb-button-primary" href="/admin/reports">Open report queue <ArrowRight size={18} aria-hidden="true"/></Link><Link className="elb-button" href="/">Public website <ArrowUpRight size={18} aria-hidden="true"/></Link></>}/>
    <dl className="elb-kpi-band">{metrics.map(metric=><div key={metric.title}><dt><metric.icon size={17} aria-hidden="true"/>{metric.title}</dt><dd>{metric.value.toLocaleString('en-PH')}</dd><p>{metric.description}</p></div>)}</dl>
    <section aria-labelledby="admin-action-title"><div className="elb-section-heading"><div><h2 id="admin-action-title">Needs attention</h2><p>Separate operational queues. Counts can overlap; they are not a combined workload total.</p></div></div><div className="elb-queue-list">{attention.map(item=><Link key={item.label} href={item.href}><strong>{item.value.toLocaleString('en-PH')}</strong><span>{item.label}</span><ArrowUpRight aria-hidden="true"/></Link>)}</div></section>
    <div className="elb-workspace-grid">
      <section className="elb-workspace-section"><div className="elb-section-heading"><div><h2>Recent citizen reports</h2><p>Latest received concerns and recorded progress.</p></div><Link className="elb-button" href="/admin/reports">View all <ArrowRight size={16} aria-hidden="true"/></Link></div>{recentReports.length?<div className="elb-activity-list">{recentReports.map(report=><Link key={report.id} href={'/admin/reports/'+report.id}><div><strong>{report.title}</strong><p>{report.trackingId} · {categoryLabel(report.category)} · {report.barangay}</p></div><div className="elb-activity-status"><span>{STATUS_META[report.status].label}</span><time dateTime={report.createdAt}>{formatReportDate(report.createdAt)}</time></div></Link>)}</div>:<EmptyState title="No reports to show" actions={<Link className="elb-button" href="/admin/reports">Open report queue</Link>}>New citizen concerns and their status history will appear here.</EmptyState>}</section>
      <section className="elb-workspace-section"><div className="elb-section-heading"><div><h2>Report progress</h2><p>{total?performance+'% currently resolved.':'No recorded reports; a resolved share is unavailable.'}</p></div></div><OverviewChart title="Recorded report statuses" items={reportStatusBars.map(item=>({key:item.status,label:item.label,count:counts[item.status]??0,percent:total?Math.round((counts[item.status]??0)/total*10000)/100:null}))} denominator={total} description="All received reports. Statuses are mutually exclusive." compact/><p className="elb-help mt-4">This is a current operational snapshot, not a trend or response-time measure.</p></section>
    </div>
    <section><div className="elb-section-heading"><div><h2>Workspaces</h2><p>Familiar destinations for each service workflow.</p></div></div><div className="elb-module-directory">{moduleLinks.map(module=><Link href={module.href} key={module.href}><module.icon aria-hidden="true"/><div><strong>{module.title}</strong><p>{module.description}</p></div></Link>)}</div></section>
    <div className="flex flex-wrap gap-x-8 gap-y-3 border-t border-border pt-5 text-sm text-muted-foreground"><Link className="inline-flex min-h-11 items-center gap-2" href="/admin/citizens"><UsersRound size={18} aria-hidden="true"/>{citizenCount.toLocaleString('en-PH')} Citizen accounts</Link><Link className="inline-flex min-h-11 items-center gap-2" href="/admin/census">{recentSurveys.toLocaleString('en-PH')} eligible employment survey updates in the last 7 days</Link></div>
  </div>;
}
