import Link from "next/link";
import { ArrowUpRight, ClipboardPenLine, MapPinned, ListChecks, BellRing, ShieldCheck } from "lucide-react";

const steps=[
  {number:"01",title:"Choose a service",description:"Hanapin ang kailangan mong i-report o i-request.",icon:ClipboardPenLine},
  {number:"02",title:"Send the details",description:"Mag-submit ng information at requirements. GPS/photo for civic reports.",icon:MapPinned},
  {number:"03",title:"Follow the progress",description:"Gamitin ang reference ID para makita ang latest status.",icon:ListChecks},
];

export function WorkflowSection(){
  return <section id="how-it-works" className="scroll-mt-24 bg-[#f8fbfe] px-5 py-18 sm:px-8 lg:px-12 lg:py-23">
    <div className="mx-auto max-w-[1344px]"><div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="text-[11px] font-extrabold uppercase tracking-[.14em] text-[#2477ac]">Simple by design</p><h2 className="mt-3 text-[clamp(1.9rem,3vw,3.1rem)] font-extrabold tracking-[-.04em] text-[#143d62]">How eLB will work</h2><p className="mt-3 text-[13px] leading-6 text-[#718a9d]">From reporting a concern to tracking an action—in three easy steps.</p></div><span className="inline-flex items-center gap-2 text-[11px] font-semibold text-[#728a9d]"><ShieldCheck size={16} className="text-[#237ca6]"/> Prototype workflow, not a live service</span></div>
      <div className="mt-9 grid gap-4 lg:grid-cols-3">{steps.map(s=><div key={s.number} className="relative rounded-[22px] border border-[#dfe9f2] bg-white px-6 py-7 sm:px-7"><div className="flex items-start justify-between"><span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#e8f3fc] text-[#1c75ad]"><s.icon size={28}/></span><span className="text-3xl font-extrabold tracking-tight text-[#d7e8f5]">{s.number}</span></div><h3 className="mt-6 text-[15px] font-extrabold text-[#163e61]">{s.title}</h3><p className="mt-2 text-[12px] leading-6 text-[#7d94a7]">{s.description}</p></div>)}</div>
      <div className="mt-8 flex flex-col gap-5 rounded-[24px] bg-[#103c64] p-7 text-white sm:flex-row sm:items-center sm:justify-between sm:p-9"><div><p className="inline-flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[.13em] text-[#ffd17c]"><BellRing size={16}/> Building better connections</p><h3 className="mt-2 max-w-lg text-[22px] font-extrabold leading-snug tracking-[-.03em] sm:text-[26px]">Serbisyong malinaw. Aksyon na nasusubaybayan.</h3></div><Link href="/register" className="inline-flex shrink-0 items-center justify-center gap-2 rounded-full bg-[#ffbf43] px-6 py-3 text-[12px] font-extrabold text-[#153e62] transition hover:bg-[#ffd373]">Explore registration <ArrowUpRight size={17}/></Link></div>
    </div>
  </section>;
}
