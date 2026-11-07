'use client';
import {useEffect,useRef,useState,type FormEvent} from 'react';
import {useRouter} from 'next/navigation';

export function IdentityUpload({version}:{version:number}) {
  const router=useRouter();
  const [busy,setBusy]=useState(false),[error,setError]=useState('');
  const [key,setKey]=useState(()=>crypto.randomUUID());
  const [selected,setSelected]=useState<File|null>(null),[preview,setPreview]=useState('');
  const fileInput=useRef<HTMLInputElement>(null);
  const previewUrl=useRef('');
  useEffect(()=>()=>{if(previewUrl.current)URL.revokeObjectURL(previewUrl.current);},[]);
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
  return <form onSubmit={submit} className="elb-identity-upload elb-workflow-panel" aria-busy={busy}>
    <h2 className="text-xl font-bold">Submit your ID for review</h2>
    <p className="text-sm leading-6 text-muted-foreground">Use a valid government-issued ID or accepted identity document showing your name. An Admin reviews the document against your submitted details. Do not include unrelated personal information. This does not replace any service-specific residency or eligibility checks.</p>
    <label className="elb-identity-field">Document description<input name="documentLabel" required minLength={3} maxLength={120} disabled={busy} placeholder="For example, the type of ID submitted" onChange={()=>setKey(crypto.randomUUID())} className="mt-2 min-h-11 w-full rounded-xl border border-input bg-background px-3 text-foreground"/></label>
    <label className="elb-identity-field">ID image (JPG or PNG, up to 5 MB)<input ref={fileInput} name="file" type="file" required accept="image/jpeg,image/png" disabled={busy} onChange={event=>{setKey(crypto.randomUUID());const file=event.currentTarget.files?.[0];const valid=file && ['image/jpeg','image/png'].includes(file.type) && file.size<=5*1024*1024 ? file : null;if(previewUrl.current)URL.revokeObjectURL(previewUrl.current);previewUrl.current=valid?URL.createObjectURL(valid):'';setSelected(valid);setPreview(previewUrl.current);setError('');}} className="mt-2 block min-h-11 w-full rounded-xl border border-input bg-background p-2 text-foreground file:mr-3 file:min-h-11 file:rounded-lg file:border-0 file:bg-primary file:px-4 file:text-primary-foreground"/></label>
    {selected&&preview&&<div className="elb-identity-preview">
      {/* Browser-local preview stays on this device until submission. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={preview} alt="Selected identity document preview" width={640} height={360}/>
      <p>{selected.name} · {(selected.size/1024/1024).toFixed(2)} MB</p><button type="button" disabled={busy} className="elb-button" onClick={()=>{if(previewUrl.current)URL.revokeObjectURL(previewUrl.current);previewUrl.current='';setSelected(null);setPreview('');if(fileInput.current)fileInput.current.value='';setKey(crypto.randomUUID());}}>Remove selected image</button>
    </div>}
    <p className="text-sm text-muted-foreground">Private storage: only you and authorized Admin reviewers can retrieve your uploaded ID. A decoded copy is stored with a history of review decisions.</p>
    {error&&<p role="alert" className="elb-account-alert">{error}</p>}
    <button disabled={busy} className="elb-button elb-button-primary">{busy?'Submitting ID…':'Submit ID for review'}</button>
  </form>;
}
