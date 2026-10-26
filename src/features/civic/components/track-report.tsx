"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { AlertCircle, ArrowRight, Check, FileSearch, Hash, LoaderCircle, LockKeyhole, RefreshCw, Search } from "lucide-react";
import { formatReportDate, STATUS_META, STATUS_STEPS, TRACKING_PATTERN } from "../config";
import type { PublicTracking } from "../types";
import { StatusBadge } from "./status-badge";
import s from "../civic.module.css";

export function TrackReport() {
  const [id, setId] = useState("");
  const [result, setResult] = useState<PublicTracking | null>(null);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  const lookup = useCallback(async (trackingId: string, quiet = false, signal?: AbortSignal) => {
    if (!quiet) setPending(true);
    setError("");
    try {
      const response = await fetch(`/api/reports/track/${encodeURIComponent(trackingId)}`, { cache: "no-store", signal });
      const body = await response.json();
      if (!response.ok) { if (response.status === 404) setResult(null); throw new Error(body.error || "Tracking is unavailable. Try again."); }
      if (!signal?.aborted) setResult(body);
    } catch (issue) { if (!signal?.aborted) setError(issue instanceof Error ? issue.message : "Could not connect. Try again."); }
    finally { if (!quiet && !signal?.aborted) setPending(false); }
  }, []);

  const trackedId = result?.trackingId;
  useEffect(() => {
    if (!trackedId) return;
    const controller = new AbortController();
    function check() { if (document.visibilityState === "visible") void lookup(trackedId!, true, controller.signal); }
    const interval = window.setInterval(check, 30000);
    return () => { window.clearInterval(interval); controller.abort(); };
  }, [trackedId, lookup]);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const normalized = id.trim().toUpperCase();
    if (!TRACKING_PATTERN.test(normalized)) { setError("Enter your full tracking ID, for example ELB-2026-A1B2C3D4E5F6."); setResult(null); return; }
    setId(normalized); void lookup(normalized);
  }

  const currentStep = result ? STATUS_STEPS.indexOf(result.status) : -1;
  return <div className={s.trackLayout}>
    <div className={s.trackIntro}><span className={s.eyebrow}>A clear trail of action</span><h1>Less guessing.<br /><em>More clarity.</em></h1><p>May tracking ID ka na? Check where your concern stands, from the first submission to the recorded outcome.</p><ol className={s.sideSteps}><li><span>01</span><div><strong>Find your tracking ID</strong><p>It appears on your submission receipt and in My Reports.</p></div></li><li><span>02</span><div><strong>See the current status</strong><p>Follow the desk&apos;s recorded progress at a glance.</p></div></li><li><span>03</span><div><strong>Read the full story</strong><p>Sign in to your account for photos, details, and progress remarks.</p></div></li></ol><p className={s.note}><LockKeyhole size={15} /><span>Public tracking shows status and office assignment. Personal details, photos, precise locations, and desk remarks stay inside your account.</span></p></div>
    <div className={s.trackCard}><div className={s.trackCardTop}><div><span className={s.trackIcon}><Hash size={23} strokeWidth={1.7} /></span><div><h2>Follow your concern</h2><p>Every report has its own reference.</p></div></div></div>
      <form className={s.trackForm} onSubmit={submit}><label htmlFor="live-tracking-id">Tracking ID</label><div className={s.trackInput}><input id="live-tracking-id" className={s.input} value={id} onChange={event => { setId(event.target.value); setResult(null); setError(""); }} placeholder="ELB-2026-A1B2C3D4E5F6" maxLength={48} required autoComplete="off" spellCheck={false} disabled={pending} /><button className={s.primary} type="submit" aria-label="Track" disabled={pending}>{pending ? <LoaderCircle size={16} className={s.spin} /> : <Search size={15} />}<span>Track</span></button></div>{error && <p role="alert" className={s.alert}><AlertCircle size={15} />{error}</p>}</form>
      {!result ? <div className={s.trackBlank}><FileSearch size={34} strokeWidth={1.4} /><p>Your progress trail will appear here.</p><span>Enter the full tracking ID from your receipt.<br />This lookup uses saved reports.</span></div> : <div className={s.trackResult} aria-live="polite"><div className={s.trackResultTop}><h3>Current report status</h3><StatusBadge status={result.status} /></div>
        {result.status !== "REJECTED" && result.status !== "REOPENED" && <ol className={s.trackSteps} aria-label="Report progress">{STATUS_STEPS.map((status, index) => <li key={status} className={`${s.trackStep} ${index < currentStep ? s.trackStepDone : index === currentStep ? s.trackStepCurrent : ""}`} aria-current={index === currentStep ? "step" : undefined}><span>{index < currentStep ? <Check size={13} /> : String(index + 1).padStart(2, "0")}</span><p>{STATUS_META[status].short}</p></li>)}</ol>}
        <div className={`${s.trackSummary} ${result.status === "REJECTED" ? "mt-5" : ""}`}><p>{STATUS_META[result.status].description}</p>{result.status === "REOPENED" && <p className="mt-3 rounded-xl border border-border bg-muted p-3 text-xs leading-6 text-warning-foreground">The resolution is being reviewed again. Sign in to My Reports for your own updates; private feedback and evidence are not shown here.</p>}{result.status === "RESOLVED" && result.verifiedEvidenceAvailable && <p className="mt-3 rounded-xl border border-border bg-muted px-3 py-2 text-xs leading-5 text-success"><strong>Verified photo evidence available.</strong> The Super Admin approved the officer&apos;s proof. Sign in to <Link className="font-bold underline" href="/reports">My Reports</Link> to view the resolution photos.</p>}<p className="mt-3"><strong>Assigned office</strong><br />{result.assignedOffice || "Awaiting desk assignment"}</p><p className="mt-3"><strong>Last recorded update</strong><br />{formatReportDate(result.updatedAt, true)}</p><div className={`${s.refreshLine} mt-4`}><span className={s.liveDot}>Checks every 30 seconds</span><button type="button" disabled={pending} onClick={() => void lookup(result.trackingId)}><RefreshCw size={11} />Refresh</button></div>
          <details className={s.manualToggle}><summary>View status history</summary><ol className="mt-3 space-y-3">{result.updates.map(event => <li key={event.id}><strong className="text-xs">{STATUS_META[event.status].label}</strong><span className="mt-1 block text-xs text-muted-foreground">{formatReportDate(event.createdAt, true)}</span></li>)}</ol></details>
        </div></div>}
      <div className={s.trackFoot}><LockKeyhole size={13} /><span>For the complete report and desk remarks, <Link href="/reports">open My Reports <ArrowRight size={10} className="inline" /></Link>.</span></div>
    </div>
  </div>;
}
