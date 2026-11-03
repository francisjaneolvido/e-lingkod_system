'use client';
import {useId,useState,type CSSProperties} from 'react';
import {distributionRows,donutLabels,svgCoordinate,type ChartItem} from './chart-model';

export function DistributionChart({title,items,denominator,description,multi=false}:{title:string;items:readonly ChartItem[];denominator:number;description:string;multi?:boolean}) {
 const id=useId(),[selected,setSelected]=useState<string|null>(null),[hovered,setHovered]=useState<string|null>(null);
 const data=distributionRows(items,denominator,multi),active=data?.rows.find(r=>r.key===(hovered??selected));
 const labels=data?donutLabels(data.rows):[],minY=Math.min(0,...labels.map(l=>l.y-12)),maxY=Math.max(200,...labels.map(l=>l.y+12));
 return <section className="elb-chart elb-chart-compact elb-distribution" data-chart-type="donut" aria-labelledby={id}>
   <div className="elb-chart-heading"><h3 id={id}>{title}</h3></div><p className="elb-chart-description">{description} Denominator: {denominator}.</p>
   {data?<><div className="elb-donut-layout"><div className="elb-donut-visual"><svg viewBox={`0 ${minY} 200 ${maxY-minY}`} role="img" aria-label={`${title}: ${data.total} records; numbered categories in the adjacent legend`}>
     {data.rows.filter(r=>r.count>0).map(row=><circle key={row.key} cx="100" cy="100" r="60" pathLength="1" fill="none" stroke={row.unknown?'var(--chart-unknown)':`var(--chart-${row.series})`} strokeWidth={active?.key===row.key?25:22} strokeDasharray={`${row.fraction} ${1-row.fraction}`} strokeDashoffset={-row.start} transform="rotate(-90 100 100)" className="elb-donut-segment"><title>{`${row.label}: ${row.count} (${row.percent}%)`}</title></circle>)}
     {labels.map(label=><g key={label.key} aria-hidden="true"><path d={`M ${label.anchorX} ${label.anchorY} L ${label.side==='left'?17:183} ${label.y}`} fill="none" stroke="var(--foreground)" strokeWidth="1"/><text x={label.side==='left'?10:190} y={label.y+4} textAnchor="middle" className="elb-donut-number">{label.number}</text></g>)}
     {data.rows.filter(r=>r.count>0).map(row=>{const a=row.start*Math.PI*2-Math.PI/2;return <line key={row.key} x1={svgCoordinate(100+Math.cos(a)*48)} y1={svgCoordinate(100+Math.sin(a)*48)} x2={svgCoordinate(100+Math.cos(a)*72)} y2={svgCoordinate(100+Math.sin(a)*72)} stroke="var(--card)" strokeWidth="2" aria-hidden="true"/>;})}
     <text x="100" y="99" textAnchor="middle" className="elb-donut-total">{data.total.toLocaleString()}</text><text x="100" y="115" textAnchor="middle" className="elb-donut-unit">records</text>
   </svg></div><ul className="elb-donut-legend" aria-label={title+' categories'}>{data.rows.map((row,index)=><li key={row.key}><button type="button" className="elb-donut-key" aria-pressed={selected===row.key} aria-describedby={id+'-detail'} title={`${row.label}: ${row.count} (${row.percent}%); denominator ${denominator}`} style={{'--series':row.unknown?'var(--chart-unknown)':`var(--chart-${row.series})`} as CSSProperties} onMouseEnter={()=>setHovered(row.key)} onMouseLeave={()=>setHovered(null)} onFocus={()=>setHovered(row.key)} onBlur={()=>setHovered(null)} onClick={()=>setSelected(selected===row.key?null:row.key)}><span className="elb-donut-marker" aria-hidden="true">{index+1}</span><span>{row.label}</span><strong>{row.count.toLocaleString()} <small>· {row.percent}%</small></strong></button></li>)}</ul></div>
   <p id={id+'-detail'} role="status" className="elb-chart-selection">{active?`${active.label}: ${active.count} of ${denominator} (${active.percent}%). Highlight only; filters unchanged.`:'All categories shown, including unknowns. Highlight only; filters unchanged.'}</p></>:<p className="elb-chart-empty">No complete part-to-whole distribution available in this authorized view.</p>}
 </section>;
}
