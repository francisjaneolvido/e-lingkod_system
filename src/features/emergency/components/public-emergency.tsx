"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { BellRing, CheckCircle2, Copy, ExternalLink, Flame, HeartPulse, Info, LifeBuoy, MapPin, PhoneCall, Search, ShieldAlert, ShieldCheck } from "lucide-react";
import { LOS_BANOS_BARANGAYS } from "@/features/emergency/domain";

export type PublicHotline = { id: string; title: string; category: string; office: string; phone: string; extension: string | null; note: string | null; sourceUrl: string; verifiedAt: string | null };
export type PublicAlert = { id: string; title: string; details: string; safetyInstructions: string; sourceUrl: string; issuingOffice: string; severity: string; barangays: string[]; publishedAt: string | null; startsAt: string; expiresAt: string };
const categories: Record<string, string> = { POLICE: "Police", FIRE: "Fire", MEDICAL: "Medical", RESCUE: "Rescue / disaster", BARANGAY: "Barangay", SOCIAL: "Social welfare", UTILITY: "Utilities", OTHER: "Other" };
const severityColor: Record<string, string> = {
  CRITICAL: "bg-red-100 text-red-800 border-red-200",
  WARNING: "bg-orange-100 text-orange-900 border-orange-200",
  ADVISORY: "bg-amber-100 text-amber-900 border-amber-200",
  INFORMATION: "bg-sky-100 text-sky-900 border-sky-200",
};
const categoryIcons: Record<string, typeof ShieldAlert> = { POLICE: ShieldCheck, FIRE: Flame, MEDICAL: HeartPulse, RESCUE: LifeBuoy };

