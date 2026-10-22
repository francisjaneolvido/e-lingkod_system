"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, CheckCircle2, LoaderCircle, Send, UserCheck, ShieldCheck } from "lucide-react";
import { STATUS_META, TRANSITIONS, type ReportStatus } from "../config";
import type { ReportDetail, ReportPriority } from "../types";
import s from "../civic.module.css";

export type ReportOfficer = { id: string; name: string; department: string; designation: string };
const priorities: ReportPriority[] = ["LOW", "NORMAL", "HIGH", "URGENT"];
export function AdminUpdateForm({ report, role, viewerId, officers = [] }: { report: ReportDetail; role: string; viewerId: string; officers?: ReportOfficer[] }) {
  const router = useRouter();
  const superAdmin = role === "ADMIN";
  const canClaim = !superAdmin && !report.assignedStaffId && !["REJECTED", "RESOLVED", "PENDING_VERIFICATION", "REOPENED"].includes(report.status);
  const canUpdate = report.status !== "PENDING_VERIFICATION" && (superAdmin || (report.status !== "REOPENED" && report.assignedStaffId === viewerId));
  const [status, setStatus] = useState<ReportStatus>(report.status);
  const [office, setOffice] = useState(report.assignedOffice || "");
  const [officerId, setOfficerId] = useState(report.assignedStaffId || "");
  const [priority, setPriority] = useState<ReportPriority>(report.priority);
  const [visibleToCitizen, setVisibleToCitizen] = useState(false);
  const [note, setNote] = useState("");
  const [baseVersion, setBaseVersion] = useState(report.version);
  const [saving, setSaving] = useState(false);
  const [refreshing, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const stale = report.version !== baseVersion;
  const officeNames = [...new Set([...officers.map(o => o.department), ...(report.assignedOffice ? [report.assignedOffice] : [])])].sort();
  const eligible = officers.filter(o => o.department === office);
  function loadLatest() { setBaseVersion(report.version); setStatus(report.status); setOffice(report.assignedOffice || ""); setOfficerId(report.assignedStaffId || ""); setPriority(report.priority); setNote(""); setVisibleToCitizen(false); setError(""); setSaved(false); }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving || stale || !canUpdate) return;
    setError(""); setSaved(false); setSaving(true);
    try {
      const res = await fetch(`/api/admin/reports/${report.id}`, { method: "PATCH", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "UPDATE", status, assignedOffice: office, assignedStaffId: officerId || null, priority, visibleToCitizen, note, version: baseVersion }) });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Could not save case update.");
      setBaseVersion(baseVersion + 1); setNote(""); setSaved(true);
      startTransition(() => router.refresh());
    } catch (issue) { setError(issue instanceof Error ? issue.message : "Unable to save case update."); }
    finally { setSaving(false); }
  }
  async function claim() {
    if (saving || stale || !canClaim) return;
    setSaving(true); setError(""); setSaved(false);
    try {
      const res = await fetch(`/api/admin/reports/${report.id}`, { method: "PATCH", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "CLAIM", version: baseVersion }) });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Could not claim this case.");
      setBaseVersion(baseVersion + 1); setOfficerId(viewerId); setSaved(true);
      startTransition(() => router.refresh());
    } catch (issue) { setError(issue instanceof Error ? issue.message : "Could not claim this case."); }
    finally { setSaving(false); }
  }
  return <section className={s.caseUpdatePanel}><span className={s.overline}>{superAdmin ? "SUPER ADMIN · CASE ROUTING" : "ASSIGNED STAFF · CASE ACTION"}</span><h3 className="mt-2">Manage this concern</h3>
    <p>{superAdmin ? "Route to the responsible office and record the next step. Staff assignment is balanced automatically unless you choose a specific officer." : "Only your personally assigned cases can be updated. New routed concerns are normally offered automatically using balanced workload. Legacy unassigned concerns can still be claimed from your office queue."}</p>
    {stale && !refreshing && <div role="alert" className={`${s.alert} mt-3`}><AlertCircle size={15}/><div>Another update is available. Copy any unsaved remarks, then <button type="button" className={s.textButton} onClick={loadLatest}>load latest details</button>.</div></div>}
    {report.status === "REOPENED" && superAdmin && <div className="my-4 rounded-xl border border-[#edcfa9] bg-[#fff8ed] p-4 text-sm leading-6 text-[#725022]"><strong>Citizen requested another review.</strong> Read the citizen feedback and evidence in the case details. Choose <strong>Under review</strong>, confirm the responsible officer, and explain the next steps before saving.</div>}
    {canClaim && <div className="my-4 rounded-xl border border-[#c8e3eb] bg-[#eef8fb] p-4"><p className="text-[12px] font-bold text-[#245b76]">This case is in your office queue</p><p className="mt-1 text-[11px] leading-6 text-[#5c7c91]">Claim it to become the responsible officer. Only one staff member can claim an unassigned case.</p><button type="button" className="mt-3 inline-flex items-center gap-2 rounded-lg bg-[#155579] px-4 py-2.5 text-xs font-bold text-white disabled:opacity-50" onClick={claim} disabled={saving || refreshing || stale}><UserCheck size={15}/> {saving ? "Claiming…" : "Claim this case"}</button></div>}
    {canUpdate && <form id="case-update-form" className={`${s.adminForm} mt-4`} onSubmit={submit}>
      <fieldset disabled={saving || refreshing || stale} className={s.fields}>
        {superAdmin && <><div className={s.field}><label htmlFor="case-priority">Priority level</label><select id="case-priority" value={priority} onChange={e => setPriority(e.target.value as ReportPriority)}>{priorities.map(p => <option key={p} value={p}>{p[0] + p.slice(1).toLowerCase()}</option>)}</select><span className={s.hint}>Urgent should be reserved for time-sensitive concerns; this is a triage label, not an emergency dispatch service.</span></div>
        <div className={s.field}><label htmlFor="case-office">Responsible LGU office</label><select id="case-office" value={office} onChange={e => { setOffice(e.target.value); setOfficerId(""); }}><option value="">Not yet routed</option>{officeNames.map(name => <option key={name} value={name}>{name}</option>)}</select><span className={s.hint}>Office choices come from registered staff with Civic Reports access. If your office is missing, assign a staff member in LGU Staff Management first.</span></div>
        <div className={s.field}><label htmlFor="case-officer">Responsible officer</label><select id="case-officer" value={officerId} onChange={e => setOfficerId(e.target.value)} disabled={!office}><option value="">Auto-balance across eligible office staff (recommended)</option>{eligible.map(person => <option key={person.id} value={person.id}>{person.name} — {person.designation}</option>)}</select><span className={s.hint}>Leave this on Auto-balance for fair workload distribution. The selected staff member must accept the offer; Super Admin can still override by choosing an officer. Move to In Progress after an officer accepts.</span></div></>}
        <div className={s.field}><label htmlFor="case-status">Report status</label><select id="case-status" value={status} onChange={e => { setStatus(e.target.value as ReportStatus); setSaved(false); }}>{[report.status, ...TRANSITIONS[report.status]].filter(v => v !== "PENDING_VERIFICATION").map(v => <option value={v} key={v}>{STATUS_META[v].label}{v === report.status ? " (current)" : ""}</option>)}</select>{report.status === "IN_PROGRESS" && <span className={s.hint}>To close this case, use the proof-photo submission panel below. Final approval is restricted to Super Admin.</span>}</div>
        <div className={s.field}><label htmlFor="case-note">Case remarks *</label><textarea id="case-note" value={note} onChange={e => setNote(e.target.value)} required minLength={10} maxLength={1500} rows={4} placeholder="Describe the inspection, assignment reason, or action taken."/><span className={s.hint}>A status change is always shown to the citizen; routing-only remarks stay internal unless you choose otherwise.</span></div>
        <label className="flex items-start gap-2 text-[11px] font-semibold leading-5 text-[#416782]"><input type="checkbox" checked={visibleToCitizen || status !== report.status} disabled={status !== report.status} onChange={e => setVisibleToCitizen(e.target.checked)} className="mt-1 size-4 accent-[#1b7295]"/><span>Visible to citizen {status !== report.status ? "(required because status changed)" : "— share this note on their tracking timeline"}</span></label>
      </fieldset>
      <div className={s.caseSaveBar}>
        {error && <p role="alert" className={s.alert}><AlertCircle size={15}/>{error}</p>}
        {saved && <p role="status" className={`${s.alert} ${s.success}`}><CheckCircle2 size={15}/>Case update saved. Add another remark to record a new update.</p>}
        <button type="submit" className={s.primary} disabled={saving || refreshing || stale}>
          {saving || refreshing ? <LoaderCircle size={15} className={s.spin}/> : <Send size={14}/>}
          {saving || refreshing ? "Saving…" : "Save case update"}
        </button>
      </div>
    </form>}
    {!canUpdate && !canClaim && report.status !== "PENDING_VERIFICATION" && <p className="mt-4 flex items-start gap-2 rounded-xl bg-[#f4f7f9] p-3 text-xs text-[#6e8798]"><ShieldCheck size={16}/> This case has an assigned officer or is closed. Ask your Super Admin to transfer it if you need responsibility.</p>}
    {report.status === "PENDING_VERIFICATION" && <p className="mt-3 text-xs leading-6 text-[#5d7788]">The regular update form is paused until Super Admin reviews the submitted proof below.</p>}
    {!canUpdate && (error || saved) && <p role={error ? "alert" : "status"} className={`${s.alert} mt-2`}>{error || "Case claimed. Updating details…"}</p>}
  </section>;
}
