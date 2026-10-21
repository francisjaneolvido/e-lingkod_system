"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, CheckCircle2, ClipboardCheck, FileSpreadsheet, History, Info, RotateCcw, ShieldAlert, Upload, XCircle } from "lucide-react";
import type { JobsDashboardData } from "./job-types";

type Preview={totalRows:number;validRows:number;invalidRows:number;issues:{row:number;message:string}[];moreIssues:number;previewHash:string|null;duplicate:{sourceLabel:string;recordCount:number;status:string;createdAt:string}|null};
type Phase="upload"|"preview"|"result";
type Dataset="DEMO"|"REAL";

export function SpesImportWorkspace({batches,batchCount,isSuperAdmin}:{batches:JobsDashboardData["batches"];batchCount:number;isSuperAdmin:boolean}){
  const router=useRouter();
  const [file,setFile]=useState<File|null>(null);
  const [source,setSource]=useState("Hackathon Demo — Fictional SPES Survey");
  const [datasetKind,setDatasetKind]=useState<Dataset>("DEMO");
  const [authorizedUse,setAuthorizedUse]=useState(false);
  const [phase,setPhase]=useState<Phase>("upload");
  const [preview,setPreview]=useState<Preview|null>(null);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState("");
  const [success,setSuccess]=useState("");
  const [historyBusy,setHistoryBusy]=useState("");
  const [historyMessage,setHistoryMessage]=useState("");

  function invalidate(){setPhase("upload");setPreview(null);setError("");setSuccess("");}
  function payload(includeHash=false){
    const body=new FormData();
    if(file)body.set("file",file);
    body.set("sourceLabel",source.trim());
    body.set("datasetKind",datasetKind);
    if(authorizedUse)body.set("authorizedUse","yes");
    if(includeHash&&preview?.previewHash)body.set("previewHash",preview.previewHash);
    return body;
  }
  async function request(path:string,body:FormData){
    const response=await fetch(path,{method:"POST",body});
    const result=await response.json().catch(()=>({}));
    if(!response.ok)throw new Error(result.error||"Unable to process the CSV. Check the file and try again.");
    return result;
  }
  async function validate(){
    if(!file)return;
    setBusy(true);setError("");
    try{
      const result:Preview=await request("/api/admin/jobs/import/preview",payload());
      setPreview(result);setPhase("preview");
    }catch(e){setError(e instanceof Error?e.message:"Unable to validate this CSV.");}
    finally{setBusy(false);}
  }
  async function confirm(){
    if(!file||!preview?.previewHash||preview.invalidRows||preview.duplicate)return;
    setBusy(true);setError("");
    try{
      const result=await request("/api/admin/jobs/import",payload(true));
      setSuccess(`${result.count} anonymous ${datasetKind.toLowerCase()} survey records successfully imported. Your file was not stored.`);
      setPhase("result");setFile(null);
      router.refresh();
    }catch(e){setError(e instanceof Error?e.message:"Import failed.");}
    finally{setBusy(false);}
  }
  async function batchAction(id:string,action:"ARCHIVE"|"RESTORE"){
    const reason=action==="ARCHIVE"?window.prompt("Reason for archiving this survey batch (at least 10 characters):", "Fictional data correction; exclude from workforce insights."):"";
    if(reason===null)return;
    if(action==="RESTORE"&&!window.confirm("Restore this batch's original survey records to Workforce Insights?"))return;
    setHistoryBusy(id);setHistoryMessage("");
    try{
      const response=await fetch(`/api/admin/jobs/import/${encodeURIComponent(id)}`,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({action,reason})});
      const result=await response.json().catch(()=>({}));
      if(!response.ok)throw new Error(result.error||"Unable to change import status.");
      setHistoryMessage(action==="ARCHIVE"?"Batch archived. Its rows are excluded from insights, but preserved for restoration.":"Batch restored. Its records are included in insights again.");
      router.refresh();
    }catch(e){setHistoryMessage(e instanceof Error?e.message:"Unable to update history.");}
    finally{setHistoryBusy("");}
  }
  return <div className="spes-v104-layout">
    <section className="jobs-panel jobs-pad spes-import-main" aria-label="SPES CSV import wizard">
      <div className="jobs-feature-title"><FileSpreadsheet size={23}/><div><h2>SPES Survey Import</h2><p>Preview and verify anonymous records before adding anything to Workforce Insights.</p></div></div>
      <div className="spes-steps" aria-label="Import progress">
        {(["Upload","Preview & validate","Confirm import"] as const).map((step,i)=><div className={`spes-step ${["upload","preview","result"].indexOf(phase)>=i?"spes-step--active":""}`} key={step}><span>{i+1}</span>{step}</div>)}
      </div>
      <div className="jobs-info-note"><Info size={19}/><p>Only anonymous data with authorized consent can be imported. Never upload names, emails, phone numbers, addresses, birthdays or ID numbers. The uploaded file is validated in memory, not stored.</p></div>
      {phase==="upload"&&<div className="spes-fields">
        <div className="jobs-csv-template"><strong>CSV format — exact column order</strong><code>consent,barangay,education,skills,interests,availability</code><small>Skills/interests separated by | · 500 rows maximum · 300 KB limit</small><a href="/demo-data/spes-demo-consented.csv" download className="jobs-text-action">Download sample CSV <ArrowRight size={13}/></a></div>
        <label className="jobs-label">Dataset type <select className="jobs-input" value={datasetKind} onChange={e=>{setDatasetKind(e.target.value as Dataset);setAuthorizedUse(false);invalidate();}}><option value="DEMO">Fictional / hackathon demonstration</option><option value="REAL">Authorized, anonymous real survey data</option></select></label>
        <label className="jobs-label">Survey source label <input className="jobs-input" maxLength={120} value={source} onChange={e=>{setSource(e.target.value);invalidate();}} placeholder="e.g. Hackathon Demo — SPES 2026"/></label>
        {datasetKind==="REAL"&&<label className="spes-consent"><input type="checkbox" checked={authorizedUse} onChange={e=>{setAuthorizedUse(e.target.checked);invalidate();}}/> I confirm the collection/use is authorized, respondents consented to these insights, and direct identifiers are excluded.</label>}
        <label className="jobs-label">CSV file <input className="jobs-upload" type="file" accept=".csv,text/csv" onChange={e=>{setFile(e.target.files?.[0]||null);invalidate();}}/></label>
        {file&&<p className="spes-file-meta">Selected: {file.name} ({Math.ceil(file.size/1024)} KB)</p>}
        <div className="spes-actionbar"><span>Nothing is saved during preview.</span><button type="button" className="jobs-primary-button" disabled={busy||!file||source.trim().length<4||(datasetKind==="REAL"&&!authorizedUse)} onClick={validate}><ClipboardCheck size={17}/>{busy?"Validating...":"Preview CSV"}</button></div>
      </div>}
      {phase==="preview"&&preview&&<div className="spes-preview">
        <h3>Review import results</h3>
        <div className="spes-summary-grid"><div><strong>{preview.totalRows}</strong><span>Total rows</span></div><div><strong>{preview.validRows}</strong><span>Valid</span></div><div><strong>{preview.invalidRows}</strong><span>Invalid</span></div></div>
        <p className="spes-source-context">Source: <strong>{source}</strong> · <strong>{datasetKind==="DEMO"?"Fictional demo":"Authorized real"}</strong></p>
        {preview.duplicate&&<div className="spes-problem" role="alert"><ShieldAlert size={19}/><div><strong>Duplicate survey batch detected</strong><p>Already imported as “{preview.duplicate.sourceLabel}” ({preview.duplicate.recordCount} rows). {preview.duplicate.status==="VOIDED"?"Restore the archived batch using Import History.":"No new records should be imported."}</p></div></div>}
        {preview.invalidRows>0&&<div className="spes-problem" role="alert"><XCircle size={19}/><div><strong>{preview.invalidRows} rows need correction</strong><p>No survey records will be saved until all rows are valid. Update the CSV and preview it again.</p><ul>{preview.issues.map(item=><li key={item.row}>Row {item.row}: {item.message}</li>)}</ul>{preview.moreIssues>0&&<p>And {preview.moreIssues} more issues.</p>}</div></div>}
        {!preview.invalidRows&&!preview.duplicate&&<div className="spes-ready"><CheckCircle2 size={20}/><span>All {preview.validRows} rows passed validation. Nothing has been saved yet.</span></div>}
        <div className="spes-actionbar"><button type="button" className="jobs-secondary-button" disabled={busy} onClick={()=>{setPhase("upload");setPreview(null);}}>Back to upload</button><button type="button" className="jobs-primary-button" disabled={busy||preview.invalidRows>0||Boolean(preview.duplicate)||!preview.previewHash} onClick={confirm}><Upload size={17}/>{busy?"Importing...":"Confirm & import"}</button></div>
      </div>}
      {phase==="result"&&<div className="spes-result"><CheckCircle2 size={28}/><h3>Survey imported</h3><p>{success}</p><button className="jobs-primary-button" type="button" onClick={()=>{setPhase("upload");setPreview(null);setSuccess("");}}>Import another file</button></div>}
      {error&&<div role="alert" className="spes-problem"><XCircle size={18}/><p>{error}</p></div>}
    </section>
    <aside className="jobs-panel jobs-pad spes-import-history" aria-label="SPES import history">
      <div className="jobs-feature-title"><History size={21}/><div><h2>Import History</h2><p>Latest {batches.length} of {batchCount} import batches, including archived history.</p></div></div>
      {historyMessage&&<p className="spes-history-message" role="status">{historyMessage}</p>}
      {batches.length?batches.map(batch=><article className="spes-history-item" key={batch.id}>
        <div className="spes-history-heading"><strong>{batch.sourceLabel}</strong><span className={`spes-dataset-tag spes-dataset-tag--${batch.datasetKind.toLowerCase()}`}>{batch.datasetKind==="DEMO"?"Demo":batch.datasetKind==="REAL"?"Real":"Unclassified"}</span></div>
        <p>{batch.recordCount} records · {new Date(batch.createdAt).toLocaleDateString("en-PH")} · {batch.importedBy}</p>
        {batch.status==="VOIDED"&&<p className="spes-archived-tag">Archived — excluded from insights</p>}
        {batch.events.length>0&&<details><summary>Activity history</summary><ul>{batch.events.map((event,i)=><li key={`${event.createdAt}-${i}`}>{event.action} by {event.actor} · {new Date(event.createdAt).toLocaleString("en-PH")}{event.note?` — ${event.note}`:""}</li>)}</ul></details>}
        {isSuperAdmin&&<button disabled={historyBusy===batch.id} className="jobs-secondary-button spes-history-action" type="button" onClick={()=>batchAction(batch.id,batch.status==="ACTIVE"?"ARCHIVE":"RESTORE")}><RotateCcw size={14}/>{historyBusy===batch.id?"Updating...":batch.status==="ACTIVE"?"Archive batch":"Restore batch"}</button>}
      </article>):<p className="jobs-empty-side">No survey imports yet.</p>}
      <div className="jobs-info-note"><Info size={18}/><p>Archiving does not delete any survey records. Super Admin may restore them later. Archived batches do not contribute to Workforce Insights.</p></div>
    </aside>
  </div>;
}
