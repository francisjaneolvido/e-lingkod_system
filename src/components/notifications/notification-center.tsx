"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { Bell, CheckCheck, Circle, ExternalLink } from "lucide-react";

type Item={id:string;module:string;type:string;title:string;message:string;href:string|null;readAt:string|null;createdAt:string};

export function NotificationCenter({ initialItems, initialUnread }:{initialItems:Item[];initialUnread:number}) {
  const [items,setItems]=useState(initialItems); const [unread,setUnread]=useState(initialUnread); const [busy,setBusy]=useState(false);
  const groups=useMemo(()=>{
    const map=new Map<string,Item[]>();
    for(const item of items){const day=new Date(item.createdAt).toLocaleDateString("en-PH",{year:"numeric",month:"short",day:"numeric"});map.set(day,[...(map.get(day)||[]),item]);}
    return [...map.entries()];
  },[items]);
  async function mark(id?:string){setBusy(true);try{const r=await fetch("/api/notifications",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify(id?{id}:{})});if(!r.ok)return;setItems(list=>list.map(x=>!id||x.id===id?{...x,readAt:new Date().toISOString()}:x));setUnread(n=>id?Math.max(0,n-1):0);}finally{setBusy(false)}}
  return <div className="space-y-4">
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-[18px] border border-border bg-card p-4">
      <div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-xl bg-muted text-foreground"><Bell size={19}/></span><div><strong className="block text-sm text-foreground">{unread} unread</strong><span className="text-xs text-muted-foreground">Workflow updates from Civic Reports, Online Services and LGU modules.</span></div></div>
      <button disabled={busy||unread===0} onClick={()=>mark()} type="button" className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-3.5 py-2.5 text-xs font-extrabold text-foreground disabled:opacity-45"><CheckCheck size={14}/> Mark all read</button>
    </div>
    {groups.length?groups.map(([day,rows])=><section key={day} className="overflow-hidden rounded-[18px] border border-border bg-card"><div className="border-b border-border bg-card px-4 py-2.5 text-xs font-extrabold uppercase tracking-[.14em] text-muted-foreground">{day}</div><div className="divide-y divide-border">{rows.map(item=><Link key={item.id} href={item.href||"#"} onClick={()=>{if(!item.readAt)void mark(item.id)}} className={`flex items-start gap-3 px-4 py-4 transition hover:bg-card ${item.readAt?"":"bg-muted"}`}><span className={`mt-1 grid size-7 shrink-0 place-items-center rounded-lg ${item.readAt?"bg-muted text-muted-foreground":"bg-muted text-foreground"}`}><Circle size={8} fill="currentColor"/></span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-start justify-between gap-2"><strong className="text-xs leading-5 text-foreground">{item.title}</strong><span className="text-xs text-muted-foreground">{new Date(item.createdAt).toLocaleTimeString("en-PH",{hour:"numeric",minute:"2-digit"})}</span></div><p className="mt-0.5 text-xs leading-5 text-muted-foreground">{item.message}</p><span className="mt-1.5 inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wide text-muted-foreground">{item.module}{item.href&&<><span>·</span><ExternalLink size={9}/> Open</>}</span></div></Link>)}</div></section>):<div className="rounded-[18px] border border-border bg-card px-6 py-16 text-center"><Bell className="mx-auto text-muted-foreground" size={28}/><strong className="mt-3 block text-sm text-foreground">No notifications yet</strong><p className="mt-1 text-xs text-muted-foreground">Updates will appear here as your requests and LGU tasks move forward.</p></div>}
  </div>;
}
