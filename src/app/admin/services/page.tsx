import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BarChart3, CalendarClock, CheckCircle2, ClipboardList, Hourglass, Inbox, Search, Settings2 } from "lucide-react";
import { requireModulePage } from "@/lib/access";
import { adminServiceQueue, serviceDashboardCounts } from "@/features/services/server/data";
import { publishedServiceCatalog } from "@/features/services/server/catalog";
import { SERVICE_STATUS_META, isServiceStatus, type ServiceRequestStatus } from "@/features/services/domain";

export const instant = false;
export const metadata: Metadata = { title: "Online LGU Services | Admin" };

const workflowTabs = [
  ["", "All"], ["new", "New / intake"], ["review", "In review"], ["action", "Citizen action"], ["schedule", "Scheduled"], ["final", "Final / release"], ["closed", "Closed"],
] as const;

function nextStep(status: ServiceRequestStatus) {
  const steps: Record<ServiceRequestStatus,string> = {
    DRAFT: "Citizen completing draft", FOR_TRIAGE: "Screen intake", FORM_OPEN: "Citizen completing full form", SUBMITTED: "Assign / start review",
    ASSIGNED: "Start requirements review", UNDER_REVIEW: "Verify form & documents", ACTION_REQUIRED: "Wait for citizen correction", VALIDATED: "Schedule or recommend",
    SCHEDULED: "Citizen confirmation", APPOINTMENT_CONFIRMED: "Conduct scheduled activity", APPOINTMENT_COMPLETED: "Submit staff recommendation", FOR_FINAL_VERIFICATION: "Super Admin verification", READY_FOR_RELEASE: "Release / deliver service",
    COMPLETED: "Completed", DECLINED: "Closed", CANCELLED: "Cancelled",
  };
  return steps[status];
}

