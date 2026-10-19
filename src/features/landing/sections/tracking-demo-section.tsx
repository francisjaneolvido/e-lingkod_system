"use client";

import { FormEvent, useState } from "react";
import { CheckCircle2, CircleDot, ClipboardCheck, Hash, Info, SearchCheck } from "lucide-react";

const milestones=[
  {label:"Submitted", detail:"Report received in the sample workflow",state:"done"},
  {label:"Under review",detail:"For validation by the assigned office",state:"active"},
  {label:"Action taken",detail:"Pending next action in this sample",state:"pending"},
  {label:"Resolved",detail:"Final outcome to be recorded",state:"pending"},
] as const;

export function TrackingDemoSection() {
  const [id,setId]=useState("");
  const [result,setResult]=useState<"idle"|"found"|"missing">("idle");
  function submit(event:FormEvent<HTMLFormElement>){event.preventDefault();setResult(id.trim().toUpperCase()==="ELB-DEMO-001"?"found":"missing");}
  function fillExample(){setId("ELB-DEMO-001");setResult("found");}
  return <section id="track-demo" className="scroll-mt-24 overflow-hidden bg-[#eaf5fd] px-5 py-18 sm:px-8 lg:px-12 lg:py-23">
    <div className="mx-auto grid max-w-[1344px] items-center gap-10 lg:grid-cols-[.92fr_1.08fr] lg:gap-18">
      <div className="max-w-xl"><span className="inline-flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-[.15em] text-[#226d9a]"><span className="h-1 w-8 rounded-full bg-[#f5b638]"/> Track with transparency</span><h2 className="mt-4 text-[clamp(1.9rem,3vw,3.25rem)] font-extrabold leading-[1.18] tracking-[-.04em] text-[#143f66]">Hindi ka na mangangapa sa status ng report mo.</h2><p className="mt-5 max-w-lg text-[13px] leading-7 text-[#567790] sm:text-[14px]">Kapag may tracking ID, mas madaling makita kung na-receive, nire-review, inaaksyunan, o resolved na ang concern. Try our interactive sample below.</p><div className="mt-6 inline-flex items-start gap-3 rounded-xl bg-white/70 px-4 py-3 text-[11px] leading-5 text-[#58768c]"><Info size={17} className="mt-0.5 shrink-0 text-[#287cae]"/><span><strong className="text-[#194d74]">Demo only.</strong> The sample status below is not connected to any government system or real report.</span></div></div>
      <div className="rounded-[27px] border border-[#d4e5f0] bg-white p-5 shadow-[0_24px_55px_rgba(34,101,150,.09)] sm:p-7 lg:p-8">
        <div className="flex items-center gap-3 border-b border-[#edf2f6] pb-5"><span className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#eaf4fb] text-[#1f72a8]"><Hash size={24}/></span><div><h3 className="text-[15px] font-extrabold text-[#173f63]">Report tracking demo</h3><p className="text-[11px] text-[#8198aa]">See how the status journey will look</p></div><span className="ml-auto hidden rounded-full bg-[#fff4dd] px-3 py-1 text-[10px] font-bold text-[#a4701b] sm:inline">Sample</span></div>
        <form onSubmit={submit} className="mt-5 flex flex-col gap-3 sm:flex-row"><label htmlFor="track-id" className="sr-only">Sample tracking ID</label><input id="track-id" value={id} onChange={e=>{setId(e.target.value);setResult("idle")}} placeholder="Enter sample ID (ELB-DEMO-001)" className="h-12 min-w-0 flex-1 rounded-xl border border-[#dbe7f0] bg-[#fcfeff] px-4 text-[12px] font-semibold text-[#1b4c70] outline-none placeholder:font-normal placeholder:text-[#9baebb] focus:border-[#2584b9] focus:ring-2 focus:ring-[#d5ecfa]"/><button type="submit" className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-[#153f67] px-5 text-[12px] font-bold text-white transition hover:bg-[#1873a9]"><SearchCheck size={17}/> Check status</button></form>
        <button type="button" onClick={fillExample} className="mt-3 text-[11px] font-bold text-[#297ba9] underline-offset-2 hover:underline">Use sample ID: ELB-DEMO-001</button>
        {result==="idle" && <div className="mt-6 flex min-h-[122px] items-center gap-4 rounded-xl border border-dashed border-[#cde0ee] bg-[#f8fbfd] p-5"><ClipboardCheck className="shrink-0 text-[#82adc7]" size={30}/><p className="text-[12px] leading-6 text-[#6e8ba0]">Enter the sample ID to preview a complete tracking journey—no account needed.</p></div>}
        {result==="missing" && <div role="status" className="mt-6 rounded-xl border border-[#f4dac2] bg-[#fff8f0] p-4 text-[12px] leading-6 text-[#9a6b3b]">This is not a demo ID. Try <strong>ELB-DEMO-001</strong>. Real tracking will be available after the backend is built.</div>}
        {result==="found" && <div role="status" aria-live="polite" className="mt-6 rounded-xl border border-[#e2ecf3] bg-[#fafdff] p-5"><div className="flex flex-wrap items-center justify-between gap-2"><div><p className="text-[10px] font-bold uppercase tracking-[.1em] text-[#8fa3b3]">Sample civic report</p><h4 className="mt-1 text-[14px] font-extrabold text-[#153e63]">Streetlight repair request</h4></div><span className="rounded-full bg-[#e7f4fa] px-3 py-1 text-[10px] font-bold text-[#1b79a5]">Under review</span></div><ol className="mt-6 space-y-0">{milestones.map((step,index)=><li key={step.label} className="relative flex gap-3 pb-5 last:pb-0"><span className={`relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${step.state==="done"?"bg-[#118b81] text-white":step.state==="active"?"bg-[#1f79b1] text-white":"border border-[#ccdde9] bg-white text-[#aac1cf]"}`}>{step.state==="done"?<CheckCircle2 size={17}/>:step.state==="active"?<CircleDot size={17}/>:<span className="h-2 w-2 rounded-full bg-current"/>}</span>{index<3 && <span className="absolute left-[13px] top-7 h-[calc(100%-28px)] w-px bg-[#d6e4ed]"/>}<div><p className={`text-[12px] font-bold ${step.state==="pending"?"text-[#93a7b5]":"text-[#234f73]"}`}>{step.label}</p><p className="mt-0.5 text-[10px] leading-5 text-[#8198ab]">{step.detail}</p></div></li>)}</ol></div>}
      </div>
    </div>
  </section>;
}
