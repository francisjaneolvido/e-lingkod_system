import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarClock, CheckCircle2, FileUp, Info, ShieldCheck } from "lucide-react";
import { currentViewer } from "@/lib/access";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { serviceForClient } from "@/features/services/catalog";
import { resolveServiceDefinition } from "@/features/services/server/catalog";
import { ServiceStartForm } from "@/features/services/components/service-start-form";

export const instant = false;
export const metadata: Metadata = { title: "LGU Service | eLingkod Bayan" };

export default async function ServicePage({ params }: { params: Promise<{serviceKey:string}> }) {
  const { serviceKey } = await params;
  const service = await resolveServiceDefinition(serviceKey);
  if (!service) notFound();
  const viewer = await currentViewer();
  const citizen = viewer?.role === "CITIZEN";
  const Icon = service.icon;

  return <><SiteHeader viewer={viewer ? { name:viewer.name, email:viewer.email, role:viewer.role } : null}/><main className="min-h-screen bg-[#f6f9fb] px-5 py-7 sm:px-8 lg:px-12"><div className="mx-auto max-w-[1160px]">
    <Link href="/services" className="inline-flex items-center gap-2 text-xs font-bold text-[#2b7596]"><ArrowLeft size={15}/> All online services</Link>

    <section className="mt-4 rounded-[22px] border border-[#d8e7ee] bg-white p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-4"><span className={`grid size-11 shrink-0 place-items-center rounded-xl ${service.accent}`}><Icon size={21}/></span><div><p className="text-[9px] font-extrabold uppercase tracking-[.14em] text-[#3a7e9b]">{service.category}</p><h1 className="mt-1 text-2xl font-black tracking-tight text-[#164361]">{service.title}</h1><p className="mt-2 max-w-3xl text-xs leading-5 text-[#6c8798]">{service.description}</p></div></div>
        <span className={`rounded-full px-2.5 py-1.5 text-[9px] font-extrabold ${service.intakeMode === "PRESCREEN" ? "bg-amber-50 text-amber-700" : "bg-emerald-50 text-emerald-700"}`}>{service.intakeMode === "PRESCREEN" ? "Screening first" : "Direct online form"}</span>
      </div>
      <div className="mt-4 grid gap-2 sm:grid-cols-3"><InfoBlock icon={ShieldCheck} title="Processing office" text={service.processingOffice}/><InfoBlock icon={FileUp} title="Requirements" text={`${service.requirements.filter(item => item.required).length} required · ${service.requirements.length} listed`}/><InfoBlock icon={CalendarClock} title="Schedule" text={service.appointmentMode === "NONE" ? "No routine appointment" : service.appointmentMode === "OPTIONAL" ? "Scheduled only when needed" : service.appointmentMode === "INSPECTION" ? "Inspection slot selected after validation" : "Interview / visit slot selected after validation"}/></div>
    </section>

    <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
      <section>{citizen ? <ServiceStartForm service={serviceForClient(service)}/> : viewer ? <AccessCard title="Citizen account required" body="LGU staff accounts process requests from the protected workspace. Use a Citizen account to submit a personal service request." href="/admin/services" action="Open LGU workspace"/> : <AccessCard title="Sign in to start this request" body="Use your Citizen account so the request can be saved, requirements can be uploaded securely, and every status update can be tracked." href={`/login?next=${encodeURIComponent(`/services/${service.key}`)}`} action="Sign in as citizen"/>}</section>

      <aside className="space-y-3 lg:sticky lg:top-4 lg:self-start">
        <section className="rounded-[18px] border border-[#d9e7ee] bg-white p-4"><div className="flex items-center gap-2"><CheckCircle2 size={16} className="text-[#33816c]"/><h2 className="text-xs font-black text-[#1d4d69]">Prepare before submitting</h2></div><div className="mt-3 space-y-2.5">{service.requirements.map(requirement => <div key={requirement.key} className="rounded-xl bg-[#f8fbfc] px-3 py-2.5"><div className="flex items-start gap-2"><span className={`mt-1 size-1.5 shrink-0 rounded-full ${requirement.required ? "bg-[#31836d]" : "bg-[#a1b2bb]"}`}/><div><strong className="text-[10px] leading-4 text-[#355f76]">{requirement.label}</strong>{requirement.condition ? <span className="ml-1 text-[8px] font-bold text-[#9a7a38]">CONDITIONAL</span> : !requirement.required && <span className="ml-1 text-[8px] font-bold text-[#8ba0aa]">OPTIONAL</span>}{requirement.examples && <p className="mt-1 text-[9px] leading-4 text-[#8397a3]">Examples: {requirement.examples}</p>}{requirement.help && <p className="mt-1 text-[9px] leading-4 text-[#8397a3]">{requirement.help}</p>}</div></div></div>)}</div></section>
        <section className="rounded-[18px] border border-[#e5ddc9] bg-[#fffaf1] p-4"><div className="flex items-start gap-2"><Info size={15} className="mt-0.5 shrink-0 text-[#9a7a38]"/><div><h2 className="text-[11px] font-black text-[#735c2e]">Important</h2><p className="mt-1 text-[9px] leading-4 text-[#876f42]">{service.serviceNotice}</p></div></div></section>
        <section className="rounded-[18px] border border-[#d9e7ee] bg-white p-4"><span className="text-[8px] font-black uppercase tracking-[.12em] text-[#8498a5]">How this works</span><ol className="mt-2 space-y-1 text-[9px] leading-4 text-[#6f8796]"><li>1. Save a draft or send the short screening intake.</li><li>2. Submit complete details and requirements.</li><li>3. Staff validates documents and requests corrections if needed.</li>{service.appointmentMode !== "NONE" && <li>4. Choose from LGU schedule options when an in-person step is required.</li>}<li>{service.appointmentMode !== "NONE" ? "5" : "4"}. Final verification and release/completion.</li></ol></section><section className="rounded-[18px] border border-[#d9e7ee] bg-white p-4"><span className="text-[8px] font-black uppercase tracking-[.12em] text-[#8498a5]">Expected outcome</span><p className="mt-1.5 text-[11px] font-bold leading-5 text-[#42677b]">{service.outcomeLabel}</p></section>
      </aside>
    </div>
  </div></main><SiteFooter/></>;
}

function InfoBlock({ icon:Icon, title, text }: { icon:any; title:string; text:string }) { return <div className="rounded-xl bg-[#f5f9fb] px-3 py-2.5"><div className="flex items-center gap-2"><Icon size={14} className="text-[#377b98]"/><strong className="text-[9px] text-[#315b72]">{title}</strong></div><span className="mt-1 block text-[9px] leading-4 text-[#8195a1]">{text}</span></div>; }
function AccessCard({ title, body, href, action }: { title:string; body:string; href:string; action:string }) { return <div className="rounded-[18px] border border-[#d9e7ee] bg-white p-5"><h2 className="text-base font-black text-[#194763]">{title}</h2><p className="mt-2 text-xs leading-5 text-[#718b9a]">{body}</p><Link href={href} className="mt-4 inline-flex rounded-xl bg-[#175e80] px-4 py-2.5 text-[10px] font-extrabold text-white">{action}</Link></div>; }
