"use client";
import "@/styles/admin-workflows.css";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Inbox, LoaderCircle, RefreshCw, Search, SlidersHorizontal } from "lucide-react";
import { categoryLabel, formatReportDate, REPORT_CATEGORIES, STATUS_META, type ReportStatus } from "@/features/civic/config";
import type { ReportPriority, ReportSummary } from "@/features/civic/types";
import { InteractiveMap } from "@/features/civic/components/interactive-map";

const priorities: ReportPriority[] = ["URGENT", "HIGH", "NORMAL", "LOW"];
const priorityOrder: Record<ReportPriority, number> = { URGENT: 0, HIGH: 1, NORMAL: 2, LOW: 3 };
const priorityTone: Record<ReportPriority, string> = {
  URGENT: "bg-danger-soft text-destructive border border-border", HIGH: "bg-warning-soft text-warning-foreground border border-border",
  NORMAL: "bg-muted text-foreground border border-border", LOW: "bg-muted text-muted-foreground border border-border",
};
const statusTone: Record<ReportStatus, string> = {
  SUBMITTED: "bg-muted text-link", UNDER_REVIEW: "bg-warning-soft text-warning-foreground",
  IN_PROGRESS: "bg-secondary text-secondary-foreground", PENDING_VERIFICATION: "bg-warning-soft text-warning-foreground", RESOLVED: "bg-success-soft text-success", REJECTED: "bg-danger-soft text-destructive", REOPENED: "bg-warning-soft text-warning-foreground",
};