export function PublicEmergency({ hotlines, alerts, dataAvailable }: { hotlines: PublicHotline[]; alerts: PublicAlert[]; dataAvailable: boolean }) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("ALL");
  const [barangay, setBarangay] = useState("ALL");
  const [copied, setCopied] = useState<string | null>(null);
  const filtered = useMemo(() => hotlines.filter(contact =>
    (category === "ALL" || contact.category === category) &&
    [contact.title, contact.office, contact.phone, contact.note || "", categories[contact.category] || ""].join(" ").toLowerCase().includes(search.toLowerCase().trim()),
  ), [hotlines, search, category]);
  const visibleAlerts = useMemo(() => alerts.filter(alert => barangay === "ALL" || alert.barangays.includes(barangay)), [alerts, barangay]);

  async function copyNumber(id: string, number: string) {
    try { await navigator.clipboard.writeText(number); setCopied(id); } catch { setCopied(null); }
  }
  return <main className="min-h-screen bg-[#f5f9fc] px-4 pb-20 pt-10 text-[#183f5b] sm:px-8">
    <div className="mx-auto max-w-6xl space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3"><Link href="/" className="text-sm font-bold text-[#216994] hover:underline">← Back to eLingkod Bayan</Link><span className="rounded-full border border-[#cde2ef] bg-white px-3 py-1 text-xs font-semibold text-[#587990]">Los Baños, Laguna · Public access</span></div>
      <header className="rounded-3xl bg-[#103b60] px-6 py-9 text-white sm:px-10">
        <span className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[#b1e5f6]"><ShieldAlert size={18}/> Public safety</span>
        <h1 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">Emergency Hotlines & Alerts</h1>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-[#d0e6f4]">Tawag agad sa emergency services at tingnan ang verified advisory references para sa Los Baños. Hindi kailangan ng account para makatawag.</p>
        <p className="mt-3 text-xs leading-6 text-[#f6e4b5]">Hackathon prototype · Not an official LGU dispatch service. Calls open your phone dialer; this website does not place a call or dispatch responders automatically.</p>
      </header>

      {!dataAvailable && <div role="alert" className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm font-bold text-amber-900">The live Los Baños directory and advisory feed are currently unavailable. National 911 and Red Cross 143 remain accessible below. Please verify updates directly with official authorities.</div>}
      <section aria-labelledby="emergency-911" className="rounded-3xl border border-red-200 bg-white p-5 shadow-sm sm:p-7">
        <p className="text-xs font-extrabold uppercase tracking-widest text-red-700">Immediate danger? Call now</p>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-5"><div><h2 id="emergency-911" className="text-4xl font-black text-red-700">911</h2><p className="mt-2 text-sm text-[#496679]">National Emergency Hotline · Police, fire, medical and rescue emergencies</p><a href="https://ehotlines.e.gov.ph/" target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-1 text-xs text-[#24688e] underline">Government source <ExternalLink size={12}/></a></div><a href="tel:911" className="inline-flex min-h-13 w-full items-center justify-center gap-3 rounded-2xl bg-red-700 px-7 py-4 text-base font-extrabold text-white hover:bg-red-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-700 sm:w-auto"><PhoneCall size={21}/> Call 911</a></div>
      </section>

      <section aria-labelledby="hotline-directory" className="space-y-4">
        <div><h2 id="hotline-directory" className="text-xl font-extrabold">Emergency contact directory</h2><p className="mt-1 text-xs text-[#6a879a]">Only published/verified contacts appear below. Local numbers must be approved using an official source.</p></div>
        <div className="grid gap-3 sm:grid-cols-[1fr_220px]"><label className="flex items-center gap-3 rounded-xl border border-[#d3e2eb] bg-white px-4"><Search size={17} className="text-[#6b8aa0]"/><input className="min-h-12 w-full bg-transparent text-sm outline-none" value={search} onChange={e=>setSearch(e.target.value)} type="search" placeholder="Search hotline, office or number" aria-label="Search hotlines" /></label><label><span className="sr-only">Contact category</span><select className="min-h-12 w-full rounded-xl border border-[#d3e2eb] bg-white px-3 text-sm" value={category} onChange={e=>setCategory(e.target.value)}><option value="ALL">All categories</option>{Object.entries(categories).map(([id,label])=><option key={id} value={id}>{label}</option>)}</select></label></div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{filtered.map(contact=>{ const Icon = categoryIcons[contact.category] || PhoneCall; return <article key={contact.id} className="flex flex-col rounded-2xl border border-[#dce7ee] bg-white p-5 shadow-sm"><div className="flex items-center gap-2"><span className="grid size-9 place-items-center rounded-xl bg-[#e9f4f9] text-[#286d91]"><Icon size={19}/></span><span className="text-[11px] font-bold text-[#607e91]">{categories[contact.category] || "Emergency contact"}</span></div><h3 className="mt-4 text-base font-extrabold">{contact.title}</h3><p className="mt-1 text-xs text-[#627f91]">{contact.office}</p><p className="mt-3 text-2xl font-black tracking-tight text-[#143f60]">{contact.phone}</p>{contact.extension && <p className="text-xs font-semibold text-orange-700">Ask operator for extension {contact.extension}</p>}{contact.note && <p className="mt-2 text-xs leading-5 text-[#607a8a]">{contact.note}</p>}<div className="mt-auto flex gap-2 pt-5"><a href={`tel:${contact.phone.replace(/[^+\d]/g, "")}`} className="flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-[#134b71] px-3 text-sm font-bold text-white hover:bg-[#1b6a95]"><PhoneCall size={16}/> Call</a><button type="button" onClick={()=>copyNumber(contact.id, contact.phone)} aria-label={`Copy ${contact.phone}`} className="flex min-h-11 items-center gap-1 rounded-xl border border-[#d4e2ec] px-3 text-xs font-bold"><Copy size={15}/>{copied===contact.id?"Copied":"Copy"}</button></div><a href={contact.sourceUrl} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex items-center gap-1 text-xs text-[#34749a] underline">Reference / verification source <ExternalLink size={12}/></a>{contact.verifiedAt && <span className="mt-2 inline-flex items-center gap-1 text-[11px] text-[#6c8594]"><CheckCircle2 size={12}/> Admin verified {new Date(contact.verifiedAt).toLocaleDateString("en-PH")}</span>}</article>;})}</div>
        {!filtered.length && <p className="rounded-xl border border-dashed border-[#cadde8] bg-white p-6 text-sm text-[#54748a]">Walang verified contact na tumutugma sa filter. Para sa emergency, gamitin ang 911.</p>}
        <p className="text-xs text-[#6a8598]"><Info size={13} className="mr-1 inline"/>Local PNP, BFP, MDRRMO, hospital, barangay and utility hotlines will only be displayed once Admin verifies the correct number and source. Hindi kami maglalagay ng unconfirmed numbers.</p>
      </section>

      <section aria-labelledby="public-advisories" className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3"><div><h2 id="public-advisories" className="flex items-center gap-2 text-xl font-extrabold"><BellRing size={21}/> LGU Advisories & Alerts</h2><p className="mt-1 text-xs text-[#6a879a]">Only Admin-published, currently active advisories appear here. No demo alert is presented as live.</p></div><label className="flex items-center gap-2 text-xs font-bold"><MapPin size={16}/> Barangay <select className="min-h-11 max-w-52 rounded-lg border border-[#cbdde7] bg-white px-2" value={barangay} onChange={e=>setBarangay(e.target.value)}><option value="ALL">All barangays</option>{LOS_BANOS_BARANGAYS.map(b=><option key={b} value={b}>{b}</option>)}</select></label></div>
        {!visibleAlerts.length ? <div className="rounded-2xl border border-[#d7e6ee] bg-white p-7"><p className="font-bold text-[#255774]">{dataAvailable ? `No active published advisories${barangay!=="ALL"?` for ${barangay}`:""}.` : "Live advisory feed currently unavailable."}</p><p className="mt-2 text-sm text-[#64849a]">Hindi ibig sabihin nito na walang panganib. Check the latest updates directly from <a href="https://www.pagasa.dost.gov.ph/" className="underline" target="_blank" rel="noopener noreferrer">PAGASA</a> and your local LGU. For immediate danger, call 911.</p></div> :
        <div className="space-y-3">{visibleAlerts.map(alert=><article key={alert.id} className="rounded-2xl border border-[#dbe6ed] bg-white p-6"><div className="flex flex-wrap gap-2"><span className={`rounded-full border px-3 py-1 text-[11px] font-black ${severityColor[alert.severity] || severityColor.INFORMATION}`}>{alert.severity}</span><span className="text-xs text-[#7a92a1]">Published {alert.publishedAt ? new Date(alert.publishedAt).toLocaleString("en-PH") : ""}</span></div><h3 className="mt-3 text-lg font-extrabold">{alert.title}</h3><p className="mt-2 whitespace-pre-line text-sm leading-7 text-[#496d81]">{alert.details}</p><div className="mt-4 rounded-xl bg-[#f1f7fb] p-4"><h4 className="text-xs font-extrabold">Safety instructions</h4><p className="mt-1 whitespace-pre-line text-sm leading-6">{alert.safetyInstructions}</p></div><p className="mt-3 text-xs text-[#647f90]"><strong>Affected barangays:</strong> {alert.barangays.join(", ")}</p><p className="mt-1 text-xs text-[#647f90]"><strong>Issued by:</strong> {alert.issuingOffice} · <strong>Valid until:</strong> {new Date(alert.expiresAt).toLocaleString("en-PH")}</p><a href={alert.sourceUrl} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-[#2775a0] underline">View official reference <ExternalLink size={13}/></a></article>)}</div>}
      </section>
      <footer className="rounded-xl border border-[#dce9ee] bg-white px-5 py-4 text-xs leading-6 text-[#667f8f]">For non-urgent potholes, drainage or community complaints, use <Link className="font-bold text-[#286c94] underline" href="/reports/new">Civic Reporting</Link>. Civic Reports do not dispatch emergency responders. Browser calling depends on your device and calling app.</footer>
    </div>
  </main>;
}
