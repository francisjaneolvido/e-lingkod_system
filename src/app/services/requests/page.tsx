import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Building2, CalendarClock, CheckCircle2, FileText, RotateCcw } from "lucide-react";
import { requireCitizenPageViewer } from "@/lib/access";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { citizenServiceRequests } from "@/features/services/server/data";
import { SERVICE_STATUS_META, citizenServiceStatusLabel, citizenStatusGuidance } from "@/features/services/domain";
import { resolveServiceDefinition } from "@/features/services/server/catalog";

export const instant = false;
export const metadata: Metadata = { title: "My LGU Requests | eLingkod Bayan" };

export default async function MyServiceRequests() {
  const viewer = await requireCitizenPageViewer("/services/requests");
  const rows = await citizenServiceRequests(viewer.id);
  const definitions = await Promise.all([...new Set(rows.map(row => row.serviceKey))].map(key => resolveServiceDefinition(key, true)));
  const serviceMap = new Map(definitions.filter(Boolean).map(service => [service!.key, service!]));
  const actionCount = rows.filter(row => ["FORM_OPEN", "ACTION_REQUIRED", "SCHEDULED"].includes(row.status)).length;
  const activeCount = rows.filter(row => !["COMPLETED", "DECLINED", "CANCELLED"].includes(row.status)).length;
  const scheduledCount = rows.filter(row => ["SCHEDULED", "APPOINTMENT_CONFIRMED"].includes(row.status)).length;
  const completedCount = rows.filter(row => row.status === "COMPLETED").length;

  return <><SiteHeader viewer={{ name:viewer.name, email:viewer.email, role:viewer.role }}/><main className="min-h-screen bg-card px-5 py-7 sm:px-8"><div className="mx-auto max-w-[1040px]">
    <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs font-extrabold uppercase tracking-[.14em] text-foreground">ONLINE LGU SERVICES</p><h1 className="mt-1 text-2xl font-black text-foreground">My LGU Requests</h1><p className="mt-1 text-xs text-muted-foreground">Continue drafts, fix LGU findings, confirm schedules and track release or completion.</p></div><Link href="/services" className="rounded-xl bg-primary px-4 py-2.5 text-xs font-extrabold text-white">Request a service</Link></div>

    {rows.length > 0 && <div className="mt-5 grid gap-2 sm:grid-cols-4"><Stat icon={FileText} value={activeCount} label="Active"/><Stat icon={RotateCcw} value={actionCount} label="Need your action" highlight={actionCount > 0}/><Stat icon={CalendarClock} value={scheduledCount} label="Scheduled"/><Stat icon={CheckCircle2} value={completedCount} label="Completed"/></div>}

    {rows.length ? <div className="mt-5 space-y-2.5">{rows.map(row => {
      const meta = SERVICE_STATUS_META[row.status];
      const service = serviceMap.get(row.serviceKey) || null;
      const guidance = citizenStatusGuidance(row.status, service || undefined);
      const action = ["FORM_OPEN", "ACTION_REQUIRED", "SCHEDULED"].includes(row.status);
      return <Link key={row.id} href={`/services/requests/${row.id}`} className={`group grid gap-3 rounded-[17px] border bg-card p-4 transition sm:grid-cols-[minmax(0,1fr)_190px_auto] sm:items-center ${action ? "border-border ring-1 ring-border" : "border-border hover:border-border"}`}>
        <div className="flex min-w-0 items-start gap-3"><span className={`grid size-9 shrink-0 place-items-center rounded-xl ${action ? "bg-muted text-warning-foreground" : "bg-muted text-foreground"}`}><FileText size={17}/></span><div className="min-w-0"><span className="text-xs font-extrabold text-muted-foreground">{row.trackingId}</span><h2 className="mt-0.5 truncate text-[12px] font-black text-foreground">{row.serviceTitle}</h2><p className="mt-1 text-xs text-muted-foreground">{row.assignedDepartment || "LGU processing office"} · Updated {new Date(row.updatedAt).toLocaleString("en-PH", { month:"short", day:"numeric", hour:"numeric", minute:"2-digit" })}</p></div></div>
        <div className="min-w-0"><span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-extrabold ${meta.tone}`}>{citizenServiceStatusLabel(row.status, service || undefined)}</span><p className="mt-1.5 truncate text-xs font-bold text-muted-foreground">{guidance.action}</p></div>
        <ArrowRight size={15} className="hidden text-muted-foreground transition group-hover:translate-x-1 sm:block"/>
      </Link>;
    })}</div> : <div className="mt-6 rounded-[20px] border border-dashed border-border bg-card px-6 py-12 text-center"><Building2 className="mx-auto text-muted-foreground" size={30}/><h2 className="mt-3 text-base font-black text-foreground">No requests yet</h2><p className="mt-1.5 text-xs text-muted-foreground">Browse the catalog when you need a permit, certificate, clearance or assistance request.</p><Link href="/services" className="mt-4 inline-flex rounded-xl bg-primary px-4 py-2.5 text-xs font-extrabold text-white">Browse services</Link></div>}
  </div></main><SiteFooter/></>;
}

function Stat({ icon:Icon, value, label, highlight = false }: { icon:any; value:number; label:string; highlight?:boolean }) { return <div className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 ${highlight ? "border-border bg-card" : "border-border bg-card"}`}><Icon size={15} className={highlight ? "text-warning-foreground" : "text-muted-foreground"}/><div><strong className="block text-lg leading-none text-foreground">{value}</strong><span className="text-xs font-bold text-muted-foreground">{label}</span></div></div>; }
