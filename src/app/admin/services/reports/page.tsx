import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, BarChart3, Clock3, Download, Gauge, UsersRound } from "lucide-react";
import { requireSuperAdminPage } from "@/lib/access";
import { serviceAdminReport } from "@/features/services/server/data";
import { SERVICE_STATUS_META, isServiceStatus } from "@/features/services/domain";

export const instant = false;
export const metadata: Metadata = { title: "LGU Service Analytics | eLingkod Bayan" };

export default async function ServiceReportsPage(){
  await requireSuperAdminPage("/admin/services/reports");
  const report=await serviceAdminReport();
  return <div className="space-y-5">
    <div className="flex flex-wrap items-center justify-between gap-3"><Link href="/admin/services" className="inline-flex items-center gap-2 text-xs font-bold text-[#2b7596]"><ArrowLeft size={15}/> Service Request Desk</Link><a href="/api/admin/services/export" className="inline-flex items-center gap-2 rounded-xl bg-[#175e80] px-4 py-2.5 text-[10px] font-extrabold text-white"><Download size={14}/> Export request audit CSV</a></div>
    <header className="rounded-[20px] border border-[#d8e7ee] bg-[linear-gradient(120deg,#edf7fb,#fff_65%,#fff9ed)] p-5 sm:p-6"><p className="text-[10px] font-black uppercase tracking-[.14em] text-[#347d9d]">SUPER ADMIN · SERVICE PERFORMANCE</p><h1 className="mt-1.5 text-2xl font-black text-[#174663]">Online Services Analytics</h1><p className="mt-2 max-w-3xl text-xs leading-6 text-[#6e8999]">Thirty-day operational view for demand, throughput, turnaround and active staff workload. Counts are workflow metrics—not employee performance scores.</p></header>
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><Metric icon={BarChart3} label="Submitted · 30 days" value={report.submitted}/><Metric icon={Gauge} label="Completed · 30 days" value={report.completed}/><Metric icon={Clock3} label="Average turnaround" value={`${report.turnaroundHours}h`}/><Metric icon={UsersRound} label="Staff with active work" value={report.staffLoads.length}/></div>
    <div className="grid gap-4 xl:grid-cols-2">
      <section className="rounded-[18px] border border-[#dfe9ee] bg-white p-5"><h2 className="text-sm font-black text-[#214e69]">Requests by service · last 30 days</h2><div className="mt-4 space-y-2">{report.byService.length?report.byService.map(row=><div key={row.serviceKey} className="flex items-center justify-between rounded-xl bg-[#f7fafb] px-3 py-2.5"><span className="text-[11px] font-bold text-[#456b7e]">{row.serviceTitle}</span><strong className="text-sm text-[#1d607e]">{row._count._all}</strong></div>):<Empty/>}</div></section>
      <section className="rounded-[18px] border border-[#dfe9ee] bg-white p-5"><h2 className="text-sm font-black text-[#214e69]">Current workflow distribution</h2><div className="mt-4 space-y-2">{report.byStatus.map(row=>{const status=isServiceStatus(row.status)?row.status:"DRAFT";return <div key={row.status} className="flex items-center justify-between rounded-xl bg-[#f7fafb] px-3 py-2.5"><span className={`rounded-full px-2 py-1 text-[9px] font-black ${SERVICE_STATUS_META[status].tone}`}>{SERVICE_STATUS_META[status].label}</span><strong className="text-sm text-[#1d607e]">{row._count._all}</strong></div>})}</div></section>
    </div>
    <section className="rounded-[18px] border border-[#dfe9ee] bg-white p-5"><h2 className="text-sm font-black text-[#214e69]">Active workload distribution</h2><p className="mt-1 text-[10px] leading-5 text-[#8095a2]">Balanced assignment uses active accepted/offered work to spread new cases fairly. Super Admin can still override manually.</p><div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">{report.staffLoads.length?report.staffLoads.map((row:any)=><div key={row.staff.id} className="rounded-xl border border-[#e2eaee] p-3"><strong className="text-[11px] text-[#315b72]">{row.staff.name}</strong><p className="mt-1 text-[9px] text-[#8297a4]">{row.staff.department||"No department"}</p><span className="mt-2 inline-flex rounded-full bg-[#eef6f9] px-2 py-1 text-[9px] font-black text-[#347994]">{row.count} active</span></div>):<Empty/>}</div></section>
  </div>;
}
function Metric({icon:Icon,label,value}:{icon:any;label:string;value:string|number}){return <div className="rounded-2xl border border-[#dfe9ee] bg-white p-4"><span className="grid size-9 place-items-center rounded-xl bg-[#eef6f9] text-[#347b98]"><Icon size={17}/></span><strong className="mt-3 block text-2xl text-[#174a67]">{value}</strong><span className="mt-1 block text-[10px] font-bold text-[#718b9b]">{label}</span></div>}
function Empty(){return <p className="text-[11px] text-[#8ba0ac]">No data yet.</p>}
