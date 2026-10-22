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
    <section className="rounded-[20px] border border-[#d8e7ee] bg-[linear-gradient(120deg,#edf7fb,#fff_65%,#fff9ed)] px-5 py-5 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div><p className="elb-admin-eyebrow">ONLINE LGU SERVICES</p><h1 className="mt-1 text-2xl font-black tracking-tight text-[#143f61]">Service Request Desk</h1><p className="mt-1 max-w-2xl text-xs leading-5 text-[#668395]">Process citizen requests through intake, document verification, scheduling, staff recommendation and final verification.</p></div>
        <div className="flex flex-wrap gap-2"><Link href="/services" className="rounded-xl border border-[#bad3df] bg-white px-3.5 py-2.5 text-[11px] font-extrabold text-[#286d8b]">Citizen catalog →</Link>{viewer.role === "ADMIN" && <><Link href="/admin/services/reports" className="inline-flex items-center gap-1.5 rounded-xl border border-[#bad3df] bg-white px-3.5 py-2.5 text-[11px] font-extrabold text-[#286d8b]"><BarChart3 size={13}/> Analytics</Link><Link href="/admin/services/catalog" className="inline-flex items-center gap-1.5 rounded-xl bg-[#175e80] px-3.5 py-2.5 text-[11px] font-extrabold text-white"><Settings2 size={13}/> Service Builder</Link></>}</div>
      </div>
    </section>

    <div className="grid gap-2 sm:grid-cols-3 xl:grid-cols-5">
      {metrics.map(([label, value, Icon, target]) => <Link key={label} href={`/admin/services?view=${target}`} className="group flex items-center gap-3 rounded-2xl border border-[#dfe9ee] bg-white px-4 py-3 transition hover:border-[#a9cddc]">
        <span className="grid size-9 place-items-center rounded-xl bg-[#eef6f9] text-[#347b98]"><Icon size={17}/></span>
        <div><strong className="block text-xl leading-none text-[#174a67]">{value}</strong><span className="mt-1 block text-[10px] font-bold text-[#718b9b]">{label}</span></div>
      </Link>)}
    </div>

    <section className="rounded-[18px] border border-[#dfe9ee] bg-white">
      <div className="flex gap-1 overflow-x-auto border-b border-[#e8eff2] px-3 pt-3">
        {workflowTabs.map(([key,label]) => <Link key={key || "all"} href={`/admin/services${key ? `?view=${key}` : ""}`} className={`whitespace-nowrap rounded-t-xl px-3 py-2 text-[10px] font-extrabold ${view === key ? "bg-[#edf6f9] text-[#17607f]" : "text-[#718997] hover:bg-[#f7fafb]"}`}>{label}</Link>)}
      </div>
      <form className="grid gap-2 p-3 md:grid-cols-[minmax(220px,1fr)_220px_160px_auto]" action="/admin/services">
        {view && <input type="hidden" name="view" value={view}/>} 
        <label className="relative"><Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8aa0ad]"/><input name="q" defaultValue={search} className="w-full rounded-xl border border-[#cfdee6] py-2.5 pl-9 pr-3 text-xs outline-none focus:border-[#5a9ab5]" placeholder="Tracking ID, citizen, email or service"/></label>
        <select name="service" defaultValue={serviceKey} className="rounded-xl border border-[#cfdee6] px-3 py-2.5 text-xs"><option value="">All services</option>{services.map(service => <option key={service.key} value={service.key}>{service.shortTitle}</option>)}</select>
        <label className="flex items-center gap-2 rounded-xl border border-[#dbe6ec] px-3 text-[10px] font-bold text-[#607e91]"><input type="checkbox" name="mine" value="1" defaultChecked={mine}/> Assigned to me</label>
        <button className="rounded-xl bg-[#175e80] px-4 py-2.5 text-[10px] font-extrabold text-white">Filter queue</button>
      </form>
    </section>

    <section className="overflow-hidden rounded-[18px] border border-[#dfe8ed] bg-white">
      <div className="flex items-center justify-between border-b border-[#eaf0f3] px-4 py-3"><div><h2 className="text-xs font-black text-[#214e69]">Accessible request queue</h2><p className="mt-0.5 text-[10px] text-[#8197a5]">{rows.length} request{rows.length === 1 ? "" : "s"}</p></div>{counts.completedCount > 0 && <Link href="/admin/services?view=closed" className="text-[10px] font-bold text-[#47788f]">{counts.completedCount} completed total</Link>}</div>
      {rows.length ? <div className="overflow-x-auto"><table className="w-full min-w-[940px] text-left text-xs">
        <thead className="bg-[#f7fafb] text-[9px] uppercase tracking-wider text-[#7d94a2]"><tr><th className="px-4 py-2.5">Request</th><th className="px-4 py-2.5">Citizen</th><th className="px-4 py-2.5">Status / next step</th><th className="px-4 py-2.5">Assigned</th><th className="px-4 py-2.5">Updated</th><th className="px-4 py-2.5"/></tr></thead>
        <tbody className="divide-y divide-[#edf2f4]">{rows.map((row:any) => {
          const key = isServiceStatus(row.status) ? row.status : "DRAFT";
          const meta = SERVICE_STATUS_META[key];
          return <tr key={row.id} className="hover:bg-[#fbfdfe]">
            <td className="px-4 py-3"><strong className="block text-[11px] text-[#287797]">{row.trackingId}</strong><span className="mt-0.5 block font-bold text-[#365e74]">{row.serviceTitle}</span></td>
            <td className="px-4 py-3"><strong className="block text-[#315a72]">{row.requester.name}</strong><span className="text-[10px] text-[#8497a4]">{row.requester.email}</span></td>
            <td className="px-4 py-3"><span className={`rounded-full px-2 py-1 text-[9px] font-extrabold ${meta.tone}`}>{meta.label}</span><span className="mt-1.5 block text-[10px] text-[#718997]">{nextStep(key)}</span></td>
            <td className="px-4 py-3 text-[10px] text-[#6f8796]">{row.assignedStaff?.name || row.assignedDepartment || "Unassigned"}{row.workAssignment?.status === "OFFERED" && <span className="mt-1 block text-[8px] font-black uppercase tracking-wide text-amber-700">Awaiting staff acceptance</span>}</td>
            <td className="px-4 py-3 text-[10px] text-[#8497a4]">{new Date(row.updatedAt).toLocaleString("en-PH", { month:"short", day:"numeric", hour:"numeric", minute:"2-digit" })}</td>
            <td className="px-4 py-3"><Link href={`/admin/services/${row.id}`} className="inline-flex items-center gap-1 rounded-lg bg-[#eef6f9] px-2.5 py-2 text-[10px] font-extrabold text-[#277594]">Open <ArrowRight size={12}/></Link></td>
          </tr>;
        })}</tbody>
      </table></div> : <div className="px-6 py-12 text-center text-xs text-[#8096a4]">No service requests match the current filters.</div>}
    </section>
  </div>;
}
