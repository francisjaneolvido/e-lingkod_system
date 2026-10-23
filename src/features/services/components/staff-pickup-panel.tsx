"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarClock, CheckCircle2, Plus, Trash2 } from "lucide-react";

const field = "w-full rounded-xl border border-[#cbdde7] bg-white px-3 py-2.5 text-xs text-[#264f66]";
const formatSlot = (value: string) => new Date(value).toLocaleString("en-PH", { timeZone: "Asia/Manila", weekday: "short", month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });

export function StaffPickupPanel({ request }: { request: any }) {
  const router = useRouter();
  const [dates, setDates] = useState(["", "", ""]);
  const [location, setLocation] = useState(request.assignedDepartment || "Municipal Hall - Releasing Counter");
  const [instructions, setInstructions] = useState("Bring your tracking number and a valid ID. Authorized representatives must bring authorization and IDs.");
  const [claimantName, setClaimantName] = useState("");
  const [releaseNote, setReleaseNote] = useState("");
  const [idVerified, setIdVerified] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const slots = request.pickupSlots || [];
  const proposed = slots.filter((slot: any) => slot.status === "PROPOSED");
  const confirmed = slots.find((slot: any) => slot.status === "CONFIRMED");
  const claimed = slots.find((slot: any) => slot.status === "CLAIMED");
  const canOffer = !proposed.length && !confirmed && !claimed;
  const pickupDue = confirmed && new Date(confirmed.scheduledAt).getTime() <= Date.now();

  async function submit(url: string, body: any, method = "POST") {
    setBusy(true); setError("");
    try {
      const response = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Unable to update pickup schedule.");
      router.refresh();
    } catch (error) {
      setError(error instanceof Error ? error.message : "Request failed.");
    } finally { setBusy(false); }
  }

  return <section className="rounded-2xl border border-[#c9e5df] bg-[#f7fcfa] p-4">
    <div className="flex items-start gap-2"><CalendarClock size={18} className="mt-0.5 text-[#16806a]"/><div><h3 className="text-xs font-black text-[#205f58]">Document pickup scheduling</h3><p className="mt-1 text-[10px] leading-4 text-[#547b74]">Separate from interview/inspection appointments. Citizen chooses when to collect the approved physical document. Pickup reference: <strong>{request.trackingId}</strong>.</p></div></div>
    {claimed && <p className="mt-3 rounded-xl bg-emerald-50 p-3 text-[10px] font-semibold text-emerald-800">Document collected by {claimed.claimantName} on {formatSlot(claimed.claimedAt || claimed.scheduledAt)}. Pending Admin completion verification.</p>}
    {proposed.length > 0 && <div className="mt-3 rounded-xl bg-white p-3 text-[10px] text-[#427167]"><strong>Waiting for citizen selection.</strong> {proposed.length} pickup options sent. Citizen can choose one or request new dates.</div>}
    {confirmed && <div className="mt-3 rounded-xl bg-white p-3 text-[10px] text-[#35665a]"><strong>Confirmed pickup:</strong> {formatSlot(confirmed.scheduledAt)}<p className="mt-1">{confirmed.location}</p><p className="mt-1 text-[#637f77]">Ask for tracking ID and confirm claimant identity/authorization before handing over the document.</p></div>}
    {canOffer && <div className="mt-3 space-y-2">
      <p className="text-[10px] font-bold text-[#386d62]">Offer 2–5 available pickup dates (Philippine time)</p>
      {dates.map((value, index) => <div key={index} className="flex gap-2"><input aria-label={`Pickup date option ${index + 1}`} className={field} type="datetime-local" value={value} onChange={event => setDates(current => current.map((v, i) => i === index ? event.target.value : v))}/>{dates.length > 2 && <button type="button" aria-label="Remove pickup choice" className="rounded-lg border p-2" onClick={() => setDates(current => current.filter((_, i) => i !== index))}><Trash2 size={14}/></button>}</div>)}
      <button type="button" disabled={dates.length >= 5} className="inline-flex items-center gap-1 text-[10px] font-bold text-[#277763] disabled:opacity-40" onClick={() => setDates(current => [...current, ""])}><Plus size={13}/> Add pickup choice</button>
      <input aria-label="Document releasing office" className={field} value={location} onChange={event => setLocation(event.target.value)} placeholder="Document releasing office / counter" maxLength={220}/>
      <textarea aria-label="Pickup requirements" className={field} rows={3} value={instructions} onChange={event => setInstructions(event.target.value)} placeholder="What to bring, office hours, authorization requirements" maxLength={800}/>
      <button disabled={busy || dates.filter(Boolean).length < 2 || !location.trim() || !instructions.trim()} className="rounded-xl bg-[#19745f] px-4 py-2.5 text-[10px] font-bold text-white disabled:opacity-50" onClick={() => submit(`/api/admin/services/requests/${request.id}/pickup`, { slots: dates.filter(Boolean).map(value => ({ scheduledAt: new Date(`${value}:00+08:00`).toISOString() })), location, instructions })}>Send pickup date options</button>
    </div>}
    {confirmed && <div className="mt-3 space-y-2 rounded-xl border border-[#bcd8ca] bg-white p-3">
      <h4 className="text-[11px] font-bold text-[#245e4f]">Record actual document claiming</h4>
      {!pickupDue && <p className="text-[10px] text-[#826c3f]">Release recording unlocks on the confirmed pickup date/time.</p>}
      <input className={field} aria-label="Claimant full name" placeholder="Name of person who actually claimed the document" maxLength={180} value={claimantName} onChange={event => setClaimantName(event.target.value)}/>
      <label className="flex gap-2 text-[10px] leading-4 text-[#3b6557]"><input type="checkbox" checked={idVerified} onChange={event => setIdVerified(event.target.checked)}/> I checked the claimant's ID and, if needed, authorization.</label>
      <textarea className={field} rows={2} placeholder="Release remarks (minimum 8 characters)" value={releaseNote} onChange={event => setReleaseNote(event.target.value)} maxLength={1800}/>
      <button disabled={busy || !pickupDue || !idVerified || claimantName.trim().length < 2 || releaseNote.trim().length < 8} className="inline-flex items-center gap-1.5 rounded-xl bg-[#19745f] px-4 py-2.5 text-[10px] font-bold text-white disabled:opacity-50" onClick={() => submit(`/api/admin/services/requests/${request.id}`, { action: "MARK_RELEASED", claimantName, idVerified, note: releaseNote }, "PATCH")}><CheckCircle2 size={14}/> Confirm physical document released</button>
    </div>}
    {error && <p role="alert" className="mt-3 rounded-lg bg-rose-50 p-3 text-[10px] text-rose-700">{error}</p>}
  </section>;
}
