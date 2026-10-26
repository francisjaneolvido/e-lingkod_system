'use client';
import { useId, useState } from 'react';
import { chartRows, type ChartItem, type ChartSort } from './chart-model';

export function OverviewChart({ title, items, description }: { title: string; items: readonly ChartItem[]; description: string }) {
  const id = useId();
  const [sort, setSort] = useState<ChartSort>('source');
  const [selected, setSelected] = useState<string | null>(null);
  const [limit, setLimit] = useState(12);
  const rows = chartRows(items, sort);
  const active = rows.find(row => row.key === selected);
  return <section className="elb-chart" aria-labelledby={id}>
    <div className="elb-chart-heading"><h3 id={id}>{title}</h3><div><label htmlFor={id + '-sort'}>Sort chart</label><select id={id + '-sort'} value={sort} onChange={e => { setSort(e.target.value as ChartSort); setLimit(12); }}><option value="source">Source order</option><option value="count">Highest count</option><option value="label">Category name</option></select></div></div>
    <p className="elb-chart-description">{description} Bar lengths compare counts within this chart; they do not combine populations.</p>
    {rows.length ? <><ul className="elb-chart-bars" aria-label={title + ' categories'}>{rows.slice(0, limit).map(row => <li key={row.key}><button type="button" aria-pressed={selected === row.key} onClick={() => setSelected(selected === row.key ? null : row.key)} className="elb-chart-row" style={{ '--series': row.unknown ? 'var(--chart-unknown)' : `var(--chart-${row.series})` } as React.CSSProperties}>
      <span className="elb-chart-category">{row.label}</span><strong>{row.count.toLocaleString()}{row.percent !== undefined && <small> · {row.percent === null ? 'Percentage unavailable' : row.percent + '%'}</small>}</strong><span aria-hidden="true" className="elb-chart-track"><span style={{ width: row.width + '%' }} /></span>
    </button></li>)}</ul><p role="status" className="elb-chart-selection">{active ? `${active.label}: ${active.count.toLocaleString()}${active.percent == null ? '' : ' (' + active.percent + '%)'}.` : 'Select a category for its value. Arrow through the page with Tab; activate with Enter or Space.'}</p>
    {rows.length > limit && <button type="button" className="elb-chart-more" onClick={() => setLimit(value => value + 12)}>Show more categories ({Math.min(limit, rows.length)} of {rows.length})</button>}
    <details className="elb-chart-table"><summary>View {title.toLowerCase()} as a table</summary><div className="elb-table-scroll"><table><caption>{title} · complete values in selected sort order</caption><thead><tr><th scope="col">Category</th><th scope="col">Count</th><th scope="col">Percent</th></tr></thead><tbody>{rows.map(row => <tr key={row.key}><th scope="row">{row.label}</th><td>{row.count.toLocaleString()}</td><td>{row.percent == null ? 'Not supplied' : row.percent + '%'}</td></tr>)}</tbody></table></div></details></> : <p className="elb-chart-empty">No reported categories in this authorized view.</p>}
  </section>;
}
