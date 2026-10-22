"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, CalendarClock, CheckCircle2, ClipboardCheck, Loader2, Plus, Send, Trash2, UserRoundCheck } from "lucide-react";
import type { SerializableOnlineServiceDefinition } from "../catalog";

const input = "w-full rounded-xl border border-[#cadde7] bg-white px-3 py-2.5 text-xs text-[#244f69] outline-none transition focus:border-[#4b99b8] focus:ring-2 focus:ring-[#d8eef6]";

export function AdminRequestActions({ request, service, viewerRole, staff, verificationReady, verifiedRequiredCount, requiredDocumentCount }: {
  request:any;
  service:SerializableOnlineServiceDefinition;
  viewerRole:string;
  staff:Array<any>;
  verificationReady:boolean;
  verifiedRequiredCount:number;
  requiredDocumentCount:number;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [note, setNote] = useState("");
  const [staffId, setStaffId] = useState(request.assignedStaffId || "");
  const [slots, setSlots] = useState(["", "", ""]);
  const [location, setLocation] = useState(request.assignedDepartment || service.processingOffice);
  const [agenda, setAgenda] = useState(service.appointmentPurpose || "LGU service appointment");

  const reviewStage = ["SUBMITTED", "ASSIGNED", "UNDER_REVIEW"].includes(request.status);
  const releaseAlreadyApproved = Boolean(request.releaseApprovedAt);
  const canOfferSchedule = request.status === "VALIDATED" && service.appointmentMode !== "NONE";
  const requiredAppointment = !["NONE", "OPTIONAL"].includes(service.appointmentMode);

  const actionHint = useMemo(() => {
    if (request.status === "FOR_TRIAGE") return "Screen the intake. Open the full form only when this is the correct service path.";
    if (reviewStage && !verificationReady) return `Verify the required documents before validation (${verifiedRequiredCount}/${requiredDocumentCount}).`;
    if (reviewStage) return "All currently required documents are verified. Validate the request when the form is also correct.";
    if (request.status === "VALIDATED" && requiredAppointment) return "Offer 2–5 schedule options. The citizen chooses the preferred slot.";
    if (request.status === "VALIDATED" && service.appointmentMode === "OPTIONAL") return "You may continue directly to recommendation, or offer schedule options only if an in-person step is needed.";
    if (request.status === "VALIDATED") return "Record the staff recommendation and send the case to Super Admin final verification.";
    if (request.status === "SCHEDULED") return "Schedule options were sent. Wait for the citizen to choose a slot or request new options.";
    if (request.status === "APPOINTMENT_CONFIRMED") return "Conduct the confirmed activity first. Record the outcome only after the scheduled time has occurred.";
    if (request.status === "APPOINTMENT_COMPLETED") return "The scheduled activity is complete. Add the staff recommendation and submit for final verification.";
    if (request.status === "FOR_FINAL_VERIFICATION") return releaseAlreadyApproved ? "Release was authorized and delivered. Super Admin must verify final completion." : "Staff actions are locked while Super Admin performs final verification.";
    if (request.status === "READY_FOR_RELEASE") return `Record the actual release / delivery of ${service.outcomeLabel.toLowerCase()}.`;
    return "Actions are limited by the current workflow state to protect the audit trail.";
  }, [request.status, releaseAlreadyApproved, reviewStage, verificationReady, verifiedRequiredCount, requiredDocumentCount, requiredAppointment, service]);

  async function call(url:string, method:string, body:any) {
    setBusy(url + method);
    setError("");
    try {
      const response = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Action failed.");
      setNote("");
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Action failed.");
    } finally { setBusy(""); }
  }

  const action = (actionName:string) => call(`/api/admin/services/requests/${request.id}`, "PATCH", { action: actionName, note });
  const primary = (() => {
    if (request.status === "FOR_TRIAGE") return { label:"Open full form", action:"OPEN_FORM", note:false };
    if (["SUBMITTED", "ASSIGNED"].includes(request.status)) return { label:"Start requirements review", action:"START_REVIEW", note:false };
    if (reviewStage) return { label:"Validate request", action:"VALIDATE", note:false, disabled:!verificationReady };
    if (request.status === "APPOINTMENT_CONFIRMED") return { label:`Record ${service.appointmentMode === "INSPECTION" ? "inspection" : "appointment"} outcome`, action:"COMPLETE_APPOINTMENT", note:true };
    if (request.status === "APPOINTMENT_COMPLETED") return { label:"Submit staff recommendation", action:"RECOMMEND_FINAL", note:true };
    if (request.status === "VALIDATED" && (!requiredAppointment || service.appointmentMode === "OPTIONAL")) return { label:"Submit staff recommendation", action:"RECOMMEND_FINAL", note:true };
    if (request.status === "READY_FOR_RELEASE") return { label:"Record release / delivery", action:"MARK_RELEASED", note:true };
    return null;
  })();

  function setSlot(index:number, value:string) { setSlots(current => current.map((slot,i) => i === index ? value : slot)); }
  function addSlot() { if (slots.length < 5) setSlots(current => [...current, ""]); }
  function removeSlot(index:number) { if (slots.length > 2) setSlots(current => current.filter((_,i) => i !== index)); }

  return <div className="space-y-3">
    <section className="rounded-2xl border border-[#dce8ee] bg-[#f8fbfc] p-4">
      <div className="flex items-start gap-2"><ClipboardCheck size={16} className="mt-0.5 shrink-0 text-[#2d7898]"/><div><h3 className="text-xs font-black text-[#214e69]">Current step</h3><p className="mt-1 text-[10px] leading-4 text-[#718b9a]">{actionHint}</p></div></div>
    </section>

    {viewerRole === "ADMIN" && <section className="rounded-2xl border border-[#dce8ee] bg-white p-4">
      <div className="flex items-center gap-2"><UserRoundCheck size={16} className="text-[#2c7899]"/><h3 className="text-xs font-black text-[#214e69]">Assignment override</h3></div>
      <p className="mt-1 text-[9px] leading-4 text-[#8296a2]">Normal requests are balanced automatically among eligible {service.processingOffice} staff. Use this only to override or rescue an unaccepted case.</p>
      <div className="mt-3 grid gap-2">
        <select className={input} value={staffId} onChange={event => setStaffId(event.target.value)}><option value="">Choose staff for manual override</option>{staff.map(person => <option key={person.id} value={person.id}>{person.name} · {person.department || "No department"}{typeof person.activeLoad === "number" ? ` · ${person.activeLoad} active` : ""}</option>)}</select>
        <button disabled={!staffId || !!busy} onClick={() => call(`/api/admin/services/requests/${request.id}/assign`, "PATCH", { staffId })} className="rounded-xl bg-[#175e80] px-3 py-2.5 text-[10px] font-extrabold text-white disabled:opacity-50">Assign / reassign</button>
      </div>
    </section>}

    {reviewStage && <section className="rounded-2xl border border-[#dce8ee] bg-white p-4">
      <div className="flex items-center justify-between gap-2"><h3 className="text-xs font-black text-[#214e69]">Requirements review</h3><span className={`rounded-full px-2 py-1 text-[9px] font-black ${verificationReady ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>{verifiedRequiredCount}/{requiredDocumentCount} verified</span></div>
      {!verificationReady && <div className="mt-3 flex gap-2 rounded-xl bg-[#fff8ed] px-3 py-2 text-[10px] leading-4 text-[#8b6a2d]"><AlertTriangle size={14} className="mt-0.5 shrink-0"/>Validate remains locked until every currently required upload is verified.</div>}
      <textarea className={`${input} mt-3`} rows={2} value={note} onChange={event => setNote(event.target.value)} placeholder="Correction instructions, or optional validation note"/>
      <div className="mt-3 flex flex-wrap gap-2"><ActionButton onClick={() => action("REQUEST_CORRECTION")} label="Request correction" secondary/><ActionButton onClick={() => action("VALIDATE")} label="Validate request" disabled={!verificationReady}/></div>
    </section>}

    {canOfferSchedule && <section className="rounded-2xl border border-[#dfdcf1] bg-[#fbfaff] p-4">
      <div className="flex items-center justify-between gap-3"><div className="flex items-center gap-2"><CalendarClock size={16} className="text-[#6b67a7]"/><div><h3 className="text-xs font-black text-[#454073]">Offer schedule options</h3><p className="mt-0.5 text-[9px] text-[#817ca3]">Citizen chooses one slot. Unselected options close automatically.</p></div></div>{service.appointmentMode === "OPTIONAL" && <span className="rounded-full bg-white px-2 py-1 text-[8px] font-black text-[#726d9e]">OPTIONAL</span>}</div>
      <div className="mt-3 space-y-2">{slots.map((slot,index) => <div key={index} className="flex gap-2"><input className={input} type="datetime-local" value={slot} onChange={event => setSlot(index,event.target.value)}/>{slots.length > 2 && <button type="button" onClick={() => removeSlot(index)} className="grid size-10 shrink-0 place-items-center rounded-xl border border-[#dedbea] bg-white text-[#817ba4]" aria-label="Remove slot"><Trash2 size={14}/></button>}</div>)}</div>
      <button type="button" onClick={addSlot} disabled={slots.length >= 5} className="mt-2 inline-flex items-center gap-1 text-[9px] font-extrabold text-[#665f99] disabled:opacity-40"><Plus size={12}/> Add another slot</button>
      <div className="mt-3 grid gap-2"><input className={input} value={location} onChange={event => setLocation(event.target.value)} placeholder="Office / venue"/><textarea className={input} rows={2} value={agenda} onChange={event => setAgenda(event.target.value)} placeholder="Purpose of interview / inspection"/></div>
      <button disabled={slots.filter(Boolean).length < 2 || !!busy} onClick={() => call(`/api/admin/services/requests/${request.id}/appointment`, "POST", { slots: slots.filter(Boolean).map(scheduledAt => ({ scheduledAt })), location, agenda })} className="mt-3 inline-flex items-center gap-2 rounded-xl bg-[#625d98] px-3.5 py-2.5 text-[10px] font-extrabold text-white disabled:opacity-50"><CalendarClock size={14}/> Send schedule options</button>
    </section>}

    {primary && !reviewStage && <section className="rounded-2xl border border-[#dce8ee] bg-white p-4">
      <h3 className="text-xs font-black text-[#214e69]">{primary.note ? "Record outcome / recommendation" : "Case action"}</h3>
      {primary.note && <textarea className={`${input} mt-3`} rows={3} value={note} onChange={event => setNote(event.target.value)} placeholder={request.status === "APPOINTMENT_CONFIRMED" ? "Record what happened during the interview / inspection, including findings or next step." : request.status === "READY_FOR_RELEASE" ? "Record how, when and to whom the document/service was released or delivered." : "State your assessment and recommendation clearly."}/>} 
      <div className="mt-3"><ActionButton onClick={() => action(primary.action)} label={primary.label} disabled={primary.disabled}/></div>
    </section>}

    {request.status === "SCHEDULED" && <section className="rounded-2xl border border-[#dfdcf1] bg-[#fbfaff] p-4 text-[10px] leading-4 text-[#736e98]"><strong className="text-[#494477]">Waiting for citizen selection.</strong><br/>Do not create another set unless the citizen requests new options.</section>}

    {viewerRole === "ADMIN" && request.status === "FOR_FINAL_VERIFICATION" && <section className="rounded-2xl border border-[#d4e9df] bg-[#f7fcf9] p-4">
      <div className="flex items-center gap-2"><CheckCircle2 size={16} className="text-[#2e876d]"/><h3 className="text-xs font-black text-[#27624f]">Super Admin verification</h3></div>
      <p className="mt-2 text-[10px] leading-4 text-[#6c887c]">{releaseAlreadyApproved ? "Release was already authorized and staff recorded actual delivery. Verify the completed transaction." : service.completionMode === "RELEASE" ? "Review the staff recommendation and authorize release only when the case record is complete." : "Review the staff assessment and verify completion of the service."}</p>
      <textarea className={`${input} mt-3`} rows={3} value={note} onChange={event => setNote(event.target.value)} placeholder="State the verification basis / final remarks"/>
      <div className="mt-3 flex flex-wrap gap-2">
        {!releaseAlreadyApproved && service.completionMode === "RELEASE" && <button onClick={() => call(`/api/admin/services/requests/${request.id}/final`, "PATCH", { action: "APPROVE_RELEASE", note })} className="rounded-xl bg-[#277b64] px-3.5 py-2.5 text-[10px] font-extrabold text-white">Approve for release</button>}
        {(service.completionMode === "SERVICE" || releaseAlreadyApproved) && <button onClick={() => call(`/api/admin/services/requests/${request.id}/final`, "PATCH", { action: "VERIFY_COMPLETED", note })} className="rounded-xl bg-[#175e80] px-3.5 py-2.5 text-[10px] font-extrabold text-white">Verify completed</button>}
        {!releaseAlreadyApproved && <button onClick={() => call(`/api/admin/services/requests/${request.id}/final`, "PATCH", { action: "RETURN_TO_STAFF", note })} className="rounded-xl border border-[#bcd6e1] bg-white px-3.5 py-2.5 text-[10px] font-extrabold text-[#296d8c]">Return to staff</button>}
      </div>
    </section>}

    {["FOR_TRIAGE", "SUBMITTED", "ASSIGNED", "UNDER_REVIEW", "ACTION_REQUIRED", "VALIDATED", "SCHEDULED", "APPOINTMENT_CONFIRMED", "APPOINTMENT_COMPLETED"].includes(request.status) && <details className="rounded-2xl border border-[#eadfe1] bg-white p-4"><summary className="cursor-pointer text-[10px] font-extrabold text-[#8b5960]">More actions</summary><p className="mt-2 text-[9px] leading-4 text-[#8c7a7e]">Use only when the request cannot continue or must be referred elsewhere. A reason is required.</p><textarea className={`${input} mt-2`} rows={2} value={note} onChange={event => setNote(event.target.value)} placeholder="Reason for closure / referral"/><button onClick={() => action("DECLINE")} className="mt-2 rounded-xl bg-[#fff0f1] px-3 py-2 text-[10px] font-extrabold text-[#a74d58]">Close / refer request</button></details>}

    {error && <p className="rounded-xl bg-[#fff0f1] px-3 py-2.5 text-[11px] font-semibold text-[#a84e59]">{error}</p>}
    {busy && <p className="flex items-center gap-2 text-[10px] text-[#718b9a]"><Loader2 size={13} className="animate-spin"/> Saving action…</p>}
  </div>;
}

function ActionButton({ onClick, label, secondary, disabled }: { onClick:()=>void; label:string; secondary?:boolean; disabled?:boolean }) {
  return <button disabled={disabled} onClick={onClick} className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2.5 text-[10px] font-extrabold disabled:cursor-not-allowed disabled:opacity-40 ${secondary ? "border border-[#bfd7e1] bg-white text-[#286d8b]" : "bg-[#175e80] text-white"}`}><Send size={13}/>{label}</button>;
}
