"use client";

import { useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import Image from "next/image";
import { AlertCircle, ArrowRight, Building2, Check, CheckCircle2, CircleHelp, FileCheck2, Leaf, Lightbulb, LoaderCircle, MapPin, Route, ShieldCheck, Trash2 } from "lucide-react";
import { REPORT_CATEGORIES } from "../config";
import type { LocationValue } from "../types";
import { PhotoUploader } from "./photo-uploader";
import { LocationPicker } from "./location-picker";
import { CopyTracking } from "./copy-tracking";
import s from "../civic.module.css";

const icons = { road: Route, light: Lightbulb, waste: Trash2, building: Building2, tree: Leaf, other: CircleHelp };

export function ReportForm() {
  const [category, setCategory] = useState("");
  const [photos, setPhotos] = useState<File[]>([]);
  const [location, setLocation] = useState<LocationValue>({ latitude: "", longitude: "", accuracy: null, source: "ADDRESS" });
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [receipt, setReceipt] = useState<{ id: string; trackingId: string } | null>(null);
  const submissionKey = useRef("");
  const errorBox = useRef<HTMLDivElement>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    setError("");
    const values = new FormData(event.currentTarget);
    if (!category || photos.length === 0) { setError("Choose a concern type and attach at least one photo before submitting."); requestAnimationFrame(() => errorBox.current?.focus()); return; }
    if (!submissionKey.current) submissionKey.current = crypto.randomUUID();
    values.set("submissionKey", submissionKey.current);
    values.set("latitude", location.latitude); values.set("longitude", location.longitude);
    values.set("locationSource", location.source); values.set("gpsAccuracy", location.accuracy === null ? "" : String(location.accuracy));
    values.set("confirmed", values.get("confirmed") === "on" ? "true" : "false");
    photos.forEach(photo => values.append("photos", photo));
    setPending(true);
    try {
      const response = await fetch("/api/reports", { method: "POST", body: values, credentials: "same-origin" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Your report could not be submitted. Please try again.");
      setReceipt({ id: result.id, trackingId: result.trackingId });
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (issue) {
      setError(issue instanceof Error ? issue.message : "Unable to submit. Check your connection and try again.");
      requestAnimationFrame(() => errorBox.current?.focus());
    } finally { setPending(false); }
  }

  if (receipt) return <section className={s.receipt} aria-labelledby="report-success-title">
    <div className={s.receiptHead}><div className={s.receiptSymbol}><CheckCircle2 size={30} strokeWidth={1.7} /></div><span className={s.eyebrow}>Concern received</span><h1 id="report-success-title">Salamat sa pakikilahok.</h1><p>Your report is saved. The community action desk can now review the details and record its next steps.</p></div>
    <div className={s.receiptBody}><span className={s.overline}>Your tracking ID</span><div className={s.receiptId}><strong>{receipt.trackingId}</strong><CopyTracking value={receipt.trackingId} /></div><p>Keep this ID to check progress. Your full report, photos, and desk remarks are available in My Reports.</p><div className={s.actions}><Link href={`/reports/${receipt.id}`} className={s.primary}>View my report <ArrowRight size={15} /></Link><Link href="/reports" className={s.secondary}>All my reports</Link></div><div className={s.smallSection}><h3>What happens next?</h3><p>The desk validates your concern, assigns an office, and records progress. A saved report does not mean emergency assistance has been dispatched.</p></div></div>
  </section>;

  return <>
    <div className={s.hero}><div><span className={s.eyebrow}>01 / Civic reporting</span><h1>May concern sa inyong lugar?<br /><em>Let&apos;s put it on record.</em></h1><p>A broken streetlight. A blocked drain. A place that needs care.<br className="hidden sm:block" /> Share the details, mark the location, and follow the action.</p></div><div className={s.heroAside}><strong>One concern. One clear trail.</strong>Every submission gets a tracking ID and its own progress history.</div></div>
    <div className={s.formLayout}>
      <form onSubmit={submit} className={s.formStack} aria-label="Submit a civic report">
        <section className={s.panel}><div className={s.panelInner}><div className={s.sectionHead}><span className={s.stepNumber}>01</span><div><h2>Tell us what needs attention</h2><p>Choose the closest concern type, then describe what you observed.</p></div></div>
          <fieldset disabled={pending}><legend className={s.srOnly}>Concern type (required)</legend><div className={s.categories}>{REPORT_CATEGORIES.map(item => { const Icon = icons[item.icon]; return <label key={item.value} className={s.category}><input type="radio" name="category" required value={item.value} checked={category === item.value} onChange={() => setCategory(item.value)} /><Icon size={23} strokeWidth={1.65} />{category === item.value && <Check size={13} className={s.categoryCheck} />}<strong>{item.label}</strong><span>{item.detail}</span></label>; })}</div></fieldset>
          <div className={s.fields}><div className={s.field}><label htmlFor="report-title">Give your concern a short title <span className={s.required}>*</span></label><input id="report-title" name="title" required minLength={8} maxLength={120} placeholder="e.g. Broken streetlight near the barangay hall" disabled={pending} /></div><div className={s.field}><label htmlFor="report-description">What happened? <span className={s.required}>*</span></label><textarea id="report-description" name="description" required minLength={20} maxLength={2000} rows={4} placeholder="Describe the problem, where it is, and anything that will help the desk understand your concern." disabled={pending} /><div className={s.fieldFooter}><span className={s.hint}>Be specific. Include when you noticed the concern.</span><span className={s.count}>20–2,000 characters</span></div></div></div>
        </div></section>
        <section className={s.panel}><div className={s.panelInner}><div className={s.sectionHead}><span className={s.stepNumber}>02</span><div><h2>Show us the situation</h2><p>Add a clear photo so the action desk can review the concern.</p></div></div><PhotoUploader onChange={setPhotos} disabled={pending} /></div></section>
        <section className={s.panel}><div className={s.panelInner}><div className={s.sectionHead}><span className={s.stepNumber}>03</span><div><h2>Where is the concern?</h2><p>Pin the incident site and add an address or nearby landmark.</p></div></div><LocationPicker value={location} onChange={setLocation} disabled={pending} /></div></section>
        <section className={s.panel}><div className={s.panelInner}><div className={s.sectionHead}><span className={s.stepNumber}><FileCheck2 size={16} /></span><div><h2>Ready to send?</h2><p>Your report and photos will be shared with the LGU action desk.</p></div></div><label className={s.confirmBox}><input type="checkbox" name="confirmed" required disabled={pending} /><span>I confirm that the details are accurate to the best of my knowledge and the location refers to the incident site. I understand that my report will be reviewed before action is recorded.</span></label>
          {error && <div ref={errorBox} tabIndex={-1} role="alert" className={s.alert}><AlertCircle size={16} />{error}</div>}
          <div className={s.submitRow}><p><ShieldCheck size={12} className="mr-1 inline" /> Your photos, address, and identity are visible only to you and authorized LGU staff.</p><button type="submit" className={s.primary} disabled={pending}>{pending ? <><LoaderCircle size={16} className={s.spin} />Saving your report…</> : <>Submit report <ArrowRight size={16} /></>}</button></div>
        </div></section>
      </form>
      <aside className={s.sideRail} aria-label="Reporting guide">
        <div className={s.imageStory}><Image src="/images/landing/neighbors-at-work.webp" alt="Illustration of neighbors caring for a shared community space" fill sizes="(max-width: 850px) 100vw, 335px" /><div className={s.imageStoryCopy}><span className={s.storyTag}>For the places we share</span><h2>A better bayan<br />starts with you.</h2><p>Small observations help the community take its next step.</p><span className="mt-3 block text-xs text-white/60">Illustrative community image</span></div></div>
        <div className={s.sideCard}><h3><Route size={16} /> From concern to action</h3><ol className={s.sideSteps}><li><span>01</span><div><strong>Capture the concern</strong><p>Clear details and photos help staff understand the situation.</p></div></li><li><span>02</span><div><strong>Put it in the right place</strong><p>Location and a nearby landmark help the desk route your report.</p></div></li><li><span>03</span><div><strong>Follow the progress</strong><p>Use your tracking ID or open My Reports for desk remarks.</p></div></li></ol></div>
        <p className={s.note}><CircleHelp size={15} /><span>For immediate danger, contact the appropriate emergency service directly. Civic reports are reviewed through the action desk.</span></p>
        <Link href="/track" className={`${s.note} items-center`}><MapPin size={15} /><span>Already reported? Track its progress <ArrowRight size={12} className="ml-1 inline" /></span></Link>
      </aside>
    </div>
  </>;
}
