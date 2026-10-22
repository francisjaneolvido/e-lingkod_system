import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { ArrowRight, Building2, CalendarClock, FileCheck2, Search, ShieldCheck, Sparkles } from "lucide-react";
import { currentViewer } from "@/lib/access";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { SERVICE_CATEGORIES } from "@/features/services/catalog";
import { publishedServiceCatalog } from "@/features/services/server/catalog";

export const instant = false;
export const metadata: Metadata = { title: "Online LGU Services | eLingkod Bayan" };

export default async function ServicesPage() {
  await connection();
  const viewer = await currentViewer();
  const catalog = await publishedServiceCatalog();
  const citizen = viewer?.role === "CITIZEN";
  return <><SiteHeader viewer={viewer ? { name:viewer.name, email:viewer.email, role:viewer.role } : null}/><main className="min-h-screen bg-[#f6f9fb]">
    <section className="border-b border-[#d9e8ef] bg-[linear-gradient(120deg,#eef7fb,#fff_62%,#fff8eb)] px-5 py-9 sm:px-8 lg:px-12">
      <div className="mx-auto max-w-[1200px]"><div className="flex flex-wrap items-end justify-between gap-5"><div className="max-w-[760px]"><span className="inline-flex items-center gap-2 rounded-full border border-[#cfdfeb] bg-white px-3 py-1.5 text-[10px] font-extrabold text-[#286f96]"><Building2 size={14}/> Online LGU Services</span><h1 className="mt-4 text-[clamp(2rem,4vw,3.7rem)] font-black leading-[1.04] tracking-[-.045em] text-[#143f61]">Request local services without guessing the next step.</h1><p className="mt-3 max-w-[720px] text-sm leading-6 text-[#5b7b8e]">Choose the service, complete only the relevant form, upload requirements securely, respond to LGU corrections or schedules, and follow one tracking timeline until release or completion.</p></div><div className="flex flex-wrap gap-2">{citizen && <Link href="/services/requests" className="rounded-xl bg-[#175e80] px-4 py-2.5 text-xs font-extrabold text-white">My LGU requests</Link>}<Link href="#catalog" className="rounded-xl border border-[#bdd5df] bg-white px-4 py-2.5 text-xs font-extrabold text-[#2a6c8b]">Browse services</Link></div></div>
        <div className="mt-6 grid gap-2 sm:grid-cols-4"><Mini icon={FileCheck2} title="Service-specific forms" text="Realistic intake fields, not one generic application."/><Mini icon={ShieldCheck} title="Requirement verification" text="Files are checked individually before validation."/><Mini icon={CalendarClock} title="Scheduling only if needed" text="Interviews, inspections and release slots stay service-specific."/><Mini icon={Sparkles} title="Track every handoff" text="Citizen, staff and final verification updates stay visible."/></div>
      </div>
    </section>

    <section id="catalog" className="scroll-mt-24 px-5 py-8 sm:px-8 lg:px-12"><div className="mx-auto max-w-[1200px]"><div className="mb-5 flex items-end justify-between gap-4"><div><p className="text-[9px] font-extrabold uppercase tracking-[.15em] text-[#2a7a9a]">SERVICE CATALOG</p><h2 className="mt-1 text-xl font-black text-[#164361]">What do you need today?</h2></div><span className="hidden items-center gap-2 text-[10px] text-[#78909e] sm:flex"><Search size={13}/> {catalog.length} available services</span></div>
      {SERVICE_CATEGORIES.map(category => <section key={category} className="mb-7"><div className="mb-2.5 flex items-center gap-2"><span className="h-4 w-1 rounded-full bg-[#4d8ba5]"/><h3 className="text-xs font-extrabold text-[#52748a]">{category}</h3></div><div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">{catalog.filter(service => service.category === category).map(service => { const Icon = service.icon; return <Link key={service.key} href={`/services/${service.key}`} className="group flex min-h-[170px] flex-col rounded-[18px] border border-[#dce8ee] bg-white p-4 transition hover:-translate-y-0.5 hover:border-[#9bc9da] hover:shadow-[0_12px_28px_rgba(39,92,120,.07)]"><div className="flex items-start justify-between gap-3"><span className={`grid size-9 place-items-center rounded-xl ${service.accent}`}><Icon size={18}/></span><span className={`rounded-full px-2 py-1 text-[8px] font-black ${service.intakeMode === "PRESCREEN" ? "bg-amber-50 text-amber-700" : "bg-emerald-50 text-emerald-700"}`}>{service.intakeMode === "PRESCREEN" ? "SCREENING FIRST" : "START ONLINE"}</span></div><h4 className="mt-3 text-[14px] font-black leading-5 text-[#1c4c69]">{service.title}</h4><p className="mt-1.5 flex-1 text-[10px] leading-4 text-[#748c9b]">{service.description}</p><div className="mt-3 flex items-end justify-between gap-3 border-t border-[#edf2f5] pt-3"><span className="line-clamp-2 text-[8px] leading-3 text-[#8198a6]">{service.processingOffice}</span><ArrowRight size={14} className="shrink-0 text-[#337a99] transition group-hover:translate-x-1"/></div></Link>; })}</div></section>)}
    </div></section>
  </main><SiteFooter/></>;
}

function Mini({ icon:Icon, title, text }: { icon:any; title:string; text:string }) { return <div className="rounded-xl border border-white/80 bg-white/75 px-3 py-3"><Icon className="text-[#397b9c]" size={16}/><strong className="mt-2 block text-[11px] text-[#214f6b]">{title}</strong><span className="mt-1 block text-[9px] leading-4 text-[#7790a0]">{text}</span></div>; }
