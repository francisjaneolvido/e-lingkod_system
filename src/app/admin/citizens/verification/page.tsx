import "@/styles/admin-workflows.css";
import Link from 'next/link';
import {requireSuperAdminPage} from '@/lib/access';
import {identityQueue} from '@/features/identity/server';
import {identityLabel,identityTime} from '@/features/identity/components/identity-history';
import {IDENTITY_STATES} from '@/features/identity/policy';

export const instant=false;
export const metadata={title:'Citizen ID reviews | eLingkod Bayan'};
export default async function IdentityQueuePage({searchParams}:{searchParams:Promise<{status?:string;q?:string;page?:string}>}){
  const viewer=await requireSuperAdminPage('/admin/citizens/verification');const params=await searchParams;
  const status=params.status==='ALL'||(IDENTITY_STATES as readonly string[]).includes(params.status||'')?params.status:'PENDING';
  const queue=await identityQueue({status,q:params.q,page:Number(params.page||1)},viewer);
  const pageLink=(page:number)=>'/admin/citizens/verification?'+new URLSearchParams({status:queue.status,q:queue.q,page:String(page)});
  return <div className="elb-admin-workflow space-y-5 text-foreground"><header><h1 className="text-3xl font-semibold tracking-tight text-foreground">Citizen ID reviews</h1><p className="mt-2 text-sm text-muted-foreground">Review exact document revisions. Only Admin decisions grant Citizen access; the 24–72-hour review window is an estimate.</p></header>
    <div className="elb-kpi-band elb-kpi-band-three">{IDENTITY_STATES.map(state=><Link href={'/admin/citizens/verification?status='+state} key={state} className="min-w-0 border-r border-border py-3 pr-4 last:border-0"><span className="block text-2xl font-bold tabular-nums">{queue.totals[state]||0}</span><span className="text-sm">{identityLabel(state)}</span></Link>)}</div>
    <form className="flex flex-wrap items-end gap-3" action="/admin/citizens/verification"><label className="flex-1 text-sm font-semibold">Search name or email<input name="q" defaultValue={queue.q} maxLength={80} className="elb-field mt-2 min-h-11 w-full rounded-xl border border-input bg-card px-3"/></label><label className="text-sm font-semibold">Status<select name="status" defaultValue={queue.status} className="elb-field mt-2 block min-h-11 max-w-full rounded-xl border border-input bg-card px-3"><option value="ALL">All Citizen accounts</option>{IDENTITY_STATES.map(state=><option key={state} value={state}>{identityLabel(state)}</option>)}</select></label><button className="min-h-11 rounded-xl bg-primary px-5 font-semibold text-primary-foreground">Apply filters</button><Link href="/admin/citizens/verification" className="elb-button">Clear filters</Link></form>
    <p className="text-sm text-muted-foreground">{queue.total} matching accounts · Page {queue.page} of {queue.pages}</p>
    <div className="overflow-x-auto border-y border-border" role="region" aria-label="Citizen review results" tabIndex={0}><table className="elb-data-table elb-admin-data-table w-full min-w-[650px] text-left "><thead><tr className="border-b border-border"><th className="p-4">Citizen</th><th className="p-4">Review status</th><th className="p-4">Latest submission</th><th className="p-4">Action</th></tr></thead><tbody>{queue.rows.map(row=><tr key={row.id} className="border-b border-border"><td className="p-4"><strong>{row.name}</strong><span className="mt-1 block break-all text-muted-foreground">{row.email}</span></td><td className="p-4">{identityLabel(row.identityStatus)}</td><td className="p-4">{row.identitySubmissions[0]?identityTime(row.identitySubmissions[0].submittedAt):'No ID submitted'}</td><td className="p-4"><Link href={'/admin/citizens/verification/'+row.id} className="relative inline-flex min-h-11 items-center font-semibold underline">Open review<span className="sr-only"> for {row.name}</span></Link></td></tr>)}</tbody></table>{!queue.rows.length&&<p className="p-6 text-sm">No accounts match these filters.</p>}</div>
    <nav aria-label="Review queue pages" className="flex gap-4">{queue.page>1&&<Link className="inline-flex min-h-11 items-center underline" href={pageLink(queue.page-1)}>Previous page</Link>}{queue.page<queue.pages&&<Link className="inline-flex min-h-11 items-center underline" href={pageLink(queue.page+1)}>Next page</Link>}</nav>
    <Link href="/admin/citizens" className="inline-flex min-h-11 items-center underline">Registered citizen directory</Link>
  </div>;
}
