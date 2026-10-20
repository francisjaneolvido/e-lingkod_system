"use client";

import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { Camera, ImagePlus, X } from "lucide-react";
import { MAX_PHOTOS, MAX_PHOTO_BYTES } from "../config";
import s from "../civic.module.css";

type Photo = { file: File; url: string };
export function PhotoUploader({ onChange, disabled }: { onChange: (files: File[]) => void; disabled: boolean }) {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [error, setError] = useState("");
  const urls = useRef<string[]>([]);
  const browse = useRef<HTMLInputElement>(null);
  const camera = useRef<HTMLInputElement>(null);
  useEffect(() => () => urls.current.forEach(url => URL.revokeObjectURL(url)), []);

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
    <div className={s.uploadBox}><span className={s.uploadSymbol}><ImagePlus size={25} strokeWidth={1.6} /></span><div><strong>A clear photo makes a difference.</strong><p>Attach 1–3 photos · JPG, PNG, WebP · up to 3 MB each</p><div className={s.uploadActions}><button type="button" onClick={() => browse.current?.click()} disabled={disabled || photos.length === MAX_PHOTOS} className={s.textButton}>Choose photos</button><button type="button" onClick={() => camera.current?.click()} disabled={disabled || photos.length === MAX_PHOTOS} className={s.textButton}><Camera size={12} className="mr-1 inline" />Use camera</button></div></div></div>
    {error && <p role="alert" className={s.alert}>{error}</p>}
    {photos.length > 0 && <div className={s.photoGrid}>{photos.map((photo, index) => <div key={photo.url} className={s.photoItem}>
      {/* Browser-local object URLs cannot use the Next.js image optimizer. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={photo.url} alt={`Photo evidence ${index + 1}`} /><button type="button" disabled={disabled} onClick={() => remove(index)} className={s.photoRemove} aria-label={`Remove photo ${index + 1}`}><X size={14} /></button><p>{photo.file.name}</p>
    </div>)}</div>}
    <p className={`${s.hint} mt-3`} aria-live="polite">{photos.length ? `${photos.length} of 3 photos attached. ` : ""}Focus on the concern and avoid including people or private documents.</p>
  </div>;
}
