"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, ArrowUpRight, CheckCircle2, ClipboardList, Clock3, FileSearch, LoaderCircle, Plus, Search, SlidersHorizontal } from "lucide-react";
import type { ReportSummary } from "../types";
import { categoryLabel, formatReportDate, STATUS_META, type ReportStatus } from "../config";
import { ReportCard } from "./report-card";
import { StatusBadge } from "./status-badge";
import { RefreshControl } from "./refresh-control";
import s from "../civic.module.css";

const filters: { value: "ALL" | ReportStatus; label: string }[] = [
  { value: "ALL", label: "All reports" }, { value: "SUBMITTED", label: "Submitted" },
  { value: "UNDER_REVIEW", label: "Under review" }, { value: "IN_PROGRESS", label: "In progress" },
  { value: "PENDING_VERIFICATION", label: "Awaiting verification" }, { value: "REOPENED", label: "Reopened" }, { value: "RESOLVED", label: "Resolved" }, { value: "REJECTED", label: "Not accepted" },
];

export function ReportsWorkspace({ reports: initialReports, admin = false }: { reports: ReportSummary[]; admin?: boolean }) {
  const [olderReports, setOlderReports] = useState<ReportSummary[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(initialReports.length === 200 ? initialReports.at(-1)!.id : null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState("");
  const reports = useMemo(() => [...initialReports, ...olderReports.filter(report => !initialReports.some(current => current.id === report.id))], [initialReports, olderReports]);
  async function loadMore() {
    if (!nextCursor || loading) return;
    setLoading(true); setLoadError("");
    try {
      const response = await fetch(`${admin ? "/api/admin/reports" : "/api/reports"}?cursor=${encodeURIComponent(nextCursor)}`, { cache: "no-store" });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Could not load older reports.");
      setOlderReports(current => [...current, ...body.reports]); setNextCursor(body.nextCursor);
    } catch (issue) { setLoadError(issue instanceof Error ? issue.message : "Could not load older reports."); }
    finally { setLoading(false); }
  }
  const [status, setStatus] = useState<"ALL" | ReportStatus>("ALL");
  const [search, setSearch] = useState("");
  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return reports.filter(report => (status === "ALL" || status === report.status) &&
      (!term || [report.title, report.trackingId, report.barangay, report.assignedOffice, report.reporterName, categoryLabel(report.category)].join(" ").toLowerCase().includes(term)));
  }, [reports, status, search]);
  const submitted = reports.filter(report => report.status === "SUBMITTED").length;
  const active = reports.filter(report => report.status === "UNDER_REVIEW" || report.status === "IN_PROGRESS").length;
  const resolved = reports.filter(report => report.status === "RESOLVED").length;

  return <>
    <div className={`${s.hero} ${admin ? s.staffHero : ""}`}><div><span className={s.eyebrow}>{admin ? "LGU workspace / Community action desk" : "Your voice, on record"}</span><h1>{admin ? <>Every concern deserves<br /><em>a clear next step.</em></> : <>Your reports.<br /><em>Their journey to action.</em></>}</h1><p>{admin ? "Review the details, route concerns to the right office, and keep citizens informed." : "A place for every concern you raised—and every update along the way."}</p></div><div className={s.actions}>{admin ? <span className={s.staffTag}>STAFF ACCESS</span> : <Link className={s.primary} href="/reports/new"><Plus size={15} />Report a concern</Link>}<RefreshControl auto={!admin} /></div></div>
    <div className={s.stats} aria-label={admin ? "Report overview" : "My report overview"}>{[{ count: reports.length, label: nextCursor ? "Reports loaded" : "Reports on record", icon: ClipboardList }, { count: submitted, label: admin ? "Waiting for review" : "Submitted", icon: FileSearch }, { count: active, label: "Review & action", icon: Clock3 }, { count: resolved, label: "Resolved", icon: CheckCircle2 }].map(item => <div className={s.stat} key={item.label}><item.icon size={19} strokeWidth={1.5} /><strong>{item.count.toString().padStart(2, "0")}</strong><span>{item.label}</span></div>)}</div>
    <div className={s.workspaceToolbar}><div className={s.filters} role="group" aria-label="Filter reports by status">{filters.map(item => <button type="button" key={item.value} onClick={() => setStatus(item.value)} aria-pressed={status === item.value} className={`${s.filter} ${status === item.value ? s.filterActive : ""}`}>{item.label}<span>{item.value === "ALL" ? reports.length : reports.filter(report => report.status === item.value).length}</span></button>)}</div><div className={s.searchBox}><Search size={15} /><label htmlFor="report-search" className={s.srOnly}>Search reports</label><input id="report-search" className={s.input} type="search" value={search} onChange={event => setSearch(event.target.value)} placeholder={admin ? "Search ID, concern, or barangay" : "Search your reports"} /></div></div>
    {filtered.length === 0 ? <div className={s.emptyState}><div><span className={s.emptyIcon}>{reports.length ? <SlidersHorizontal size={25} /> : <ClipboardList size={25} strokeWidth={1.6} />}</span><h2>{reports.length ? "No reports match this view" : admin ? "The action desk is ready" : "Your first concern can start a change."}</h2><p>{reports.length ? "Try a different keyword or status to find the report you need." : admin ? "Submitted citizen reports will appear here, ready for review and assignment." : "Spotted something that needs attention? Add a photo and location to put it on the desk's radar."}</p>{reports.length ? <button type="button" className={s.secondary} onClick={() => { setSearch(""); setStatus("ALL"); }}>Clear filters</button> : !admin && <Link className={s.primary} href="/reports/new">Report a concern <ArrowRight size={15} /></Link>}</div></div> : admin ? <>
      <p className={s.resultCount} aria-live="polite">{filtered.length} {filtered.length === 1 ? "concern" : "concerns"} {status === "ALL" ? "in the action desk" : `· ${STATUS_META[status].label}`}</p>
      <div className={s.tableWrap}><table className={s.table}><thead><tr><th scope="col">Concern / tracking ID</th><th scope="col">Location</th><th scope="col">Status</th><th scope="col">Assigned office</th><th scope="col">Submitted</th><th scope="col"><span className={s.srOnly}>Open report</span></th></tr></thead><tbody>{filtered.map(report => <tr key={report.id}><td><Link href={`/admin/reports/${report.id}`}>{report.title}</Link><p className={s.trackingId}>{report.trackingId}</p></td><td>{report.barangay}<p>{categoryLabel(report.category)}</p></td><td><StatusBadge status={report.status} /></td><td>{report.assignedOffice || <span className={s.officeUnassigned}>Not assigned</span>}</td><td>{formatReportDate(report.createdAt)}<p>{report.reporterName}</p></td><td><Link href={`/admin/reports/${report.id}`} className={s.quiet} aria-label={`Review ${report.trackingId}`}><ArrowUpRight size={17} /></Link></td></tr>)}</tbody></table></div>
    </> : <div className={s.reportGrid}>{filtered.map(report => <ReportCard report={report} key={report.id} />)}</div>}
    {loadError && <p role="alert" className={s.alert}>{loadError}</p>}
    {nextCursor && <div className="mt-6 text-center"><button type="button" className={s.secondary} disabled={loading} onClick={() => void loadMore()}>{loading && <LoaderCircle size={14} className={s.spin} />}{loading ? "Loading reports…" : "Load older reports"}</button><p className={`${s.hint} mt-3`}>Counts and filters apply to the loaded reports. Load older records to include them.</p></div>}
    <div className={s.listFooter}><span>{filtered.length} of {reports.length} reports shown{nextCursor ? " · More records available below" : ""}</span><span>All timestamps use Philippine time.</span></div>
  </>;
}
