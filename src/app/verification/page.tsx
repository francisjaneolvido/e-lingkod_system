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
  return <><SiteHeader viewer={viewer}/><main className="elb-account-main [overflow-wrap:anywhere]">
    <header className="elb-account-title"><div><h1>Verification status</h1><p>{account.name} · {account.email}</p></div><Link href="/" className="elb-account-back">Back to public information</Link></header>
    <div className="elb-verification-layout"><div>
      <section className="elb-verification-status elb-workflow-panel" data-approved={account.identityStatus==='APPROVED'} aria-labelledby="identity-status-title"><h2 id="identity-status-title">{identityLabel(account.identityStatus)}</h2><p>{steps[account.identityStatus]}</p><p className="text-muted-foreground">{latest?'Latest submission: '+identityTime(latest.submittedAt):'No ID has been submitted.'}</p>{['LEGACY','APPROVED'].includes(account.identityStatus)&&<Link href="/account" className="elb-button elb-button-primary">Open your citizen account</Link>}</section>
      {canSubmitIdentity(account.identityStatus)&&<IdentityUpload key={account.identityVersion} version={account.identityVersion}/>}
    </div><aside className="elb-verification-guide"><h2>About identity review</h2>{!['LEGACY','APPROVED'].includes(account.identityStatus)?<><p>Submit a clear JPG or PNG image of your accepted identity document. An Admin compares it with your account details.</p><p>Estimated review window: 24–72 hours after submission. Approval always requires an authenticated Admin decision.</p></>:<p>Identity approval does not replace document, residency, or eligibility checks required by a particular service.</p>}<p>Identity review, email verification, and LGU roles are separate. Password recovery does not approve an account.</p></aside></div>
    <IdentityHistory submissions={account.submissions}/>
  </main><SiteFooter/></>;
}
