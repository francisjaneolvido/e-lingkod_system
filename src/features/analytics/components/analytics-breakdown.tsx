'use client';
import { useState } from 'react';
import type { AnalyticsGroup } from '../domain';
type Breakdown = AnalyticsGroup['breakdowns'][number];
export function AnalyticsBreakdown({data}:{data:Breakdown}) {
  const [page,setPage]=useState(1),size=10;
  const visible=data.items.slice((page-1)*size,page*size);
  return <details className="rounded-[20px] border border-border bg-card p-5" open={data.key==='employmentStatus'||data.key==='industry'}>
    <summary className="cursor-pointer text-base font-bold text-foreground">{data.title}</summary>
    <p className="mt-3 text-xs leading-6 text-muted-foreground">Denominator: {data.denominator}. Recorded: {data.known}; {data.multi?'no selections recorded':'unknown / not recorded'}: {data.missing}. {data.multi?'Multiple selections; category percentages can total more than 100%.':'Percentages include unknown responses in the denominator.'}</p>
    {data.items.length===0?<p className="mt-4 rounded-xl bg-muted p-4 text-sm text-muted-foreground">No eligible observations. A percentage is unavailable.</p>:<>
      <div className="mt-3 overflow-x-auto"><table className="w-full min-w-[280px] table-fixed text-left text-sm"><caption className="sr-only">{data.title}: counts and percentage of the source-group denominator</caption><thead><tr className="border-b border-border text-xs text-muted-foreground"><th scope="col" className="w-[60%] py-2 pr-3">Reported category</th><th scope="col" className="w-[20%] py-2 text-right">Count</th><th scope="col" className="w-[20%] py-2 text-right">Percent</th></tr></thead><tbody>{visible.map(item=><tr key={item.key} className="border-b border-border align-top"><th scope="row" className="break-words py-3 pr-3 font-medium text-foreground">{item.label}<span aria-hidden="true" className="mt-2 block h-2 overflow-hidden rounded-full bg-muted"><span className={'block h-full rounded-full '+(item.unknown?'bg-brand-gold':'bg-primary')} style={{width:(item.percent??0)+'%'}}/></span></th><td className="py-3 text-right tabular-nums text-foreground">{item.count}</td><td className="py-3 text-right tabular-nums text-muted-foreground">{item.percent===null?'Unavailable':item.percent+'%'}</td></tr>)}</tbody></table></div>
      <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-muted-foreground"><span>Categories {(page-1)*size+1}–{Math.min(page*size,data.items.length)} of {data.items.length}</span><button type="button" className="min-h-11 rounded-xl border border-border px-3 font-semibold disabled:opacity-40" disabled={page===1} onClick={()=>setPage(p=>p-1)}>Previous categories</button><button type="button" className="min-h-11 rounded-xl border border-border px-3 font-semibold disabled:opacity-40" disabled={page*size>=data.items.length} onClick={()=>setPage(p=>p+1)}>Next categories</button></div>
    </>}
  </details>;
}
