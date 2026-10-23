"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarCheck2, CalendarClock } from "lucide-react";

const formatSlot = (value: string) => new Date(value).toLocaleString("en-PH", { timeZone: "Asia/Manila", weekday: "long", month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });

export function CitizenPickupPanel({ request }: { request: any }) {
  const router = useRouter();
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const slots: any[] = request.pickupSlots || [];
  const proposed = slots.filter(item => item.status === "PROPOSED");
  const confirmed = slots.find(item => item.status === "CONFIRMED");
  const claimed = slots.find(item => item.status === "CLAIMED");
  const changesRequested = slots.some(item => item.status === "CHANGE_REQUESTED");
  const canReschedule = proposed.length > 0 || !!confirmed;

  async function update(slotId: string, action: "SELECT" | "REQUEST_CHANGE") {
    setBusy(true); setError("");
    try {
      const response = await fetch(`/api/services/requests/${request.id}/pickup/${slotId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, note: reason }) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Could not update your pickup selection.");
      setReason(""); router.refresh();
    } catch (error) { setError(error instanceof Error ? error.message : "Please try again."); }
    finally { setBusy(false); }
  }
  return <section className="rounded-[18px] border border-[#c8e3dc] bg-[#f5fcf9] p-4">
    <div className="flex items-start gap-2.5"><CalendarClock size={18} className="mt-0.5 text-[#22816d]"/><div><h2 className="text-xs font-black text-[#205c51]">Document pickup schedule</h2><p className="mt-1 text-[10px] leading-4 text-[#547f70]">Your document has been approved for release. Select a pickup time provided by the processing office. This is not your interview/inspection appointment.</p></div></div>
    <div className="mt-3 rounded-xl bg-white p-3"><p className="text-[9px] text-[#6d877e]">Your pickup reference</p><p className="mt-0.5 select-all text-sm font-black tracking-wide text-[#1c6154]">{request.trackingId}</p><p className="mt-1 text-[9px] text-[#6d877e]">Present your reference and a valid ID at the releasing counter.</p></div>
    {!!proposed.length && <div className="mt-3 space-y-2"><p className="text-[10px] font-bold text-[#376b5f]">Choose one available slot</p>{proposed.map(slot => <button key={slot.id} disabled={busy || new Date(slot.scheduledAt).getTime() <= Date.now()} onClick={() => update(slot.id, "SELECT")} className="w-full rounded-xl border border-[#c8e2d7] bg-white px-3 py-3 text-left text-[10px] hover:border-[#348671] disabled:opacity-40"><strong className="block text-[11px] text-[#206854]">{formatSlot(slot.scheduledAt)}</strong><span className="mt-1 block text-[#5a8174]">{slot.location}</span><span className="mt-1 block text-[#718d83]">{slot.instructions}</span></button>)}</div>}
    {confirmed && <div className="mt-3 rounded-xl border border-[#a1d0be] bg-white p-3 text-[10px] text-[#316955]"><div className="flex items-center gap-2"><CalendarCheck2 size={16}/><strong>Pickup confirmed</strong></div><p className="mt-2 font-bold">{formatSlot(confirmed.scheduledAt)}</p><p className="mt-1">{confirmed.location}</p><p className="mt-1 text-[#648275]">{confirmed.instructions}</p></div>}
    {claimed && <p className="mt-3 rounded-xl bg-emerald-100 p-3 text-[10px] text-emerald-900">Document collection recorded on {formatSlot(claimed.claimedAt || claimed.scheduledAt)}. Final completion is subject to Admin verification.</p>}
    {!proposed.length && !confirmed && !claimed && <p className="mt-3 text-[10px] leading-4 text-[#668478]">{changesRequested ? "You requested a new schedule. The LGU office will send updated choices." : "Waiting for the LGU office to offer pickup date/time options."}</p>}
    {canReschedule && <div className="mt-3 border-t border-[#d6e9dd] pt-3"><label className="block text-[10px] font-bold text-[#4c7362]">Can't attend? Request different dates</label><textarea aria-label="Reason for pickup reschedule" value={reason} onChange={event => setReason(event.target.value)} className="mt-1 w-full rounded-lg border border-[#c8e3d5] bg-white p-2.5 text-[10px]" rows={2} maxLength={800} placeholder="Explain why the available dates don't work."/><button disabled={busy || reason.trim().length < 4} onClick={() => update(confirmed?.id || proposed[0].id, "REQUEST_CHANGE")} className="mt-2 rounded-xl border border-[#abcdbb] bg-white px-3 py-2.5 text-[10px] font-bold text-[#347b5a] disabled:opacity-40">Request new pickup dates</button></div>}
    {error && <p role="alert" className="mt-3 rounded-lg bg-rose-50 p-3 text-[10px] text-rose-700">{error}</p>}
  </section>;
}
