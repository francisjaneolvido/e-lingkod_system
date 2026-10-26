import Link from "next/link";
import { ArrowUpRight, ClipboardPenLine, MapPinned, ListChecks, BellRing, ShieldCheck } from "lucide-react";

const steps=[
  {number:"01",title:"Choose a service",description:"Hanapin ang kailangan mong i-report o i-request.",icon:ClipboardPenLine},
  {number:"02",title:"Send the details",description:"Mag-submit ng information at requirements. GPS/photo for civic reports.",icon:MapPinned},
  {number:"03",title:"Follow the progress",description:"Gamitin ang reference ID para makita ang latest status.",icon:ListChecks},
];

export function WorkflowSection(){
  return <section id="how-it-works" className="scroll-mt-24 bg-card px-5 py-18 sm:px-8 lg:px-12 lg:py-23">
    <div className="mx-auto max-w-[1344px]"><div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="text-xs font-extrabold uppercase tracking-[.14em] text-muted-foreground">Simple by design</p><h2 className="mt-3 text-[clamp(1.9rem,3vw,3.1rem)] font-extrabold tracking-[-.04em] text-foreground">How eLB will work</h2><p className="mt-3 text-[13px] leading-6 text-muted-foreground">From reporting a concern to tracking an action—in three easy steps.</p></div><span className="inline-flex items-center gap-2 text-xs font-semibold text-muted-foreground"><ShieldCheck size={16} className="text-foreground"/> Prototype workflow, not a live service</span></div>
      <div className="mt-9 grid gap-4 lg:grid-cols-3">{steps.map(s=><div key={s.number} className="relative rounded-[22px] border border-border bg-card px-6 py-7 sm:px-7"><div className="flex items-start justify-between"><span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted text-foreground"><s.icon size={28}/></span><span className="text-3xl font-extrabold tracking-tight text-muted-foreground">{s.number}</span></div><h3 className="mt-6 text-[15px] font-extrabold text-foreground">{s.title}</h3><p className="mt-2 text-[12px] leading-6 text-muted-foreground">{s.description}</p></div>)}</div>
      <div className="mt-8 flex flex-col gap-5 rounded-[24px] bg-primary p-7 text-white sm:flex-row sm:items-center sm:justify-between sm:p-9"><div><p className="inline-flex items-center gap-2 text-xs font-extrabold uppercase tracking-[.13em] text-on-brand-gold"><BellRing size={16}/> Building better connections</p><h3 className="mt-2 max-w-lg text-[22px] font-extrabold leading-snug tracking-[-.03em] sm:text-[26px]">Serbisyong malinaw. Aksyon na nasusubaybayan.</h3></div><Link href="/register" className="inline-flex shrink-0 items-center justify-center gap-2 rounded-full bg-brand-gold px-6 py-3 text-[12px] font-extrabold text-on-gold transition hover:bg-brand-gold">Explore registration <ArrowUpRight size={17}/></Link></div>
    </div>
  </section>;
}
