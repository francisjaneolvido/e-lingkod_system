"use client";

import { useState } from "react";
import { AlertCircle, CheckCircle2, Crosshair, LoaderCircle, MapPin } from "lucide-react";
import type { LocationValue } from "../types";
import { LocationMap } from "./location-map";
import s from "../civic.module.css";

export function LocationPicker({ value, onChange, disabled }: { value: LocationValue; onChange: (location: LocationValue) => void; disabled: boolean }) {
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState("");
  const lat = value.latitude.trim() ? Number(value.latitude) : null;
  const lng = value.longitude.trim() ? Number(value.longitude) : null;
  const valid = lat !== null && lng !== null && Number.isFinite(lat) && Number.isFinite(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;

  function locate() {
    setError("");
    if (!window.isSecureContext || !navigator.geolocation) { setError("GPS needs localhost or HTTPS. You can still enter an address or manual coordinates below."); return; }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(position => {
      onChange({ latitude: position.coords.latitude.toFixed(7), longitude: position.coords.longitude.toFixed(7), accuracy: Math.round(position.coords.accuracy), source: "GPS" });
      setLocating(false);
    }, issue => {
      setLocating(false);
      setError(issue.code === 1 ? "Location permission was declined. Enter the incident address and, if known, coordinates below." : "Your location could not be captured. Try again outdoors or enter the incident location manually.");
    }, { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 });
  }
  function manual(field: "latitude" | "longitude", text: string) {
    onChange({ ...value, [field]: text, accuracy: null, source: "MANUAL" });
  }
  return <>
    <div className={s.locationTop}><p>Capture the location <strong>only if you are at the incident site.</strong> Otherwise, enter its address or coordinates.</p><button type="button" disabled={disabled || locating} className={s.secondary} onClick={locate}>{locating ? <LoaderCircle size={15} className={s.spin} /> : <Crosshair size={15} />}{locating ? "Finding location…" : "Use my location"}</button></div>
    <LocationMap latitude={valid ? lat : null} longitude={valid ? lng : null} />
    {valid && <div className={s.locationCaptured}><CheckCircle2 size={14} />{value.source === "GPS" ? `GPS captured · estimated accuracy ±${value.accuracy ?? "—"} m` : "Manual coordinates added"}<button type="button" className={s.textButton} disabled={disabled} onClick={() => onChange({ latitude: "", longitude: "", accuracy: null, source: "ADDRESS" })}>Clear</button></div>}
    {error && <p role="status" className={s.alert}><AlertCircle size={15} />{error}</p>}
    <details className={s.manualToggle}><summary>Enter or adjust coordinates manually</summary><div className={s.coordinates}><div className={s.field}><label htmlFor="report-lat">Latitude</label><input id="report-lat" type="number" step="any" min="-90" max="90" inputMode="decimal" placeholder="e.g. 14.5995" value={value.latitude} onChange={event => manual("latitude", event.target.value)} disabled={disabled || locating} /></div><div className={s.field}><label htmlFor="report-lng">Longitude</label><input id="report-lng" type="number" step="any" min="-180" max="180" inputMode="decimal" placeholder="e.g. 120.9842" value={value.longitude} onChange={event => manual("longitude", event.target.value)} disabled={disabled || locating} /></div></div></details>
    <div className={`${s.twoFields} mt-5`}><div className={s.field}><label htmlFor="report-barangay">Barangay / area <span className={s.required}>*</span></label><input id="report-barangay" name="barangay" required minLength={2} maxLength={100} placeholder="Barangay or community name" autoComplete="address-level3" disabled={disabled} /></div><div className={s.field}><label htmlFor="report-address">Address / nearby landmark <span className={s.required}>*</span></label><input id="report-address" name="address" required minLength={8} maxLength={300} placeholder="Street, building, or nearby landmark" disabled={disabled} /></div></div>
    <p className={`${s.hint} mt-3`}><MapPin size={11} className="mr-1 inline" />The written address helps staff find the concern even when GPS is unavailable.</p>
  </>;
}
