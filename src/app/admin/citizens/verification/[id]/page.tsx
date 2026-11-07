import Link from 'next/link';
import {requireSuperAdminPage} from '@/lib/access';
import {identityDetail} from '@/features/identity/server';
import {IdentityHistory,identityLabel,identityTime} from '@/features/identity/components/identity-history';
import {IdentityReviewForm} from '@/features/identity/components/identity-review-form';

export const instant=false;
export const metadata={title:'Review Citizen ID | eLingkod Bayan'};
export default async function CitizenIdentityPage({params}:{params:Promise<{id:string}>}){
  const viewer=await requireSuperAdminPage('/admin/citizens/verification');const {id}=await params;
  const account=await identityDetail(id,viewer);const latest=account.submissions[0];
  return <div className="mx-auto max-w-4xl space-y-5 text-foreground [overflow-wrap:anywhere]"><Link href="/admin/citizens/verification" className="inline-flex min-h-11 items-center underline">Back to review queue</Link><h1 className="text-3xl font-semibold tracking-tight text-foreground">Citizen ID review</h1>
    <section className="rounded-2xl border border-border bg-card p-5"><h2 className="text-xl font-bold">{account.name}</h2><p className="mt-2">{identityLabel(account.identityStatus)}</p><dl className="mt-4 grid gap-4 text-sm sm:grid-cols-2">{[['Current email',account.email],['Current mobile',account.phoneNumber||'Not provided'],['Role',account.role],['Registered',identityTime(account.createdAt)],['Email verification',account.emailVerified?'Email verified':'Email not verified'],['Review version',String(account.identityVersion)]].map(([label,value])=><div key={label}><dt className="text-muted-foreground">{label}</dt><dd className="min-w-0 [overflow-wrap:anywhere] font-medium">{value}</dd></div>)}</dl><p className="mt-4 text-sm text-muted-foreground">Submitted details are recorded separately with each document below. Legacy access is not proof of ID verification. Do not copy document information into public records or analytics.</p>
      {account.identityStatus==='PENDING'&&latest&&<IdentityReviewForm id={latest.id} version={account.identityVersion}/>}
    </section><IdentityHistory submissions={account.submissions}/>
  </div>;
}
