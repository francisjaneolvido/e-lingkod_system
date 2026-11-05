import {connection} from 'next/server';
import {redirect} from 'next/navigation';
import Link from 'next/link';
import {currentViewer} from '@/lib/access';
import {identityDetail} from '@/features/identity/server';
import {canSubmitIdentity} from '@/features/identity/policy';
import {IdentityUpload} from '@/features/identity/components/identity-upload';
import {IdentityHistory,identityLabel,identityTime} from '@/features/identity/components/identity-history';
import {SiteHeader} from '@/components/layout/site-header';
import {SiteFooter} from '@/components/layout/site-footer';

export const instant=false;
export const metadata={title:'Verification status | eLingkod Bayan',robots:{index:false,follow:false}};
export default async function VerificationPage() {
  await connection();const viewer=await currentViewer();if(!viewer)redirect('/login?next=%2Fverification');
  if(viewer.role!=='CITIZEN')redirect('/admin');
  const account=await identityDetail(viewer.id,viewer);const latest=account.submissions[0];
  const steps:Record<string,string>={SUBMISSION_REQUIRED:'Submit your ID below to begin review. Citizen features become available after an Admin approves your submission.',PENDING:'An Admin will review your submission. You can browse public information, recover your password and sign out while waiting.',CORRECTIONS_REQUIRED:'Read the review reason below, then submit a corrected document. Your previous submission remains in the review history.',REJECTED:'Read the review reason below. You may submit a corrected document for a new review.',APPROVED:'Your Citizen features are available. Service-specific document and eligibility checks still apply.',LEGACY:'Your existing access is preserved. This classification does not mean an ID was submitted or verified.'};
  return <><SiteHeader viewer={viewer}/><main className="min-h-[70vh] bg-background px-5 py-10 text-foreground [overflow-wrap:anywhere]"><div className="mx-auto max-w-3xl space-y-6">
    <header><h1 className="text-3xl font-bold">Verification status</h1><p className="mt-3 text-muted-foreground">{account.name} · {account.email}</p></header>
    <section className="space-y-3 rounded-2xl border border-border bg-card p-5"><h2 className="text-xl font-bold">{identityLabel(account.identityStatus)}</h2><p className="text-sm leading-6">{steps[account.identityStatus]}</p><p className="text-sm text-muted-foreground">{latest?'Latest submission: '+identityTime(latest.submittedAt):'Submission time: not yet submitted.'}</p>{!['LEGACY','APPROVED'].includes(account.identityStatus)&&<p className="text-sm leading-6 text-muted-foreground">Estimated review window: 24–72 hours after submission. This is an estimate, not a guarantee; approval always requires an authenticated Admin action.</p>}{['LEGACY','APPROVED'].includes(account.identityStatus)&&<Link href="/account" className="inline-flex min-h-11 items-center font-semibold underline">Open your Citizen account</Link>}</section>
    {canSubmitIdentity(account.identityStatus)&&<IdentityUpload key={account.identityVersion} version={account.identityVersion}/>}
    <IdentityHistory submissions={account.submissions}/>
    <p className="text-sm text-muted-foreground">Identity review, email verification and LGU roles are separate. Password recovery does not approve an account.</p>
    <Link href="/" className="inline-flex min-h-11 items-center font-semibold underline">Browse public information</Link>
  </div></main><SiteFooter/></>;
}
