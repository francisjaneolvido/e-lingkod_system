"use client";

import { useEffect, useRef, useState } from "react";
import { AlertCircle, CheckCircle2, Crosshair, LoaderCircle, MapPin } from "lucide-react";
import type { LocationValue } from "../types";
import { InteractiveMap } from "./interactive-map";
import s from "../civic.module.css";

export function LocationPicker({ value, onChange, disabled }: { value: LocationValue; onChange: (location: LocationValue) => void; disabled: boolean }) {
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState("");
  const [address, setAddress] = useState("");
  const [barangay, setBarangay] = useState("");
  const addressEdit = useRef(0);
  const barangayEdit = useRef(0);
  const locationGeneration = useRef(0);
  const autoRequested = useRef(false);
  const lat = value.latitude.trim() ? Number(value.latitude) : null;
  const lng = value.longitude.trim() ? Number(value.longitude) : null;
  const valid = lat !== null && lng !== null && Number.isFinite(lat) && Number.isFinite(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;

  async function lookup(latitude: number, longitude: number, generation: number, addressVersion: number, barangayVersion: number) {
    try {
      const response = await fetch(`/api/reports/reverse-geocode?lat=${latitude}&lon=${longitude}`);
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Address lookup unavailable.");
      if (locationGeneration.current !== generation) return;
      if (addressEdit.current === addressVersion) setAddress(result.address || "");
      if (result.barangay && barangayEdit.current === barangayVersion) setBarangay(result.barangay);
    } catch { if (locationGeneration.current === generation) setError("The address could not be found automatically. Enter a nearby landmark and barangay below."); }
  }
  function select(latitude: number, longitude: number) {
    const generation = ++locationGeneration.current;
    onChange({ latitude: latitude.toFixed(7), longitude: longitude.toFixed(7), accuracy: null, source: "MANUAL", capturedAt: null });
    void lookup(latitude, longitude, generation, addressEdit.current, barangayEdit.current);
  }
  function locate() {
    setError("");
    if (!window.isSecureContext || !navigator.geolocation) { setError("GPS needs localhost or HTTPS. You can still enter an address or manual coordinates below."); return; }
    const generation = ++locationGeneration.current;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(position => {
      setLocating(false);
      if (locationGeneration.current !== generation) return;
      onChange({ latitude: position.coords.latitude.toFixed(7), longitude: position.coords.longitude.toFixed(7), accuracy: Math.round(position.coords.accuracy), source: "GPS", capturedAt: new Date(position.timestamp).toISOString() });
      void lookup(position.coords.latitude, position.coords.longitude, generation, addressEdit.current, barangayEdit.current);
    }, issue => {
      setLocating(false);
      if (locationGeneration.current !== generation) return;
      setError(issue.code === 1 ? "Location permission was declined. Enter the incident address and, if known, coordinates below." : issue.code === 3 ? "GPS timed out. Try again or choose the location on the map." : "Location services are unavailable. Enter the incident address or choose a point on the map.");
    }, { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 });
  }
  const initialLocate = useRef(locate);
  useEffect(() => { if (!autoRequested.current) { const timer = setTimeout(() => { autoRequested.current = true; initialLocate.current(); }, 0); return () => clearTimeout(timer); } }, []); // Request once when this form opens, including development strict mode.
  function manual(field: "latitude" | "longitude", text: string) {
    locationGeneration.current++;
    onChange({ ...value, [field]: text, accuracy: null, source: "MANUAL", capturedAt: null });
  }
  return <>
    <div className={`${s.locationTop} elb-civic-locationTop`}><p>Capture the location <strong>only if you are at the incident site.</strong> Otherwise, enter its address or coordinates.</p><button type="button" disabled={disabled || locating} className={`${s.secondary} elb-civic-secondary`} onClick={locate}>{locating ? <LoaderCircle size={15} className={s.spin} /> : <Crosshair size={15} />}{locating ? "Finding location…" : "Use my location"}</button></div>
    <InteractiveMap points={valid ? [{ latitude: lat, longitude: lng }] : []} onSelect={select} />
    <p className={`${s.hint} elb-civic-hint mt-2`}>Click the map or drag the pin to correct the incident site. The map initially shows Los Baños; no point is saved until you select one. © OpenStreetMap contributors.</p>
    {valid && <div className={s.locationCaptured}><CheckCircle2 size={14} />{value.source === "GPS" ? `Browser GPS captured · estimated accuracy ±${value.accuracy ?? "—"} m · ${value.capturedAt ? new Date(value.capturedAt).toLocaleString("en-PH") : ""}` : "Manually selected point · location not GPS verified"}<button type="button" className={`${s.textButton} elb-civic-textButton`} disabled={disabled} onClick={() => { locationGeneration.current++; onChange({ latitude: "", longitude: "", accuracy: null, source: "ADDRESS", capturedAt: null }); }}>Clear</button></div>}
    {error && <p role="status" className={`${s.alert} elb-civic-alert`}><AlertCircle size={15} />{error}</p>}
    <details className={`${s.manualToggle} elb-civic-manualToggle`}><summary>Enter or adjust coordinates manually</summary><div className={s.coordinates}><div className={`${s.field} elb-civic-field`}><label htmlFor="report-lat">Latitude</label><input id="report-lat" type="number" step="any" min="-90" max="90" inputMode="decimal" placeholder="e.g. 14.5995" value={value.latitude} onChange={event => manual("latitude", event.target.value)} disabled={disabled || locating} /></div><div className={`${s.field} elb-civic-field`}><label htmlFor="report-lng">Longitude</label><input id="report-lng" type="number" step="any" min="-180" max="180" inputMode="decimal" placeholder="e.g. 120.9842" value={value.longitude} onChange={event => manual("longitude", event.target.value)} disabled={disabled || locating} /></div></div></details>
    <div className={`${s.twoFields} mt-5`}><div className={`${s.field} elb-civic-field`}><label htmlFor="report-barangay">Barangay / area <span className={s.required}>*</span></label><input id="report-barangay" name="barangay" required minLength={2} maxLength={100} placeholder="Barangay or community name" autoComplete="address-level3" value={barangay} onChange={event => { barangayEdit.current++; setBarangay(event.target.value); }} disabled={disabled} /></div><div className={`${s.field} elb-civic-field`}><label htmlFor="report-address">Address / nearby landmark <span className={s.required}>*</span></label><input id="report-address" name="address" required minLength={8} maxLength={300} placeholder="Street, building, or nearby landmark" value={address} onChange={event => { addressEdit.current++; setAddress(event.target.value); }} disabled={disabled} /></div></div>
    <p className={`${s.hint} elb-civic-hint mt-3`}><MapPin size={11} className="mr-1 inline" />The written address helps staff find the concern even when GPS is unavailable. If address lookup is enabled, selected coordinates are sent to Geoapify. Address data © Geoapify, © OpenStreetMap contributors.</p>
  </>;
}
