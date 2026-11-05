import Link from 'next/link';

type Submission={id:string;revision:number;documentLabel:string;detailsJson:string;submittedAt:Date;reviews:{id:string;decision:string;reason:string;reviewedAt:Date;reviewer:{id:string;name:string}}[]};
export const identityLabel=(status:string)=>({SUBMISSION_REQUIRED:'ID submission required',PENDING:'Pending Admin review',CORRECTIONS_REQUIRED:'Corrections requested',REJECTED:'Submission rejected',APPROVED:'ID review approved',LEGACY:'Existing account — legacy access'}[status]||'Review status unavailable');
export const identityTime=(value:Date)=>value.toLocaleString('en-PH',{timeZone:'Asia/Manila',dateStyle:'medium',timeStyle:'short'})+' (Philippine time)';

export function IdentityHistory({submissions}:{submissions:Submission[]}) {
  if(!submissions.length)return <p className="text-sm text-muted-foreground">No ID has been submitted for review.</p>;
  return <section className="space-y-4"><h2 className="text-xl font-bold">Submission and review history</h2>{submissions.map(row=>{
    const details=JSON.parse(row.detailsJson) as Record<string,string|null|boolean>;
    return <article key={row.id} className="space-y-3 rounded-2xl border border-border bg-card p-5">
      <h3 className="font-bold">Document revision {row.revision}: {row.documentLabel}</h3>
      <p className="text-sm text-muted-foreground">Submitted <time dateTime={row.submittedAt.toISOString()}>{identityTime(row.submittedAt)}</time></p>
      <details><summary className="min-h-11 cursor-pointer py-3 text-sm font-semibold">Details recorded with this document</summary><dl className="grid gap-3 text-sm sm:grid-cols-2">{[['Name',details.name],['First name',details.firstName],['Surname',details.lastName],['Middle initial',details.hasNoMiddleName?'No middle name declared':details.middleInitial],['Email',details.email],['Mobile number',details.phoneNumber]].map(([label,value])=><div key={String(label)}><dt className="text-muted-foreground">{label}</dt><dd className="min-w-0 [overflow-wrap:anywhere] font-medium">{String(value||'Not provided')}</dd></div>)}</dl></details>
      <Link prefetch={false} href={'/api/identity/documents/'+row.id} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center rounded-xl border border-input px-4 text-sm font-semibold">Open protected ID image (new tab)</Link>
      {row.reviews.length?row.reviews.map(review=><div key={review.id} className="rounded-xl border border-border bg-muted p-4 text-sm"><p className="font-semibold">{identityLabel(review.decision)}</p><p className="mt-2 whitespace-pre-wrap break-words">{review.reason}</p><p className="mt-2 text-muted-foreground">Reviewed by {review.reviewer.name} · <time dateTime={review.reviewedAt.toISOString()}>{identityTime(review.reviewedAt)}</time></p></div>):<p className="text-sm text-muted-foreground">Awaiting an Admin decision.</p>}
    </article>;
  })}</section>;
}
