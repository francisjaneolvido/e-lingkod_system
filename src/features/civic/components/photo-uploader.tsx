"use client";

import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { Camera, ImagePlus, X } from "lucide-react";
import { MAX_PHOTOS, MAX_PHOTO_BYTES } from "../config";
import s from "../civic.module.css";

type Photo = { file: File; url: string };
type CheckResult = { status: "ACCEPTED" | "REJECTED" | "UNCERTAIN" | "UNAVAILABLE"; score: number | null; observations: string; feedback: string };
export function PhotoUploader({ onChange, onValidation, disabled, category, title, description }: { onChange: (files: File[]) => void; onValidation: (ready: boolean) => void; disabled: boolean; category: string; title: string; description: string }) {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [error, setError] = useState("");
  const [results, setResults] = useState<CheckResult[]>([]);
  const [checking, setChecking] = useState(false);
  const [retry, setRetry] = useState(0);
  const urls = useRef<string[]>([]);
  const browse = useRef<HTMLInputElement>(null);
  const camera = useRef<HTMLInputElement>(null);
  useEffect(() => () => urls.current.forEach(url => URL.revokeObjectURL(url)), []);
  useEffect(() => {
    onValidation(false);
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setResults([]);
      setError("");
      if (!photos.length || !category || !title.trim() || !description.trim()) { setChecking(false); return; }
      setChecking(true);
      try {
        const form = new FormData(); form.set("category", category); form.set("title", title); form.set("description", description);
        photos.forEach(item => form.append("photos", item.file));
        const response = await fetch("/api/reports/evidence", { method: "POST", body: form, signal: controller.signal });
        const body = await response.json();
        if (!response.ok) throw new Error(body.error || "Photo check failed.");
        const checks = body.results as CheckResult[];
        setResults(checks);
        onValidation(checks.length === photos.length && checks.every(result => result.status === "ACCEPTED"));
      } catch (issue) { if (!controller.signal.aborted) { setError(issue instanceof Error ? issue.message : "Could not check the photos."); setResults([]); onValidation(false); } }
      finally { if (!controller.signal.aborted) setChecking(false); }
    }, 850);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [photos, category, title, description, onValidation, retry]);

  function add(event: ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(event.currentTarget.files || []);
    event.currentTarget.value = "";
    setError("");
    if (photos.length + selected.length > MAX_PHOTOS) { setError("You can attach up to 3 photos. Remove one before adding another."); return; }
    if (selected.some(file => !["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > MAX_PHOTO_BYTES || file.size === 0)) { setError("Choose JPG, PNG, or WebP photos of 3 MB or less each."); return; }
    const next = [...photos, ...selected.map(file => ({ file, url: URL.createObjectURL(file) }))];
    urls.current = next.map(photo => photo.url);
    setPhotos(next); onChange(next.map(photo => photo.file));
  }
  function remove(index: number) {
    URL.revokeObjectURL(photos[index].url);
    const next = photos.filter((_, position) => position !== index);
    urls.current = next.map(photo => photo.url);
    setPhotos(next); onChange(next.map(photo => photo.file)); setError("");
  }
  return <div>
    <input ref={browse} type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={add} disabled={disabled} className={s.srOnly} tabIndex={-1} aria-label="Choose report photos" />
    <input ref={camera} type="file" accept="image/jpeg,image/png,image/webp" capture="environment" onChange={add} disabled={disabled} className={s.srOnly} tabIndex={-1} aria-label="Take a report photo" />
    <div className={`${s.uploadBox} elb-civic-uploadBox`}><span className={s.uploadSymbol}><ImagePlus size={25} strokeWidth={1.6} /></span><div><strong>A clear photo makes a difference.</strong><p>Attach 1–3 photos · JPG, PNG, WebP · up to 3 MB each</p><div className={s.uploadActions}><button type="button" onClick={() => browse.current?.click()} disabled={disabled || photos.length === MAX_PHOTOS} className={`${s.textButton} elb-civic-textButton`}>Choose photos</button><button type="button" onClick={() => camera.current?.click()} disabled={disabled || photos.length === MAX_PHOTOS} className={`${s.textButton} elb-civic-textButton`}><Camera size={12} className="mr-1 inline" />Use camera</button></div></div></div>
    {error && <p role="alert" className={`${s.alert} elb-civic-alert`}>{error}</p>}
    {(error || results.some(result => result.status === "UNAVAILABLE")) && <button type="button" className={`${s.textButton} elb-civic-textButton`} disabled={disabled || checking} onClick={() => setRetry(current => current + 1)}>Retry photo check</button>}
    {photos.length > 0 && <div className={s.photoGrid}>{photos.map((photo, index) => <div key={photo.url} className={`${s.photoItem} elb-civic-photoItem`}>
      {/* Browser-local object URLs cannot use the Next.js image optimizer. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={photo.url} alt={`Photo evidence ${index + 1}`} /><button type="button" disabled={disabled} onClick={() => remove(index)} className={`${s.photoRemove} elb-civic-photoRemove`} aria-label={`Remove photo ${index + 1}`}><X size={14} /></button><p>{photo.file.name}</p><p role="status">{checking ? "Checking photo…" : !category || !title.trim() || !description.trim() ? "Choose a category and describe the concern to check this photo." : results[index] ? `${results[index].status === "ACCEPTED" ? "Image verified" : results[index].status === "REJECTED" ? "Image rejected" : "Could not verify image"}: ${results[index].feedback}` : "Waiting for photo check…"}</p>
    </div>)}</div>}
    <p className={`${s.hint} elb-civic-hint mt-3`} aria-live="polite">{photos.length ? `${photos.length} of 3 photos attached. ` : ""}Focus on the concern and avoid including people or private documents.</p>
  </div>;
}
