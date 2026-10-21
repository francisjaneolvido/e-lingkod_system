"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Check, Info, Save, ShieldCheck } from "lucide-react";
import { EDUCATION, EDUCATION_LABEL, INTERESTS, SECTORS, SKILLS, WORK_LABEL, WORK_TYPES } from "../domain";
import { emptyOpportunity, toOpportunityForm, type ManagedJob, type OpportunityFormValue } from "./job-types";
import "./jobs-workspace.css";

function Choices({legend,items,selected,onChange,limit}:{legend:string;items:readonly string[];selected:string[];onChange:(items:string[])=>void;limit:number}) {
 return <fieldset className="jobs-choice-group"><legend className="jobs-field-label">{legend} <span className="jobs-hint-inline">{selected.length}/{limit} selected</span></legend>
  <div className="jobs-chips">{items.map(item=>{
   const active=selected.includes(item);
   return <label key={item} className={`jobs-chip ${active?"jobs-chip--on":""}`}>
    <input type="checkbox" checked={active} disabled={!active&&selected.length>=limit} onChange={e=>onChange(e.target.checked?[...selected,item]:selected.filter(s=>s!==item))}/>
    {active&&<Check size={13} aria-hidden/>}{item}
   </label>;
  })}</div></fieldset>;
}

export function OpportunityEditor({job}:{job?:ManagedJob}) {
 const router=useRouter();
 const starting=useMemo(()=>job?toOpportunityForm(job):{...emptyOpportunity,skills:[],interests:[]},[job]);
 const [form,setForm]=useState<OpportunityFormValue>(starting);
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState("");
 const [saved,setSaved]=useState(false);
 const dirty=JSON.stringify(form)!==JSON.stringify(starting);
 useEffect(()=>{
  if(!dirty||saved)return;
  const warn=(event:BeforeUnloadEvent)=>{event.preventDefault();event.returnValue="";};
  const blockNavigation=(event:globalThis.MouseEvent)=>{
   if(event.defaultPrevented||event.button!==0||event.ctrlKey||event.metaKey||event.shiftKey||event.altKey)return;
   const link=(event.target as HTMLElement).closest<HTMLAnchorElement>("a[href]");
   if(!link||link.getAttribute("href")?.startsWith("#"))return;
   const destination=new URL(link.href);
   if(destination.href!==window.location.href&&!window.confirm("Leave this page? Your unsaved opportunity changes will be lost.")){
    event.preventDefault();event.stopPropagation();
   }
  };
  window.addEventListener("beforeunload",warn);
  document.addEventListener("click",blockNavigation,true);
  return ()=>{window.removeEventListener("beforeunload",warn);document.removeEventListener("click",blockNavigation,true);};
 },[dirty,saved]);
 function change<K extends keyof OpportunityFormValue>(key:K,value:OpportunityFormValue[K]){setForm(prev=>({...prev,[key]:value}));setError("");}
 async function save(event:FormEvent<HTMLFormElement>){
  event.preventDefault();if(busy)return;
  setError("");setBusy(true);
  try{
   const response=await fetch(job?`/api/admin/jobs/${job.id}`:"/api/admin/jobs",{method:job?"PATCH":"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(job?{action:"EDIT",job:form}:form)});
   const result=await response.json().catch(()=>({error:"Unexpected response from server."}));
   if(!response.ok)throw new Error(result.error||"Unable to save opportunity.");
   setSaved(true);router.push("/admin/jobs?updated=1");router.refresh();
  }catch(reason){setError(reason instanceof Error?reason.message:"Unable to save opportunity.");}finally{setBusy(false);}
 }
 return <div className="jobs-editor-layout">
  <div className="jobs-editor-heading"><div><Link href="/admin/jobs" className="jobs-back"><ArrowLeft size={16}/> Back to opportunities</Link><p className="jobs-eyebrow">PESO / OPPORTUNITY MANAGEMENT</p><h1>{job?"Edit job opportunity":"Create job opportunity"}</h1><p>Fill out the vacancy information. Saving creates a draft. Submit it to the Super Admin for employer and vacancy review from the Opportunities list.</p></div><span className="jobs-editor-state">{job?.status||"NEW DRAFT"}</span></div>
  <form onSubmit={save} className="jobs-editor-form">
   <div className="jobs-form-body">
    <section className="jobs-form-section" aria-labelledby="jobs-basic"><div className="jobs-section-head"><span className="jobs-section-index">01</span><div><h2 id="jobs-basic">Basic information</h2><p>What position is available, and where is the work located?</p></div></div>
     <div className="jobs-input-grid">
      <label className="jobs-label">Job title *<input required minLength={5} maxLength={150} className="jobs-input" value={form.title} onChange={e=>change("title",e.target.value)} placeholder="e.g. Office Assistant"/></label>
      <label className="jobs-label">Employer / local business *<input required minLength={2} maxLength={150} className="jobs-input" value={form.employer} onChange={e=>change("employer",e.target.value)} placeholder="Name of verified local employer"/></label>
      <label className="jobs-label">Barangay *<input required minLength={2} maxLength={100} className="jobs-input" value={form.barangay} onChange={e=>change("barangay",e.target.value)} placeholder="e.g. Poblacion"/></label>
      <label className="jobs-label">Work location *<input required minLength={3} maxLength={180} className="jobs-input" value={form.location} onChange={e=>change("location",e.target.value)} placeholder="e.g. City proper, Laguna"/></label>
      <label className="jobs-label">Sector<select className="jobs-input" value={form.sector} onChange={e=>change("sector",e.target.value)}>{SECTORS.map(s=><option key={s} value={s}>{s}</option>)}</select></label>
      <label className="jobs-label">Work type<select className="jobs-input" value={form.workType} onChange={e=>change("workType",e.target.value)}>{WORK_TYPES.map(t=><option value={t} key={t}>{WORK_LABEL[t]}</option>)}</select></label>
     </div>
    </section>
    <section className="jobs-form-section" aria-labelledby="jobs-requirements"><div className="jobs-section-head"><span className="jobs-section-index">02</span><div><h2 id="jobs-requirements">Description & requirements</h2><p>Describe the role clearly so citizens understand the opportunity.</p></div></div>
     <div className="jobs-form-stack"><label className="jobs-label">Description and responsibilities *<textarea required minLength={30} maxLength={3000} rows={5} className="jobs-input jobs-textarea" value={form.description} onChange={e=>change("description",e.target.value)} placeholder="Include responsibilities, working conditions, and essential qualifications"/><span className="jobs-field-help">At least 30 characters. Avoid collecting applicants’ private data here.</span></label>
     <label className="jobs-label jobs-narrow">Minimum education<select className="jobs-input" value={form.education} onChange={e=>change("education",e.target.value)}>{EDUCATION.map(item=><option value={item} key={item}>{EDUCATION_LABEL[item]}</option>)}</select></label>
     <Choices legend="Required skills *" items={SKILLS} selected={form.skills} onChange={v=>change("skills",v)} limit={8}/>
     <Choices legend="Relevant interest areas (optional)" items={INTERESTS} selected={form.interests} onChange={v=>change("interests",v)} limit={4}/></div>
    </section>
    <section className="jobs-form-section" aria-labelledby="jobs-application"><div className="jobs-section-head"><span className="jobs-section-index">03</span><div><h2 id="jobs-application">Inquiry & publication details</h2><p>Tell citizens where to obtain official information or inquire.</p></div></div>
     <div className="jobs-form-stack"><label className="jobs-label">Official inquiry / application instructions *<textarea required minLength={8} maxLength={250} rows={3} className="jobs-input jobs-textarea" value={form.contactInfo} onChange={e=>change("contactInfo",e.target.value)} placeholder="e.g. Inquire at the PESO desk during office hours"/></label>
     <div className="jobs-input-grid"><label className="jobs-label">Official posting link (optional)<input className="jobs-input" type="url" maxLength={500} value={form.externalUrl} onChange={e=>change("externalUrl",e.target.value)} placeholder="https://..."/></label>
     <label className="jobs-label">Expiry date (optional)<input type="date" className="jobs-input" value={form.expiresAt} onChange={e=>change("expiresAt",e.target.value)}/></label></div></div>
    </section>
    <section className="jobs-form-section jobs-verification-source" aria-labelledby="jobs-source"><div className="jobs-section-head"><span className="jobs-section-index">04</span><div><h2 id="jobs-source">Employer & vacancy verification source</h2><p>Internal PESO reference; not shown to citizens. Required before requesting approval.</p></div></div>
     <label className="jobs-label">Where did the vacancy information come from?<textarea className="jobs-input jobs-textarea" rows={3} minLength={12} maxLength={300} value={form.reviewSource} onChange={e=>change("reviewSource",e.target.value)} placeholder="e.g. Employer called PESO desk on Oct 21; vacancy and official contact confirmed with HR"/><span className="jobs-field-help">Record the verification method and reference. Do not enter personal IDs or private contact information.</span></label>
    </section>
    <aside className="jobs-info-note"><ShieldCheck size={20} aria-hidden/><div><strong>Before publishing</strong><p>A draft does not appear on the Citizen Portal. Submit the draft for review; Super Admin confirmation is required before publication.</p></div></aside>
   </div>
   <div className="jobs-editor-actions"><div className="jobs-editor-action-copy"><Save size={17}/><span>{job?"Editing a published listing returns it to Draft and requires a new review.":"Your opportunity will be saved as a Draft."}</span></div><div className="jobs-editor-action-buttons"><Link className="jobs-secondary-button" href="/admin/jobs">Cancel</Link><button className="jobs-primary-button" disabled={busy||form.skills.length===0} type="submit"><Save size={16}/>{busy?"Saving...":job?"Save changes":"Save draft"}</button></div></div>
   {form.skills.length===0&&<p className="jobs-inline-help" role="note"><Info size={14}/> Select at least one required skill to enable saving.</p>}
   {error&&<p role="alert" className="jobs-error-banner">{error}</p>}
  </form>
 </div>;
}
