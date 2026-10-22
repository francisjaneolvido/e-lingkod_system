"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import {
  BellRing, CheckCircle2, ChevronDown, ExternalLink, FilePlus2, PhoneCall,
  Plus, ShieldAlert, ShieldCheck,
} from "lucide-react";
import { ALERT_SEVERITIES, HOTLINE_CATEGORIES, LOS_BANOS_BARANGAYS } from "@/features/emergency/domain";

// The server still determines who may view, submit, approve and publish records.
type Hotline = {
  id: string; title: string; category: string; office: string; phone: string;
  extension: string | null; note: string | null; sourceUrl: string;
  isActive: boolean; verifiedAt: string;
};
type Proposal = {
  id: string; targetId: string | null; operation: string; title: string; category: string;
  office: string; phone: string; extension: string | null; note: string | null;
  sourceUrl: string; status: string; submittedById: string; reviewedById: string | null;
  reviewNote: string | null; createdAt: string;
};
type Alert = {
  id: string; title: string; details: string; safetyInstructions: string;
  sourceUrl: string; issuingOffice: string; severity: string; barangays: string[];
  status: string; createdById: string; reviewNote: string | null; startsAt: string;
  expiresAt: string; publishedAt: string | null; createdAt: string;
};

const labelClass = "mb-1 block text-xs font-bold text-[#345e78]";
const inputClass = "min-h-11 w-full rounded-lg border border-[#ccdfe9] bg-white px-3 py-2 text-sm text-[#183f5b] outline-none focus-visible:ring-2 focus-visible:ring-[#86bedf]";
const primaryButton = "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[#16547a] px-4 py-2 text-xs font-extrabold text-white hover:bg-[#246d96] disabled:cursor-not-allowed disabled:opacity-50";
const secondaryButton = "inline-flex min-h-11 items-center justify-center gap-1 rounded-lg border border-[#ccdee9] bg-white px-3 py-2 text-xs font-bold text-[#225d80] hover:bg-[#f1f7fb] disabled:cursor-not-allowed disabled:opacity-50";
const panelClass = "rounded-2xl border border-[#d9e6ed] bg-white p-4 sm:p-5";
const statusLabels: Record<string, string> = {
  DRAFT: "Draft", RETURNED: "Returned", PENDING_REVIEW: "For review",
  PUBLISHED: "Published", ARCHIVED: "Archived", PENDING: "For verification",
  APPROVED: "Approved",
};
const statusColors: Record<string, string> = {
  PENDING_REVIEW: "bg-amber-100 text-amber-900",
  PENDING: "bg-amber-100 text-amber-900",
  RETURNED: "bg-orange-100 text-orange-900",
  PUBLISHED: "bg-emerald-100 text-emerald-800",
  APPROVED: "bg-emerald-100 text-emerald-800",
  ARCHIVED: "bg-slate-100 text-slate-700",
  DRAFT: "bg-sky-100 text-sky-900",
};
const officeSuggestions = [
  "Municipal Disaster Risk Reduction and Management Office (MDRRMO)",
  "Municipal Operations Center (OpCen)",
  "Public Information Office (PIO)",
  "Municipal Health Office (MHO)",
  "Municipal Social Welfare and Development Office (MSWDO)",
  "Los Baños Police Station", "Los Baños Fire Station", "Municipal Mayor's Office",
];
const formatDate = (value: string) => new Date(value).toLocaleString("en-PH", {
  dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Manila",
});
function datetimeInput(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.valueOf())) return "";
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}
const newHotline = {
  targetId: "", title: "", category: "RESCUE", office: "", phone: "",
  extension: "", note: "", sourceUrl: "",
};
const blankAlert = {
  title: "", details: "", safetyInstructions: "", issuingOffice: "", sourceUrl: "",
  severity: "ADVISORY", barangays: [] as string[], startsAt: "", expiresAt: "",
};

