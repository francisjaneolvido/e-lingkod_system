"use client";

/* eslint-disable @next/next/no-img-element -- Signed-in, uncached evidence endpoint. */
import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, BadgeCheck, Camera, CheckCircle2, ClipboardCheck, LoaderCircle, RotateCcw, Send } from "lucide-react";
import { formatReportDate } from "../config";
import type { ReportDetail, ResolutionSubmissionView } from "../types";
import s from "../civic.module.css";

function ProofImages({ submission }: { submission: ResolutionSubmissionView }) {
  return <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">{submission.photos.map((photo, i) =>
    <a key={photo.id} href={`/api/reports/resolution-photos/${photo.id}`} target="_blank" rel="noreferrer" className="overflow-hidden rounded-xl border border-[#d8e5eb] bg-white" aria-label={`Open resolution proof photo ${i + 1}`}>
      <img src={`/api/reports/resolution-photos/${photo.id}`} alt={`Resolution proof ${i + 1}`} loading="lazy" className="h-28 w-full object-cover transition hover:scale-[1.02]" />
    </a>)}</div>;
}

export function ResolutionWorkflow({ report, role, viewerId }: { report: ReportDetail; role: string; viewerId: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [refreshing, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [saved, setSaved] = useState("");
  const [remarks, setRemarks] = useState("");
  const [proofPhotos, setProofPhotos] = useState<File[]>([]);
  const [decisionNote, setDecisionNote] = useState("");
  const isAdmin = role === "ADMIN";
  const isOfficer = role === "STAFF" && report.assignedStaffId === viewerId;
  const awaiting = report.status === "PENDING_VERIFICATION";
  const latestPending = awaiting ? report.resolutionSubmissions.find(item => item.reviewStatus === "PENDING") : undefined;
  const lastReturned = report.resolutionSubmissions.find(item => item.reviewStatus === "RETURNED");
  const showSubmission = isOfficer && report.status === "IN_PROGRESS";

  function selectProof(files: FileList | null) {
    const selected = Array.from(files || []);
    if (selected.length > 3) { setProofPhotos([]); setError("Choose up to 3 proof photos only."); return; }
    if (selected.some(file => !["image/jpeg", "image/png", "image/webp"].includes(file.type))) {
      setProofPhotos([]); setError("Proof photos must be JPG, PNG, or WebP."); return;
    }
    if (selected.some(file => file.size > 3 * 1024 * 1024)) {
      setProofPhotos([]); setError("Each proof photo must be 3 MB or smaller."); return;
    }
    setProofPhotos(selected); setError("");
  }

  async function submitProof(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending || refreshing || !showSubmission) return;
    if (proofPhotos.length < 1 || proofPhotos.length > 3) { setError("Add 1–3 photos showing the completed work."); return; }
    setError(""); setSaved(""); setPending(true);
    try {
      const form = new FormData();
      form.set("remarks", remarks); form.set("version", String(report.version));
      proofPhotos.forEach(file => form.append("photos", file));
      const response = await fetch(`/api/admin/reports/${report.id}/resolution`, { method: "POST", credentials: "same-origin", body: form });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not submit proof.");
      setSaved("Proof submitted for Super Admin verification.");
      setRemarks(""); setProofPhotos([]);
      startTransition(() => router.refresh());
    } catch (issue) { setError(issue instanceof Error ? issue.message : "Proof submission failed."); }
    finally { setPending(false); }
  }

  async function decide(decision: "APPROVE" | "RETURN") {
    if (pending || refreshing || !latestPending || !isAdmin) return;
    if (decision === "RETURN" && decisionNote.trim().length < 10) { setError("Write at least 10 characters explaining what the officer needs to improve."); return; }
    setPending(true); setError(""); setSaved("");
    try {
      const response = await fetch(`/api/admin/reports/${report.id}/resolution`, {
        method: "PATCH", credentials: "same-origin", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ submissionId: latestPending.id, decision, version: report.version, note: decisionNote }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not review this resolution.");
      setSaved(decision === "APPROVE" ? "Resolution approved and officially marked Resolved." : "Returned to In Progress. The officer can submit updated proof.");
      setDecisionNote(""); startTransition(() => router.refresh());
    } catch (issue) { setError(issue instanceof Error ? issue.message : "Could not review this resolution."); }
    finally { setPending(false); }
  }

  if (!isAdmin && !isOfficer) return null;
  return <section className={s.resolutionActionPanel} aria-labelledby="resolution-workflow-title">
    <span className={s.overline}>VERIFIED RESOLUTION</span>
    <h3 id="resolution-workflow-title" className="mt-2 flex items-center gap-2"><ClipboardCheck size={17}/> Photo proof &amp; approval</h3>
    <p className="mt-2">LGU Staff submits proof of work. Only the Super Admin can approve the final resolution.</p>
    {error && <p role="alert" className={`${s.alert} mt-3`}><AlertTriangle size={15}/>{error}</p>}
    {saved && <p role="status" className={`${s.alert} ${s.success} mt-3`}><CheckCircle2 size={15}/>{saved}</p>}

    {showSubmission && <form id="resolution-proof-form" onSubmit={submitProof} className="mt-5 space-y-4">
      {lastReturned && <div className="rounded-xl border border-[#ecd8c3] bg-[#fff8ef] p-3 text-xs text-[#83552c]"><strong>Returned for rework</strong><p className="mt-2 whitespace-pre-wrap">{lastReturned.reviewNote || "Please submit improved evidence."}</p></div>}
      <div className={s.field}><label htmlFor="resolution-remarks">Action taken / resolution remarks *</label>
        <textarea id="resolution-remarks" required minLength={20} maxLength={1500} rows={4} value={remarks} onChange={e => setRemarks(e.target.value)} placeholder="Example: Replaced the streetlight fixture and tested that the lamp is functioning."/>
        <span className={s.hint}>This becomes a citizen-visible resolution statement only after approval. At least 20 characters.</span></div>
      <div className={s.field}><label htmlFor="resolution-photos">Photo proof of completed work * (1–3)</label>
        <input id="resolution-photos" type="file" accept="image/jpeg,image/png,image/webp" multiple required={proofPhotos.length===0} onChange={e => selectProof(e.target.files)} className={s.proofFileInput}/>
        <span className={s.hint}>JPG, PNG, or WebP. Max 3 MB each. Avoid faces, ID cards, and private addresses in evidence images.</span>
        {proofPhotos.length > 0 && <span className={s.proofFileCount}><CheckCircle2 size={15}/>{proofPhotos.length} photo(s) ready for review</span>}
      </div>
      <div className={s.caseSaveBar}><button disabled={pending || refreshing} type="submit" className={s.primary}>{pending || refreshing ? <LoaderCircle size={15} className={s.spin}/> : <Send size={15}/>} {pending || refreshing ? "Submitting…" : "Submit proof for verification"}</button></div>
    </form>}

    {awaiting && <div className="mt-4 rounded-xl border border-[#e3d6a5] bg-[#fffaf0] p-4">
      <p className="flex items-center gap-2 text-[12px] font-extrabold text-[#805d23]"><Camera size={16}/> Waiting for LGU verification</p>
      <p className="mt-2 text-[11px] leading-6 text-[#756c58]">The case is not officially Resolved. Verification is required before the citizen can view the approved proof.</p>
      {latestPending && <div className="mt-4 rounded-xl border border-[#efe5d6] bg-white p-3">
        <div className="text-[11px] font-bold text-[#254c66]">Submitted by {latestPending.submittedByName}</div>
        <p className="mt-1 text-[10px] text-[#8ba0af]">{formatReportDate(latestPending.createdAt, true)}</p>
        <p className="mt-3 whitespace-pre-wrap text-xs leading-6 text-[#49667c]">{latestPending.remarks}</p>
        <ProofImages submission={latestPending}/>
        {isAdmin && <div className="mt-5 border-t border-[#e2e8ed] pt-4">
          <div className={s.field}><label htmlFor="decision-note">Reviewer note {"(required when returning)"}</label>
            <textarea id="decision-note" rows={3} value={decisionNote} onChange={e => setDecisionNote(e.target.value)} maxLength={1500} placeholder="Describe missing proof or additional work required..."/>
            <span className={s.hint}>Reviewer notes are internal and are not shown to citizens.</span></div>
          <div className={s.caseDecisionBar}>
            <button disabled={pending || refreshing} type="button" onClick={() => void decide("APPROVE")} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#177b65] px-4 py-2 text-xs font-bold text-white disabled:opacity-60"><BadgeCheck size={16}/> Approve &amp; resolve</button>
            <button disabled={pending || refreshing} type="button" onClick={() => void decide("RETURN")} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[#dbb989] bg-white px-4 py-2 text-xs font-bold text-[#89602b] disabled:opacity-60"><RotateCcw size={16}/> Return for rework</button>
          </div>
        </div>}
      </div>}
    </div>}

    {report.resolutionSubmissions.filter(item => item.reviewStatus !== "PENDING").length > 0 && <details className="mt-5 rounded-xl border border-[#e4eaef] p-3">
      <summary className="cursor-pointer text-xs font-bold text-[#315c76]">Previous verification decisions ({report.resolutionSubmissions.filter(item => item.reviewStatus !== "PENDING").length})</summary>
      <ol className="mt-3 space-y-3">{report.resolutionSubmissions.filter(item => item.reviewStatus !== "PENDING").map(item =>
        <li key={item.id} className="rounded-lg bg-[#f4f8fa] p-3 text-[11px] text-[#4e7085]"><strong>{item.reviewStatus}</strong> · {formatReportDate(item.createdAt, true)}
          {item.reviewNote && <p className="mt-2 whitespace-pre-wrap">Review note: {item.reviewNote}</p>}
        </li>)}</ol>
    </details>}
  </section>;
}

export function VerifiedResolution({ report }: { report: ReportDetail }) {
  const approved = report.resolutionSubmissions.find(item => item.reviewStatus === "APPROVED");
  if (!approved) return null; // Legacy resolutions did not collect photos.
  return <section className="mt-5 rounded-2xl border border-[#b7dfd0] bg-[#f2faf6] p-5" aria-label="Verified proof of resolution">
    <p className="flex items-center gap-2 text-[12px] font-extrabold text-[#19755d]"><BadgeCheck size={18}/> {report.status === "RESOLVED" ? "LGU-verified proof of resolution" : "Previously approved resolution · kept for reference"}</p>
    <p className="mt-2 text-xs leading-6 text-[#375e54]">{approved.remarks}</p>
    <p className="mt-2 text-[10px] text-[#5c897b]">Verified {approved.reviewedAt ? formatReportDate(approved.reviewedAt, true) : "by the action desk"} · {approved.photos.length} photo(s)</p>
    <ProofImages submission={approved}/>
  </section>;
}
