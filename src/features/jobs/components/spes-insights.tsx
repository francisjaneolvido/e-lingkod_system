"use client";
import { useState } from "react";
import { Info } from "lucide-react";
import type { JobsDashboardData } from "./job-types";

type Kind="DEMO"|"REAL"|"UNCLASSIFIED"|"ALL";
export function SpesInsights({insights}:{insights:JobsDashboardData["insights"]}){
  const [kind,setKind]=useState<Kind>(insights.DEMO.total?"DEMO":insights.REAL.total?"REAL":insights.UNCLASSIFIED.total?"UNCLASSIFIED":"ALL");
  const summary=insights[kind];
  return <section className="spes-insights-view" aria-label="SPES workforce insights">
    <div className="jobs-panel jobs-pad spes-insights-control"><div><h2>Workforce Insights</h2><p className="jobs-muted">Aggregated anonymous survey data. Select a source type to avoid combining fictional and real records by accident.</p></div>
      <label className="jobs-label">Survey source <select className="jobs-input" value={kind} onChange={e=>setKind(e.target.value as Kind)}><option value="DEMO">Fictional demo ({insights.DEMO.total})</option><option value="REAL">Authorized real ({insights.REAL.total})</option><option value="UNCLASSIFIED">Legacy / unclassified ({insights.UNCLASSIFIED.total})</option><option value="ALL">All sources — combined ({insights.ALL.total})</option></select></label>
      {kind==="ALL"&&<div className="spes-source-warning"><Info size={18}/> This view combines demo and real data. Do not report these totals as actual local employment statistics.</div>}
      {kind==="UNCLASSIFIED"&&<div className="spes-source-warning"><Info size={18}/> Legacy batches without explicit source classification are not verified real-world statistics.</div>}
      <div className="spes-summary-grid"><div><strong>{summary.total}</strong><span>Active survey records</span></div><div><strong>{summary.areaCount}</strong><span>Areas represented</span></div><div><strong>{summary.topSkills.length}</strong><span>Skills displayed</span></div></div>
    </div>
    <div className="jobs-insights-layout">
      <div className="jobs-panel jobs-pad"><h2>Most reported skills</h2><p className="jobs-muted">Percent of selected survey records, not the overall working population.</p><div className="jobs-bars">{summary.topSkills.length?summary.topSkills.map(([label,n])=><div className="jobs-bar-row" key={label}><div><span>{label}</span><strong>{n<3?"<3":`${n} (${Math.round(100*n/Math.max(1,summary.total))}%)`}</strong></div><div className="jobs-bar-track"><span style={{width:`${n<3?0:100*n/Math.max(1,summary.total)}%`}}/></div></div>):<p className="jobs-empty-side">No active survey records for this source type.</p>}</div></div>
      <div className="jobs-panel jobs-pad"><h2>Survey areas</h2><p className="jobs-muted">Anonymous totals by barangay; small groups are withheld.</p><div className="jobs-bars">{summary.topBarangays.length?summary.topBarangays.map(([label,n])=><div className="jobs-bar-row" key={label}><div><span>{n<3?"Small group withheld":label}</span><strong>{n<3?"<3":`${n} (${Math.round(100*n/Math.max(1,summary.total))}%)`}</strong></div><div className="jobs-bar-track"><span style={{width:`${n<3?0:100*n/Math.max(1,summary.total)}%`}}/></div></div>):<p className="jobs-empty-side">No active survey records for this source type.</p>}</div></div>
      <div className="jobs-panel jobs-pad jobs-insights-wide"><h2>Survey skill overlap × active job opportunities</h2><p className="jobs-muted">Counts are indicative skill overlaps only, not job applications, qualifications, or hiring guarantees. Values below 3 are withheld.</p><div className="jobs-signal-grid">{summary.opportunitySignals.length?summary.opportunitySignals.map(j=><div className="jobs-signal" key={j.id}><strong>{j.title}</strong><span>{j.aligned>=3?`${j.aligned} overlaps`:"<3 overlaps"}</span></div>):<p className="jobs-empty-side">Publish vacancies and import survey records to see comparisons.</p>}</div></div>
    </div>
  </section>;
}
