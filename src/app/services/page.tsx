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
  return <><SiteHeader viewer={viewer ? { name:viewer.name, email:viewer.email, role:viewer.role } : null}/><main className="min-h-screen bg-card">
    <section className="border-b border-border bg-muted px-5 py-9 sm:px-8 lg:px-12">
      <div className="mx-auto max-w-[1200px]"><div className="flex flex-wrap items-end justify-between gap-5"><div className="max-w-[760px]"><span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-extrabold text-foreground"><Building2 size={14}/> Online LGU Services</span><h1 className="mt-4 text-[clamp(2rem,4vw,3.7rem)] font-black leading-[1.04] tracking-[-.045em] text-foreground">Request local services without guessing the next step.</h1><p className="mt-3 max-w-[720px] text-sm leading-6 text-muted-foreground">Choose the service, complete only the relevant form, upload requirements securely, respond to LGU corrections or schedules, and follow one tracking timeline until release or completion.</p></div><div className="flex flex-wrap gap-2">{citizen && <Link href="/services/requests" className="rounded-xl bg-primary px-4 py-2.5 text-xs font-extrabold text-white">My LGU requests</Link>}<Link href="#catalog" className="rounded-xl border border-border bg-card px-4 py-2.5 text-xs font-extrabold text-foreground">Browse services</Link></div></div>
        <div className="mt-6 grid gap-2 sm:grid-cols-4"><Mini icon={FileCheck2} title="Service-specific forms" text="Realistic intake fields, not one generic application."/><Mini icon={ShieldCheck} title="Requirement verification" text="Files are checked individually before validation."/><Mini icon={CalendarClock} title="Scheduling only if needed" text="Interviews, inspections and release slots stay service-specific."/><Mini icon={Sparkles} title="Track every handoff" text="Citizen, staff and final verification updates stay visible."/></div>
      </div>
    </section>

    <section id="catalog" className="scroll-mt-24 px-5 py-8 sm:px-8 lg:px-12"><div className="mx-auto max-w-[1200px]"><div className="mb-5 flex items-end justify-between gap-4"><div><p className="text-xs font-extrabold uppercase tracking-[.15em] text-foreground">SERVICE CATALOG</p><h2 className="mt-1 text-xl font-black text-foreground">What do you need today?</h2></div><span className="hidden items-center gap-2 text-xs text-muted-foreground sm:flex"><Search size={13}/> {catalog.length} available services</span></div>
      {SERVICE_CATEGORIES.map(category => <section key={category} className="mb-7"><div className="mb-2.5 flex items-center gap-2"><span className="h-4 w-1 rounded-full bg-primary"/><h3 className="text-xs font-extrabold text-muted-foreground">{category}</h3></div><div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">{catalog.filter(service => service.category === category).map(service => { const Icon = service.icon; return <Link key={service.key} href={`/services/${service.key}`} className="group flex min-h-[170px] flex-col rounded-[18px] border border-border bg-card p-4 transition hover:-translate-y-0.5 hover:border-border hover:shadow-[0_12px_28px_rgba(39,92,120,.07)]"><div className="flex items-start justify-between gap-3"><span className={`grid size-9 place-items-center rounded-xl ${service.accent}`}><Icon size={18}/></span><span className={`rounded-full px-2 py-1 text-xs font-black ${service.intakeMode === "PRESCREEN" ? "bg-amber-50 text-amber-700" : "bg-emerald-50 text-emerald-700"}`}>{service.intakeMode === "PRESCREEN" ? "SCREENING FIRST" : "START ONLINE"}</span></div><h4 className="mt-3 text-[14px] font-black leading-5 text-foreground">{service.title}</h4><p className="mt-1.5 flex-1 text-xs leading-4 text-muted-foreground">{service.description}</p><div className="mt-3 flex items-end justify-between gap-3 border-t border-border pt-3"><span className="line-clamp-2 text-xs leading-3 text-muted-foreground">{service.processingOffice}</span><ArrowRight size={14} className="shrink-0 text-muted-foreground transition group-hover:translate-x-1"/></div></Link>; })}</div></section>)}
    </div></section>
  </main><SiteFooter/></>;
}

function Mini({ icon:Icon, title, text }: { icon:any; title:string; text:string }) { return <div className="rounded-xl border border-white/80 bg-card/75 px-3 py-3"><Icon className="text-muted-foreground" size={16}/><strong className="mt-2 block text-xs text-foreground">{title}</strong><span className="mt-1 block text-xs leading-4 text-muted-foreground">{text}</span></div>; }
