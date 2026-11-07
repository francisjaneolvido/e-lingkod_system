'use client';
import Link from 'next/link';
import '@/styles/visual-reference.css';
import { useEffect, useRef, useState } from 'react';
import { AGE_GROUPS, EDUCATION_LEVELS, EDUCATION_LABELS, EMPLOYMENT_STATUSES, EMPLOYMENT_LABELS } from '@/features/community/domain';
import { INDUSTRIES, OPERATING_STATUSES } from '@/features/establishments/domain';
import { POPULATIONS, parseAnalyticsFilters, type AnalyticsResult, type AnalyticsGroup } from '../domain';
import { AnalyticsBreakdown } from './analytics-breakdown';
import { AnalyticsOverview } from './analytics-overview';
import {ChartTable} from '@/components/insights/overview-chart';
import {overviewBreakdowns} from './overview-model';
const control='mt-2 min-h-11 w-full min-w-0 rounded-xl border border-border bg-card px-3 py-2 text-sm text-foreground';
const button='inline-flex min-h-11 items-center justify-center rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-40';
const panel='reference-detail-panel';
const populationLabels={INDIVIDUAL:'Individual respondents',ESTABLISHMENT:'Establishment annual records',IMPORTS:'Mapped source observations',SPES:'Anonymous SPES source observations'};
const filterLabels:Record<string,string>={barangay:'Barangay',employment:'Employment',age:'Age group',education:'Education',sex:'Reported sex',skill:'Skill',overseas:'Overseas experience',industry:'Industry',operatingStatus:'Operating condition',source:'Source',dataset:'Dataset'};
function filterValue(key:string,value:string){if(['skill','sex','source','barangay'].includes(key))return value;return value==='__UNKNOWN__'?'Unknown / not recorded':key==='employment'?(EMPLOYMENT_LABELS[value as keyof typeof EMPLOYMENT_LABELS]??value):key==='education'?(EDUCATION_LABELS[value as keyof typeof EDUCATION_LABELS]??value):key==='industry'?(INDUSTRIES.find(i=>i.value===value)?.label??value):value.replaceAll('_',' ');}
type Data=AnalyticsResult & {availableBarangays:string[]};
type Topic='Employment'|'Demographics'|'Skills & training'|'Livelihood & social'|'Establishments'|'Source observations'|'Methodology';
const demographic=new Set(['barangay','educationLevel','ageGroup','sex','civilStatus','pwdStatus','currentlyStudying']);
const skills=new Set(['skills','qualifications','completedTraining','trainingInterest','trainingCategories','trainingPrograms','trainingReason','trainingBarriers']);
const employment=new Set(['employmentStatus','occupation','preferredOccupations','industry','workArrangement','workLocationScope','employmentLength','workRelatedToEducation','interestedNewWork','preferredIndustry','preferredWorkArrangement','preferredWorkLocation','willingOutsideMunicipality']);
function belongs(key:string,topic:Topic){return topic==='Demographics'?demographic.has(key):topic==='Skills & training'?skills.has(key):topic==='Employment'?employment.has(key)||key==='employmentBarriers':topic==='Livelihood & social'?!demographic.has(key)&&!skills.has(key)&&!employment.has(key)&&key!=='employmentBarriers':true;}
const serialize=(value:Record<string,string>)=>new URLSearchParams(Object.entries(value).filter(([,v])=>v).sort(([a],[b])=>a.localeCompare(b))).toString();
function FilterOptions({name,value,values,labels,onChange}:{name:string;value:string;values:readonly string[];labels?:Record<string,string>;onChange:(value:string)=>void}){return <label className="min-w-0 text-sm font-medium text-foreground">{name}<select className={control} value={value} onChange={e=>onChange(e.target.value)}><option value="">All recorded / unknown</option>{values.map(v=><option key={v} value={v}>{labels?.[v]??v.replaceAll('_',' ')}</option>)}<option value="__UNKNOWN__">Unknown / not recorded only</option></select></label>;}
function Group({group,topic}:{group:AnalyticsGroup;topic:Topic}) {
  return <section className={panel}>
    <div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-wide text-foreground">Separate source population</p><h2 className="mt-2 break-words text-xl font-bold text-foreground">{group.source}</h2></div><p className="rounded-2xl bg-muted px-4 py-3 text-foreground"><strong className="text-2xl tabular-nums">{group.count}</strong> <span className="text-sm">{group.unit}</span></p></div>
    {group.count===0&&<p role="status" className="mt-5 rounded-2xl bg-muted p-4 text-sm leading-6 text-muted-foreground">No eligible {group.unit} for the applied filters. Unknown values remain unknown; no population estimate is substituted.</p>}
    {group.measures.length>0&&<div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{group.measures.map(m=><article key={m.key} className="rounded-2xl border border-border p-4"><h3 className="text-sm font-semibold text-foreground">{m.title}</h3><p className="mt-2 text-xl font-bold tabular-nums text-foreground">{m.key.endsWith('Workers')?(m.sum??'Unknown'):(m.mean??'Unknown')}</p><p className="mt-2 text-xs leading-5 text-muted-foreground">{m.key.endsWith('Workers')?'Sum of known values':'Mean of known values'} · known {m.known} of {m.denominator}; unknown {m.unknown}.</p></article>)}</div>}
    {topic==='Employment'&&group.considerations.length>0&&<aside className="mt-6 rounded-2xl border border-border bg-card p-5"><h3 className="font-bold text-foreground">Planning considerations</h3><p className="mt-2 text-sm leading-6 text-muted-foreground">Reported associations, not proven causes or service commitments. Discuss these signals with participants before choosing interventions.</p><ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-muted-foreground">{group.considerations.map(c=><li key={c.barrier}><strong>{c.barrier} ({c.count})</strong>: {c.suggestion}</li>)}</ul></aside>}
    <div className="reference-detail-categories">{group.breakdowns.filter(d=>belongs(d.key,topic)).map(d=><AnalyticsBreakdown key={d.key} data={d}/>)}</div>
  </section>;
}
export function WorkforceAnalytics({currentYear,initialQuery=''}:{currentYear:number;initialQuery?:string}) {
  const defaults={population:'INDIVIDUAL',period:'CURRENT',year:String(currentYear)};
  const initial=()=>{try{return Object.fromEntries(Object.entries(parseAnalyticsFilters(new URLSearchParams(initialQuery),currentYear)).map(([k,v])=>[k,String(v)]));}catch{return defaults;}};
  const [draft,setDraft]=useState<Record<string,string>>(initial),[query,setQuery]=useState(initialQuery||serialize(defaults)),[reload,setReload]=useState(0);
  const requestSequence=useRef(0),historyMode=useRef<'push'|'replace'|'none'>('replace');
  const [data,setData]=useState<Data|null>(null),[busy,setBusy]=useState(true),[error,setError]=useState(''),[topic,setTopic]=useState<Topic>('Employment');
  const [barangays,setBarangays]=useState<string[]>([]);
  useEffect(()=>{
    const abort=new AbortController(),version=requestSequence.current,mode=historyMode.current;let active=true;
    const isCurrent=()=>active&&!abort.signal.aborted&&version===requestSequence.current;
    fetch('/api/admin/census/analytics?'+query,{cache:'no-store',signal:abort.signal}).then(async response=>{
      const payload=await response.json();if(!isCurrent())return;
      if(!response.ok){if(response.status===401||response.status===403)setData(null);throw Error(payload.error||'Unable to load protected analytics.');}
      if(isCurrent()){
        const applied=Object.fromEntries(Object.entries(payload.filters).map(([k,v])=>[k,String(v)])),next=serialize(applied);
        if(mode!=='none'&&serialize(Object.fromEntries(new URLSearchParams(window.location.search)))!==next){
          const url=window.location.pathname+'?'+next;
          if(mode==='replace')window.history.replaceState(null,'',url);else window.history.pushState(null,'',url);
        }
        setData(payload);setBarangays(payload.availableBarangays);
        setTopic(payload.filters.population==='INDIVIDUAL'?'Employment':payload.filters.population==='ESTABLISHMENT'?'Establishments':'Source observations');
      }
    }).catch(e=>{if(isCurrent())setError(e instanceof Error?e.message:'Unable to load protected analytics.');}).finally(()=>{if(isCurrent())setBusy(false);});
    return ()=>{active=false;abort.abort();};
  },[query,reload]);
  useEffect(()=>{
    function restoreView(){
      requestSequence.current+=1;historyMode.current='none';setError('');
      try{
        const parsed=parseAnalyticsFilters(new URLSearchParams(window.location.search),currentYear);
        const next=Object.fromEntries(Object.entries(parsed).map(([k,v])=>[k,String(v)]));
        setDraft(next);setQuery(serialize(next));setBusy(true);setReload(n=>n+1);
      }catch(failure){setData(null);setBusy(false);setError(failure instanceof Error?failure.message:'Invalid shared analytics view.');}
    }
    window.addEventListener('popstate',restoreView);
    return ()=>window.removeEventListener('popstate',restoreView);
  },[currentYear]);
  function request(nextQuery=query){requestSequence.current+=1;historyMode.current='push';setBusy(true);setError('');setQuery(nextQuery);setReload(n=>n+1);}
  function change(next:Record<string,string>){setDraft(next);}
  function apply(next=draft){try{
    const parsed=parseAnalyticsFilters(next,currentYear),canonical=Object.fromEntries(Object.entries(parsed).map(([key,value])=>[key,String(value)]));
    setDraft(canonical);request(serialize(canonical));
  }catch(failure){setError(failure instanceof Error?failure.message:'Invalid filter');}}
  function removeFilter(key:string){
    if(!data)return;
    const next=Object.fromEntries(Object.entries(data.filters).map(([k,v])=>[k,String(v)]));delete next[key];apply(next);
  }
  const set=(key:string,value:string)=>change({...draft,[key]:value});
  const selected=draft.population;
  const personal=selected==='INDIVIDUAL',mapped=selected==='IMPORTS',spes=selected==='SPES',organization=selected==='ESTABLISHMENT';
  const topics:Topic[]=data?.filters.population==='INDIVIDUAL'?['Employment','Demographics','Skills & training','Livelihood & social','Methodology']:data?.filters.population==='ESTABLISHMENT'?['Establishments','Methodology']:['Source observations','Methodology'];
  const exportQuery=data?new URLSearchParams(Object.entries(data.filters).map(([key,value])=>[key,String(value)])).toString():'';
  let canonicalDraft=draft;try{canonicalDraft=Object.fromEntries(Object.entries(parseAnalyticsFilters(draft,currentYear)).map(([k,v])=>[k,String(v)]));}catch{/* Invalid edits remain unapplied. */}
  const changed=serialize(canonicalDraft)!==(data?serialize(Object.fromEntries(Object.entries(data.filters).map(([k,v])=>[k,String(v)]))):query);
  return <div className="elb-analytics visual-analytics" data-view-state={busy?'loading':error?'error':changed?'draft':'current'}>
    <header className="elb-analytics-header"><div><h1>Workforce analytics</h1></div><a href="#analytics-filters" className="elb-button">Refine this view</a></header>
    {busy&&!data&&<p role="status" className="analytics-view-status">Loading the protected view…</p>}
    {error&&<div role="alert" className={panel}><p className="font-semibold text-destructive">{error}</p><button type="button" className={button+' mt-4'} onClick={()=>request(query)}>Retry analytics</button></div>}
    {data&&<section aria-label="Analytics overview" aria-busy={busy} className="space-y-6">
      <div className="elb-applied-view"><div className="analytics-quick-view"><label>Change barangay<select aria-label="Overview barangay" value={draft.barangay||''} onChange={event=>set('barangay',event.target.value)}><option value="">All authorized barangays</option>{barangays.map(barangay=><option key={barangay} value={barangay}>{barangay}</option>)}</select></label><button type="button" className="elb-button elb-button-primary" onClick={()=>apply()} disabled={busy||!changed}>Apply view</button><button type="button" className="analytics-reset" onClick={()=>apply(defaults)}>Reset all filters</button></div><h2 className="sr-only">Applied annual view</h2><p className="elb-applied-summary"><strong>{populationLabels[data.filters.population]}</strong><span>Survey year {data.filters.year}</span><span>{data.filters.barangay||'All authorized barangays'}</span></p><div className="elb-filter-chips" role="group" aria-label="Applied filters">{Object.entries(data.filters).filter(([key,value])=>value!==undefined&&value!==''&&!(['population','year','period','barangay'].includes(key))).map(([key,value])=><button key={key} type="button" onClick={()=>removeFilter(key)} aria-label={'Remove '+(filterLabels[key]??key)+' filter'}>{filterLabels[key]??key}: {filterValue(key,String(value))} <span aria-hidden="true">×</span></button>)}</div><div className="analytics-view-actions">{data.filters.barangay&&<button type="button" className="elb-button" onClick={()=>removeFilter('barangay')}>Clear barangay</button>}</div></div>
      {(busy||error||changed)&&<p role="status" className="analytics-view-status">{busy?'Updating requested view. Previous results are shown below until it succeeds.':error?'Request failed. Results below belong to the previous successful view; exports are unavailable.':'Unapplied changes. Results below still describe the applied view.'}</p>}{data.groups.length?data.groups.map(group=><AnalyticsOverview key={JSON.stringify(data.filters)+group.source} group={group} population={data.filters.population} updating={busy||changed||!!error} onFilter={key=>apply({...Object.fromEntries(Object.entries(data.filters).map(([k,v])=>[k,String(v)])),barangay:key})}/>):<p role="status" className={panel}>No eligible source observations for the applied filters. No unique-person total is inferred.</p>}
    </section>}
    <section id="analytics-filters" className="elb-analytics-filters scroll-mt-24"><h2 className="text-lg font-semibold text-foreground">Refine the annual view</h2><p className="elb-help mt-2">Reset all filters returns to individual respondents, the current Manila year and all authorized barangays, with no optional filters.</p><form aria-label="Analytics filters" className="mt-5 space-y-5" onSubmit={e=>{e.preventDefault();apply();}}>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <label className="text-sm font-medium text-foreground">Population<select className={control} value={selected} onChange={e=>change({population:e.target.value,period:draft.period,year:draft.year,barangay:draft.barangay||'',...(e.target.value==='SPES'?{dataset:'REAL'}:{})})}>{POPULATIONS.map(p=><option key={p} value={p}>{populationLabels[p]}</option>)}</select></label>
        <label className="text-sm font-medium text-foreground">Period<select className={control} value={draft.period} onChange={e=>change({...draft,period:e.target.value,...(e.target.value==='CURRENT'?{year:String(currentYear)}:{})})}><option value="CURRENT">Current Manila calendar year ({currentYear})</option><option value="YEAR">Selected survey year / historical annual view</option></select></label>
        <label className="text-sm font-medium text-foreground">Survey year<input required type="number" min="2020" max={currentYear+1} disabled={draft.period==='CURRENT'} className={control} value={draft.year} onChange={e=>set('year',e.target.value)}/></label>
        <label className="text-sm font-medium text-foreground">Barangay<select className={control} value={draft.barangay||''} onChange={e=>set('barangay',e.target.value)}><option value="">All authorized barangays</option>{barangays.map(b=><option key={b} value={b}>{b}</option>)}</select></label>
        {(personal||mapped)&&<FilterOptions name="Employment status" value={draft.employment||''} values={EMPLOYMENT_STATUSES} labels={EMPLOYMENT_LABELS} onChange={value=>set('employment',value)}/>}
        {(personal||mapped)&&<FilterOptions name="Age group" value={draft.age||''} values={AGE_GROUPS}  onChange={value=>set('age',value)}/>}
        {(personal||mapped||spes)&&<FilterOptions name="Education" value={draft.education||''} values={EDUCATION_LEVELS} labels={EDUCATION_LABELS} onChange={value=>set('education',value)}/>}
        {(personal||mapped||spes)&&<label className="text-sm font-medium text-foreground">Reported skill (exact text)<input maxLength={80} className={control} value={draft.skill||''} onChange={e=>set('skill',e.target.value)}/></label>}
        {personal&&<label className="text-sm font-medium text-foreground">Reported sex (exact text)<input maxLength={30} className={control} value={draft.sex||''} onChange={e=>set('sex',e.target.value)}/></label>}
        {personal&&<FilterOptions name="Overseas experience" value={draft.overseas||''} values={['CURRENT','FORMER','NEVER']}  onChange={value=>set('overseas',value)}/>}
        {organization&&<FilterOptions name="Line of business / industry" value={draft.industry||''} values={INDUSTRIES.map(i=>i.value)} labels={Object.fromEntries(INDUSTRIES.map(i=>[i.value,i.label]))} onChange={value=>set('industry',value)}/>}
        {organization&&<FilterOptions name="Operating condition" value={draft.operatingStatus||''} values={OPERATING_STATUSES}  onChange={value=>set('operatingStatus',value)}/>}
        {(mapped||spes)&&<label className="text-sm font-medium text-foreground">Dataset source (optional)<input maxLength={180} className={control} value={draft.source||''} onChange={e=>set('source',e.target.value)}/></label>}
        {spes&&<label className="text-sm font-medium text-foreground">SPES dataset kind<select className={control} value={draft.dataset||'REAL'} onChange={e=>set('dataset',e.target.value)}><option value="REAL">Authorized real data</option><option value="DEMO">Explicitly synthetic demo data</option><option value="ALL">Separate source groups for both kinds</option></select></label>}
      </div>
      <p className="text-xs leading-6">Only applicable filters are shown. Changing populations clears incompatible filters. Activity dates never substitute for survey years. Optional matching preferences do not determine statistical participation.</p>
      <div className="flex flex-wrap items-center gap-3"><button disabled={busy&&serialize(canonicalDraft)===query} className={button}>Apply analytics filters</button><button type="button" className="elb-button" onClick={()=>{change(defaults);apply(defaults);}}>Reset all filters</button>{changed&&!error&&<p className="text-sm" role="status">Changes not applied. Select Apply analytics filters.</p>}</div>
    </form></section>
    {data&&!busy&&!error&&!changed&&<>
      <section className={panel}><nav aria-label="Census workspace" className="mt-5 flex flex-wrap gap-3"><Link className={button} href="/admin/census">Protected records</Link><Link className={button} href="/admin/census/imports">Mapped imports</Link><Link className={button} href="/admin/jobs/legacy-spes">Historical SPES imports</Link></nav><h2 className="mt-4 font-bold text-foreground">Detailed breakdowns &amp; export</h2><p className="my-3 text-sm">The CSV uses the exact applied population, year and filters shown above.</p><a className={button} href={'/api/admin/census/analytics/export?'+exportQuery} download>Export applied aggregates (CSV)</a></section>
      <section className={panel} data-overview-tables=""><h2 className="text-lg font-bold text-foreground">Overview data tables</h2>{data.groups.map(group=><div key={group.source} className="mt-4"><h3 className="font-semibold text-foreground">{group.source}</h3>{overviewBreakdowns(group,data.filters.population).map(d=><ChartTable key={d.key} title={d.title} items={d.items}/>)}</div>)}</section>
      <nav aria-label="Analytics topics" className="flex flex-wrap gap-2">{topics.map(t=><button key={t} type="button" aria-pressed={topic===t} onClick={()=>setTopic(t)} className={'min-h-11 rounded-xl border px-4 py-2 text-sm font-semibold '+(topic===t?'border-border bg-primary text-white':'border-border bg-card text-foreground')}>{t}</button>)}</nav>
      {topic==='Methodology'?<section className={panel}><h2 className="text-xl font-bold text-foreground">Coverage, denominators &amp; exclusions</h2><ul className="mt-5 list-disc space-y-3 pl-5 text-sm leading-7">{data.methodology.map(note=><li key={note}>{note}</li>)}</ul><h3 className="mt-6 font-semibold text-foreground">Excluded records within applicable source context</h3>{Object.keys(data.excluded).length?<dl className="mt-3 grid gap-3 sm:grid-cols-2">{Object.entries(data.excluded).map(([key,count])=><div key={key} className="rounded-xl border border-border p-3"><dt className="break-words text-sm">{key.replace(/([A-Z])/g,' $1')}</dt><dd className="mt-2 font-bold tabular-nums text-foreground">{count}</dd></div>)}</dl>:<p className="mt-3 text-sm">No counted source-context exclusions. Draft workspaces are never queried as submitted statistics.</p>}</section>:data.groups.length?data.groups.map(group=><Group key={JSON.stringify(data.filters)+group.source} group={group} topic={topic}/>):<p role="status" className={panel}>No eligible source observations for the applied year and filters. No respondent total is inferred from other sources.</p>}
      <section className={panel}><h2 className="text-lg font-bold text-foreground">Designated survey-assistance staff</h2><p className="mt-3 text-sm leading-6">Current Admin-maintained roster, separate from survey-year respondents and workforce. This does not imply real-time availability or grant CENSUS access.</p><div className="elb-table-scroll reference-roster"><table><caption>Current assistance roster for all listed barangays</caption><thead><tr><th scope="col">Barangay</th><th scope="col">Designated staff</th><th scope="col">Last maintained (PHT)</th></tr></thead><tbody>{data.rosters.map(r=><tr key={r.barangay}><th scope="row">{r.barangay}</th><td>{r.count===null?'Not configured / requires confirmation':r.count}</td><td>{typeof r.confirmedAt==='string'?new Date(r.confirmedAt).toLocaleString('en-PH',{timeZone:'Asia/Manila'}):'Not recorded'}</td></tr>)}</tbody></table></div></section>
    </>}
  </div>;
}
