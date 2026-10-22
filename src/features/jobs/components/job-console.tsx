"use client";

import { Fragment, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Archive, ArrowRight, ArrowUpRight, BarChart3, BriefcaseBusiness, ClipboardList, Filter, MapPin, Plus, Search, ShieldCheck, X } from "lucide-react";
import { SECTORS, WORK_LABEL, WORK_TYPES } from "../domain";
import { displayJobStatus, type JobsDashboardData, type ManagedJob } from "./job-types";
import "./jobs-workspace.css";

type Status="ALL"|"PUBLISHED"|"DRAFT"|"PENDING_REVIEW"|"RETURNED"|"CLOSED"|"FILLED"|"ARCHIVED"|"EXPIRED";
type QuickView="ALL"|"MY_WORK"|"RETURNED"|"REVIEW"|"PUBLISHED"|"CLOSED";
type Action="SUBMIT_REVIEW"|"APPROVE"|"RETURN"|"CLOSE"|"FILL"|"ARCHIVE";
const statusLabels:Record<string,string>={PUBLISHED:"Published",DRAFT:"Draft",PENDING_REVIEW:"For review",RETURNED:"Returned",CLOSED:"Closed",FILLED:"Filled",ARCHIVED:"Archived",EXPIRED:"Expired"};
function Badge({status}:{status:string}) {return <span className={`jobs-status jobs-status--${status.toLowerCase()}`}>{statusLabels[status]||status}</span>;}
function DateCell({date}:{date:string}){return <span>{new Date(date).toLocaleDateString("en-PH",{month:"short",day:"numeric",year:"numeric"})}</span>;}
function JobActions({job,busy,now,isSuperAdmin,onAction,onReview}:{job:ManagedJob;busy:boolean;now:Date;isSuperAdmin:boolean;onAction:(id:string,action:Action)=>Promise<void>;onReview:(id:string)=>void}){
 const status=displayJobStatus(job,now);
 return <div className="jobs-row-actions">
  {status!=="PENDING_REVIEW"&&<Link href={`/admin/jobs/${encodeURIComponent(job.id)}/edit`} className="jobs-small-button">Edit <ArrowRight size={13}/></Link>}
  {(status==="DRAFT"||status==="RETURNED")&&<button type="button" disabled={busy} className="jobs-small-button jobs-small-button--blue" onClick={()=>onAction(job.id,"SUBMIT_REVIEW")}>Submit for verification</button>}
  {status==="PENDING_REVIEW"&&isSuperAdmin&&<button type="button" disabled={busy} className="jobs-small-button jobs-small-button--blue" onClick={()=>onReview(job.id)}>Review vacancy</button>}
  {status==="PENDING_REVIEW"&&!isSuperAdmin&&<span className="jobs-muted">Awaiting Super Admin</span>}
  {status==="PUBLISHED"&&<><button type="button" disabled={busy} className="jobs-small-button" onClick={()=>onAction(job.id,"FILL")}>Mark filled</button><button type="button" disabled={busy} className="jobs-small-button" onClick={()=>onAction(job.id,"CLOSE")}>Close</button></>}
  {status==="EXPIRED"&&<span className="jobs-expired-hint">Expired: edit date and request review</span>}
  {status!=="ARCHIVED"&&status!=="PENDING_REVIEW"&&<button type="button" disabled={busy} className="jobs-icon-button" onClick={()=>onAction(job.id,"ARCHIVE")} title={`Archive ${job.title}`} aria-label={`Archive ${job.title}`}><Archive size={16}/></button>}
 </div>;
}
function VacancyReview({job,busy,onSubmit}:{job:ManagedJob;busy:boolean;onSubmit:(id:string,action:Action,details:Record<string,unknown>)=>Promise<void>}){
 const [employerVerified,setEmployerVerified]=useState(false);
 const [vacancyVerified,setVacancyVerified]=useState(false);
 const [note,setNote]=useState("");
 return <div className="jobs-review-card">
  <div className="jobs-review-heading"><ShieldCheck size={20}/><div><strong>Super Admin verification</strong><p>Verify employer identity and the open vacancy through an independent authorized channel before publishing.</p></div></div>
  <p className="jobs-review-source"><strong>PESO-provided source:</strong> {job.reviewSource||"Not recorded"}</p>
  <label className="jobs-review-check"><input type="checkbox" checked={employerVerified} onChange={e=>setEmployerVerified(e.target.checked)}/> I confirmed the employer details.</label>
  <label className="jobs-review-check"><input type="checkbox" checked={vacancyVerified} onChange={e=>setVacancyVerified(e.target.checked)}/> I confirmed this vacancy is genuine and available.</label>
  <label className="jobs-label">Reviewer remarks / required corrections<textarea maxLength={1000} rows={3} className="jobs-input jobs-textarea" value={note} onChange={e=>setNote(e.target.value)} placeholder="Add a reason when returning for corrections..."/></label>
  <div className="jobs-review-actions"><button disabled={busy||!employerVerified||!vacancyVerified} className="jobs-primary-button" type="button" onClick={()=>onSubmit(job.id,"APPROVE",{employerVerified,vacancyVerified,note})}>Approve & publish</button><button disabled={busy||note.trim().length<20} className="jobs-secondary-button" type="button" onClick={()=>onSubmit(job.id,"RETURN",{note})}>Return for correction</button></div>
  <p className="jobs-field-help">Approval is recorded with your Super Admin identity. Public listings do not show internal verification notes.</p>
 </div>;
}

