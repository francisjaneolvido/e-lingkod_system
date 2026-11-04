"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { INDUSTRIES, LOS_BANOS_BARANGAYS, MARKET_REACH, OPERATING_STATUSES, ORGANIZATION_TYPES, parseEstablishmentAnswers, type EstablishmentAnswers } from "../domain";
import type { EstablishmentList, EstablishmentState } from "../server/data";

type Answers = Record<string, string | number | null>;
type Operation = { method: "POST" | "PUT" | "DELETE"; body: Record<string, unknown>; message: string };
const fieldClass = "mt-2 w-full min-w-0 rounded-2xl border border-border bg-card px-4 py-3 text-sm text-foreground focus:outline-2 focus:outline-offset-2 focus:outline-border";
const buttonBase = "rounded-2xl border px-5 py-3 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50";
const button = buttonBase + " border-border bg-card text-foreground";
const primary = buttonBase + " border-transparent bg-primary text-white";
const card = "rounded-[24px] border border-border bg-card p-6 sm:p-8";
const friendly = (s: string) => s.toLowerCase().replaceAll("_", " ").replace(/^./, x => x.toUpperCase());
const enumFields = new Set(["officeType", "employerType", "organizationType", "operatingStatus", "marketReach"]);
const steps = ["Identification", "Organization & operations", "Workforce & contact", "Review"];
const labels: Record<string, string> = { businessName:"Business name", officeType:"Office type", street:"Street / building / village", barangay:"Barangay", municipality:"Municipality", province:"Province", tradeName:"Trade name", employerType:"Employer type", organizationType:"Organization type", industry:"Line of business / industry", productsServices:"Principal products / services", operatingStatus:"Operating status", startYear:"Start year", monthsOperated:"Months operated in survey year", marketReach:"Market reach", totalWorkers:"Total workers", regularWorkers:"Regular workers", nonRegularWorkers:"Nonregular workers", partTimeWorkers:"Part-time workers", workforceNotes:"Workforce notes", contactName:"Contact person", contactPosition:"Contact position", contactEmail:"Contact email", contactPhone:"Contact phone", ownerPresidentName:"Owner / president name" };
function blank(year: number): Answers { return { surveyYear:year, businessName:"", officeType:"MAIN", street:"", barangay:"", municipality:"Los Baños", province:"Laguna" }; }
function answerText(name: string, value: unknown) {
  if (value === null || value === undefined || value === "") return name.endsWith("Workers") ? "Unknown" : "Not provided";
  if (name === "industry") return INDUSTRIES.find(x => x.value === value)?.label ?? String(value);
  return enumFields.has(name) ? friendly(String(value)) : String(value);
}
function AnswerSummary({ answers }: { answers: EstablishmentAnswers | Answers }) {
  return <dl className="grid gap-x-8 gap-y-4 text-sm sm:grid-cols-2">{Object.entries(labels).map(([name,label]) => <div key={name} className="min-w-0"><dt className="font-semibold text-foreground">{label}</dt><dd className="mt-1 break-words text-muted-foreground">{answerText(name,answers[name as keyof typeof answers])}</dd></div>)}</dl>;
}
function Field({ name, answers, change, options, type="text", hint }: { name: string; answers: Answers; change: (name: string,value: string) => void; options?: readonly {value:string;label:string}[]; type?: string; hint?: string }) {
  const id="est-"+name;
  return <div className="min-w-0"><label htmlFor={id} className="text-sm font-semibold text-foreground">{labels[name]}</label>{options ? <select id={id} value={String(answers[name]??"")} onChange={e=>change(name,e.target.value)} className={fieldClass}><option value="">Choose an option</option>{options.map(x=><option key={x.value} value={x.value}>{x.label}</option>)}</select> : <input id={id} type={type} min={type==="number"?0:undefined} step={type==="number"?1:undefined} value={String(answers[name]??"")} onChange={e=>change(name,e.target.value)} className={fieldClass} aria-describedby={hint?id+"-hint":undefined} maxLength={type==="number"?undefined:500}/>}{hint?<p id={id+"-hint"} className="mt-2 text-xs leading-5 text-muted-foreground">{hint}</p>:null}</div>;
}
async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const response=await fetch(url,{cache:"no-store",...init});
  const body=await response.json();
  if (!response.ok) throw Object.assign(new Error(body.error??"The survey is unavailable. Try again."),{status:response.status});
  return body as T;
}
export function EstablishmentSurveyForm({ initialRecords, currentYear }: { initialRecords: EstablishmentList; currentYear: number }) {
  const [records,setRecords]=useState(initialRecords),[current,setCurrent]=useState<EstablishmentState|null>(null),[answers,setAnswers]=useState<Answers>(()=>blank(currentYear));
  const [correctIdentity,setCorrectIdentity]=useState(false);
  const [creating,setCreating]=useState(false),[year,setYear]=useState(currentYear),[step,setStep]=useState(0),[dirty,setDirty]=useState(false),[busy,setBusy]=useState(false),[pending,setPending]=useState(false);
  const [error,setError]=useState(""),[message,setMessage]=useState(""),[confirmation,setConfirmation]=useState<{title:string;text:string;label:string;run:()=>void}|null>(null);
  const pendingOperation=useRef<Operation|null>(null),inFlight=useRef(false),dialog=useRef<HTMLDialogElement>(null);
  const locked=busy||pending;
  const change=(name:string,value:string)=>{setAnswers(previous=>({...previous,[name]:value}));setDirty(true);setMessage("");};
  const confirm=(title:string,text:string,label:string,run:()=>void)=>{setConfirmation({title,text,label,run});dialog.current?.showModal();};
  function apply(value:EstablishmentState) { setCurrent(value);setYear(value.surveyYear);setAnswers({...value.answers});setCreating(false);setDirty(false);setCorrectIdentity(false); }
  async function load(id:string,yr:number) {
    if(inFlight.current)return;inFlight.current=true;setBusy(true);setError("");setMessage("");
    try{apply(await request<EstablishmentState>(`/api/establishment-surveys?id=${encodeURIComponent(id)}&year=${yr}`));setMessage("Saved state refreshed.");}
    catch(e){setError(e instanceof Error?e.message:"Could not load saved state.");}finally{inFlight.current=false;setBusy(false);}
  }
  const leave=(run:()=>void)=>dirty?confirm("Leave unsaved changes?","Your saved draft and protected history will remain. Unsaved edits will be discarded.","Discard unsaved edits",run):run();
  async function perform(operation?:Operation) {
    if(inFlight.current)return;
    const op=pendingOperation.current??operation;if(!op)return;
    pendingOperation.current=op;setPending(true);inFlight.current=true;setBusy(true);setError("");setMessage("");
    try{
      const result=await request<{establishmentId:string}>("/api/establishment-surveys",{method:op.method,headers:{"content-type":"application/json"},body:JSON.stringify(op.body)});
      const [value,list]=await Promise.all([request<EstablishmentState>(`/api/establishment-surveys?id=${encodeURIComponent(result.establishmentId)}&year=${op.body.surveyYear}`),request<EstablishmentList>("/api/establishment-surveys")]);
      apply(value);setRecords(list);setMessage(op.message);pendingOperation.current=null;setPending(false);
    }catch(e){
      const status=e&&typeof e==="object"&&"status" in e?Number(e.status):0;
      if([400,401,403,404,409].includes(status)){pendingOperation.current=null;setPending(false);setError(e instanceof Error?e.message:"The request was rejected.");}
      else setError("Outcome not confirmed. Retry the pending operation to reconcile the saved result. "+(e instanceof Error?e.message:""));
    }finally{inFlight.current=false;setBusy(false);}
  }
  function save(status:"DRAFT"|"SUBMITTED") {
    try {
      // Same parser improves feedback; the server validates independently.
      parseEstablishmentAnswers({...answers,surveyYear:year},status);
      const operation:Operation={method:creating?"POST":"PUT",body:{...answers,surveyYear:year,status,correctIdentity:creating?false:correctIdentity,establishmentId:current?.establishment.id,expectedRecordVersion:current?.recordVersion,expectedVersion:current?.workspaceVersion,requestKey:crypto.randomUUID()},message:creating?"Establishment draft created.":status==="DRAFT"?"Draft saved.":"Survey submitted."};
      if(status==="SUBMITTED")confirm("Submit establishment survey?","This creates a protected revision. Later drafts will not erase this submitted response.","Submit survey",()=>{void perform(operation);});
      else void perform(operation);
    }catch(e){setError(e instanceof Error?e.message:"Check the survey fields.");}
  }
  const field=(name:string,options?:readonly {value:string;label:string}[],type="text",hint?:string)=><Field key={name} name={name} answers={answers} change={change} options={options} type={type} hint={hint}/>;
  const options=(values:readonly string[])=>values.map(value=>({value,label:friendly(value)}));
  const identity=<>{field("businessName")}{field("officeType",[{value:"MAIN",label:"Main office"},{value:"BRANCH",label:"Branch"}])}{field("street")}{field("barangay",LOS_BANOS_BARANGAYS.map(value=>({value,label:value})))}<p className="text-sm text-muted-foreground sm:col-span-2">Municipality: Los Baños · Province: Laguna</p></>;
  return <div className="space-y-6 text-foreground">
    <header className="rounded-[24px] border border-border bg-muted p-6 sm:p-8"><Link href="/community-employment" className="text-sm font-semibold text-muted-foreground">Citizen Profiling</Link><h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">Establishment Profiling</h1><p className="mt-4 max-w-3xl text-sm leading-7 text-muted-foreground">A private organizational survey for community planning, separate from the personal survey. Manage records through your own Citizen account as owner or authorized representative. Creating a record does not verify legal ownership or municipal accreditation.</p></header>
    {error?<p role="alert" className="rounded-2xl border border-red-200 bg-danger-soft p-4 text-sm text-destructive">{error}</p>:null}
    <p role="status" aria-live="polite" className={message?"rounded-2xl bg-muted p-4 text-sm text-foreground":"sr-only"}>{busy?"Working…":message}</p>
    {pending?<div className={card}><p className="mb-4 text-sm leading-6 text-muted-foreground">A save is awaiting reconciliation. Keep this page open and retry the original operation before making more changes.</p><button type="button" className={primary} disabled={busy} onClick={()=>void perform()}>Retry pending operation</button></div>:null}
    {!current&&!creating?<section className={card}><div className="flex flex-wrap items-center justify-between gap-4"><h2 className="text-xl font-bold">Your establishments</h2><button type="button" className={primary} disabled={locked} onClick={()=>{setCreating(true);setAnswers(blank(currentYear));setYear(currentYear);setStep(0);setDirty(false);setMessage("");}}>Add establishment</button></div><p className="mt-3 text-sm leading-6 text-muted-foreground">Only records created by your account appear here. Use an existing record for another survey year. Add separate branches at their own locations.</p><div className="mt-6 grid gap-4 md:grid-cols-2">{records.map(record=><button key={record.id} type="button" disabled={locked} onClick={()=>{setStep(0);void load(record.id,currentYear);}} className="min-w-0 rounded-2xl border border-border p-5 text-left hover:bg-muted disabled:opacity-50"><span className="block break-words font-semibold">{record.businessName} — {record.street}</span><span className="mt-2 block text-sm text-muted-foreground">{record.barangay} · {friendly(record.officeType)}</span></button>)}</div>{!records.length?<p className="mt-5 text-sm text-muted-foreground">No establishment records yet.</p>:null}</section>:<>
      <section className={card}>
        <div className="flex flex-wrap items-center justify-between gap-4"><h2 className="text-xl font-bold">{creating?"New establishment":"Your organizational survey"}</h2><button type="button" className={button} disabled={locked} onClick={()=>leave(()=>{setCurrent(null);setCreating(false);setDirty(false);setError("");setMessage("");})}>Back to your establishments</button></div>
        <div className="mt-5 flex flex-wrap items-center gap-4"><label className="text-sm font-semibold" htmlFor="est-year">Survey year</label><select id="est-year" value={year} disabled={locked} className={fieldClass.replace("mt-2","mt-0").replace("w-full","w-auto")} onChange={e=>{const next=Number(e.target.value);if(creating){setYear(next);setDirty(true);}else if(current)leave(()=>{void load(current.establishment.id,next);});}}>{Array.from({length:currentYear-2018},(_,i)=>currentYear+1-i).map(value=><option key={value} value={value}>{value}</option>)}</select>{current?<button type="button" className={button} disabled={locked} onClick={()=>confirm("Refresh saved state?","This discards unsaved edits and loads the latest saved answers and versions.","Refresh saved state",()=>{void load(current.establishment.id,year);})}>Refresh saved state</button>:null}</div>
        {current?.submittedStatus==="WITHDRAWN"?<p className="mt-5 rounded-2xl bg-muted p-4 text-sm leading-6">This year’s participation is withdrawn. Protected history remains. A new draft does not restore participation; a subsequent submission does.</p>:null}
        {!creating?<><p className="mt-5 break-words text-sm font-semibold">{current?.establishment.businessName} · {current?.establishment.street}</p><p className="mt-2 text-sm leading-6 text-muted-foreground">To submit, complete identification, classification, principal activity, operating status and contact. Workforce figures may remain unknown. Identification belongs to the selected annual survey. Use the explicit correction option to update the current establishment; earlier submitted revisions keep their original answers.</p><p className="mt-6 text-sm font-semibold">Step {step+1} of 4 · {steps[step]}</p><progress aria-label="Survey progress" value={step+1} max={4} className="mt-3 h-2 w-full overflow-hidden rounded-full appearance-none [&::-webkit-progress-bar]:bg-muted [&::-webkit-progress-value]:bg-primary [&::-moz-progress-bar]:bg-primary"/></>:<p className="mt-5 text-sm leading-6 text-muted-foreground">Start with a business name and location. You can save the rest of the survey incomplete. Matching names alone will never merge unrelated records.</p>}
        <fieldset disabled={locked} className="mt-6 grid min-w-0 gap-6 sm:grid-cols-2"><legend className="sr-only">{creating?"Establishment identification":steps[step]}</legend>
          {creating||step===0?identity:null}
          {!creating&&step===0?<label className="flex items-start gap-3 rounded-2xl bg-muted p-4 text-sm leading-6 sm:col-span-2"><input type="checkbox" checked={correctIdentity} onChange={e=>{setCorrectIdentity(e.target.checked);setDirty(true);}} className="mt-1 size-4 shrink-0 accent-[#118B81]"/><span>Also correct the current establishment identity<span className="mt-1 block text-xs text-muted-foreground">Apply this survey’s name, office type and location to the current establishment record. Leave unchecked for annual-only edits; earlier submitted revisions remain unchanged.</span></span></label>:null}
          {!creating&&step===1?<>{field("tradeName")}{field("employerType",options(["PUBLIC","PRIVATE"]))}{field("organizationType",options(ORGANIZATION_TYPES))}{field("industry",INDUSTRIES)}{field("productsServices")}{field("operatingStatus",options(OPERATING_STATUSES))}{field("startYear",undefined,"number")}{field("monthsOperated",undefined,"number")}{field("marketReach",options(MARKET_REACH))}</>:null}
          {!creating&&step===2?<><p className="text-sm leading-6 text-muted-foreground sm:col-span-2">Count people working in this establishment, including working owners. Leave a number blank if unknown; enter 0 only when confirmed none. Regular and nonregular workers make up the total; part-time workers overlap these groups. These figures do not count as individual survey respondents.</p>{field("totalWorkers",undefined,"number")}{field("regularWorkers",undefined,"number")}{field("nonRegularWorkers",undefined,"number")}{field("partTimeWorkers",undefined,"number")}{field("workforceNotes")}{field("ownerPresidentName")}{field("contactName")}{field("contactPosition")}{field("contactEmail",undefined,"email")}{field("contactPhone",undefined,"tel")}<p className="text-xs leading-6 text-muted-foreground sm:col-span-2">Contact person, position and at least one email or phone are needed to submit. Contact details remain private to your account.</p></>:null}
          {!creating&&step===3?<div className="sm:col-span-2"><p className="mb-6 text-sm leading-6 text-muted-foreground">Review the organizational answers below. This is a community-planning survey, not a permit or job application. You may submit unknown workforce figures without inventing zeros.</p><AnswerSummary answers={answers}/></div>:null}
        </fieldset>
        <div className="mt-8 flex flex-wrap gap-3 border-t border-border pt-6">{creating?<button type="button" className={primary} disabled={locked} onClick={()=>save("DRAFT")}>Create establishment draft</button>:<><button type="button" className={button} disabled={locked||step===0} onClick={()=>setStep(n=>n-1)}>Previous</button>{step<3?<button type="button" className={primary} disabled={locked} onClick={()=>{setStep(n=>n+1);setError("");}}>Next</button>:<button type="button" className={primary} disabled={locked} onClick={()=>save("SUBMITTED")}>Review and submit</button>}<button type="button" className={button} disabled={locked} onClick={()=>save("DRAFT")}>Save draft</button></>}</div>
      </section>
      {current?<section className={card}><h2 className="text-xl font-bold">Submitted response & protected history</h2><p className="mt-3 text-sm leading-6 text-muted-foreground">Current draft: {current.hasDraft?"saved":"none"}. Submitted participation: {current.submittedStatus==="SUBMITTED"?"active":current.submittedStatus==="WITHDRAWN"?"withdrawn":"not submitted"}. Earlier submitted answers remain protected when you edit a draft.</p>{current.submitted?<details className="mt-5 rounded-2xl border border-border p-5"><summary className="cursor-pointer font-semibold">Current submitted response</summary><div className="mt-5"><AnswerSummary answers={current.submitted}/></div></details>:null}<ol className="mt-5 space-y-4">{current.history.map(revision=><li key={revision.id}><details className="rounded-2xl border border-border p-5"><summary className="cursor-pointer text-sm font-semibold">Revision {revision.revision} · {friendly(revision.action)} · {new Date(revision.createdAt).toLocaleString("en-PH",{timeZone:"Asia/Manila"})}</summary><p className="my-4 text-xs text-muted-foreground">Recorded by your account. Time shown in Asia/Manila.</p><AnswerSummary answers={revision.answers}/></details></li>)}</ol>{!current.history.length?<p className="mt-4 text-sm text-muted-foreground">No submitted or withdrawn revisions for this year.</p>:null}{current.hasDraft||current.submittedStatus==="SUBMITTED"?<button type="button" className={button+" mt-6"} disabled={locked} onClick={()=>confirm("Withdraw this year's survey?","This removes this year’s draft and active participation. Protected history stays available. This does not delete the establishment.","Withdraw survey",()=>{void perform({method:"DELETE",body:{establishmentId:current.establishment.id,surveyYear:year,expectedRecordVersion:current.recordVersion,expectedVersion:current.workspaceVersion,requestKey:crypto.randomUUID()},message:"Survey withdrawn."});})}>Withdraw this year&apos;s survey</button>:null}</section>:null}
    </>}
    <dialog ref={dialog} aria-labelledby="est-dialog-title" aria-describedby="est-dialog-description" onClose={()=>setConfirmation(null)} className="m-auto w-[min(92vw,520px)] rounded-[24px] border border-border bg-card p-6 text-foreground shadow-xl backdrop:bg-primary/40 sm:p-8"><h2 id="est-dialog-title" className="text-xl font-bold">{confirmation?.title}</h2><p id="est-dialog-description" className="mt-4 text-sm leading-7 text-muted-foreground">{confirmation?.text}</p><div className="mt-6 flex flex-wrap gap-3"><button type="button" className={button} onClick={()=>dialog.current?.close()}>Cancel</button><button type="button" className={primary} onClick={()=>{const action=confirmation?.run;dialog.current?.close();action?.();}}>{confirmation?.label}</button></div></dialog>
  </div>;
}
