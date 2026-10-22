"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AlertCircle, CalendarClock, CheckCircle2, Circle, Clock3, FileCheck2, Loader2, Printer, RotateCcw, Save, Trash2, Upload } from "lucide-react";
import type { SerializableOnlineServiceDefinition, ServiceRequirement } from "../catalog";
import { conditionMatches } from "../catalog";
import { citizenServiceStatusLabel, citizenStatusGuidance, SERVICE_STATUS_META, serviceStage, serviceStageLabels, type ServiceRequestStatus } from "../domain";
import { ServiceFormFields } from "./service-form-fields";

const input = "mt-1.5 w-full rounded-xl border border-[#cadde7] bg-white px-3.5 py-2.5 text-[12px] text-[#244f69] outline-none transition focus:border-[#4b99b8] focus:ring-2 focus:ring-[#d8eef6]";
const docTone:Record<string,string> = { PENDING:"bg-amber-50 text-amber-700", VERIFIED:"bg-emerald-50 text-emerald-700", REJECTED:"bg-rose-50 text-rose-700" };

export function CitizenRequestDetail({ request, service }: { request:any; service:SerializableOnlineServiceDefinition }) {
  const router = useRouter();
  const status = request.status as ServiceRequestStatus;
  const [purpose,setPurpose] = useState(request.purpose || "");
  const [fields,setFields] = useState<Record<string,string>>(request.formData || {});
  const [busy,setBusy] = useState("");
  const [error,setError] = useState("");
  const [saveState,setSaveState] = useState<"idle"|"saving"|"saved"|"error">("idle");
  const [appointmentNote,setAppointmentNote] = useState("");
  const firstRender = useRef(true);
  const editable = ["DRAFT","FORM_OPEN","ACTION_REQUIRED"].includes(status);
  const canCancel = !["COMPLETED","DECLINED","CANCELLED","READY_FOR_RELEASE","FOR_FINAL_VERIFICATION"].includes(status);
  const guidance = citizenStatusGuidance(status, service);
  const meta = SERVICE_STATUS_META[status];
  const labels = serviceStageLabels(service, status);
  const stage = serviceStage(status, service);
  const activeRequirements = useMemo(() => service.requirements.filter(requirement => conditionMatches(requirement.condition, fields)), [service.requirements, fields]);

  const docsByKey = useMemo(() => {
    const map = new Map<string,any>();
    for (const document of request.documents) if (!map.has(document.requirementKey)) map.set(document.requirementKey, document);
    return map;
  },[request.documents]);
  const proposedSlots = request.appointments.filter((item:any) => item.status === "PROPOSED");
  const confirmedAppointment = request.appointments.find((item:any) => item.status === "CONFIRMED") || request.appointments.find((item:any) => item.status === "COMPLETED");

  async function api(url:string, method:string, body?:any) {
    setBusy(url+method); setError("");
    try {
      const response=await fetch(url,{method,headers:body instanceof FormData?undefined:{"Content-Type":"application/json"},body:body instanceof FormData?body:body?JSON.stringify(body):undefined});
      const data=await response.json().catch(()=>({}));
      if(!response.ok) throw new Error(data.error||"Request failed.");
      router.refresh(); return true;
    } catch(cause){ setError(cause instanceof Error?cause.message:"Request failed."); return false; }
    finally{setBusy("");}
  }

  useEffect(() => {
    if (!editable) return;
    if (firstRender.current) { firstRender.current = false; return; }
    const timer = window.setTimeout(async () => {
      setSaveState("saving");
      try {
        const response = await fetch(`/api/services/requests/${request.id}`, { method:"PATCH", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ action:"SAVE_DRAFT", purpose, fields }) });
        if (!response.ok) throw new Error();
        setSaveState("saved");
      } catch { setSaveState("error"); }
    }, 850);
    return () => window.clearTimeout(timer);
  }, [purpose, fields, editable, request.id]);

  async function upload(requirement:ServiceRequirement,file:File|null){if(!file)return;const fd=new FormData();fd.set("requirementKey",requirement.key);fd.set("file",file);await api(`/api/services/requests/${request.id}/documents`,"POST",fd);}
  async function submitForReview(){
    const saved=await api(`/api/services/requests/${request.id}`,"PATCH",{action:"UPDATE",purpose,fields});
    if(saved) await api(`/api/services/requests/${request.id}`,"PATCH",{action:"SUBMIT"});
  }
  async function selectSlot(id:string){await api(`/api/services/requests/${request.id}/appointments/${id}`,"PATCH",{action:"SELECT",note:appointmentNote});}
  async function requestNewSlots(){if(!proposedSlots[0])return;await api(`/api/services/requests/${request.id}/appointments/${proposedSlots[0].id}`,"PATCH",{action:"REQUEST_CHANGE",note:appointmentNote});}

  return <div className="space-y-4">
    <section className="rounded-[20px] border border-[#d8e7ee] bg-white px-4 py-4 sm:px-5">
      <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-[9px] font-extrabold uppercase tracking-[.14em] text-[#2c7998]">{request.trackingId}</p><h1 className="mt-1 text-xl font-black text-[#164361]">{request.serviceTitle}</h1><p className="mt-1 text-[10px] text-[#78909e]">{request.assignedDepartment || service.processingOffice}</p></div><div className="flex flex-wrap items-center gap-2"><Link href={`/services/requests/${request.id}/print`} className="inline-flex items-center gap-1.5 rounded-xl border border-[#cedfe7] bg-white px-3 py-2 text-[9px] font-extrabold text-[#3d728b]"><Printer size={12}/> Print summary</Link><span className={`rounded-full px-3 py-1.5 text-[9px] font-extrabold ${meta.tone}`}>{citizenServiceStatusLabel(status, service)}</span></div></div>
      <div className="mt-4 overflow-x-auto pb-1"><div className="flex min-w-max items-center">{labels.map((label,index)=><div key={label} className="flex items-center"><div className="flex items-center gap-1.5"><span className={`grid size-5 place-items-center rounded-full border text-[8px] font-black ${index<=stage?"border-[#2c7d9c] bg-[#2c7d9c] text-white":"border-[#cddde5] bg-white text-[#8ca0ab]"}`}>{index<stage?<CheckCircle2 size={11}/>:index+1}</span><span className={`text-[8px] font-bold ${index<=stage?"text-[#2c607a]":"text-[#91a2ab]"}`}>{label}</span></div>{index<labels.length-1&&<span className={`mx-2 h-px w-7 ${index<stage?"bg-[#75adc0]":"bg-[#dce7ec]"}`}/>}</div>)}</div></div>
    </section>

    <section className={`rounded-[18px] border p-4 ${status==="ACTION_REQUIRED"?"border-[#efd1b0] bg-[#fff9f1]":status==="SCHEDULED"?"border-[#ded8ef] bg-[#fbfaff]":status==="COMPLETED"?"border-[#cfe7dc] bg-[#f7fcf9]":"border-[#dbe8ee] bg-[#f7fbfd]"}`}>
      <div className="flex items-start gap-3"><span className="grid size-9 shrink-0 place-items-center rounded-xl bg-white/80 text-[#347b98]">{status==="COMPLETED"?<CheckCircle2 size={17}/>:status==="ACTION_REQUIRED"?<RotateCcw size={17}/>:<Clock3 size={17}/>}</span><div><h2 className="text-sm font-black text-[#1d4f6b]">{guidance.title}</h2><p className="mt-1 text-[10px] leading-5 text-[#708b9a]">{guidance.detail}</p><span className="mt-2 inline-flex rounded-full bg-white/80 px-2 py-1 text-[8px] font-extrabold text-[#51798d]">Next: {guidance.action}</span></div></div>
    </section>

    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
      <div className="space-y-4">
        {editable ? <section className="space-y-3">
          <div className="rounded-2xl border border-[#d9e7ee] bg-white p-4">
            <div className="mb-3 flex items-start justify-between gap-3"><div><h2 className="text-xs font-black text-[#194763]">{status==="ACTION_REQUIRED"?"Fix request information":"Request details"}</h2><p className="mt-1 text-[9px] leading-4 text-[#7a92a0]">Changes save automatically. Required fields are checked when you submit.</p></div><span className={`inline-flex items-center gap-1 text-[8px] font-bold ${saveState==="error"?"text-rose-600":"text-[#76909e]"}`}>{saveState==="saving"?<Loader2 size={11} className="animate-spin"/>:<Save size={11}/>} {saveState==="saving"?"Saving…":saveState==="saved"?"Saved":saveState==="error"?"Save failed":"Autosave"}</span></div>
            <label className="block text-[10px] font-extrabold text-[#315d76]">{service.purposeLabel}<span className="ml-1 text-[#b35a5a]">*</span>{service.purposeOptions?<select className={input} value={purpose} onChange={event=>setPurpose(event.target.value)}><option value="">Select an option</option>{service.purposeOptions.map(option=><option key={option} value={option}>{option}</option>)}</select>:<textarea className={input} rows={2} maxLength={1200} value={purpose} onChange={event=>setPurpose(event.target.value)} placeholder={service.purposePlaceholder}/>}</label>
          </div>
          <ServiceFormFields fields={service.fields} values={fields} onChange={(key,value)=>setFields(current=>({...current,[key]:value}))} enforceRequired={false} compact/>
        </section> : <section className="rounded-[18px] border border-[#dfe9ee] bg-white p-4"><h2 className="text-xs font-black text-[#214e69]">Submitted information</h2><div className="mt-3 rounded-xl bg-[#f7fafb] p-3"><Data label={service.purposeLabel} value={request.purpose||"—"}/></div><div className="mt-4 space-y-4">{Array.from(new Set(service.fields.filter(field=>conditionMatches(field.condition,request.formData||{})).map(field=>field.section))).map(section=><div key={section}><h3 className="mb-2 text-[8px] font-black uppercase tracking-[.1em] text-[#78909e]">{section}</h3><div className="grid gap-x-4 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">{service.fields.filter(field=>field.section===section&&conditionMatches(field.condition,request.formData||{})).map(field=><Data key={field.key} label={field.label} value={String(request.formData?.[field.key]||"—")}/>)}</div></div>)}</div></section>}

        <section className="rounded-[18px] border border-[#d9e7ee] bg-white p-4">
          <div className="flex items-center justify-between gap-3"><div><h2 className="text-xs font-black text-[#194763]">Requirements</h2><p className="mt-1 text-[9px] leading-4 text-[#758e9d]">Only requirements relevant to your answers are shown. Staff verifies each upload separately.</p></div><FileCheck2 size={17} className="text-[#4e879f]"/></div>
          <div className="mt-3 space-y-2">{activeRequirements.map(requirement=>{const document=docsByKey.get(requirement.key);const statusLabel=document?.verificationStatus==="REJECTED"?"Needs replacement":document?.verificationStatus?document.verificationStatus.charAt(0)+document.verificationStatus.slice(1).toLowerCase():"Not uploaded";return <div key={requirement.key} className={`rounded-xl border p-3 ${document?.verificationStatus==="REJECTED"?"border-[#f0cdd0] bg-[#fff9f9]":"border-[#e0e9ee] bg-[#fbfdfe]"}`}><div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><p className="text-[10px] font-bold text-[#2a566e]">{requirement.label}{requirement.required&&<span className="text-[#a95858]"> *</span>}</p>{document&&<span className={`rounded-full px-2 py-0.5 text-[8px] font-black ${docTone[document.verificationStatus]||"bg-slate-100 text-slate-600"}`}>{statusLabel}</span>}</div>{requirement.help&&<p className="mt-1 text-[9px] leading-4 text-[#8397a3]">{requirement.help}</p>}{document?.verificationNote&&<p className="mt-2 rounded-lg bg-white px-2.5 py-2 text-[9px] leading-4 text-[#7f6267]">LGU note: {document.verificationNote}</p>}</div><div className="flex items-center gap-2">{document&&<a href={`/api/services/documents/${document.id}`} target="_blank" className="max-w-[150px] truncate text-[9px] font-bold text-[#267596]">{document.fileName}</a>}{editable&&document&&<button onClick={()=>api(`/api/services/requests/${request.id}/documents`,"DELETE",{documentId:document.id})} className="rounded-lg p-1.5 text-[#a95a61]" aria-label="Remove document"><Trash2 size={14}/></button>}{editable&&<label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-[#eef6fa] px-2.5 py-2 text-[9px] font-extrabold text-[#286f8e]"><Upload size={13}/>{document?"Replace":"Upload"}<input type="file" accept=".pdf,.jpg,.jpeg,.png,.webp" className="hidden" onChange={event=>upload(requirement,event.target.files?.[0]||null)}/></label>}</div></div></div>})}</div>
          {editable&&<button onClick={submitForReview} disabled={!!busy} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[#17607f] px-4 py-2.5 text-[10px] font-extrabold text-white disabled:opacity-60"><CheckCircle2 size={15}/> Submit for LGU review</button>}
        </section>

        <section className="rounded-[18px] border border-[#d9e7ee] bg-white p-4"><h2 className="text-xs font-black text-[#194763]">Tracking history</h2><p className="mt-1 text-[9px] text-[#8498a4]">Every citizen-visible handoff, correction, schedule and verification stays here.</p><div className="mt-3 space-y-0">{request.events.map((event:any,index:number)=><div key={event.id} className="relative flex gap-3 pb-4 last:pb-0"><div className="relative z-10 mt-1.5 size-2.5 rounded-full bg-[#2d819f] ring-4 ring-[#eaf5f8]"/>{index<request.events.length-1&&<span className="absolute left-[4px] top-4 h-full w-px bg-[#d9e6ec]"/>}<div><p className="text-[10px] font-bold leading-4 text-[#2b566f]">{event.note}</p><p className="mt-1 text-[8px] text-[#879aa6]">{new Date(event.createdAt).toLocaleString("en-PH")}</p></div></div>)}</div></section>
      </div>

      <aside className="space-y-3 xl:sticky xl:top-4 xl:self-start">
        {status==="SCHEDULED"&&proposedSlots.length>0&&<section className="rounded-[18px] border border-[#dedcf2] bg-[#fbfaff] p-4"><div className="flex items-start gap-2.5"><CalendarClock className="mt-0.5 text-[#6b67a7]" size={17}/><div><h2 className="text-xs font-black text-[#39366c]">Choose your schedule</h2><p className="mt-1 text-[9px] leading-4 text-[#77739c]">Select one available slot. The other options will close automatically.</p></div></div><div className="mt-3 space-y-2">{proposedSlots.map((slot:any)=><button key={slot.id} disabled={!!busy} onClick={()=>selectSlot(slot.id)} className="w-full rounded-xl border border-[#d8d4ec] bg-white p-3 text-left transition hover:border-[#8f89bd] hover:bg-[#f8f7ff]"><strong className="block text-[11px] text-[#4f4a80]">{new Date(slot.scheduledAt).toLocaleString("en-PH",{weekday:"short",month:"short",day:"numeric",hour:"numeric",minute:"2-digit"})}</strong><span className="mt-1 block text-[9px] leading-4 text-[#7a759d]">{slot.location} · {slot.agenda}</span></button>)}</div><textarea className={input} rows={2} value={appointmentNote} onChange={event=>setAppointmentNote(event.target.value)} placeholder="Optional note, or explain why none of the options work."/><button disabled={!appointmentNote.trim()||!!busy} onClick={requestNewSlots} className="mt-2 w-full rounded-xl border border-[#c9c6e4] bg-white px-3 py-2.5 text-[9px] font-extrabold text-[#59558c] disabled:opacity-40">None work — request new options</button></section>}

        {confirmedAppointment&&["CONFIRMED","COMPLETED"].includes(confirmedAppointment.status)&&<section className="rounded-[18px] border border-[#dedcf2] bg-[#fbfaff] p-4"><div className="flex items-start gap-2.5"><CalendarClock className="mt-0.5 text-[#6b67a7]" size={17}/><div><h2 className="text-xs font-black text-[#39366c]">{confirmedAppointment.status==="COMPLETED"?"Scheduled activity completed":"Confirmed schedule"}</h2><p className="mt-1.5 text-[11px] font-bold text-[#54517f]">{new Date(confirmedAppointment.scheduledAt).toLocaleString("en-PH")}</p><p className="mt-1 text-[9px] leading-4 text-[#77739c]">{confirmedAppointment.location}<br/>{confirmedAppointment.agenda}</p>{confirmedAppointment.staffNote&&<p className="mt-2 rounded-lg bg-white px-2.5 py-2 text-[9px] leading-4 text-[#6c688d]">Outcome: {confirmedAppointment.staffNote}</p>}</div></div></section>}

        <section className="rounded-[18px] border border-[#dce8ee] bg-white p-4"><h2 className="text-xs font-black text-[#214e69]">Request reference</h2><div className="mt-3 space-y-2"><Data label="Tracking ID" value={request.trackingId}/><Data label="Processing office" value={request.assignedDepartment||service.processingOffice}/><Data label="Started" value={new Date(request.createdAt).toLocaleString("en-PH")}/>{request.submittedAt&&<Data label="Last submitted" value={new Date(request.submittedAt).toLocaleString("en-PH")}/>}</div>{service.serviceNotice&&<p className="mt-3 rounded-xl bg-[#f7fafb] px-3 py-2.5 text-[9px] leading-4 text-[#718997]">{service.serviceNotice}</p>}</section>

        {canCancel&&<button onClick={()=>{if(window.confirm("Cancel this LGU service request? Active schedule options will also be closed."))api(`/api/services/requests/${request.id}`,"PATCH",{action:"CANCEL"});}} className="w-full rounded-xl border border-[#e5c9cc] bg-white px-3 py-2.5 text-[9px] font-extrabold text-[#9a5058]">Cancel request</button>}
      </aside>
    </div>

    {error&&<div className="flex gap-2 rounded-xl bg-[#fff1f1] px-4 py-3 text-xs font-semibold text-[#a84d58]"><AlertCircle size={16}/>{error}</div>}
    {busy&&<p className="flex items-center gap-2 text-[10px] text-[#6d8797]"><Loader2 size={14} className="animate-spin"/> Saving changes…</p>}
  </div>;
}

function Data({label,value}:{label:string;value:string}) { return <div><span className="text-[8px] font-bold uppercase tracking-wider text-[#8a9ca7]">{label}</span><p className="mt-0.5 whitespace-pre-wrap text-[10px] leading-4 text-[#45697d]">{value}</p></div>; }
