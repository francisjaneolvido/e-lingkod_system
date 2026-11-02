'use client';
import { useId, useState } from 'react';
import { chartRows, type ChartItem, type ChartSort } from './chart-model';

export function OverviewChart({ title, items, description, compact=false, denominator }: { title: string; items: readonly ChartItem[]; description: string; compact?:boolean; denominator?:number }) {
  const id = useId();
  const [sort, setSort] = useState<ChartSort>(compact?'count':'source');
  const [hovered,setHovered]=useState<string|null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [limit, setLimit] = useState(compact?5:12);
  const rows = chartRows(items, sort);
  const active = rows.find(row => row.key === (hovered??selected));
  return <section className={"elb-chart"+(compact?" elb-chart-compact":"")} data-chart-type="bar" aria-labelledby={id}>
    <div className="elb-chart-heading"><h3 id={id}>{title}</h3>{!compact&&<div><label htmlFor={id + '-sort'}>Sort chart</label><select id={id + '-sort'} value={sort} onChange={e => { setSort(e.target.value as ChartSort); setLimit(12); }}><option value="source">Source order</option><option value="count">Highest count</option><option value="label">Category name</option></select></div>}</div>
    <p className="elb-chart-description">{description}{denominator!==undefined&&<> Denominator: {denominator}.</>}{!compact&&<> Bar lengths compare counts within this chart; they do not combine populations.</>}</p>
    {rows.length ? <><ul className="elb-chart-bars" aria-label={title + ' categories'}>{rows.slice(0, limit).map(row => <li key={row.key}><button type="button" aria-pressed={selected === row.key} aria-describedby={id+"-detail"} title={`${row.label}: ${row.count}${row.percent==null?"":` (${row.percent}%)`}${denominator===undefined?"":`; denominator ${denominator}`}`} onMouseEnter={()=>setHovered(row.key)} onMouseLeave={()=>setHovered(null)} onFocus={()=>setHovered(row.key)} onBlur={()=>setHovered(null)} onClick={() => setSelected(selected === row.key ? null : row.key)} className="elb-chart-row" style={{ '--series': row.unknown ? 'var(--chart-unknown)' : `var(--chart-${row.series})` } as React.CSSProperties}>
      <span className="elb-chart-category">{row.label}</span><strong>{row.count.toLocaleString()}{row.percent !== undefined && <small> · {row.percent === null ? 'Percentage unavailable' : row.percent + '%'}</small>}</strong><span aria-hidden="true" className="elb-chart-track"><span style={{ width: row.width + '%' }} /></span>
    </button></li>)}</ul><p id={id+"-detail"} role="status" className="elb-chart-selection">{active ? `${active.label}: ${active.count.toLocaleString()}${active.percent == null ? '' : ' (' + active.percent + '%)'}${denominator===undefined?'':`; denominator ${denominator}`}. Highlight only; filters unchanged.` : compact?'':'Hover, focus or select a bar for details. Highlight only; filters unchanged.'}</p>
    {rows.length>limit&&<p className="elb-chart-description">Showing {sort==='count'?'top':'first'} {limit} of {rows.length} categories; complete values in the detailed tables below.</p>}
    {!compact&&rows.length > limit && <button type="button" className="elb-chart-more" onClick={() => setLimit(value => value + 12)}>Show more categories ({Math.min(limit, rows.length)} of {rows.length})</button>}
    {!compact&&<ChartTable title={title} items={rows}/>}</> : <p className="elb-chart-empty">No reported categories in this authorized view.</p>}
  </section>;
}

export function ChartTable({title,items}:{title:string;items:readonly ChartItem[]}) {
 return <details className="elb-chart-table"><summary>View {title.toLowerCase()} as a table</summary><div className="elb-table-scroll"><table><caption>{title} · complete values</caption><thead><tr><th scope="col">Category</th><th scope="col">Count</th><th scope="col">Percent</th></tr></thead><tbody>{items.map(row=><tr key={row.key}><th scope="row">{row.label}</th><td>{row.count.toLocaleString()}</td><td>{row.percent==null?'Not supplied':row.percent+'%'}</td></tr>)}</tbody></table>{!items.length&&<p>No recorded categories.</p>}</div></details>;
}
