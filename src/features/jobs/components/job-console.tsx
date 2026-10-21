"use client";

import { Fragment, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Archive, ArrowRight, ArrowUpRight, BriefcaseBusiness, ClipboardList, Filter, MapPin, Plus, Search, ShieldCheck, Users, X } from "lucide-react";
import { SECTORS, WORK_LABEL, WORK_TYPES } from "../domain";
import { SpesImportWorkspace } from "./spes-import-workspace";
import { SpesInsights } from "./spes-insights";
import { displayJobStatus, type JobsDashboardData, type ManagedJob } from "./job-types";
import "./jobs-workspace.css";

type Tab="opportunities"|"survey"|"insights";
type Status="ALL"|"PUBLISHED"|"DRAFT"|"PENDING_REVIEW"|"RETURNED"|"CLOSED"|"FILLED"|"ARCHIVED"|"EXPIRED";
type Action="SUBMIT_REVIEW"|"APPROVE"|"RETURN"|"CLOSE"|"FILL"|"ARCHIVE";
const statusLabels:Record<string,string>={PUBLISHED:"Published",DRAFT:"Draft",PENDING_REVIEW:"For review",RETURNED:"Returned",CLOSED:"Closed",FILLED:"Filled",ARCHIVED:"Archived",EXPIRED:"Expired"};
function Badge({status}:{status:string}) {return <span className={`jobs-status jobs-status--${status.toLowerCase()}`}>{statusLabels[status]||status}</span>;}
function DateCell({date}:{date:string}){return <span>{new Date(date).toLocaleDateString("en-PH",{month:"short",day:"numeric",year:"numeric"})}</span>;}
function JobActions({job,busy,now,isSuperAdmin,onAction,onReview}:{job:ManagedJob;busy:boolean;now:Date;isSuperAdmin:boolean;onAction:(id:string,action:Action)=>Promise<void>;onReview:(id:string)=>void}){
 const status=displayJobStatus(job,now);
 return <div className="jobs-row-actions">
  {status!=="PENDING_REVIEW"&&<Link href={`/admin/jobs/${encodeURIComponent(job.id)}/edit`} className="jobs-small-button">Edit <ArrowRight size={13}/></Link>}
  {(status==="DRAFT"||status==="RETURNED")&&<button type="button" disabled={busy} className="jobs-small-button jobs-small-button--blue" onClick={()=>onAction(job.id,"SUBMIT_REVIEW")}>Submit for review</button>}
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
export function JobConsole({data,viewerName,asOf,isSuperAdmin,saved=false}:{data:JobsDashboardData;viewerName:string;asOf:string;isSuperAdmin:boolean;saved?:boolean}){
 const router=useRouter();const now=useMemo(()=>new Date(asOf),[asOf]);const [tab,setTab]=useState<Tab>("opportunities");
 const [search,setSearch]=useState("");const [status,setStatus]=useState<Status>("ALL");const [sector,setSector]=useState("ALL");const [type,setType]=useState("ALL");
 const [busy,setBusy]=useState(false);const [error,setError]=useState("");const [notice,setNotice]=useState(saved?"Opportunity saved successfully.":"");
 
 const [expanded,setExpanded]=useState<string|null>(null);
 const [reviewId,setReviewId]=useState<string|null>(null);
 const filtered=useMemo(()=>data.jobs.filter(job=>{
  const query=search.trim().toLowerCase();
  return (!query||[job.title,job.employer,job.barangay,job.location,...job.skills].join(" ").toLowerCase().includes(query))&&
   (status==="ALL"||displayJobStatus(job,now)===status)&&(sector==="ALL"||job.sector===sector)&&(type==="ALL"||job.workType===type);
 }),[data.jobs,search,status,sector,type,now]);
 const counts=useMemo(()=>({active:data.jobs.filter(j=>displayJobStatus(j,now)==="PUBLISHED").length,draft:data.jobs.filter(j=>displayJobStatus(j,now)==="DRAFT").length,pending:data.jobs.filter(j=>displayJobStatus(j,now)==="PENDING_REVIEW").length,expired:data.jobs.filter(j=>displayJobStatus(j,now)==="EXPIRED").length,archived:data.jobs.filter(j=>displayJobStatus(j,now)==="ARCHIVED").length}),[data.jobs,now]);
 async function action(id:string,act:Action,details:Record<string,unknown>={}){
  const confirmations:Partial<Record<Action,string>>={SUBMIT_REVIEW:"Submit this vacancy for Super Admin verification?",ARCHIVE:"Archive and hide this opportunity?",CLOSE:"Mark this opportunity closed and remove it from citizen discovery?",FILL:"Confirm the vacancy was filled and remove it from citizen discovery?"};
  if(confirmations[act]&&!window.confirm(confirmations[act]))return;
  setBusy(true);setError("");setNotice("");
  try{
   const response=await fetch(`/api/admin/jobs/${encodeURIComponent(id)}`,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:act,...details})});
   const result=await response.json().catch(()=>({}));if(!response.ok)throw Error(result.error||"Unable to update listing.");
   const messages:Record<Action,string>={SUBMIT_REVIEW:"Submitted for Super Admin review.",APPROVE:"Employer and vacancy approved; listing is now published.",RETURN:"Returned to PESO staff for corrections.",CLOSE:"Vacancy closed.",FILL:"Vacancy marked filled.",ARCHIVE:"Opportunity archived."};
   setNotice(messages[act]);setReviewId(null);router.refresh();
  }catch(e){setError(e instanceof Error?e.message:"Unable to update listing.");}finally{setBusy(false);}
 }
 return <div className="jobs-workspace">
  <header className="jobs-header"><div><span className="jobs-eyebrow">PESO / LOCAL EMPLOYMENT SERVICES</span><h1>Job Matching</h1><p>Manage local vacancies, survey insights, and citizen opportunity discovery. Signed in as {viewerName}. {isSuperAdmin?"You can review vacancies before publication.":"Submit vacancies for Super Admin review before publication."}</p></div><Link href="/admin/jobs/new" className="jobs-primary-button"><Plus size={17}/> Add opportunity</Link></header>
  <div className="jobs-metrics">
   {[{label:"Live listings",value:counts.active,icon:BriefcaseBusiness},{label:"Drafts",value:counts.draft,icon:ClipboardList},{label:"For review",value:counts.pending,icon:ShieldCheck},{label:"Survey records",value:data.totalSurveys,icon:Users}].map(metric=><div className="jobs-metric" key={metric.label}><div><span>{metric.label}</span><strong>{metric.value}</strong></div><metric.icon aria-hidden size={20}/></div>)}
  </div>
  {(notice||error)&&<div role={error?"alert":"status"} className={`jobs-banner ${error?"jobs-banner--error":"jobs-banner--success"}`}>{error||notice}<button onClick={()=>{setError("");setNotice("");}} title="Dismiss message" aria-label="Dismiss message"><X size={16}/></button></div>}
  <div className="jobs-tabstrip" role="tablist" aria-label="PESO workspace areas">{([ ["opportunities","Opportunities"],["survey","SPES survey import"],["insights","Workforce insights"] ] as const).map(([id,label])=><button role="tab" aria-selected={tab===id} aria-controls={`jobs-panel-${id}`} id={`jobs-tab-${id}`} className={tab===id?"jobs-tab jobs-tab--active":"jobs-tab"} key={id} onClick={()=>{setTab(id);setError("");setNotice("");}}>{label}</button>)}</div>
  {tab==="opportunities"&&<section id="jobs-panel-opportunities" role="tabpanel" aria-labelledby="jobs-tab-opportunities" className="jobs-panel">
   <div className="jobs-panel-title"><div><h2>Job opportunities</h2><p>PESO submits for verification; Super Admin approves publishing. Closed, filled, and expired posts are not public.</p></div><span className="jobs-panel-count">{filtered.length} of {data.jobs.length} results</span></div>
   <div className="jobs-filterbar"><label className="jobs-search"><Search size={17} aria-hidden/><input value={search} onChange={e=>setSearch(e.target.value)} aria-label="Search jobs, employers or skills" placeholder="Search titles, employers, locations, skills..."/></label>
    <label className="jobs-filter"><Filter size={15} aria-hidden/><span className="sr-only">Status</span><select aria-label="Filter by status" value={status} onChange={e=>setStatus(e.target.value as Status)}><option value="ALL">All statuses</option><option value="PUBLISHED">Published</option><option value="DRAFT">Draft</option><option value="PENDING_REVIEW">For review</option><option value="RETURNED">Returned</option><option value="CLOSED">Closed</option><option value="FILLED">Filled</option><option value="EXPIRED">Expired</option><option value="ARCHIVED">Archived</option></select></label>
    <label className="jobs-filter"><span className="sr-only">Sector</span><select aria-label="Filter by sector" value={sector} onChange={e=>setSector(e.target.value)}><option value="ALL">All sectors</option>{SECTORS.map(s=><option key={s}>{s}</option>)}</select></label>
    <label className="jobs-filter"><span className="sr-only">Work type</span><select aria-label="Filter by work type" value={type} onChange={e=>setType(e.target.value)}><option value="ALL">All work types</option>{WORK_TYPES.map(t=><option key={t} value={t}>{WORK_LABEL[t]}</option>)}</select></label>
    {(search||status!=="ALL"||sector!=="ALL"||type!=="ALL")&&<button type="button" className="jobs-clear-filter" onClick={()=>{setSearch("");setStatus("ALL");setSector("ALL");setType("ALL");}}>Clear filters</button>}
   </div>
   {filtered.length?<><div className="jobs-desktop-table"><table><thead><tr><th>Opportunity</th><th>Type / sector</th><th>Status</th><th>Last updated</th><th className="jobs-actions-cell">Actions</th></tr></thead><tbody>{filtered.map(job=><Fragment key={job.id}><tr><td><div className="jobs-list-title">{job.title}</div><div className="jobs-list-meta"><MapPin size={12}/>{job.employer} · {job.barangay}</div><button className="jobs-text-action" type="button" onClick={()=>setExpanded(expanded===job.id?null:job.id)} aria-expanded={expanded===job.id}>{expanded===job.id?"Hide details":"Quick details"}</button>{expanded===job.id&&<div className="jobs-row-expand"><strong>Requirements:</strong> {job.skills.join(", ")||"Not specified"}<div><strong>Inquiries:</strong> {job.contactInfo}</div>{job.reviewNote&&<div><strong>Last reviewer note:</strong> {job.reviewNote}</div>}</div>}</td><td><div>{WORK_LABEL[job.workType]}</div><span className="jobs-muted">{job.sector}</span></td><td><Badge status={displayJobStatus(job,now)}/></td><td className="jobs-muted"><DateCell date={job.updatedAt}/></td><td><JobActions job={job} busy={busy} now={now} isSuperAdmin={isSuperAdmin} onAction={action} onReview={id=>setReviewId(reviewId===id?null:id)}/></td></tr>{reviewId===job.id&&isSuperAdmin&&<tr className="jobs-review-row"><td colSpan={5}><VacancyReview job={job} busy={busy} onSubmit={action}/></td></tr>}</Fragment>)}</tbody></table></div>
    <div className="jobs-mobile-list">{filtered.map(job=><article className="jobs-mobile-card" key={job.id}><div className="jobs-mobile-card-head"><h3>{job.title}</h3><Badge status={displayJobStatus(job,now)}/></div><p>{job.employer} · {job.barangay}</p><p>{WORK_LABEL[job.workType]} · {job.sector}</p><div className="jobs-mobile-card-foot"><JobActions job={job} busy={busy} now={now} isSuperAdmin={isSuperAdmin} onAction={action} onReview={id=>setReviewId(reviewId===id?null:id)}/></div>{reviewId===job.id&&isSuperAdmin&&<VacancyReview job={job} busy={busy} onSubmit={action}/>}</article>)}</div></>:<div className="jobs-empty-state"><BriefcaseBusiness size={26}/><h3>No opportunities found</h3><p>{data.jobs.length?"Try adjusting your search or filters.":"Create your first draft to start building local opportunities."}</p>{!data.jobs.length&&<Link href="/admin/jobs/new" className="jobs-primary-button"><Plus size={16}/> Add first opportunity</Link>}</div>}
  </section>}
  {tab==="survey"&&<section id="jobs-panel-survey" role="tabpanel" aria-labelledby="jobs-tab-survey"><SpesImportWorkspace batches={data.batches} batchCount={data.batchCount} isSuperAdmin={isSuperAdmin}/></section>}
  {tab==="insights"&&<section id="jobs-panel-insights" role="tabpanel" aria-labelledby="jobs-tab-insights"><SpesInsights insights={data.insights}/></section>}
  <footer className="jobs-disclaimer"><ShieldCheck size={17}/><span>Hackathon prototype. Super Admin must confirm employer and vacancy details before new listings become public. Legacy listings may predate this review. Matching is informational—not a hiring decision. <Link href="/opportunities">View citizen opportunities <ArrowUpRight size={13}/></Link></span></footer>
 </div>;
}