export default async function AdminServicesPage({ searchParams }: { searchParams: Promise<Record<string,string|string[]|undefined>> }) {
  const viewer=await requireModulePage("/admin/services","SERVICES");
  const query = await searchParams;
  const status = typeof query.status === "string" ? query.status : "";
  const serviceKey = typeof query.service === "string" ? query.service : "";
  const search = typeof query.q === "string" ? query.q : "";
  const view = typeof query.view === "string" ? query.view : "";
  const mine = query.mine === "1";
  const [rows, counts, services] = await Promise.all([
    adminServiceQueue(viewer, { status, serviceKey, mine, query: search, view }),
    serviceDashboardCounts(viewer),
    publishedServiceCatalog(),
  ]);

  const metrics = [
    ["New / intake", counts.newCount, Inbox, "new"],
    ["In review", counts.assignedCount, ClipboardList, "review"],
    ["Citizen action", counts.actionCount, Hourglass, "action"],
    ["Scheduled", counts.scheduledCount, CalendarClock, "schedule"],
    ["Final / release", counts.finalCount, CheckCircle2, "final"],
  ] as const;

  return <div className="space-y-4">
    <section className="rounded-[20px] border border-border bg-muted px-5 py-5 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div><p className="elb-admin-eyebrow">ONLINE LGU SERVICES</p><h1 className="mt-1 text-2xl font-black tracking-tight text-foreground">Service Request Desk</h1><p className="mt-1 max-w-2xl text-xs leading-5 text-muted-foreground">Process citizen requests through intake, document verification, scheduling, staff recommendation and final verification.</p></div>
        <div className="flex flex-wrap gap-2"><Link href="/services" className="rounded-xl border border-border bg-card px-3.5 py-2.5 text-xs font-extrabold text-foreground">Citizen catalog →</Link>{viewer.role === "ADMIN" && <><Link href="/admin/services/reports" className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-3.5 py-2.5 text-xs font-extrabold text-foreground"><BarChart3 size={13}/> Analytics</Link><Link href="/admin/services/catalog" className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-3.5 py-2.5 text-xs font-extrabold text-white"><Settings2 size={13}/> Service Builder</Link></>}</div>
      </div>
    </section>

    <div className="grid gap-2 sm:grid-cols-3 xl:grid-cols-5">
      {metrics.map(([label, value, Icon, target]) => <Link key={label} href={`/admin/services?view=${target}`} className="group flex items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3 transition hover:border-border">
        <span className="grid size-9 place-items-center rounded-xl bg-muted text-muted-foreground"><Icon size={17}/></span>
        <div><strong className="block text-xl leading-none text-foreground">{value}</strong><span className="mt-1 block text-xs font-bold text-muted-foreground">{label}</span></div>
      </Link>)}
    </div>

    <section className="rounded-[18px] border border-border bg-card">
      <div className="flex gap-1 overflow-x-auto border-b border-border px-3 pt-3">
        {workflowTabs.map(([key,label]) => <Link key={key || "all"} href={`/admin/services${key ? `?view=${key}` : ""}`} className={`whitespace-nowrap rounded-t-xl px-3 py-2 text-xs font-extrabold ${view === key ? "bg-muted text-foreground" : "text-muted-foreground hover:bg-card"}`}>{label}</Link>)}
      </div>
      <form className="grid gap-2 p-3 md:grid-cols-[minmax(220px,1fr)_220px_160px_auto]" action="/admin/services">
        {view && <input type="hidden" name="view" value={view}/>} 
        <label className="relative"><Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"/><input name="q" defaultValue={search} className="w-full rounded-xl border border-border py-2.5 pl-9 pr-3 text-xs outline-none focus:border-border" placeholder="Tracking ID, citizen, email or service"/></label>
        <select name="service" defaultValue={serviceKey} className="rounded-xl border border-border px-3 py-2.5 text-xs"><option value="">All services</option>{services.map(service => <option key={service.key} value={service.key}>{service.shortTitle}</option>)}</select>
        <label className="flex items-center gap-2 rounded-xl border border-border px-3 text-xs font-bold text-muted-foreground"><input type="checkbox" name="mine" value="1" defaultChecked={mine}/> Assigned to me</label>
        <button className="rounded-xl bg-primary px-4 py-2.5 text-xs font-extrabold text-white">Filter queue</button>
      </form>
    </section>

    <section className="overflow-hidden rounded-[18px] border border-border bg-card">
      <div className="flex items-center justify-between border-b border-border px-4 py-3"><div><h2 className="text-xs font-black text-foreground">Accessible request queue</h2><p className="mt-0.5 text-xs text-muted-foreground">{rows.length} request{rows.length === 1 ? "" : "s"}</p></div>{counts.completedCount > 0 && <Link href="/admin/services?view=closed" className="text-xs font-bold text-muted-foreground">{counts.completedCount} completed total</Link>}</div>
      {rows.length ? <div className="overflow-x-auto"><table className="w-full min-w-[940px] text-left text-xs">
        <thead className="bg-card text-xs uppercase tracking-wider text-muted-foreground"><tr><th className="px-4 py-2.5">Request</th><th className="px-4 py-2.5">Citizen</th><th className="px-4 py-2.5">Status / next step</th><th className="px-4 py-2.5">Assigned</th><th className="px-4 py-2.5">Updated</th><th className="px-4 py-2.5"/></tr></thead>
        <tbody className="divide-y divide-border">{rows.map((row) => {
  const key: ServiceRequestStatus = isServiceStatus(row.status)
    ? row.status
    : "DRAFT";

  const meta = SERVICE_STATUS_META[key];
          return <tr key={row.id} className="hover:bg-card">
            <td className="px-4 py-3"><strong className="block text-xs text-foreground">{row.trackingId}</strong><span className="mt-0.5 block font-bold text-foreground">{row.serviceTitle}</span></td>
            <td className="px-4 py-3"><strong className="block text-foreground">{row.requester.name}</strong><span className="text-xs text-muted-foreground">{row.requester.email}</span></td>
            <td className="px-4 py-3"><span className={`rounded-full px-2 py-1 text-xs font-extrabold ${meta.tone}`}>{meta.label}</span><span className="mt-1.5 block text-xs text-muted-foreground">{nextStep(key)}</span></td>
            <td className="px-4 py-3 text-xs text-muted-foreground">{row.assignedStaff?.name || row.assignedDepartment || "Unassigned"}{row.workAssignment?.status === "OFFERED" && <span className="mt-1 block text-xs font-black uppercase tracking-wide text-amber-700">Awaiting staff acceptance</span>}</td>
            <td className="px-4 py-3 text-xs text-muted-foreground">{new Date(row.updatedAt).toLocaleString("en-PH", { month:"short", day:"numeric", hour:"numeric", minute:"2-digit" })}</td>
            <td className="px-4 py-3"><Link href={`/admin/services/${row.id}`} className="inline-flex items-center gap-1 rounded-lg bg-muted px-2.5 py-2 text-xs font-extrabold text-foreground">Open <ArrowRight size={12}/></Link></td>
          </tr>;
        })}</tbody>
      </table></div> : <div className="px-6 py-12 text-center text-xs text-muted-foreground">No service requests match the current filters.</div>}
    </section>
  </div>;
}
