'use client';

import {useEffect,useId,useRef,useState,type KeyboardEvent} from 'react';
import {ArrowUpRight,MapPinned,Table2,X} from 'lucide-react';
import geometry from '@/features/geography/los-banos.geometry.json';
import {LOS_BANOS_REGIONS} from '@/features/geography/los-banos';
import type {GeographicMetric,GeographicSummary} from '../geographic-domain';
import {geometryPath} from './map-model';

const paths=geometry.features.map(feature=>({code:feature.properties.code,name:feature.properties.name,path:geometryPath(feature.geometry,geometry.bbox)}));
const number=(value:number|null|undefined)=>value==null?'Not recorded':value.toLocaleString('en-PH');

/** Receives only the server-authorized, applied source-group aggregates. */
export function BarangayMap({summary,metric,slot,onFilter,updating=false,atlas=false}:{summary:GeographicSummary;metric:GeographicMetric;slot:3|6;onFilter?:(key:string)=>void;updating?:boolean;atlas?:boolean}){
 const title=atlas?(metric.id==='eligible-records'?(summary.unit==='establishments'?'Eligible establishments':summary.unit==='respondents'?'Eligible respondents':'Eligible observations'):metric.id==='reported-total-workers'?'Reported workforce':metric.id==='recorded-program-interests'?'Recorded interests':'Training interest · Yes'):metric.title;
 const available=summary.availableRegions??summary.cells.filter(cell=>cell.filterKey).map(cell=>({code:cell.code,filterKey:cell.filterKey!}));
 const navigationCodes=[...new Set(available.map(region=>region.code))];
 const permitted=(code:string)=>available.find(region=>region.code===code&&region.filterKey===summary.filters.barangay)??available.find(region=>region.code===code);
 const id=useId(),dialog=useRef<HTMLDialogElement>(null),heading=useRef<HTMLHeadingElement>(null);
 const trigger=useRef<HTMLElement|SVGElement|null>(null);
 const [table,setTable]=useState(false),[selected,setSelected]=useState<string|null>(null),[focused,setFocused]=useState(navigationCodes[0]??'');
 const [hovered,setHovered]=useState<string|null>(null);
 const cell=summary.cells.find(item=>item.code===selected);
 const selectedRegion=LOS_BANOS_REGIONS.find(region=>region.code===selected),selectedPermission=selected?permitted(selected):undefined;
 const hoveredRegion=LOS_BANOS_REGIONS.find(region=>region.code===hovered);
 const highlighted=summary.cells.find(item=>item.code===(hovered??selected));
 const value=cell?.values[metric.id];
 useEffect(()=>{
  const node=dialog.current;
  if(selected&&node&&!node.open){node.showModal();heading.current?.focus();}
 },[selected]);
 useEffect(()=>{if(updating)dialog.current?.close();},[updating]);
 function open(code:string){
  if(updating||!permitted(code))return;
  trigger.current=document.activeElement as HTMLElement|SVGElement;
  setSelected(code);
 }
 function keyboard(event:KeyboardEvent<SVGPathElement>,code:string){
  if(event.key==='Enter'||event.key===' '){event.preventDefault();open(code);return;}
  const keys=['ArrowRight','ArrowDown','ArrowLeft','ArrowUp','Home','End'];
  if(!keys.includes(event.key))return;
  event.preventDefault();const codes=navigationCodes,index=codes.indexOf(code);
  const next=event.key==='Home'?0:event.key==='End'?codes.length-1:(index+(['ArrowLeft','ArrowUp'].includes(event.key)?-1:1)+codes.length)%codes.length;
  setFocused(codes[next]);event.currentTarget.ownerSVGElement?.querySelector<SVGPathElement>(`[data-region-code="${codes[next]}"]`)?.focus();
 }
 function fill(code:string){
  const region=summary.cells.find(item=>item.code===code),amount=region?.values[metric.id]?.value;
  if(!region)return permitted(code)?`url(#${id}-notview)`:`url(#${id}-outside)`;
  if(amount==null)return `url(#${id}-missing)`;
  if(amount===0)return 'var(--map-zero)';
  const index=metric.legend.bins.findIndex(bin=>amount>=bin.min&&amount<=bin.max);
  return `var(--map-heat-${Math.max(1,Math.round((index+1)*5/Math.max(1,metric.legend.bins.length)))})`;
 }
 return <section className={"elb-map"+(atlas?" reference-map":"")} data-barangay-map="" data-map-slot={slot} aria-labelledby={`${id}-title`} aria-busy={updating}>
  <header className="elb-map-heading"><div>{!atlas&&<span className="elb-context-label">Los Baños · {summary.filters.year}</span>}<h3 id={`${id}-title`}>{title}</h3></div><div className="elb-segmented" role="group" aria-label={`${metric.title} presentation`}><button type="button" aria-pressed={!table} onClick={()=>setTable(false)}><MapPinned size={16} aria-hidden="true"/><span>Map</span></button><button type="button" aria-pressed={table} onClick={()=>setTable(true)}><Table2 size={16} aria-hidden="true"/><span>Table</span></button></div></header>
  <p className="elb-map-context">{metric.unit} · {summary.scope==='restricted'?'Authorized barangays':'14 barangays'}</p>
  <div className={atlas?"reference-map-body":undefined}>
  {table?<div className="elb-map-table elb-table-scroll"><table><caption>All 14 barangays. Values reflect the applied, authorized source only.</caption><thead><tr><th scope="col">Barangay</th><th scope="col">{metric.unit}</th><th scope="col">Details</th></tr></thead><tbody>{LOS_BANOS_REGIONS.map(region=>{
   const record=summary.cells.find(item=>item.code===region.code),permission=permitted(region.code),amount=record?.values[metric.id]?.value;
   return <tr key={region.code}><th scope="row">{region.name}</th><td>{record?number(amount):permission?'Not in applied view':'Outside scope'}</td><td>{permission?<button type="button" disabled={updating} onClick={()=>open(region.code)} aria-label={`View ${region.name} details`}>View</button>:<span aria-label="Details unavailable outside scope">—</span>}</td></tr>;
  })}</tbody></table></div>:<div className="elb-map-canvas"><svg viewBox="0 0 360 300" role="group" aria-label={`${metric.title} by barangay. Arrow keys move between authorized regions; Enter opens details.`}>
   <defs><pattern id={`${id}-notview`} width="7" height="7" patternUnits="userSpaceOnUse"><rect width="7" height="7" fill="var(--muted)"/><path d="M3 0V7" stroke="var(--map-pattern)" strokeWidth=".7"/></pattern><pattern id={`${id}-missing`} width="7" height="7" patternUnits="userSpaceOnUse"><rect width="7" height="7" fill="var(--map-zero)"/><path d="M-1 1L1-1M0 7L7 0M6 8L8 6" stroke="var(--map-pattern)" strokeWidth="1.4"/></pattern><pattern id={`${id}-outside`} width="6" height="6" patternUnits="userSpaceOnUse"><rect width="6" height="6" fill="var(--muted)"/><circle cx="3" cy="3" r=".8" fill="var(--map-pattern)"/></pattern></defs>
   {paths.map(region=>{
    const record=summary.cells.find(item=>item.code===region.code),permission=permitted(region.code),amount=record?.values[metric.id]?.value,label=`${region.name}: ${record?number(amount)+' '+metric.unit :permission?'not in applied view':'outside permission scope'}`;
    return <path key={region.code} d={region.path} fill={fill(region.code)} className="elb-map-region" data-region-code={region.code} data-state={!record?(permission?'not-in-view':'outside'):amount==null?'missing':amount===0?'zero':'value'} role={permission?'button':undefined} tabIndex={permission&&!updating?(focused===region.code?0:-1):undefined} aria-label={label} aria-haspopup={permission?'dialog':undefined} aria-disabled={permission&&updating||undefined} onKeyDown={permission?event=>keyboard(event,region.code):undefined} onClick={permission?()=>open(region.code):undefined} onMouseEnter={()=>setHovered(region.code)} onMouseLeave={()=>setHovered(null)} onFocus={()=>{setFocused(region.code);setHovered(region.code);}} onBlur={()=>setHovered(null)}><title>{label}</title></path>;
   })}<g className="elb-map-boundaries" aria-hidden="true">{paths.map(region=><path key={region.code+'-halo'} d={region.path} className="elb-map-edge-halo"/>)}{paths.map(region=><path key={region.code} d={region.path} className="elb-map-edge"/>)}</g><g className="elb-map-north" aria-hidden="true"><text x="330" y="25">N</text><path d="M330 34V58M325 40L330 34L335 40"/></g>
  </svg><p className="elb-map-readout" aria-live="polite">{highlighted?<><strong>{highlighted.barangay}</strong> · {number(highlighted.values[metric.id]?.value)} {metric.unit}</>:hoveredRegion&&permitted(hoveredRegion.code)?hoveredRegion.name+' · not in applied view. Select for navigation.':atlas?'Select a region for details.':'Select a barangay for details. Filters stay unchanged.'}</p></div>}
  <div className="elb-map-legend" aria-label={`${metric.title} colour scale`}>{!atlas&&<span className="elb-context-label">{metric.unit}</span>}<div className="elb-map-scale">{metric.legend.bins.map((bin,index)=><span key={bin.min}><i style={{background:`var(--map-heat-${Math.max(1,Math.round((index+1)*5/metric.legend.bins.length))})`}}/>{bin.min===bin.max?bin.min:`${bin.min}–${bin.max}`}</span>)}{!metric.legend.bins.length&&<span>{metric.legend.maximum===null?'No recorded values':'No positive values'}</span>}</div><div className="elb-map-states"><span><i className="elb-map-key-zero"/>Zero</span><span><i className="elb-map-key-missing"/>Not recorded</span><span><i className="elb-map-key-outside"/>Outside scope</span>{summary.filters.barangay&&<span><i className="elb-map-key-notview"/>Not in view</span>}</div></div>
  </div>
  {!atlas&&<details className="elb-map-attribution"><summary>{atlas?"Map guide & boundary source":"Boundary source"}</summary><p className="elb-map-note">Use Table to find small regions.</p><p>OCHA COD-AB v03 · NAMRIA / PSA · indicative boundaries, valid-on 13 February 2025 · CC BY 3.0 IGO. <a href="https://data.source.coop/hdx/cod-ab/original/phl/latest/phl_admin4/collection.json" target="_blank" rel="noreferrer">Source and licence</a>. These boundaries do not establish legal eligibility.</p></details>}
  {summary.unmappedEligible>0&&<p className="elb-map-note">{summary.unmappedEligible} eligible {summary.unit} have unmapped geography; retained in source totals.</p>}
  <dialog ref={dialog} className="elb-detail-drawer" aria-label="Barangay details" onClose={()=>{setSelected(null);const target=trigger.current;requestAnimationFrame(()=>{if(target?.isConnected)target.focus();});}} onClick={event=>{if(event.target===event.currentTarget)dialog.current?.close();}}>
   <header><div><p className="elb-context-label">Barangay details</p><h2 ref={heading} tabIndex={-1}>{cell?.barangay??selectedRegion?.name}</h2></div><button type="button" className="elb-icon-button" aria-label="Close barangay details" onClick={()=>dialog.current?.close()}><X size={22} aria-hidden="true"/></button></header>
   {cell&&<div className="elb-drawer-body"><p>{summary.source} · {summary.filters.year}<br/>{summary.unit}; applied filters and authorized geography.</p><div className="elb-detail-value"><span>{metric.title}</span><strong>{number(value?.value)}</strong><span>{metric.unit}</span></div><dl className="elb-detail-facts"><div><dt>Eligible {summary.unit} in this barangay</dt><dd>{cell.eligible.toLocaleString('en-PH')}</dd></div><div><dt>Known metric inputs</dt><dd>{value?.known??0}</dd></div><div><dt>Missing / not recorded</dt><dd>{value?.missing??0}</dd></div><div><dt>Context denominator</dt><dd>{value?.denominator??0}</dd></div></dl><p className="elb-help">{metric.denominatorLabel}. Zero is known; missing is not zero. Counts describe this source, not the entire municipal population.</p>
    {cell.trainingInterest&&<section className="elb-drawer-section"><h3>Reported training interest</h3><dl className="elb-detail-facts">{Object.entries(cell.trainingInterest).map(([answer,count])=><div key={answer}><dt>{answer.replaceAll('_',' ')}</dt><dd>{count}</dd></div>)}</dl></section>}
    <p className="elb-help">{summary.scopeRationale} Aggregate observations only; no individual records are shown.</p>
    {cell.filterKey&&cell.filterKey!==cell.barangay&&<p className="elb-help">This filter uses the source name “{cell.filterKey}”. Records with other historical names remain outside this exact filter.</p>}
    {cell.filterKey&&onFilter&&<button type="button" className="elb-button elb-button-primary" disabled={updating} onClick={()=>{dialog.current?.close();onFilter(cell.filterKey!);}}>Apply {cell.filterKey} filter <ArrowUpRight size={18} aria-hidden="true"/></button>}
   </div>}
   {!cell&&selectedPermission&&selectedRegion&&<div className="elb-drawer-body"><p>{summary.source} · {summary.filters.year}</p><h3>Not in the applied view</h3><p>No counts for {selectedRegion.name} were fetched. Apply its exact authorized geographic filter to view this source there.</p><p className="elb-help">Opening or closing this panel leaves the current results and filters unchanged.</p>{onFilter&&<button type="button" className="elb-button elb-button-primary" disabled={updating} onClick={()=>{dialog.current?.close();onFilter(selectedPermission.filterKey);}}>Apply {selectedPermission.filterKey} filter <ArrowUpRight size={18} aria-hidden="true"/></button>}</div>}
  </dialog>
 </section>;
}
