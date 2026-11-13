"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AlertCircle, CheckCircle2, Crosshair, LoaderCircle, MapPin } from "lucide-react";
import type { LocationValue } from "../types";
import { chooseGpsReading, gpsErrorMessage, GPS_TARGET_ACCURACY_METERS } from "../gps-selection";
import { InteractiveMap } from "./interactive-map";
import s from "../civic.module.css";

// Watch briefly for improved readings instead of accepting the first, sometimes coarse, fix.
// This is deliberately finite to avoid tracking citizens after they finish choosing a pin.
const GPS_WATCH_WINDOW_MS = 25_000;

export function LocationPicker({ value, onChange, disabled }: { value: LocationValue; onChange: (location: LocationValue) => void; disabled: boolean }) {
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState("");
  const [address, setAddress] = useState("");
  const [barangay, setBarangay] = useState("");

  // A callback may arrive before React commits the most recent GPS fix. Keep the
  // latest value synchronously so two callbacks cannot overwrite a better fix.
  const latest = useRef({ value, onChange, disabled });
  useEffect(() => { latest.current = { value, onChange, disabled }; }, [value, onChange, disabled]);
  const watcher = useRef<number | null>(null);
  const watchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestId = useRef(0);
  const locationGeneration = useRef(0);
  const lookupAbort = useRef<AbortController | null>(null);
  const lookupTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const addressEdit = useRef(0);
  const barangayEdit = useRef(0);
  const addressWasEdited = useRef(false);
  const barangayWasEdited = useRef(false);

  const stopGps = useCallback(() => {
    if (watcher.current !== null && typeof navigator !== "undefined" && navigator.geolocation) {
      navigator.geolocation.clearWatch(watcher.current);
      watcher.current = null;
    }
    if (watchTimeout.current !== null) { clearTimeout(watchTimeout.current); watchTimeout.current = null; }
  }, []);

  const cancelLookup = useCallback(() => {
    if (lookupTimer.current !== null) { clearTimeout(lookupTimer.current); lookupTimer.current = null; }
    lookupAbort.current?.abort();
    lookupAbort.current = null;
  }, []);

  const apply = useCallback((next: LocationValue) => {
    latest.current.value = next;
    latest.current.onChange(next);
  }, []);

  const lookup = useCallback((latitude: number, longitude: number) => {
    cancelLookup();
    const generation = ++locationGeneration.current;
    const addressVersion = addressEdit.current;
    const barangayVersion = barangayEdit.current;
    const controller = new AbortController();
    lookupAbort.current = controller;
    // Debounce rapid GPS improvements to avoid excessive reverse-geocoding calls.
    lookupTimer.current = setTimeout(async () => {
      lookupTimer.current = null;
      try {
        const response = await fetch(`/api/reports/reverse-geocode?lat=${latitude}&lon=${longitude}`, { signal: controller.signal });
        const result = await response.json();
        if (!response.ok) throw new Error("Address lookup unavailable");
        if (controller.signal.aborted || locationGeneration.current !== generation) return;
        if (!addressWasEdited.current && addressEdit.current === addressVersion && typeof result.address === "string") setAddress(result.address);
        if (!barangayWasEdited.current && barangayEdit.current === barangayVersion && typeof result.barangay === "string") setBarangay(result.barangay);
      } catch {
        if (!controller.signal.aborted && locationGeneration.current === generation) {
          setError("The address could not be found automatically. Enter the barangay and a nearby landmark below.");
        }
      } finally { if (lookupAbort.current === controller) lookupAbort.current = null; }
    }, 350);
  }, [cancelLookup]);

  const locate = useCallback((allowManualReplacement: boolean) => {
    if (latest.current.disabled) return;
    requestId.current += 1;
    const request = requestId.current;
    stopGps();
    setError("");
    if (typeof window === "undefined" || !window.isSecureContext || !navigator.geolocation) {
      setLocating(false);
      setError("GPS requires HTTPS or localhost and location permission. You can choose the incident site manually on the map.");
      return;
    }
    setLocating(true);
    let receivedFix = false;
    try {
      watcher.current = navigator.geolocation.watchPosition(position => {
        if (requestId.current !== request || latest.current.disabled) return;
        const next = chooseGpsReading(latest.current.value, position.coords, position.timestamp, allowManualReplacement);
        if (!next) return;
        receivedFix = true;
        apply(next);
        setError("");
        lookup(position.coords.latitude, position.coords.longitude);
        if (next.accuracy !== null && next.accuracy <= GPS_TARGET_ACCURACY_METERS) {
          requestId.current += 1;
          stopGps();
          setLocating(false);
        }
      }, issue => {
        if (requestId.current !== request) return;
        requestId.current += 1;
        stopGps();
        setLocating(false);
        if (!receivedFix && latest.current.value.source !== "GPS") setError(gpsErrorMessage(issue.code));
      }, { enableHighAccuracy: true, timeout: 12_000, maximumAge: 0 });
      watchTimeout.current = setTimeout(() => {
        if (requestId.current !== request) return;
        requestId.current += 1;
        stopGps();
        setLocating(false);
        if (!receivedFix && latest.current.value.source !== "GPS") setError("No GPS reading arrived. Refresh Location or set the map pin yourself.");
      }, GPS_WATCH_WINDOW_MS);
    } catch {
      requestId.current += 1;
      stopGps();
      setLocating(false);
      setError("GPS could not be started. Check browser permissions or choose a location on the map.");
    }
  }, [apply, lookup, stopGps]);

  // Scheduling after mount avoids the duplicate permission request in React Strict Mode.
  useEffect(() => {
    const start = setTimeout(() => locate(false), 0);
    return () => { clearTimeout(start); requestId.current += 1; locationGeneration.current += 1; stopGps(); cancelLookup(); };
  }, [locate, stopGps, cancelLookup]);
  useEffect(() => {
    if (!disabled) return;
    requestId.current += 1;
    stopGps();
    // Reset the spinner if a submission finishes with an error and the form re-enables.
    const reset = setTimeout(() => setLocating(false), 0);
    return () => clearTimeout(reset);
  }, [disabled, stopGps]);

  function select(latitude: number, longitude: number) {
    if (latest.current.disabled || !Number.isFinite(latitude) || latitude < -90 || latitude > 90 ||
        !Number.isFinite(longitude) || longitude < -180 || longitude > 180) return;
    requestId.current += 1;
    stopGps();
    setLocating(false);
    setError("");
    apply({ latitude: latitude.toFixed(7), longitude: longitude.toFixed(7), accuracy: null, source: "MANUAL", capturedAt: null });
    lookup(latitude, longitude);
  }
  function manual(field: "latitude" | "longitude", text: string) {
    requestId.current += 1;
    stopGps();
    cancelLookup();
    locationGeneration.current += 1;
    setLocating(false);
    setError("");
    apply({ ...latest.current.value, [field]: text, accuracy: null, source: "MANUAL", capturedAt: null });
  }
  function clear() {
    requestId.current += 1;
    stopGps();
    cancelLookup();
    locationGeneration.current += 1;
    setLocating(false);
    setError("");
    apply({ latitude: "", longitude: "", accuracy: null, source: "ADDRESS", capturedAt: null });
  }

  const lat = value.latitude.trim() ? Number(value.latitude) : null;
  const lng = value.longitude.trim() ? Number(value.longitude) : null;
  const valid = lat !== null && lng !== null && Number.isFinite(lat) && Number.isFinite(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;

  return <>
    <div className={`${s.locationTop} elb-civic-locationTop`}>
      <p>GPS starts automatically, <strong>but use your device location only when you are at the incident site.</strong> Otherwise select the incident site on the map.</p>
      <button type="button" disabled={disabled || locating} className={`${s.secondary} elb-civic-secondary`} onClick={() => locate(value.source === "MANUAL")}>
        {locating ? <LoaderCircle size={15} className={s.spin} /> : <Crosshair size={15} />}
        {locating ? "Improving GPS accuracy…" : value.source === "MANUAL" ? "Replace pin with my GPS" : "Refresh Location"}
      </button>
    </div>
    <InteractiveMap points={valid ? [{ latitude: lat, longitude: lng }] : []} onSelect={select} />
    <p className={`${s.hint} elb-civic-hint mt-2`}>Click the map or drag the pin to correct the incident site. The map initially shows Los Baños; no point is saved until you select one. © OpenStreetMap contributors.</p>
    {valid && <div className={s.locationCaptured} aria-live="polite"><CheckCircle2 size={14} />
      {value.source === "GPS" ? `Browser GPS · estimated accuracy ±${value.accuracy ?? "—"} m · ${value.capturedAt ? new Date(value.capturedAt).toLocaleString("en-PH") : ""}` : "Manually selected point · location not GPS verified"}
      <button type="button" className={`${s.textButton} elb-civic-textButton`} disabled={disabled} onClick={clear}>Clear</button>
    </div>}
    {locating && <p role="status" className={`${s.hint} elb-civic-hint mt-2`}>Checking briefly for a more accurate GPS reading. Only better valid readings update the pin.</p>}
    {error && <p role="status" className={`${s.alert} elb-civic-alert`}><AlertCircle size={15} />{error}</p>}
    <details className={`${s.manualToggle} elb-civic-manualToggle`}><summary>Enter or adjust coordinates manually</summary><div className={s.coordinates}>
      <div className={`${s.field} elb-civic-field`}><label htmlFor="report-lat">Latitude</label><input id="report-lat" type="number" step="any" min="-90" max="90" inputMode="decimal" placeholder="e.g. 14.5995" value={value.latitude} onChange={event => manual("latitude", event.target.value)} disabled={disabled} /></div>
      <div className={`${s.field} elb-civic-field`}><label htmlFor="report-lng">Longitude</label><input id="report-lng" type="number" step="any" min="-180" max="180" inputMode="decimal" placeholder="e.g. 120.9842" value={value.longitude} onChange={event => manual("longitude", event.target.value)} disabled={disabled} /></div>
    </div></details>
    <div className={`${s.twoFields} mt-5`}><div className={`${s.field} elb-civic-field`}><label htmlFor="report-barangay">Barangay / area <span className={s.required}>*</span></label><input id="report-barangay" name="barangay" required minLength={2} maxLength={100} placeholder="Barangay or community name" autoComplete="address-level3" value={barangay} onChange={event => { barangayWasEdited.current = true; barangayEdit.current += 1; setBarangay(event.target.value); }} disabled={disabled} /></div>
      <div className={`${s.field} elb-civic-field`}><label htmlFor="report-address">Address / nearby landmark <span className={s.required}>*</span></label><input id="report-address" name="address" required minLength={8} maxLength={300} placeholder="Street, building, or nearby landmark" value={address} onChange={event => { addressWasEdited.current = true; addressEdit.current += 1; setAddress(event.target.value); }} disabled={disabled} /></div></div>
    <p className={`${s.hint} elb-civic-hint mt-3`}><MapPin size={11} className="mr-1 inline" />Confirm the barangay and landmark yourself. GPS can be inaccurate indoors; when address lookup is enabled, coordinates are sent to Geoapify. Address data © Geoapify, © OpenStreetMap contributors.</p>
  </>;
}
