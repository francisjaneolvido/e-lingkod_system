'use client';
import {useState,type FormEvent} from 'react';
import {useRouter} from 'next/navigation';

export function IdentityReviewForm({id,version}:{id:string;version:number}) {
  const router=useRouter();const [busy,setBusy]=useState(false),[message,setMessage]=useState('');
  async function submit(event:FormEvent<HTMLFormElement>) {
    event.preventDefault();if(busy)return;const form=new FormData(event.currentTarget);
    setBusy(true);setMessage('');
    try {
      const response=await fetch('/api/admin/identity/'+encodeURIComponent(id),{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({decision:form.get('decision'),reason:form.get('reason'),expectedVersion:version})});
      const body=await response.json();
      if(!response.ok){setMessage(body.error||'Review could not be saved. Refresh and try again.');if(response.status===409)router.refresh();return;}
      setMessage('Review saved.');router.refresh();
    }catch{setMessage('The connection was interrupted. Refresh to check the review before retrying.');}
    finally{setBusy(false);}
  }
  return <form onSubmit={submit} aria-busy={busy} className="mt-5 space-y-4 rounded-xl border border-border bg-muted p-5">
    <h2 className="text-lg font-bold">Review this exact document revision</h2>
    <p className="text-sm text-muted-foreground">Review can happen immediately. The 24–72-hour window is an estimate and never approves an account automatically.</p>
    <label className="block text-sm font-semibold">Decision<select name="decision" required disabled={busy} className="mt-2 min-h-11 w-full rounded-xl border border-input bg-card px-3"><option value="">Choose a decision</option><option value="APPROVED">Approve</option><option value="CORRECTIONS_REQUIRED">Request corrections</option><option value="REJECTED">Reject</option></select></label>
    <label className="block text-sm font-semibold">Reason shown to the citizen<textarea name="reason" required minLength={8} maxLength={1200} rows={4} disabled={busy} className="mt-2 w-full rounded-xl border border-input bg-card p-3"/><span className="mt-1 block text-xs font-normal text-muted-foreground">Explain the decision and any next steps. Do not include the ID number or unnecessary document details.</span></label>
    {message&&<p role="status" className="text-sm">{message}</p>}
    <button disabled={busy} className="min-h-11 rounded-xl bg-primary px-5 py-3 font-semibold text-primary-foreground disabled:cursor-not-allowed">{busy?'Saving review…':'Save review decision'}</button>
  </form>;
}
