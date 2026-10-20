"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Inbox, LoaderCircle, RefreshCw, Search, SlidersHorizontal } from "lucide-react";
import { categoryLabel, formatReportDate, STATUS_META, type ReportStatus } from "@/features/civic/config";
import type { ReportPriority, ReportSummary } from "@/features/civic/types";

const priorities: ReportPriority[] = ["URGENT", "HIGH", "NORMAL", "LOW"];
const priorityOrder: Record<ReportPriority, number> = { URGENT: 0, HIGH: 1, NORMAL: 2, LOW: 3 };
const priorityTone: Record<ReportPriority, string> = {
  URGENT: "bg-red-100 text-red-800 border border-red-200", HIGH: "bg-amber-100 text-amber-800 border border-amber-200",
  NORMAL: "bg-sky-50 text-sky-800 border border-sky-200", LOW: "bg-slate-100 text-slate-600 border border-slate-200",
};
const statusTone: Record<ReportStatus, string> = {
  SUBMITTED: "bg-blue-50 text-blue-700", UNDER_REVIEW: "bg-amber-50 text-amber-700",
  IN_PROGRESS: "bg-violet-50 text-violet-700", PENDING_VERIFICATION: "bg-orange-50 text-orange-800", RESOLVED: "bg-emerald-50 text-emerald-700", REJECTED: "bg-rose-50 text-rose-700", REOPENED: "bg-orange-100 text-orange-800",
};