type QueueMode = "ALL" | "UNASSIGNED" | "UNROUTED" | "MINE" | "NEEDS_REVIEW";
export function AdminReportsTable({ initialReports, viewerRole, viewerId, department }: {
  initialReports: ReportSummary[]; viewerRole: string; viewerId: string; department: string;
}) {
  const staff = viewerRole === "STAFF";
  const [reports, setReports] = useState(initialReports);
  const [cursor, setCursor] = useState<string | null>(initialReports.length === 200 ? initialReports.at(-1)!.id : null);
  const [status, setStatus] = useState<"ALL" | ReportStatus>("ALL");
  const [category, setCategory] = useState("ALL");
  const [priority, setPriority] = useState<"ALL" | ReportPriority>("ALL");
  const [mode, setMode] = useState<QueueMode>(staff ? "MINE" : "NEEDS_REVIEW");
  const [office, setOffice] = useState("ALL");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const officeNames = useMemo(() => [...new Set(reports.map(r => r.assignedOffice).filter((office): office is string => Boolean(office)))].sort(), [reports]);
  const filtered = useMemo(() => reports.filter(report => {
    if (status !== "ALL" && status !== report.status) return false;
    if (category !== "ALL" && category !== report.category) return false;
    if (priority !== "ALL" && priority !== report.priority) return false;
    if (office !== "ALL" && office !== report.assignedOffice) return false;
    if (mode === "UNROUTED" && report.assignedOffice) return false;
    if (mode === "UNASSIGNED" && (report.assignedStaffId || !report.assignedOffice)) return false;
    if (mode === "MINE" && report.assignedStaffId !== viewerId) return false;
    if (mode === "NEEDS_REVIEW" && !["SUBMITTED", "UNDER_REVIEW", "PENDING_VERIFICATION", "REOPENED"].includes(report.status)) return false;
    const text = [report.trackingId, report.title, report.barangay, report.reporterName, report.assignedOffice, report.assignedStaffName, categoryLabel(report.category)].join(" ").toLowerCase();
    return text.includes(query.trim().toLowerCase());
  }).sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority] || Date.parse(b.createdAt) - Date.parse(a.createdAt)), [reports, status, category, priority, mode, office, query, viewerId]);

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
  const mapped = filtered.filter(report => report.latitude !== null && report.latitude !== undefined && report.longitude !== null && report.longitude !== undefined).map(report => ({
    id: report.id, latitude: report.latitude!, longitude: report.longitude!, title: report.title, trackingId: report.trackingId, address: report.address,
    category: categoryLabel(report.category), status: STATUS_META[report.status].label, reporterName: report.reporterName,
    description: report.description, createdAt: formatReportDate(report.createdAt, true), photoId: report.photoId,
  }));
  return <div className="elb-admin-workflow space-y-5">
    <dl className="elb-kpi-band">{metrics.map(m => <div key={m.label}><dt>{m.label}</dt><dd>{m.value}</dd></div>)}</dl>
    <section className="elb-admin-sheet p-5" aria-label="Incident location map"><h2 className="mb-2 text-lg font-semibold">Reported locations</h2><p className="mb-3 text-sm text-muted-foreground">{mapped.length} mapped cases in this filtered view. Pins show the coordinates supplied by citizens; address-only cases remain in the queue.</p><InteractiveMap points={mapped} height={390} /></section>
    <section className="elb-admin-sheet" aria-label="Civic report queue">
      <div className="elb-admin-sheet-heading"><div><h2 className="mt-1 text-[19px] font-semibold text-foreground">{staff ? "My cases & office queue" : "Municipal report queue"}</h2><p className="mt-1 text-sm text-muted-foreground">{staff ? `Visible cases in ${department || "your department"} only.` : "Triage by priority, route to an office, and assign a responsible officer."} Filters apply to loaded cases.</p></div><button type="button" onClick={() => window.location.reload()} className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-xs font-bold text-foreground"><RefreshCw size={14}/> Refresh</button></div>
      <div className="elb-admin-filters">
        <label className="flex items-center gap-2 rounded-xl border border-input px-3 focus-within:outline-2 focus-within:outline-ring"><Search size={17} className="text-muted-foreground"/><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search ID, location, citizen…" className="h-11 w-full min-w-0 bg-transparent text-xs outline-none" aria-label="Search civic cases" /></label>
        <select value={mode} onChange={e => setMode(e.target.value as QueueMode)} className="elb-admin-field" aria-label="Case queue">
          <option value="ALL">All accessible</option><option value="NEEDS_REVIEW">Needs review / proof approval</option><option value="UNASSIGNED">Unclaimed officer</option>{!staff && <option value="UNROUTED">Not routed</option>}<option value="MINE">My assignments</option>
        </select>
        <select value={status} onChange={e => setStatus(e.target.value as "ALL" | ReportStatus)} className="elb-admin-field" aria-label="Status"><option value="ALL">All statuses</option>{(Object.keys(STATUS_META) as ReportStatus[]).map(key => <option key={key} value={key}>{STATUS_META[key].label}</option>)}</select>
        <select value={category} onChange={e => setCategory(e.target.value)} className="elb-admin-field" aria-label="Concern category"><option value="ALL">All categories</option>{REPORT_CATEGORIES.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}</select>
        <select value={priority} onChange={e => setPriority(e.target.value as "ALL" | ReportPriority)} className="elb-admin-field" aria-label="Priority"><option value="ALL">All priorities</option>{priorities.map(p => <option key={p} value={p}>{p[0] + p.slice(1).toLowerCase()}</option>)}</select>
        {!staff && <select value={office} title={office === "ALL" ? "All offices" : office} onChange={e => setOffice(e.target.value)} className="elb-admin-field" aria-label="Office"><option value="ALL">All offices</option>{officeNames.map(name => <option value={name} key={name}>{name}</option>)}</select>}
      </div>
      <div className="elb-admin-filter-footer"><span>{filtered.length} shown · {reports.length} loaded. Counts above describe loaded cases.</span><button className="elb-button" type="button" onClick={() => { setMode("ALL");setOffice("ALL");setPriority("ALL");setStatus("ALL");setCategory("ALL");setQuery(""); }}><SlidersHorizontal size={16}/> Clear filters</button></div><div className="overflow-x-auto" role="region" aria-label="Civic report results" tabIndex={0}><table className="elb-data-table elb-admin-data-table w-full min-w-[980px] text-left"><thead className="bg-card text-xs uppercase tracking-wider text-muted-foreground"><tr>{["Priority", "Tracking / Concern", "Barangay", "Status", "Office", "Responsible officer", "Action"].map(col => <th key={col} scope="col" className="px-5 py-3 font-bold">{col}</th>)}</tr></thead><tbody className="divide-y divide-border">{filtered.map(report => <tr key={report.id} className="hover:bg-card"><td className="px-5 py-4"><span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${priorityTone[report.priority]}`}>{report.priority}</span></td><td className="max-w-[250px] px-5 py-4"><span className="font-bold text-foreground">{report.trackingId}</span><p className="mt-1 font-semibold text-foreground" title={report.title}>{report.title}</p><span className="mt-1 block text-xs text-muted-foreground">{formatReportDate(report.createdAt)}</span></td><td className="px-5 py-4 text-foreground">{report.barangay}<span className="mt-1 block text-muted-foreground">{categoryLabel(report.category)}</span></td><td className="px-5 py-4"><span className={`rounded-full px-2.5 py-1 text-xs font-bold ${statusTone[report.status]}`}>{STATUS_META[report.status].label}</span></td><td className="min-w-[170px] max-w-[240px] px-5 py-4 text-muted-foreground">{report.assignedOffice || <span className="italic text-muted-foreground">Not routed</span>}</td><td className="px-5 py-4 text-muted-foreground">{report.assignedStaffName || <span className="italic text-muted-foreground">Unclaimed</span>}</td><td className="px-5 py-4"><Link href={`/admin/reports/${report.id}`} className="inline-flex items-center gap-1 font-bold text-foreground hover:underline">Open <ArrowUpRight size={13}/></Link></td></tr>)}</tbody></table></div>
      {office !== "ALL" && <p className="elb-help py-3">Office: {office}</p>}
      {filtered.length === 0 && <div className="flex flex-col items-center px-5 py-14 text-center"><Inbox size={30} className="text-muted-foreground"/><h3 className="mt-3 font-bold text-foreground">No cases match this view</h3><p className="mt-1 text-sm text-muted-foreground">Change a filter or clear the filters above to check the full accessible queue.</p></div>}
      <div className="flex items-center justify-between gap-4 border-t border-border px-5 py-4 text-xs text-muted-foreground"><span>{filtered.length} shown · {reports.length} loaded</span>{cursor ? <button onClick={loadMore} disabled={loading} className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 font-bold text-primary-foreground disabled:opacity-50">{loading && <LoaderCircle size={13} className="animate-spin"/>}Load more</button> : <span>All accessible cases loaded</span>}</div>{message && <p role="alert" className="px-5 pb-4 text-xs text-destructive">{message}</p>}
    </section>
  </div>;
}
