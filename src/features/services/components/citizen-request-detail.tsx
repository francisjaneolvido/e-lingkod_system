"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AlertCircle, CalendarClock, CheckCircle2, Circle, Clock3, FileCheck2, Loader2, Printer, RotateCcw, Save, Trash2, Upload } from "lucide-react";
import type { SerializableOnlineServiceDefinition, ServiceRequirement } from "../catalog";
import { conditionMatches } from "../catalog";
import { citizenServiceStatusLabel, citizenStatusGuidance, SERVICE_STATUS_META, serviceStage, serviceStageLabels, type ServiceRequestStatus } from "../domain";
import { ServiceFormFields } from "./service-form-fields";
import { DocumentInlinePreview } from "./document-inline-preview";
import { CitizenPickupPanel } from "./citizen-pickup-panel";

const input = "mt-1.5 w-full rounded-xl border border-border bg-card px-3.5 py-2.5 text-[12px] text-foreground outline-none transition focus:border-border focus:ring-2 focus:ring-border";
const docTone:Record<string,string> = { PENDING:"bg-amber-50 text-amber-700", VERIFIED:"bg-emerald-50 text-emerald-700", REJECTED:"bg-danger-soft text-destructive" };

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
    <section className="rounded-[20px] border border-border bg-card px-4 py-4 sm:px-5">
      <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-extrabold uppercase tracking-[.14em] text-foreground">{request.trackingId}</p><h1 className="mt-1 text-xl font-black text-foreground">{request.serviceTitle}</h1><p className="mt-1 text-xs text-muted-foreground">{request.assignedDepartment || service.processingOffice}</p></div><div className="flex flex-wrap items-center gap-2"><Link href={`/services/requests/${request.id}/print`} className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-2 text-xs font-extrabold text-foreground"><Printer size={12}/> Print summary</Link><span className={`rounded-full px-3 py-1.5 text-xs font-extrabold ${meta.tone}`}>{citizenServiceStatusLabel(status, service)}</span></div></div>
      <div className="mt-4 overflow-x-auto pb-1"><div className="flex min-w-max items-center">{labels.map((label,index)=><div key={label} className="flex items-center"><div className="flex items-center gap-1.5"><span className={`grid size-5 place-items-center rounded-full border text-xs font-black ${index<=stage?"border-border bg-primary text-white":"border-border bg-card text-muted-foreground"}`}>{index<stage?<CheckCircle2 size={11}/>:index+1}</span><span className={`text-xs font-bold ${index<=stage?"text-foreground":"text-muted-foreground"}`}>{label}</span></div>{index<labels.length-1&&<span className={`mx-2 h-px w-7 ${index<stage?"bg-accent":"bg-muted"}`}/>}</div>)}</div></div>
    </section>

    <section className={`rounded-[18px] border p-4 ${status==="ACTION_REQUIRED"?"border-border bg-card":status==="SCHEDULED"?"border-border bg-card":status==="COMPLETED"?"border-border bg-card":"border-border bg-card"}`}>
      <div className="flex items-start gap-3"><span className="grid size-9 shrink-0 place-items-center rounded-xl bg-card/80 text-muted-foreground">{status==="COMPLETED"?<CheckCircle2 size={17}/>:status==="ACTION_REQUIRED"?<RotateCcw size={17}/>:<Clock3 size={17}/>}</span><div><h2 className="text-sm font-black text-foreground">{guidance.title}</h2><p className="mt-1 text-xs leading-5 text-muted-foreground">{guidance.detail}</p><span className="mt-2 inline-flex rounded-full bg-card/80 px-2 py-1 text-xs font-extrabold text-muted-foreground">Next: {guidance.action}</span></div></div>
    </section>

    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
      <div className="space-y-4">
        {editable ? <section className="space-y-3">
          <div className="rounded-2xl border border-border bg-card p-4">
            <div className="mb-3 flex items-start justify-between gap-3"><div><h2 className="text-xs font-black text-foreground">{status==="ACTION_REQUIRED"?"Fix request information":"Request details"}</h2><p className="mt-1 text-xs leading-4 text-muted-foreground">Changes save automatically. Required fields are checked when you submit.</p></div><span className={`inline-flex items-center gap-1 text-xs font-bold ${saveState==="error"?"text-destructive":"text-muted-foreground"}`}>{saveState==="saving"?<Loader2 size={11} className="animate-spin"/>:<Save size={11}/>} {saveState==="saving"?"Saving…":saveState==="saved"?"Saved":saveState==="error"?"Save failed":"Autosave"}</span></div>
            <label className="block text-xs font-extrabold text-foreground">{service.purposeLabel}<span className="ml-1 text-destructive">*</span>{service.purposeOptions?<select className={input} value={purpose} onChange={event=>setPurpose(event.target.value)}><option value="">Select an option</option>{service.purposeOptions.map(option=><option key={option} value={option}>{option}</option>)}</select>:<textarea className={input} rows={2} maxLength={1200} value={purpose} onChange={event=>setPurpose(event.target.value)} placeholder={service.purposePlaceholder}/>}</label>
          </div>
          <ServiceFormFields fields={service.fields} values={fields} onChange={(key,value)=>setFields(current=>({...current,[key]:value}))} enforceRequired={false} compact/>
        </section> : <section className="rounded-[18px] border border-border bg-card p-4"><h2 className="text-xs font-black text-foreground">Submitted information</h2><div className="mt-3 rounded-xl bg-card p-3"><Data label={service.purposeLabel} value={request.purpose||"—"}/></div><div className="mt-4 space-y-4">{Array.from(new Set(service.fields.filter(field=>conditionMatches(field.condition,request.formData||{})).map(field=>field.section))).map(section=><div key={section}><h3 className="mb-2 text-xs font-black uppercase tracking-[.1em] text-muted-foreground">{section}</h3><div className="grid gap-x-4 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">{service.fields.filter(field=>field.section===section&&conditionMatches(field.condition,request.formData||{})).map(field=><Data key={field.key} label={field.label} value={String(request.formData?.[field.key]||"—")}/>)}</div></div>)}</div></section>}

        <section className="rounded-[18px] border border-border bg-card p-4">
          <div className="flex items-center justify-between gap-3"><div><h2 className="text-xs font-black text-foreground">Requirements</h2><p className="mt-1 text-xs leading-4 text-muted-foreground">Only requirements relevant to your answers are shown. Staff verifies each upload separately.</p></div><FileCheck2 size={17} className="text-muted-foreground"/></div>
          <div className="mt-3 space-y-2">{activeRequirements.map(requirement=>{const document=docsByKey.get(requirement.key);const statusLabel=document?.verificationStatus==="REJECTED"?"Needs replacement":document?.verificationStatus?document.verificationStatus.charAt(0)+document.verificationStatus.slice(1).toLowerCase():"Not uploaded";return <div key={requirement.key} className={`rounded-xl border p-3 ${document?.verificationStatus==="REJECTED"?"border-border bg-card":"border-border bg-card"}`}><div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><p className="text-xs font-bold text-foreground">{requirement.label}{requirement.required&&<span className="text-destructive"> *</span>}</p>{document&&<span className={`rounded-full px-2 py-0.5 text-xs font-black ${docTone[document.verificationStatus]||"bg-slate-100 text-slate-600"}`}>{statusLabel}</span>}</div>{requirement.help&&<p className="mt-1 text-xs leading-4 text-muted-foreground">{requirement.help}</p>}{document?.verificationNote&&<p className="mt-2 rounded-lg bg-card px-2.5 py-2 text-xs leading-4 text-muted-foreground">LGU note: {document.verificationNote}</p>}</div><div className="flex items-center gap-2">{document&&<a href={`/api/services/documents/${document.id}`} target="_blank" className="max-w-[150px] truncate text-xs font-bold text-foreground">{document.fileName}</a>}{editable&&document&&<button onClick={()=>api(`/api/services/requests/${request.id}/documents`,"DELETE",{documentId:document.id})} className="rounded-lg p-1.5 text-destructive" aria-label="Remove document"><Trash2 size={14}/></button>}{editable&&<label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-muted px-2.5 py-2 text-xs font-extrabold text-foreground"><Upload size={13}/>{document?"Replace":"Upload"}<input type="file" accept=".pdf,.jpg,.jpeg,.png,.webp" className="hidden" onChange={event=>upload(requirement,event.target.files?.[0]||null)}/></label>}</div></div>{document && <DocumentInlinePreview documentId={document.id} fileName={document.fileName} mimeType={document.mimeType} compact />}</div>})}</div>
          {editable&&<button onClick={submitForReview} disabled={!!busy} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-xs font-extrabold text-white disabled:opacity-60"><CheckCircle2 size={15}/> Submit for LGU review</button>}
        </section>

        <section className="rounded-[18px] border border-border bg-card p-4"><h2 className="text-xs font-black text-foreground">Tracking history</h2><p className="mt-1 text-xs text-muted-foreground">Every citizen-visible handoff, correction, schedule and verification stays here.</p><div className="mt-3 space-y-0">{request.events.map((event:any,index:number)=><div key={event.id} className="relative flex gap-3 pb-4 last:pb-0"><div className="relative z-10 mt-1.5 size-2.5 rounded-full bg-primary ring-4 ring-border"/>{index<request.events.length-1&&<span className="absolute left-[4px] top-4 h-full w-px bg-muted"/>}<div><p className="text-xs font-bold leading-4 text-foreground">{event.note}</p><p className="mt-1 text-xs text-muted-foreground">{new Date(event.createdAt).toLocaleString("en-PH")}</p></div></div>)}</div></section>
      </div>

      <aside className="space-y-3 xl:sticky xl:top-4 xl:self-start">
        {service.completionMode === "RELEASE" && request.releaseApprovedAt && ["READY_FOR_RELEASE", "FOR_FINAL_VERIFICATION", "COMPLETED"].includes(status) && <CitizenPickupPanel request={request}/> }
        {status==="SCHEDULED"&&proposedSlots.length>0&&<section className="rounded-[18px] border border-border bg-card p-4"><div className="flex items-start gap-2.5"><CalendarClock className="mt-0.5 text-muted-foreground" size={17}/><div><h2 className="text-xs font-black text-foreground">Choose your schedule</h2><p className="mt-1 text-xs leading-4 text-muted-foreground">Select one available slot. The other options will close automatically.</p></div></div><div className="mt-3 space-y-2">{proposedSlots.map((slot:any)=><button key={slot.id} disabled={!!busy} onClick={()=>selectSlot(slot.id)} className="w-full rounded-xl border border-border bg-card p-3 text-left transition hover:border-border hover:bg-card"><strong className="block text-xs text-foreground">{new Date(slot.scheduledAt).toLocaleString("en-PH",{weekday:"short",month:"short",day:"numeric",hour:"numeric",minute:"2-digit"})}</strong><span className="mt-1 block text-xs leading-4 text-muted-foreground">{slot.location} · {slot.agenda}</span></button>)}</div><textarea className={input} rows={2} value={appointmentNote} onChange={event=>setAppointmentNote(event.target.value)} placeholder="Optional note, or explain why none of the options work."/><button disabled={!appointmentNote.trim()||!!busy} onClick={requestNewSlots} className="mt-2 w-full rounded-xl border border-border bg-card px-3 py-2.5 text-xs font-extrabold text-muted-foreground disabled:opacity-40">None work — request new options</button></section>}

        {confirmedAppointment&&["CONFIRMED","COMPLETED"].includes(confirmedAppointment.status)&&<section className="rounded-[18px] border border-border bg-card p-4"><div className="flex items-start gap-2.5"><CalendarClock className="mt-0.5 text-muted-foreground" size={17}/><div><h2 className="text-xs font-black text-foreground">{confirmedAppointment.status==="COMPLETED"?"Scheduled activity completed":"Confirmed schedule"}</h2><p className="mt-1.5 text-xs font-bold text-muted-foreground">{new Date(confirmedAppointment.scheduledAt).toLocaleString("en-PH")}</p><p className="mt-1 text-xs leading-4 text-muted-foreground">{confirmedAppointment.location}<br/>{confirmedAppointment.agenda}</p>{confirmedAppointment.staffNote&&<p className="mt-2 rounded-lg bg-card px-2.5 py-2 text-xs leading-4 text-muted-foreground">Outcome: {confirmedAppointment.staffNote}</p>}</div></div></section>}

        <section className="rounded-[18px] border border-border bg-card p-4"><h2 className="text-xs font-black text-foreground">Request reference</h2><div className="mt-3 space-y-2"><Data label="Tracking ID" value={request.trackingId}/><Data label="Processing office" value={request.assignedDepartment||service.processingOffice}/><Data label="Started" value={new Date(request.createdAt).toLocaleString("en-PH")}/>{request.submittedAt&&<Data label="Last submitted" value={new Date(request.submittedAt).toLocaleString("en-PH")}/>}</div>{service.serviceNotice&&<p className="mt-3 rounded-xl bg-card px-3 py-2.5 text-xs leading-4 text-muted-foreground">{service.serviceNotice}</p>}</section>

        {canCancel&&<button onClick={()=>{if(window.confirm("Cancel this LGU service request? Active schedule options will also be closed."))api(`/api/services/requests/${request.id}`,"PATCH",{action:"CANCEL"});}} className="w-full rounded-xl border border-border bg-card px-3 py-2.5 text-xs font-extrabold text-destructive">Cancel request</button>}
      </aside>
    </div>

    {error&&<div className="flex gap-2 rounded-xl bg-card px-4 py-3 text-xs font-semibold text-destructive"><AlertCircle size={16}/>{error}</div>}
    {busy&&<p className="flex items-center gap-2 text-xs text-muted-foreground"><Loader2 size={14} className="animate-spin"/> Saving changes…</p>}
  </div>;
}

function Data({label,value}:{label:string;value:string}) { return <div><span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{label}</span><p className="mt-0.5 whitespace-pre-wrap text-xs leading-4 text-foreground">{value}</p></div>; }