export function EmergencyConsole({ viewerId, admin, department, hotlines, proposals, alerts }: {
  viewerId: string; admin: boolean; department: string;
  hotlines: Hotline[]; proposals: Proposal[]; alerts: Alert[];
}) {
  const [section, setSection] = useState<"alerts" | "hotlines">("alerts");
  const [hotline, setHotline] = useState(newHotline);
  const [alert, setAlert] = useState({ ...blankAlert, issuingOffice: department });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAlertEditor, setShowAlertEditor] = useState(false);
  const [showHotlineEditor, setShowHotlineEditor] = useState(false);
  const [showBarangays, setShowBarangays] = useState(true);
  const [alertFilter, setAlertFilter] = useState<"ACTION" | "PUBLISHED" | "ALL">("ACTION");
  const [hotlineFilter, setHotlineFilter] = useState<"PENDING" | "ALL">("PENDING");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [notes, setNotes] = useState<Record<string, string>>({});
  const titleRef = useRef<HTMLInputElement>(null);
  const hotlineTitleRef = useRef<HTMLInputElement>(null);

  const pendingAlerts = alerts.filter(item => item.status === "PENDING_REVIEW").length;
  const publishedAlerts = alerts.filter(item => item.status === "PUBLISHED").length;
  const pendingHotlines = proposals.filter(item => item.status === "PENDING").length;
  const actionStatus = admin ? ["PENDING_REVIEW", "RETURNED", "DRAFT"] : ["DRAFT", "RETURNED", "PENDING_REVIEW"];
  const sortedAlerts = [...alerts].sort((left, right) => {
    const leftRank = actionStatus.includes(left.status) ? actionStatus.indexOf(left.status) : 10;
    const rightRank = actionStatus.includes(right.status) ? actionStatus.indexOf(right.status) : 10;
    return leftRank !== rightRank ? leftRank - rightRank : Date.parse(right.createdAt) - Date.parse(left.createdAt);
  });
  const filteredAlerts = sortedAlerts.filter(item =>
    alertFilter === "ALL" || (alertFilter === "PUBLISHED" ? item.status === "PUBLISHED" :
      admin ? item.status === "PENDING_REVIEW" : ["DRAFT", "RETURNED", "PENDING_REVIEW"].includes(item.status)),
  );
  const filteredProposals = proposals.filter(item => hotlineFilter === "ALL" || item.status === "PENDING");

  useEffect(() => { if (showAlertEditor) titleRef.current?.focus(); }, [showAlertEditor, editingId]);
  useEffect(() => { if (showHotlineEditor) hotlineTitleRef.current?.focus(); }, [showHotlineEditor]);

  async function perform(payload: Record<string, unknown>) {
    setBusy(true); setError(""); setMessage("");
    try {
      const response = await fetch("/api/admin/emergency", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
      });
      const result = await response.json() as { ok?: boolean; error?: string };
      if (!response.ok || !result.ok) throw new Error(result.error || "Could not save this change.");
      setMessage("Saved. Loading the updated queue…");
      window.location.reload();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Something went wrong.");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } finally { setBusy(false); }
  }

  function submitHotline(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void perform({ action: "hotline.propose", operation: hotline.targetId ? "UPDATE" : "ADD",
      ...hotline, targetId: hotline.targetId || null });
  }
  function submitAlert(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!alert.barangays.length) { setError("Choose at least one affected barangay."); return; }
    if (!alert.startsAt || !alert.expiresAt) { setError("Enter both start and expiry dates."); return; }
    const startsAt = new Date(alert.startsAt);
    const expiresAt = new Date(alert.expiresAt);
    if (Number.isNaN(startsAt.getTime()) || Number.isNaN(expiresAt.getTime()) || expiresAt <= startsAt) {
      setError("Choose a valid expiry after the start date."); return;
    }
    void perform({ action: "alert.save", id: editingId, ...alert,
      startsAt: startsAt.toISOString(), expiresAt: expiresAt.toISOString() });
  }
  function startNewAlert() {
    setSection("alerts"); setEditingId(null); setError("");
    setAlert({ ...blankAlert, barangays: [], issuingOffice: department });
    setShowBarangays(true); setShowAlertEditor(true);
  }
  function editExisting(row: Alert) {
    setSection("alerts"); setEditingId(row.id); setError("");
    setAlert({ title: row.title, details: row.details, safetyInstructions: row.safetyInstructions,
      sourceUrl: row.sourceUrl, issuingOffice: row.issuingOffice, severity: row.severity,
      barangays: [...row.barangays], startsAt: datetimeInput(row.startsAt), expiresAt: datetimeInput(row.expiresAt) });
    setShowBarangays(true); setShowAlertEditor(true);
  }
  function startNewHotline() {
    setSection("hotlines"); setHotline(newHotline); setShowHotlineEditor(true); setError("");
  }
  function reviewNote(id: string) { return notes[id] ?? ""; }
  const badge = (status: string) => <span className={`rounded-md px-2 py-0.5 text-[11px] font-bold ${statusColors[status] || "bg-slate-100 text-slate-800"}`}>{statusLabels[status] || status}</span>;

  return (
    <div className="space-y-4 text-[#183f5b]">
      <header className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#d8e7ef] bg-[linear-gradient(100deg,#eef8fc,#fff)] px-4 py-4 sm:px-5">
        <div className="min-w-0"><p className="text-[11px] font-extrabold uppercase tracking-wider text-[#35769a]">Los Baños · {admin ? "Super Admin" : department || "LGU Staff"}</p>
          <h1 className="mt-0.5 flex items-center gap-2 text-xl font-black"><ShieldAlert size={21} aria-hidden="true" /> Emergency Desk</h1>
          <p className="mt-1 text-xs text-[#597a8e]">{admin ? "Review and publish verified hotlines and advisories." : "Submit source-backed advisories and hotline updates for approval."}</p>
        </div>
        <Link href="/emergency" target="_blank" className={secondaryButton}>Citizen view <ExternalLink size={14} aria-hidden="true" /></Link>
      </header>

      <div className="grid grid-cols-3 gap-2" aria-label="Emergency desk summary">
        {[
          { label: "Alert reviews", value: pendingAlerts },
          { label: "Published", value: publishedAlerts },
          { label: "Hotline reviews", value: pendingHotlines },
        ].map(card => <div key={card.label} className="rounded-xl border border-[#d9e6ed] bg-white px-3 py-2.5"><p className="text-[11px] font-semibold text-[#668298]">{card.label}</p><strong className="text-xl font-black tabular-nums">{card.value}</strong></div>)}
      </div>

      <div className="flex flex-wrap gap-2 border-b border-[#d8e6ee] pb-2" role="tablist" aria-label="Emergency desk sections">
        <button type="button" role="tab" aria-selected={section === "alerts"} onClick={() => setSection("alerts")} className={`inline-flex min-h-11 items-center gap-2 rounded-lg px-4 text-sm font-bold ${section === "alerts" ? "bg-[#155277] text-white" : "bg-white text-[#245f80]"}`}><BellRing size={16} aria-hidden="true" /> Advisories</button>
        <button type="button" role="tab" aria-selected={section === "hotlines"} onClick={() => setSection("hotlines")} className={`inline-flex min-h-11 items-center gap-2 rounded-lg px-4 text-sm font-bold ${section === "hotlines" ? "bg-[#155277] text-white" : "bg-white text-[#245f80]"}`}><PhoneCall size={16} aria-hidden="true" /> Hotlines</button>
      </div>
      {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-800">{error}</div>}
      {message && <div role="status" className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">{message}</div>}

      {section === "alerts" ? (
        <div className="space-y-3">
          <section className={panelClass} aria-labelledby="alert-list-heading">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div><h2 id="alert-list-heading" className="text-base font-extrabold">{admin ? "Advisory review queue" : "My advisories"}</h2><p className="text-[11px] text-[#698397]">Review the source before any publication.</p></div>
              <div className="flex flex-wrap gap-2">
                <label><span className="sr-only">Filter advisories</span><select className="min-h-11 rounded-lg border border-[#cadde9] bg-white px-2 text-xs" value={alertFilter} onChange={event => setAlertFilter(event.target.value as typeof alertFilter)}><option value="ACTION">{admin ? "Needs review" : "In progress"}</option><option value="PUBLISHED">Published</option><option value="ALL">All statuses</option></select></label>
                <button type="button" className={primaryButton} onClick={startNewAlert}><Plus size={16} aria-hidden="true" /> New advisory</button>
              </div>
            </div>
            <div className="mt-3 divide-y divide-[#e6eef2]">
              {filteredAlerts.map(item => (
                <article key={item.id} className="py-3 first:pt-0 last:pb-0">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2">{badge(item.status)}<span className="text-[11px] font-semibold text-[#718a99]">{item.severity}</span></div><h3 className="mt-1 text-sm font-extrabold">{item.title}</h3><p className="text-[11px] text-[#698497]">{item.issuingOffice} · Expires {formatDate(item.expiresAt)}</p></div>
                    <a href={item.sourceUrl} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-10 items-center gap-1 text-xs font-bold text-[#226c95] underline">Verify source <ExternalLink size={13} aria-hidden="true" /></a>
                  </div>
                  <details className="group mt-1 text-xs text-[#527287]"><summary className="inline-flex min-h-8 cursor-pointer list-none items-center gap-1 font-semibold text-[#276b92] marker:hidden [&::-webkit-details-marker]:hidden">View details and safety instructions <ChevronDown size={14} className="transition-transform group-open:rotate-180" aria-hidden="true" /></summary>
                    <div className="space-y-2 rounded-lg bg-[#f5f9fc] p-3 leading-5"><p className="whitespace-pre-wrap">{item.details}</p><p><strong>Safety:</strong> {item.safetyInstructions}</p><p><strong>Barangays:</strong> {item.barangays.join(", ")}</p><p>Start {formatDate(item.startsAt)}</p>{item.reviewNote && <p className="text-amber-900">Reviewer note: {item.reviewNote}</p>}</div>
                  </details>
                  {item.reviewNote && item.status === "RETURNED" && <p className="mt-1 text-xs font-semibold text-amber-800">Returned: {item.reviewNote}</p>}
                  {admin && item.status === "PENDING_REVIEW" && <label className="mt-2 block"><span className="sr-only">Review note for {item.title}</span><input className={inputClass} value={reviewNote(item.id)} onChange={event => setNotes({ ...notes, [item.id]: event.target.value })} placeholder="Reason required if returning" /></label>}
                  <div className="mt-2 flex flex-wrap gap-2">
                    {["DRAFT", "RETURNED"].includes(item.status) && (admin || item.createdById === viewerId) && <>
                      <button type="button" className={secondaryButton} disabled={busy} onClick={() => editExisting(item)}>Edit</button>
                      <button type="button" className={primaryButton} disabled={busy} onClick={() => void perform({ action: "alert.submit", id: item.id })}>Submit for review</button>
                    </>}
                    {admin && item.status === "PENDING_REVIEW" && <>
                      <button type="button" className={primaryButton} disabled={busy} onClick={() => { if (window.confirm("Did you verify this advisory against its official source? Publish it to citizens?")) void perform({ action: "alert.review", id: item.id, decision: "PUBLISH", reviewNote: reviewNote(item.id) }); }}>Approve & publish</button>
                      <button type="button" className={secondaryButton} disabled={busy} onClick={() => void perform({ action: "alert.review", id: item.id, decision: "RETURN", reviewNote: reviewNote(item.id) })}>Return</button>
                    </>}
                    {admin && item.status !== "ARCHIVED" && <button type="button" className={secondaryButton} disabled={busy} onClick={() => { if (window.confirm("Archive this advisory and remove it from the public feed?")) void perform({ action: "alert.archive", id: item.id }); }}>Archive</button>}
                  </div>
                </article>
              ))}
            </div>
            {!filteredAlerts.length && <p className="mt-3 rounded-lg bg-[#f4f8fb] p-3 text-xs text-[#58798e]">No advisories under this filter. Use “All statuses” to view history or “New advisory” to create a draft.</p>}
          </section>

          {showAlertEditor && <section id="emergency-alert-editor" className={panelClass} aria-labelledby="alert-editor-heading">
            <div className="flex items-center justify-between gap-3"><h2 id="alert-editor-heading" className="flex items-center gap-2 text-base font-extrabold"><FilePlus2 size={18} aria-hidden="true" /> {editingId ? "Edit advisory" : "New advisory draft"}</h2><button type="button" className={secondaryButton} onClick={() => { setShowAlertEditor(false); setEditingId(null); }}>Close form</button></div>
            <p className="mt-1 text-[11px] text-[#718a98]">Drafts are not public. Use verified sources only; schedule uses the time on your device (Asia/Manila when set to Philippine time).</p>
            <form onSubmit={submitAlert} className="mt-3 grid gap-3 md:grid-cols-2">
              <label className="md:col-span-2"><span className={labelClass}>Advisory title</span><input ref={titleRef} required maxLength={180} className={inputClass} value={alert.title} onChange={event => setAlert({ ...alert, title: event.target.value })} placeholder="e.g. Road closure advisory" /></label>
              <label><span className={labelClass}>Severity</span><select className={inputClass} value={alert.severity} onChange={event => setAlert({ ...alert, severity: event.target.value })}>{ALERT_SEVERITIES.map(value => <option key={value} value={value}>{value}</option>)}</select></label>
              <label><span className={labelClass}>Issuing office</span><input required list="emergency-offices" maxLength={160} className={inputClass} value={alert.issuingOffice} onChange={event => setAlert({ ...alert, issuingOffice: event.target.value })} placeholder="Select or type an LGU office" /></label>
              <label className="md:col-span-2"><span className={labelClass}>Advisory details</span><textarea required rows={3} maxLength={4000} className={inputClass} value={alert.details} onChange={event => setAlert({ ...alert, details: event.target.value })} /></label>
              <label className="md:col-span-2"><span className={labelClass}>Safety instructions for residents</span><textarea required rows={2} maxLength={3000} className={inputClass} value={alert.safetyInstructions} onChange={event => setAlert({ ...alert, safetyInstructions: event.target.value })} /></label>
              <label className="md:col-span-2"><span className={labelClass}>Official source URL (https://)</span><input required type="url" className={inputClass} value={alert.sourceUrl} onChange={event => setAlert({ ...alert, sourceUrl: event.target.value })} placeholder="https://official-source..." /></label>
              <label><span className={labelClass}>Starts (PH time)</span><input required type="datetime-local" className={inputClass} value={alert.startsAt} onChange={event => setAlert({ ...alert, startsAt: event.target.value })} /></label>
              <label><span className={labelClass}>Expires (PH time)</span><input required type="datetime-local" className={inputClass} value={alert.expiresAt} onChange={event => setAlert({ ...alert, expiresAt: event.target.value })} /></label>
              <div className="md:col-span-2">
                <button type="button" onClick={() => setShowBarangays(!showBarangays)} aria-expanded={showBarangays} aria-controls="affected-barangays" className={`${secondaryButton} w-full justify-between`}><span>Affected barangays ({alert.barangays.length} selected)</span><ChevronDown size={16} className={showBarangays ? "rotate-180" : ""} aria-hidden="true" /></button>
                {showBarangays && <fieldset id="affected-barangays" className="mt-2 rounded-xl border border-[#dae8ee] p-3"><legend className="sr-only">Affected Los Baños barangays</legend><div className="mb-2 flex flex-wrap gap-2"><button type="button" className="text-xs font-bold text-[#1a6c98] underline" onClick={() => setAlert({ ...alert, barangays: [...LOS_BANOS_BARANGAYS] })}>Select all 14</button><button type="button" className="text-xs font-bold text-[#667e8e] underline" onClick={() => setAlert({ ...alert, barangays: [] })}>Clear</button></div><div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{LOS_BANOS_BARANGAYS.map(value => <label key={value} className="flex min-h-10 items-center gap-2 rounded-lg bg-[#f5f9fc] px-2 text-xs"><input type="checkbox" checked={alert.barangays.includes(value)} onChange={event => setAlert({ ...alert, barangays: event.target.checked ? [...alert.barangays, value] : alert.barangays.filter(item => item !== value) })} />{value}</label>)}</div></fieldset>}
              </div>
              <div className="flex flex-wrap gap-2 md:col-span-2"><button disabled={busy} type="submit" className={primaryButton}>{editingId ? "Save draft changes" : "Save as draft"}</button><button type="button" className={secondaryButton} onClick={() => { setShowAlertEditor(false); setEditingId(null); }}>Cancel</button></div>
            </form>
          </section>}
        </div>
      ) : (
        <div className="space-y-3">
          <section className={panelClass} aria-labelledby="proposal-list-heading">
            <div className="flex flex-wrap items-center justify-between gap-2"><div><h2 id="proposal-list-heading" className="text-base font-extrabold">{admin ? "Hotline verification queue" : "My hotline proposals"}</h2><p className="text-[11px] text-[#678398]">Local contacts must be checked against an official source.</p></div><div className="flex gap-2"><label><span className="sr-only">Filter hotline proposals</span><select value={hotlineFilter} onChange={event => setHotlineFilter(event.target.value as typeof hotlineFilter)} className="min-h-11 rounded-lg border border-[#cadde9] bg-white px-2 text-xs"><option value="PENDING">Pending</option><option value="ALL">All proposals</option></select></label><button type="button" className={primaryButton} onClick={startNewHotline}><Plus size={16} aria-hidden="true" /> Propose number</button></div></div>
            <div className="mt-3 divide-y divide-[#e6edf1]">{filteredProposals.map(row => <article key={row.id} className="py-3 first:pt-0 last:pb-0"><div className="flex flex-wrap items-start justify-between gap-2"><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2">{badge(row.status)}<span className="text-[11px] text-[#6c8796]">{row.operation}</span></div><h3 className="mt-1 text-sm font-extrabold">{row.title}</h3><p className="text-xs text-[#4f7287]">{row.phone} · {row.office}</p></div><a href={row.sourceUrl} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-10 items-center gap-1 text-xs font-bold text-[#246c95] underline">Verify source <ExternalLink size={13} aria-hidden="true" /></a></div>{row.note && <p className="mt-1 text-xs text-[#668394]">{row.note}</p>}{row.reviewNote && <p className="mt-1 text-xs font-semibold text-amber-900">Review: {row.reviewNote}</p>}{admin && row.status === "PENDING" && <div className="mt-2 space-y-2"><label><span className="sr-only">Review reason for {row.title}</span><input className={inputClass} value={reviewNote(row.id)} onChange={event => setNotes({ ...notes, [row.id]: event.target.value })} placeholder="Reason required if returning" /></label><div className="flex flex-wrap gap-2"><button type="button" disabled={busy} className={primaryButton} onClick={() => { if (window.confirm("Have you verified this hotline number against its official source?")) void perform({ action: "hotline.review", id: row.id, decision: "APPROVE", reviewNote: reviewNote(row.id) }); }}>Verify & publish</button><button type="button" disabled={busy} className={secondaryButton} onClick={() => void perform({ action: "hotline.review", id: row.id, decision: "RETURN", reviewNote: reviewNote(row.id) })}>Return</button></div></div>}</article>)}</div>
            {!filteredProposals.length && <p className="mt-3 rounded-lg bg-[#f4f8fb] p-3 text-xs text-[#648093]">No proposals in this filter.</p>}
          </section>

          {showHotlineEditor && <section className={panelClass} aria-labelledby="hotline-editor-heading"><div className="flex items-center justify-between gap-3"><h2 id="hotline-editor-heading" className="flex items-center gap-2 text-base font-extrabold"><FilePlus2 size={18} aria-hidden="true" /> Propose hotline</h2><button type="button" className={secondaryButton} onClick={() => setShowHotlineEditor(false)}>Close form</button></div><p className="mt-1 text-[11px] text-[#698497]">A proposed number is hidden from citizens until verified and approved by Super Admin.</p>
            <form onSubmit={submitHotline} className="mt-3 grid gap-3 md:grid-cols-2">
              <label><span className={labelClass}>Create / update</span><select className={inputClass} value={hotline.targetId} onChange={event => { const match = hotlines.find(item => item.id === event.target.value); setHotline(match ? { targetId: match.id, title: match.title, category: match.category, office: match.office, phone: match.phone, extension: match.extension || "", note: match.note || "", sourceUrl: match.sourceUrl } : newHotline); }}><option value="">Add new contact</option>{hotlines.map(row => <option key={row.id} value={row.id}>Update: {row.title}{row.isActive ? "" : " (inactive)"}</option>)}</select></label>
              <label><span className={labelClass}>Category</span><select className={inputClass} value={hotline.category} onChange={event => setHotline({ ...hotline, category: event.target.value })}>{HOTLINE_CATEGORIES.map(value => <option key={value} value={value}>{value}</option>)}</select></label>
              <label><span className={labelClass}>Contact / station</span><input ref={hotlineTitleRef} required maxLength={140} className={inputClass} value={hotline.title} onChange={event => setHotline({ ...hotline, title: event.target.value })} placeholder="Los Baños Fire Station" /></label>
              <label><span className={labelClass}>Responsible office</span><input required list="emergency-offices" maxLength={160} className={inputClass} value={hotline.office} onChange={event => setHotline({ ...hotline, office: event.target.value })} placeholder="Select or type an office" /></label>
              <label><span className={labelClass}>Phone with area code if needed</span><input required type="tel" inputMode="tel" maxLength={35} className={inputClass} value={hotline.phone} onChange={event => setHotline({ ...hotline, phone: event.target.value })} placeholder="049XXXXXXXX" /></label>
              <label><span className={labelClass}>Extension (optional)</span><input maxLength={8} className={inputClass} value={hotline.extension} onChange={event => setHotline({ ...hotline, extension: event.target.value })} /></label>
              <label className="md:col-span-2"><span className={labelClass}>Official source URL (https://)</span><input required type="url" className={inputClass} value={hotline.sourceUrl} onChange={event => setHotline({ ...hotline, sourceUrl: event.target.value })} placeholder="https://official-source..." /></label>
              <label className="md:col-span-2"><span className={labelClass}>Calling notes (optional)</span><input maxLength={350} className={inputClass} value={hotline.note} onChange={event => setHotline({ ...hotline, note: event.target.value })} placeholder="Office hours, extension instructions..." /></label>
              <div className="md:col-span-2 flex flex-wrap gap-2"><button disabled={busy} className={primaryButton} type="submit">Submit for verification</button><button type="button" className={secondaryButton} onClick={() => setShowHotlineEditor(false)}>Cancel</button></div>
            </form>
          </section>}

          <section className={panelClass} aria-labelledby="published-hotlines-heading"><h2 id="published-hotlines-heading" className="text-base font-extrabold">Local contact directory</h2><p className="text-[11px] text-[#688397]">911 and 143 are national shortcuts, separate from this verified LGU list.</p><div className="mt-2 divide-y divide-[#e6edf1]">{hotlines.map(row => <div key={row.id} className="flex flex-wrap items-center justify-between gap-2 py-3 first:pt-0 last:pb-0"><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><strong className="text-sm">{row.title}</strong><span className={`rounded-md px-2 py-0.5 text-[11px] font-bold ${row.isActive ? "bg-emerald-100 text-emerald-900" : "bg-slate-100 text-slate-700"}`}>{row.isActive ? "Public" : "Inactive"}</span></div><p className="text-xs text-[#648296]">{row.phone} · {row.office}</p><a href={row.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-[11px] font-semibold text-[#246c94] underline">Source</a></div>{admin && row.isActive && <button type="button" disabled={busy} className={secondaryButton} onClick={() => { if (window.confirm("Remove this contact from the public directory?")) void perform({ action: "hotline.toggle", id: row.id, active: false }); }}>Unpublish</button>}</div>)}</div>{!hotlines.length && <p className="mt-3 rounded-lg bg-[#f4f8fb] p-3 text-xs text-[#648093]">No local contacts verified yet.</p>}</section>
        </div>
      )}

      <datalist id="emergency-offices">{officeSuggestions.map(value => <option key={value} value={value} />)}</datalist>
      <p className="flex items-start gap-2 rounded-xl bg-[#edf7fa] p-3 text-[11px] leading-5 text-[#58758a]"><ShieldCheck className="mt-0.5 shrink-0" size={15} aria-hidden="true" /> Staff proposes → Super Admin verifies source and publishes → Citizens see approved information. This portal does not dispatch emergency services.</p>
    </div>
  );
}
