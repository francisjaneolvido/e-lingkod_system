import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, BarChart3, Clock3, Download, Gauge, UsersRound } from "lucide-react";
import { requireSuperAdminPage } from "@/lib/access";
import { serviceAdminReport } from "@/features/services/server/data";
import { SERVICE_STATUS_META, isServiceStatus } from "@/features/services/domain";
import { OverviewChart } from "@/components/insights/overview-chart";

export const instant = false;
export const metadata: Metadata = { title: "LGU Service Analytics | eLingkod Bayan" };

export default async function ServiceReportsPage(){
  await requireSuperAdminPage("/admin/services/reports");
  const report=await serviceAdminReport();
  return <div className="space-y-5">
    <div className="flex flex-wrap items-center justify-between gap-3"><Link href="/admin/services" className="inline-flex items-center gap-2 text-xs font-bold text-foreground"><ArrowLeft size={15}/> Service Request Desk</Link><a href="/api/admin/services/export" className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-xs font-extrabold text-white"><Download size={14}/> Export request audit CSV</a></div>
    <header className="rounded-[20px] border border-border bg-muted p-5 sm:p-6"><p className="text-xs font-black uppercase tracking-[.14em] text-muted-foreground">SUPER ADMIN · SERVICE PERFORMANCE</p><h1 className="mt-1.5 text-2xl font-black text-foreground">Online Services Analytics</h1><p className="mt-2 max-w-3xl text-xs leading-6 text-muted-foreground">Thirty-day operational view for demand, throughput, turnaround and active staff workload. Counts are workflow metrics—not employee performance scores.</p></header>
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><Metric icon={BarChart3} label="Submitted · 30 days" value={report.submitted}/><Metric icon={Gauge} label="Completed · 30 days" value={report.completed}/><Metric icon={Clock3} label="Average turnaround" value={`${report.turnaroundHours}h`}/><Metric icon={UsersRound} label="Staff with active work" value={report.staffLoads.length}/></div>
    <div className="grid gap-4 xl:grid-cols-2">
      <OverviewChart title="Service demand overview" items={report.byService.map(row=>({key:row.serviceKey,label:row.serviceTitle,count:row._count._all}))} description="Submitted requests by service in the last 30 days. These are service requests, not census respondents." />
      <OverviewChart title="Workflow overview" items={report.byStatus.map(row=>({key:row.status,label:isServiceStatus(row.status)?SERVICE_STATUS_META[row.status].label:row.status,count:row._count._all}))} description="Current request workflow counts from the authorized service report. Different stages are not added to respondent totals." />
      <section className="rounded-[18px] border border-border bg-card p-5"><h2 className="text-sm font-black text-foreground">Requests by service · last 30 days</h2><div className="mt-4 space-y-2">{report.byService.length?report.byService.map(row=><div key={row.serviceKey} className="flex items-center justify-between rounded-xl bg-card px-3 py-2.5"><span className="text-xs font-bold text-foreground">{row.serviceTitle}</span><strong className="text-sm text-foreground">{row._count._all}</strong></div>):<Empty/>}</div></section>
      <section className="rounded-[18px] border border-border bg-card p-5"><h2 className="text-sm font-black text-foreground">Current workflow distribution</h2><div className="mt-4 space-y-2">{report.byStatus.map(row=>{const status=isServiceStatus(row.status)?row.status:"DRAFT";return <div key={row.status} className="flex items-center justify-between rounded-xl bg-card px-3 py-2.5"><span className={`rounded-full px-2 py-1 text-xs font-black ${SERVICE_STATUS_META[status].tone}`}>{SERVICE_STATUS_META[status].label}</span><strong className="text-sm text-foreground">{row._count._all}</strong></div>})}</div></section>
    </div>
    <section className="rounded-[18px] border border-border bg-card p-5"><h2 className="text-sm font-black text-foreground">Active workload distribution</h2><p className="mt-1 text-xs leading-5 text-muted-foreground">Balanced assignment uses active accepted/offered work to spread new cases fairly. Super Admin can still override manually.</p><div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">{report.staffLoads.length?report.staffLoads.map((row:any)=><div key={row.staff.id} className="rounded-xl border border-border p-3"><strong className="text-xs text-foreground">{row.staff.name}</strong><p className="mt-1 text-xs text-muted-foreground">{row.staff.department||"No department"}</p><span className="mt-2 inline-flex rounded-full bg-muted px-2 py-1 text-xs font-black text-foreground">{row.count} active</span></div>):<Empty/>}</div></section>
  </div>;
}
function Metric({icon:Icon,label,value}:{icon:any;label:string;value:string|number}){return <div className="rounded-2xl border border-border bg-card p-4"><span className="grid size-9 place-items-center rounded-xl bg-muted text-muted-foreground"><Icon size={17}/></span><strong className="mt-3 block text-2xl text-foreground">{value}</strong><span className="mt-1 block text-xs font-bold text-muted-foreground">{label}</span></div>}
function Empty(){return <p className="text-xs text-muted-foreground">No data yet.</p>}
