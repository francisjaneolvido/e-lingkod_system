"use client";

/* eslint-disable @next/next/no-img-element -- Photos are served by signed-in, uncached endpoints. */
import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, BadgeCheck, Camera, CheckCircle2, LoaderCircle, RotateCcw, Send, ShieldAlert } from "lucide-react";
import type { CitizenResolutionFeedbackView, ReportDetail } from "../types";
import { formatReportDate } from "../config";
import s from "../civic.module.css";

function CitizenFeedbackImages({ feedback }: { feedback: CitizenResolutionFeedbackView }) {
  if (!feedback.photos.length) return null;
  return <div className={s.feedbackPhotoGrid}>{feedback.photos.map((photo, index) =>
    <a key={photo.id} href={`/api/reports/feedback-photos/${photo.id}`} target="_blank" rel="noreferrer" aria-label={`Open citizen feedback photo ${index + 1}`}>
      <img loading="lazy" src={`/api/reports/feedback-photos/${photo.id}`} alt={`Additional citizen evidence ${index + 1}`} />
    </a>)}</div>;
}

/** Render in both citizen and LGU report details; only the report owner may send feedback. */
export function CitizenResolutionFeedback({ report, admin = false }: { report: ReportDetail; admin?: boolean }) {
  const router = useRouter();
  const [mode, setMode] = useState<"none" | "dispute">("none");
  const [reason, setReason] = useState("");
  const [photos, setPhotos] = useState<File[]>([]);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [refreshing, startTransition] = useTransition();
  const approved = report.resolutionSubmissions.find(item => item.reviewStatus === "APPROVED");
  const latestFeedback = approved ? report.citizenFeedbacks.find(item => item.resolutionSubmissionId === approved.id) : undefined;
  const canRespond = !admin && report.status === "RESOLVED" && approved && !latestFeedback;

  function choosePhotos(files: FileList | null) {
    const selected = Array.from(files || []);
    if (selected.length > 3 || selected.some(file => !["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size < 1 || file.size > 3 * 1024 * 1024)) {
      setError("Attach up to 3 JPG, PNG or WebP photos, each under 3 MB."); setPhotos([]); return;
    }
    setError(""); setPhotos(selected);
  }

  async function submit(decision: "CONFIRMED" | "DISPUTED") {
    if (!approved || pending || refreshing || !canRespond) return;
    if (decision === "DISPUTED" && (reason.trim().length < 20 || reason.trim().length > 1500)) {
      setError("Describe what still needs attention in 20–1500 characters."); return;
    }
    setError(""); setPending(true);
    try {
      const body = new FormData();
      body.set("decision", decision); body.set("submissionId", approved.id);
      body.set("version", String(report.version));
      if (decision === "DISPUTED") { body.set("reason", reason.trim()); photos.forEach(file => body.append("photos", file)); }
      const response = await fetch(`/api/reports/${report.id}/feedback`, { method: "POST", body, credentials: "same-origin" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not save feedback.");
      setReason(""); setPhotos([]); setMode("none");
      startTransition(() => router.refresh());
    } catch (issue) { setError(issue instanceof Error ? issue.message : "Unable to save feedback."); }
    finally { setPending(false); }
  }

  if (!report.citizenFeedbacks.length && !canRespond && report.status !== "REOPENED") return null;
  return <section className={s.citizenFeedbackCard} aria-labelledby="citizen-feedback-heading">
    <div className={s.feedbackHeading}>
      <span className={s.feedbackIcon}><ShieldAlert size={19}/></span>
      <div><span className={s.overline}>{admin ? "CITIZEN FEEDBACK · LGU REVIEW" : "CITIZEN CONFIRMATION"}</span>
        <h3 id="citizen-feedback-heading">{admin ? "Citizen response and follow-up" : "Was your concern actually resolved?"}</h3>
        <p>{admin ? "Review the citizen's response before deciding the next steps." : "Your feedback helps the LGU check whether the completed work addressed your concern."}</p>
      </div>
    </div>
    {report.status === "REOPENED" && <div className={s.feedbackReopened}><RotateCcw size={17}/><div><strong>Reopened — awaiting LGU review</strong><p>{admin ? "Review the citizen's reason and attachments below, then move this case to Under review in Case actions." : "Your concern has been sent back to the LGU action desk. You can monitor the next steps below."}</p></div></div>}
    {canRespond && <div className={s.feedbackActions}>
      {mode === "none" ? <div className={s.feedbackButtons}>
        <button className={s.feedbackConfirmButton} type="button" disabled={pending || refreshing} onClick={() => void submit("CONFIRMED")}><BadgeCheck size={17}/>{pending || refreshing ? "Saving…" : "Confirm resolved"}</button>
        <button className={s.feedbackDisputeButton} type="button" disabled={pending || refreshing} onClick={() => {setMode("dispute");setError("");}}><RotateCcw size={17}/> Still not resolved</button>
      </div> : <form onSubmit={(event: FormEvent<HTMLFormElement>) => { event.preventDefault(); void submit("DISPUTED"); }} className={s.feedbackForm}>
        <div><label htmlFor="citizen-reopen-reason">What still needs to be fixed? <span aria-hidden="true">*</span></label>
          <textarea id="citizen-reopen-reason" rows={4} minLength={20} maxLength={1500} required value={reason} onChange={e => setReason(e.target.value)} placeholder="Example: The streetlight near the barangay hall is still not working after the repair." />
          <p>Explain the remaining problem clearly (20–1500 characters). Your report will be reopened for Super Admin review.</p></div>
        <div><label htmlFor="citizen-feedback-photos">Additional evidence (optional, 1–3 photos)</label>
          <input id="citizen-feedback-photos" className={s.feedbackFileInput} type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={e => choosePhotos(e.target.files)} />
          <p>JPG, PNG or WebP · 3 MB each. Do not include faces, IDs, or private information.</p>
          {photos.length > 0 && <span className={s.feedbackFileCount}><Camera size={14}/>{photos.length} photo(s) selected</span>}</div>
        <div className={s.feedbackButtons}><button className={s.feedbackDisputeButton} type="button" onClick={() => {setMode("none");setError("");}} disabled={pending || refreshing}>Cancel</button>
          <button className={s.feedbackConfirmButton} type="submit" disabled={pending || refreshing}><Send size={16}/>{pending || refreshing ? "Submitting…" : "Request another review"}</button></div>
      </form>}
      {error && <p role="alert" className={s.feedbackError}><AlertTriangle size={15}/>{error}</p>}
    </div>}
    {report.citizenFeedbacks.length > 0 && <div className={s.feedbackHistory}>
      <h4>Citizen feedback history</h4>
      <ol>{report.citizenFeedbacks.map(entry => <li key={entry.id}>
        <div className={s.feedbackHistoryHeading}><span className={entry.decision === "CONFIRMED" ? s.feedbackConfirmed : s.feedbackDisputed}>{entry.decision === "CONFIRMED" ? <CheckCircle2 size={14}/> : <RotateCcw size={14}/>}{entry.decision === "CONFIRMED" ? "Resolution confirmed" : "Resolution disputed"}</span><time dateTime={entry.createdAt}>{formatReportDate(entry.createdAt, true)}</time></div>
        {entry.reason && <p className={s.feedbackReason}>{entry.reason}</p>}
        <CitizenFeedbackImages feedback={entry}/>
      </li>)}</ol>
    </div>}
  </section>;
}
