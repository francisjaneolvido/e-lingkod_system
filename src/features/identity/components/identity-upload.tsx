'use client';
import {useState,type FormEvent} from 'react';
import {useRouter} from 'next/navigation';

export function IdentityUpload({version}:{version:number}) {
  const router=useRouter();
  const [busy,setBusy]=useState(false),[error,setError]=useState('');
  const [key,setKey]=useState(()=>crypto.randomUUID());
  async function submit(event:FormEvent<HTMLFormElement>) {
    event.preventDefault();if(busy)return;
    const form=new FormData(event.currentTarget);form.set('expectedVersion',String(version));form.set('submissionKey',key);
    const file=form.get('file');
    if(!(file instanceof File)||!file.size||file.size>5*1024*1024){setError('Choose a JPG or PNG ID image up to 5 MB.');return;}
    setBusy(true);setError('');
    try {
      const response=await fetch('/api/identity',{method:'POST',body:form});
      const body=await response.json();
      if(!response.ok){setError(body.error||'The ID could not be submitted. Try again.');if(response.status===409)router.refresh();return;}
      router.refresh();
    }catch{setError('The connection was interrupted. Retry with the same file; a successful upload will not be duplicated.');}
    finally{setBusy(false);}
  }
  return <form onSubmit={submit} className="space-y-5 rounded-2xl border border-border bg-card p-5" aria-busy={busy}>
    <h2 className="text-xl font-bold">Submit your ID for review</h2>
    <p className="text-sm leading-6 text-muted-foreground">Use a valid government-issued ID or accepted identity document showing your name. An Admin reviews the document against your submitted details. Do not include unrelated personal information. This does not replace any service-specific residency or eligibility checks.</p>
    <label className="block text-sm font-semibold">Document description<input name="documentLabel" required minLength={3} maxLength={120} disabled={busy} placeholder="For example, the type of ID submitted" onChange={()=>setKey(crypto.randomUUID())} className="mt-2 min-h-11 w-full rounded-xl border border-input bg-background px-3 text-foreground"/></label>
    <label className="block text-sm font-semibold">ID image (JPG or PNG, up to 5 MB)<input name="file" type="file" required accept="image/jpeg,image/png" disabled={busy} onChange={()=>setKey(crypto.randomUUID())} className="mt-2 block min-h-11 w-full rounded-xl border border-input bg-background p-2 text-foreground file:mr-3 file:min-h-11 file:rounded-lg file:border-0 file:bg-primary file:px-4 file:text-primary-foreground"/></label>
    <p className="text-sm text-muted-foreground">Private storage: only you and authorized Admin reviewers can retrieve your uploaded ID. A decoded copy is stored with a history of review decisions.</p>
    {error&&<p role="alert" className="rounded-xl border border-border bg-danger-soft p-3 text-sm text-destructive">{error}</p>}
    <button disabled={busy} className="min-h-11 rounded-xl bg-primary px-5 py-3 font-semibold text-primary-foreground disabled:cursor-not-allowed">{busy?'Submitting ID…':'Submit ID for review'}</button>
  </form>;
}