type QueueMode = "ALL" | "UNASSIGNED" | "UNROUTED" | "MINE" | "NEEDS_REVIEW";
export function AdminReportsTable({ initialReports, viewerRole, viewerId, department }: {
  initialReports: ReportSummary[]; viewerRole: string; viewerId: string; department: string;
}) {
  const staff = viewerRole === "STAFF";
  const [reports, setReports] = useState(initialReports);
  const [cursor, setCursor] = useState<string | null>(initialReports.length === 200 ? initialReports.at(-1)!.id : null);
  const [status, setStatus] = useState<"ALL" | ReportStatus>("ALL");
  const [priority, setPriority] = useState<"ALL" | ReportPriority>("ALL");
  const [mode, setMode] = useState<QueueMode>(staff ? "MINE" : "NEEDS_REVIEW");
  const [office, setOffice] = useState("ALL");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const officeNames = useMemo(() => [...new Set(reports.map(r => r.assignedOffice).filter((office): office is string => Boolean(office)))].sort(), [reports]);
  const filtered = useMemo(() => reports.filter(report => {
    if (status !== "ALL" && status !== report.status) return false;
    if (priority !== "ALL" && priority !== report.priority) return false;
    if (office !== "ALL" && office !== report.assignedOffice) return false;
    if (mode === "UNROUTED" && report.assignedOffice) return false;
    if (mode === "UNASSIGNED" && (report.assignedStaffId || !report.assignedOffice)) return false;
    if (mode === "MINE" && report.assignedStaffId !== viewerId) return false;
    if (mode === "NEEDS_REVIEW" && !["SUBMITTED", "UNDER_REVIEW", "PENDING_VERIFICATION", "REOPENED"].includes(report.status)) return false;
    const text = [report.trackingId, report.title, report.barangay, report.reporterName, report.assignedOffice, report.assignedStaffName, categoryLabel(report.category)].join(" ").toLowerCase();
    return text.includes(query.trim().toLowerCase());
  }).sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority] || Date.parse(b.createdAt) - Date.parse(a.createdAt)), [reports, status, priority, mode, office, query, viewerId]);

  async function loadMore() {
    if (!cursor || loading) return;
    setLoading(true); setMessage("");
    try {
      const res = await fetch(`/api/admin/reports?cursor=${encodeURIComponent(cursor)}`, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not load more reports.");
      setReports(current => [...current, ...(data.reports as ReportSummary[]).filter(entry => !current.some(other => other.id === entry.id))]);
      setCursor(data.nextCursor);
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not load older cases."); }
    finally { setLoading(false); }
  }
  const metrics = [
    { label: "Loaded cases", value: reports.length },
    { label: "Awaiting triage", value: reports.filter(r => ["SUBMITTED", "UNDER_REVIEW"].includes(r.status)).length },
    { label: "High / urgent", value: reports.filter(r => ["HIGH", "URGENT"].includes(r.priority) && r.status !== "RESOLVED" && r.status !== "REJECTED").length },
    { label: staff ? "My cases" : "Unassigned officer", value: reports.filter(r => staff ? r.assignedStaffId === viewerId : Boolean(r.assignedOffice) && !r.assignedStaffId).length },
  ];
  return <div className="space-y-5">
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{metrics.map(m => <div key={m.label} className="rounded-2xl border border-[#e0e9f0] bg-white p-5"><p className="text-[11px] font-semibold text-[#758ea1]">{m.label}</p><strong className="mt-2 block text-[27px] font-extrabold text-[#194b6b]">{m.value}</strong></div>)}</div>
    <section className="overflow-hidden rounded-2xl border border-[#dae7f0] bg-white shadow-[0_8px_24px_rgba(20,55,90,.035)]">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#edf1f6] p-5 sm:px-6"><div><p className="text-[10px] font-bold tracking-[.15em] text-[#4289a6]">CIVIC CASE DESK</p><h2 className="mt-1 text-[19px] font-extrabold text-[#194a6c]">{staff ? "My cases & office queue" : "Municipal report queue"}</h2><p className="mt-1 text-[12px] text-[#8398a8]">{staff ? `Visible cases in ${department || "your department"} only.` : "Triage by priority, route to an office, and assign a responsible officer."} Filters apply to loaded cases.</p></div><button type="button" onClick={() => window.location.reload()} className="inline-flex items-center gap-2 rounded-lg border border-[#d9e6ef] px-3 py-2 text-xs font-bold text-[#27577d]"><RefreshCw size={14}/> Refresh</button></div>
      <div className="grid gap-3 p-5 sm:px-6 lg:grid-cols-[minmax(190px,1fr)_repeat(4,minmax(115px,auto))]">
        <label className="flex items-center gap-2 rounded-xl border border-[#dce6ee] px-3"><Search size={17} className="text-[#7991a6]"/><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search ID, location, citizen…" className="h-11 w-full min-w-0 bg-transparent text-xs outline-none" aria-label="Search civic cases" /></label>
        <select value={mode} onChange={e => setMode(e.target.value as QueueMode)} className="elb-admin-field" aria-label="Case queue">
          <option value="ALL">All accessible</option><option value="NEEDS_REVIEW">Needs review / proof approval</option><option value="UNASSIGNED">Unclaimed officer</option>{!staff && <option value="UNROUTED">Not routed</option>}<option value="MINE">My assignments</option>
        </select>
        <select value={status} onChange={e => setStatus(e.target.value as "ALL" | ReportStatus)} className="elb-admin-field" aria-label="Status"><option value="ALL">All statuses</option>{(Object.keys(STATUS_META) as ReportStatus[]).map(key => <option key={key} value={key}>{STATUS_META[key].label}</option>)}</select>
        <select value={priority} onChange={e => setPriority(e.target.value as "ALL" | ReportPriority)} className="elb-admin-field" aria-label="Priority"><option value="ALL">All priorities</option>{priorities.map(p => <option key={p} value={p}>{p[0] + p.slice(1).toLowerCase()}</option>)}</select>
        {!staff && <select value={office} onChange={e => setOffice(e.target.value)} className="elb-admin-field" aria-label="Office"><option value="ALL">All offices</option>{officeNames.map(name => <option value={name} key={name}>{name}</option>)}</select>}
      </div>
      <div className="overflow-x-auto"><table className="w-full min-w-[980px] text-left text-xs"><thead className="bg-[#f5f8fb] text-[10px] uppercase tracking-wider text-[#7890a4]"><tr>{["Priority", "Tracking / Concern", "Barangay", "Status", "Office", "Responsible officer", "Action"].map(col => <th key={col} scope="col" className="px-5 py-3 font-bold">{col}</th>)}</tr></thead><tbody className="divide-y divide-[#edf2f6]">{filtered.map(report => <tr key={report.id} className="hover:bg-[#f8fbfd]"><td className="px-5 py-4"><span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-extrabold ${priorityTone[report.priority]}`}>{report.priority}</span></td><td className="max-w-[250px] px-5 py-4"><span className="font-bold text-[#1971a7]">{report.trackingId}</span><p className="mt-1 truncate font-semibold text-[#284b68]" title={report.title}>{report.title}</p><span className="mt-1 block text-[10px] text-[#8b9dae]">{formatReportDate(report.createdAt)}</span></td><td className="px-5 py-4 text-[#42637b]">{report.barangay}<span className="mt-1 block text-[#899bad]">{categoryLabel(report.category)}</span></td><td className="px-5 py-4"><span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${statusTone[report.status]}`}>{STATUS_META[report.status].label}</span></td><td className="max-w-[150px] px-5 py-4 text-[#5d7a90]">{report.assignedOffice || <span className="italic text-[#9ca9b6]">Not routed</span>}</td><td className="px-5 py-4 text-[#5d7a90]">{report.assignedStaffName || <span className="italic text-[#9ca9b6]">Unclaimed</span>}</td><td className="px-5 py-4"><Link href={`/admin/reports/${report.id}`} className="inline-flex items-center gap-1 font-bold text-[#1a74a5] hover:underline">Open <ArrowUpRight size={13}/></Link></td></tr>)}</tbody></table></div>
      {filtered.length === 0 && <div className="flex flex-col items-center px-5 py-14 text-center"><Inbox size={30} className="text-[#9fb5c5]"/><h3 className="mt-3 font-bold text-[#24536c]">No cases match this view</h3><p className="mt-1 text-xs text-[#8397a7]">Try another filter or check the office queue.</p><button className="mt-3 inline-flex items-center gap-2 text-xs font-bold text-[#267a9a]" type="button" onClick={() => { setMode("ALL");setOffice("ALL");setPriority("ALL");setStatus("ALL");setQuery(""); }}><SlidersHorizontal size={14}/> Clear filters</button></div>}
      <div className="flex items-center justify-between gap-4 border-t border-[#edf1f6] px-5 py-4 text-[11px] text-[#7890a5]"><span>{filtered.length} shown · {reports.length} loaded</span>{cursor ? <button onClick={loadMore} disabled={loading} className="inline-flex items-center gap-2 rounded-lg bg-[#17466c] px-4 py-2 font-bold text-white disabled:opacity-50">{loading && <LoaderCircle size={13} className="animate-spin"/>}Load more</button> : <span>All accessible cases loaded</span>}</div>{message && <p role="alert" className="px-5 pb-4 text-xs text-red-600">{message}</p>}
    </section>
  </div>;
}