function initialQuickView(raw:string,isSuperAdmin:boolean):QuickView {
 const normalized=raw.toLowerCase();
 if(normalized==="my-work")return "MY_WORK";
 if(normalized==="returned")return "RETURNED";
 if(normalized==="review")return "REVIEW";
 if(normalized==="published")return "PUBLISHED";
 if(normalized==="closed")return "CLOSED";
 if(normalized==="all")return "ALL";
 return isSuperAdmin?"REVIEW":"MY_WORK";
}

export function JobConsole({data,viewerId,viewerName,asOf,isSuperAdmin,canViewInsights,initialView,saved=false}:{data:JobsDashboardData;viewerId:string;viewerName:string;asOf:string;isSuperAdmin:boolean;canViewInsights:boolean;initialView:string;saved?:boolean}){
 const router=useRouter();const now=useMemo(()=>new Date(asOf),[asOf]);
 const [quickView,setQuickView]=useState<QuickView>(()=>initialQuickView(initialView,isSuperAdmin));
 const [search,setSearch]=useState("");const [status,setStatus]=useState<Status>("ALL");const [sector,setSector]=useState("ALL");const [type,setType]=useState("ALL");
 const [busy,setBusy]=useState(false);const [error,setError]=useState("");const [notice,setNotice]=useState(saved?"Opportunity saved successfully.":"");
 const [expanded,setExpanded]=useState<string|null>(null);const [reviewId,setReviewId]=useState<string|null>(null);

 const statusOf=(job:ManagedJob)=>displayJobStatus(job,now);
 const quickMatch=(job:ManagedJob)=>{
  const current=statusOf(job);
  if(quickView==="ALL")return true;
  if(quickView==="MY_WORK")return job.createdById===viewerId&&(current==="DRAFT"||current==="RETURNED");
  if(quickView==="RETURNED")return job.createdById===viewerId&&current==="RETURNED";
  if(quickView==="REVIEW")return current==="PENDING_REVIEW";
  if(quickView==="PUBLISHED")return current==="PUBLISHED";
  return ["CLOSED","FILLED","EXPIRED","ARCHIVED"].includes(current);
 };
 const filtered=useMemo(()=>data.jobs.filter(job=>{
  const query=search.trim().toLowerCase();
  return quickMatch(job)&&(!query||[job.title,job.employer,job.barangay,job.location,...job.skills].join(" ").toLowerCase().includes(query))&&
   (status==="ALL"||statusOf(job)===status)&&(sector==="ALL"||job.sector===sector)&&(type==="ALL"||job.workType===type);
 // eslint-disable-next-line react-hooks/exhaustive-deps
 }),[data.jobs,search,status,sector,type,quickView,now,viewerId]);
 const counts=useMemo(()=>({
  active:data.jobs.filter(j=>statusOf(j)==="PUBLISHED").length,
  myWork:data.jobs.filter(j=>j.createdById===viewerId&&["DRAFT","RETURNED"].includes(statusOf(j))).length,
  returned:data.jobs.filter(j=>j.createdById===viewerId&&statusOf(j)==="RETURNED").length,
  pending:data.jobs.filter(j=>statusOf(j)==="PENDING_REVIEW").length,
  closed:data.jobs.filter(j=>["CLOSED","FILLED","EXPIRED","ARCHIVED"].includes(statusOf(j))).length,
 // eslint-disable-next-line react-hooks/exhaustive-deps
 }),[data.jobs,now,viewerId]);

 async function action(id:string,act:Action,details:Record<string,unknown>={}){
  const confirmations:Partial<Record<Action,string>>={SUBMIT_REVIEW:"Submit this vacancy for Super Admin verification?",ARCHIVE:"Archive and hide this opportunity?",CLOSE:"Mark this opportunity closed and remove it from citizen discovery?",FILL:"Confirm the vacancy was filled and remove it from citizen discovery?"};
  if(confirmations[act]&&!window.confirm(confirmations[act]))return;
  setBusy(true);setError("");setNotice("");
  try{
   const response=await fetch(`/api/admin/jobs/${encodeURIComponent(id)}`,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:act,...details})});
   const result=await response.json().catch(()=>({}));if(!response.ok)throw Error(result.error||"Unable to update listing.");
   const messages:Record<Action,string>={SUBMIT_REVIEW:"Submitted for Super Admin verification.",APPROVE:"Employer and vacancy approved; listing is now published.",RETURN:"Returned to PESO staff for corrections.",CLOSE:"Vacancy closed.",FILL:"Vacancy marked filled.",ARCHIVE:"Opportunity archived."};
   setNotice(messages[act]);setReviewId(null);router.refresh();
  }catch(e){setError(e instanceof Error?e.message:"Unable to update listing.");}finally{setBusy(false);}
 }

 const quickViews:Array<{id:QuickView;label:string;count:number;adminOnly?:boolean}>=[
  {id:"MY_WORK",label:"My drafts / returned",count:counts.myWork},
  {id:"RETURNED",label:"Returned to me",count:counts.returned},
  {id:"REVIEW",label:isSuperAdmin?"Needs verification":"Awaiting verification",count:counts.pending},
  {id:"PUBLISHED",label:"Published",count:counts.active},
  {id:"CLOSED",label:"Closed / archived",count:counts.closed},
  {id:"ALL",label:"All listings",count:data.jobs.length},
 ];

 return <div className="jobs-workspace">
  <header className="jobs-header"><div><span className="jobs-eyebrow">EMPLOYMENT & LIVELIHOOD / PESO</span><h1>Opportunity Management</h1><p>{isSuperAdmin?"Review submitted vacancies, publish verified listings, and monitor their lifecycle.":"Prepare PESO opportunity listings and submit them for Super Admin verification before they become public."} Signed in as {viewerName}.</p><div className="mt-3 flex flex-wrap gap-2">{canViewInsights&&<Link href="/admin/jobs/insights" className="jobs-small-button"><BarChart3 size={14}/> Employment insights</Link>}<Link href="/opportunities" className="jobs-small-button">Citizen view <ArrowUpRight size={13}/></Link></div></div><Link href="/admin/jobs/new" className="jobs-primary-button"><Plus size={17}/> Add opportunity</Link></header>

  <div className="jobs-metrics">
   {[{label:"Published",value:counts.active,icon:BriefcaseBusiness,view:"PUBLISHED" as QuickView},{label:"My work",value:counts.myWork,icon:ClipboardList,view:"MY_WORK" as QuickView},{label:isSuperAdmin?"Needs verification":"For verification",value:counts.pending,icon:ShieldCheck,view:"REVIEW" as QuickView},{label:"Returned to me",value:counts.returned,icon:ClipboardList,view:"RETURNED" as QuickView}].map(metric=><button type="button" onClick={()=>setQuickView(metric.view)} className="jobs-metric text-left" key={metric.label}><div><span>{metric.label}</span><strong>{metric.value}</strong></div><metric.icon aria-hidden size={20}/></button>)}
  </div>

  {(notice||error)&&<div role={error?"alert":"status"} className={`jobs-banner ${error?"jobs-banner--error":"jobs-banner--success"}`}>{error||notice}<button onClick={()=>{setError("");setNotice("");}} title="Dismiss message" aria-label="Dismiss message"><X size={16}/></button></div>}

  <section className="jobs-panel">
   <div className="jobs-panel-title"><div><h2>{isSuperAdmin?"Verification & listing queue":"My opportunity workflow"}</h2><p>{isSuperAdmin?"Start with vacancies needing verification, then monitor published and closed listings.":"Start with your drafts and returned listings. Submitted items remain read-only while awaiting Super Admin verification."}</p></div><span className="jobs-panel-count">{filtered.length} of {data.jobs.length} results</span></div>

   <div className="mb-4 flex flex-wrap gap-2" aria-label="Opportunity workflow views">{quickViews.map(item=><button type="button" key={item.id} onClick={()=>setQuickView(item.id)} className={`rounded-xl border px-3.5 py-2 text-xs font-extrabold transition ${quickView===item.id?"border-[#2c7fa2] bg-[#eaf6fb] text-[#175a7a]":"border-[#d8e5eb] bg-white text-[#607d8f] hover:border-[#b7d2de]"}`}>{item.label}<span className="ml-2 rounded-full bg-white/80 px-2 py-0.5 text-[10px]">{item.count}</span></button>)}</div>

   <div className="jobs-filterbar"><label className="jobs-search"><Search size={17} aria-hidden/><input value={search} onChange={e=>setSearch(e.target.value)} aria-label="Search jobs, employers or skills" placeholder="Search titles, employers, locations, skills..."/></label>
    <label className="jobs-filter"><Filter size={15} aria-hidden/><span className="sr-only">Status</span><select aria-label="Filter by status" value={status} onChange={e=>setStatus(e.target.value as Status)}><option value="ALL">All statuses</option><option value="PUBLISHED">Published</option><option value="DRAFT">Draft</option><option value="PENDING_REVIEW">For review</option><option value="RETURNED">Returned</option><option value="CLOSED">Closed</option><option value="FILLED">Filled</option><option value="EXPIRED">Expired</option><option value="ARCHIVED">Archived</option></select></label>
    <label className="jobs-filter"><span className="sr-only">Sector</span><select aria-label="Filter by sector" value={sector} onChange={e=>setSector(e.target.value)}><option value="ALL">All sectors</option>{SECTORS.map(s=><option key={s}>{s}</option>)}</select></label>
    <label className="jobs-filter"><span className="sr-only">Work type</span><select aria-label="Filter by work type" value={type} onChange={e=>setType(e.target.value)}><option value="ALL">All work types</option>{WORK_TYPES.map(t=><option key={t} value={t}>{WORK_LABEL[t]}</option>)}</select></label>
    {(search||status!=="ALL"||sector!=="ALL"||type!=="ALL")&&<button type="button" className="jobs-clear-filter" onClick={()=>{setSearch("");setStatus("ALL");setSector("ALL");setType("ALL");}}>Clear filters</button>}
   </div>

   {filtered.length?<><div className="jobs-desktop-table"><table><thead><tr><th>Opportunity</th><th>Type / sector</th><th>Status</th><th>Last updated</th><th className="jobs-actions-cell">Actions</th></tr></thead><tbody>{filtered.map(job=><Fragment key={job.id}><tr><td><div className="jobs-list-title">{job.title}</div><div className="jobs-list-meta"><MapPin size={12}/>{job.employer} · {job.barangay}</div><button className="jobs-text-action" type="button" onClick={()=>setExpanded(expanded===job.id?null:job.id)} aria-expanded={expanded===job.id}>{expanded===job.id?"Hide details":"Quick details"}</button>{expanded===job.id&&<div className="jobs-row-expand"><strong>Requirements:</strong> {job.skills.join(", ")||"Not specified"}<div><strong>Inquiries:</strong> {job.contactInfo}</div>{job.reviewNote&&<div><strong>Last reviewer note:</strong> {job.reviewNote}</div>}</div>}</td><td><div>{WORK_LABEL[job.workType]}</div><span className="jobs-muted">{job.sector}</span></td><td><Badge status={statusOf(job)}/></td><td className="jobs-muted"><DateCell date={job.updatedAt}/></td><td><JobActions job={job} busy={busy} now={now} isSuperAdmin={isSuperAdmin} onAction={action} onReview={id=>setReviewId(reviewId===id?null:id)}/></td></tr>{reviewId===job.id&&isSuperAdmin&&<tr className="jobs-review-row"><td colSpan={5}><VacancyReview job={job} busy={busy} onSubmit={action}/></td></tr>}</Fragment>)}</tbody></table></div>
    <div className="jobs-mobile-list">{filtered.map(job=><article className="jobs-mobile-card" key={job.id}><div className="jobs-mobile-card-head"><h3>{job.title}</h3><Badge status={statusOf(job)}/></div><p>{job.employer} · {job.barangay}</p><p>{WORK_LABEL[job.workType]} · {job.sector}</p><div className="jobs-mobile-card-foot"><JobActions job={job} busy={busy} now={now} isSuperAdmin={isSuperAdmin} onAction={action} onReview={id=>setReviewId(reviewId===id?null:id)}/></div>{reviewId===job.id&&isSuperAdmin&&<VacancyReview job={job} busy={busy} onSubmit={action}/>}</article>)}</div></>:<div className="jobs-empty-state"><BriefcaseBusiness size={26}/><h3>No opportunities in this view</h3><p>{data.jobs.length?"Try another workflow view or adjust your filters.":"Create your first draft to start building local opportunities."}</p>{!data.jobs.length&&<Link href="/admin/jobs/new" className="jobs-primary-button"><Plus size={16}/> Add first opportunity</Link>}</div>}
  </section>

  <footer className="jobs-disclaimer"><ShieldCheck size={17}/><span>Super Admin verification is required before new listings become public. Community survey and historical workforce data are managed separately in Community Insights/Data Management. Opportunity recommendations are informational—not hiring decisions.</span></footer>
 </div>;
}
