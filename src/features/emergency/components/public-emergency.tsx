"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  BellRing, CheckCircle2, ChevronDown, Copy, ExternalLink, Flame, HeartPulse,
  Info, LifeBuoy, MapPin, Phone, Search, ShieldAlert, ShieldCheck,
} from "lucide-react";
import { LOS_BANOS_BARANGAYS } from "@/features/emergency/domain";

export type PublicHotline = {
  id: string; title: string; category: string; office: string; phone: string;
  extension: string | null; note: string | null; sourceUrl: string; verifiedAt: string | null;
};
export type PublicAlert = {
  id: string; title: string; details: string; safetyInstructions: string; sourceUrl: string;
  issuingOffice: string; severity: string; barangays: string[]; publishedAt: string | null;
  startsAt: string; expiresAt: string;
};

const categories: Record<string, string> = {
  POLICE: "Police", FIRE: "Fire", MEDICAL: "Medical", RESCUE: "Rescue",
  BARANGAY: "Barangay", SOCIAL: "Social welfare", UTILITY: "Utilities", OTHER: "Other",
};
const categoryIcons: Record<string, typeof ShieldAlert> = {
  POLICE: ShieldCheck, FIRE: Flame, MEDICAL: HeartPulse, RESCUE: LifeBuoy,
};
const severityStyles: Record<string, string> = {
  CRITICAL: "border-red-300 bg-red-100 text-red-800",
  WARNING: "border-orange-300 bg-orange-100 text-orange-900",
  ADVISORY: "border-amber-300 bg-amber-100 text-amber-900",
  INFORMATION: "border-sky-200 bg-sky-100 text-sky-800",
};
const formattedDate = (value: string) => new Date(value).toLocaleString("en-PH", {
  dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Manila",
});
const numberForDialer = (value: string) => value.replace(/[^+\d]/g, "");

export function PublicEmergency({ hotlines, alerts, dataAvailable }: {
  hotlines: PublicHotline[]; alerts: PublicAlert[]; dataAvailable: boolean;
}) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("ALL");
  const [barangay, setBarangay] = useState("ALL");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // National shortcuts stay accessible above the filters, even while the DB is down.
  const localHotlines = useMemo(() => hotlines.filter(row =>
    row.id !== "national-911" && row.id !== "red-cross-143"), [hotlines]);
  const filtered = useMemo(() => localHotlines.filter(row =>
    (category === "ALL" || row.category === category) &&
    [row.title, row.office, row.phone, row.note || "", categories[row.category] || ""]
      .join(" ").toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()),
  ), [localHotlines, search, category]);
  const visibleAlerts = useMemo(() => alerts.filter(row =>
    barangay === "ALL" || row.barangays.includes(barangay),
  ), [alerts, barangay]);

  async function copyNumber(id: string, number: string) {
    try { await navigator.clipboard.writeText(number); setCopiedId(id); }
    catch { setCopiedId(null); }
  }

  return (
    <main className="min-h-screen bg-[#f6f9fc] px-3 pb-16 pt-4 text-[#153d58] sm:px-6 sm:pt-6">
      <div className="mx-auto max-w-5xl space-y-4">
        <nav className="flex flex-wrap items-center justify-between gap-2 text-xs">
          <Link href="/" className="font-bold text-[#226a93] hover:underline">← Back to eLingkod Bayan</Link>
          <span className="rounded-full border border-[#d5e4ec] bg-white px-3 py-1.5 font-semibold">Los Baños, Laguna · No login needed</span>
        </nav>

        <header className="rounded-2xl bg-[#123e5f] px-4 py-4 text-white sm:px-6">
          <div className="flex items-center gap-2 text-[#bae8f7]"><ShieldAlert size={19} aria-hidden="true" />
            <p className="text-xs font-extrabold uppercase tracking-wider">Public safety</p>
          </div>
          <h1 className="mt-1 text-xl font-extrabold tracking-tight sm:text-2xl">Emergency Hotlines & Alerts</h1>
          <p className="mt-1 text-xs text-[#deedf6] sm:text-sm">Tap to call, find verified local contacts, and check official LGU advisories.</p>
          <p className="mt-2 text-[11px] leading-5 text-[#ffecb8]">Prototype only, not an LGU dispatch service. Calling opens your device dialer; your phone must confirm the call.</p>
        </header>

        {!dataAvailable && (
          <div role="alert" className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-xs font-semibold text-amber-950">
            Local contacts and advisories could not be loaded. This does NOT mean there is no emergency. The national numbers below remain available.
          </div>
        )}

        <section aria-label="National emergency numbers" className="grid gap-2 sm:grid-cols-[1.5fr_1fr]">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-red-200 bg-white p-4 shadow-sm">
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-extrabold uppercase tracking-wide text-red-700">Immediate danger</p>
              <div className="mt-0.5 flex items-baseline gap-2"><strong className="text-3xl font-black tabular-nums text-red-700">911</strong><span className="text-xs font-semibold text-[#4b677a]">National Emergency Hotline</span></div>
              <p className="text-xs text-[#567489]">Police · Fire · Medical · Rescue</p>
            </div>
            <a href="tel:911" aria-label="Call national emergency hotline 911" className="inline-flex min-h-12 min-w-32 items-center justify-center gap-2 rounded-xl bg-red-700 px-4 text-sm font-extrabold text-white hover:bg-red-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-700">
              <Phone size={18} aria-hidden="true" /> Call 911
            </a>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#d9e6ee] bg-white p-4 shadow-sm">
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-bold uppercase tracking-wide text-[#3b708d]">Red Cross</p>
              <strong className="text-2xl font-black tabular-nums">143</strong>
              <p className="text-xs text-[#567489]">Philippine Red Cross hotline</p>
            </div>
            <a href="tel:143" aria-label="Call Philippine Red Cross 143" className="inline-flex min-h-12 min-w-28 items-center justify-center gap-2 rounded-xl bg-[#16547c] px-4 text-sm font-extrabold text-white hover:bg-[#20688e] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#16547c]">
              <Phone size={17} aria-hidden="true" /> Call 143
            </a>
          </div>
        </section>
        <p className="-mt-2 text-[11px] text-[#608095]">
          Official references: <a href="https://ehotlines.e.gov.ph/" target="_blank" rel="noopener noreferrer" className="underline">Emergency 911</a> · <a href="https://redcross.org.ph/contact-us/" target="_blank" rel="noopener noreferrer" className="underline">Philippine Red Cross</a>
        </p>

        <section id="emergency-alerts" aria-labelledby="alert-heading" className="rounded-2xl border border-[#dbe7ee] bg-white p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2"><BellRing size={18} className="text-[#256889]" aria-hidden="true" /><h2 id="alert-heading" className="text-base font-extrabold">LGU advisories</h2>
              <span className="rounded-full bg-[#eaf3f8] px-2 py-0.5 text-[11px] font-bold">{dataAvailable ? visibleAlerts.length : "Unavailable"}</span>
            </div>
            <label className="flex min-w-0 items-center gap-2 text-xs font-semibold"><MapPin size={15} aria-hidden="true" /><span className="sr-only">Filter advisories by barangay</span>
              <select className="min-h-11 max-w-52 rounded-lg border border-[#d4e3ec] bg-white px-2 text-xs" value={barangay} onChange={event => setBarangay(event.target.value)} aria-label="Filter advisories by barangay">
                <option value="ALL">All barangays</option>{LOS_BANOS_BARANGAYS.map(value => <option key={value} value={value}>{value}</option>)}
              </select>
            </label>
          </div>
          {!dataAvailable ? (
            <p className="mt-3 rounded-xl bg-amber-50 p-3 text-xs text-amber-900">Live advisory data is unavailable. Check <a className="font-bold underline" href="https://www.pagasa.dost.gov.ph/" target="_blank" rel="noopener noreferrer">PAGASA</a> and official LGU channels directly.</p>
          ) : !visibleAlerts.length ? (
            <p className="mt-3 rounded-xl bg-[#f3f8fb] px-3 py-3 text-xs leading-5 text-[#57758a]">No published active advisories{barangay !== "ALL" ? ` for ${barangay}` : ""} in this portal. <strong>This does not guarantee safety.</strong> Check official LGU and <a href="https://www.pagasa.dost.gov.ph/" target="_blank" rel="noopener noreferrer" className="underline">PAGASA</a> updates.</p>
          ) : (
            <div className="mt-3 space-y-2">
              {visibleAlerts.map(alert => (
                <details key={alert.id} open={alert.severity === "CRITICAL" || alert.severity === "WARNING"} className="group rounded-xl border border-[#dce8f0] bg-[#fbfdff]">
                  <summary className="flex cursor-pointer list-none items-start justify-between gap-3 p-3 marker:hidden [&::-webkit-details-marker]:hidden">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`rounded-md border px-2 py-0.5 text-[10px] font-extrabold ${severityStyles[alert.severity] || severityStyles.INFORMATION}`}>{alert.severity}</span>
                        <span className="text-[11px] text-[#68869a]">Issued {alert.publishedAt ? formattedDate(alert.publishedAt) : "recently"}</span>
                      </div>
                      <h3 className="mt-1 text-sm font-extrabold text-[#1a4968]">{alert.title}</h3>
                      <p className="mt-0.5 text-[11px] text-[#647e90]">{alert.barangays.length === LOS_BANOS_BARANGAYS.length ? "All Los Baños barangays" : alert.barangays.join(", ")}</p>
                    </div>
                    <ChevronDown size={17} className="mt-2 shrink-0 transition-transform group-open:rotate-180" aria-hidden="true" />
                  </summary>
                  <div className="space-y-2 border-t border-[#e0eaf0] p-3 text-xs leading-5 text-[#385f75]">
                    <p className="whitespace-pre-line">{alert.details}</p>
                    <div className="rounded-lg border-l-4 border-[#d69031] bg-amber-50 p-3"><strong className="text-amber-950">Safety instructions</strong><p className="mt-1 whitespace-pre-line">{alert.safetyInstructions}</p></div>
                    <p>Issued by {alert.issuingOffice} · Valid until {formattedDate(alert.expiresAt)}</p>
                    <a className="inline-flex items-center gap-1 font-bold text-[#1f698e] underline" href={alert.sourceUrl} target="_blank" rel="noopener noreferrer">Official source <ExternalLink size={12} aria-hidden="true" /></a>
                  </div>
                </details>
              ))}
            </div>
          )}
        </section>

        <section id="emergency-contacts" aria-labelledby="contact-heading" className="rounded-2xl border border-[#dbe7ee] bg-white p-4 sm:p-5">
          <div className="flex items-center justify-between gap-3"><div><h2 id="contact-heading" className="text-base font-extrabold">Local emergency contacts</h2><p className="text-[11px] text-[#678394]">Admin-verified numbers only · {localHotlines.length} listed</p></div></div>
          <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_175px]">
            <label className="flex min-h-11 items-center gap-2 rounded-xl border border-[#d4e2ec] px-3"><Search size={16} className="text-[#6d8fa2]" aria-hidden="true" /><span className="sr-only">Search local hotlines</span><input type="search" value={search} onChange={event => setSearch(event.target.value)} placeholder="Search office or number" className="w-full bg-transparent text-sm outline-none" /></label>
            <label><span className="sr-only">Hotline category</span><select className="min-h-11 w-full rounded-xl border border-[#d4e2ec] bg-white px-3 text-xs" value={category} onChange={event => setCategory(event.target.value)}><option value="ALL">All categories</option>{Object.entries(categories).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          </div>
          <div className="mt-3 divide-y divide-[#e8eef2]">
            {filtered.map(contact => {
              const Icon = categoryIcons[contact.category] || Phone;
              return (
                <article key={contact.id} className="py-3 first:pt-0 last:pb-0">
                  <div className="flex flex-wrap items-center gap-3 sm:flex-nowrap">
                    <span className="hidden size-9 shrink-0 place-items-center rounded-lg bg-[#e9f4fa] text-[#236b92] sm:grid"><Icon size={17} aria-hidden="true" /></span>
                    <div className="min-w-0 flex-1"><p className="text-sm font-extrabold">{contact.title}</p><p className="text-[11px] text-[#647f91]">{contact.office} · {categories[contact.category] || "Other"}</p><p className="text-base font-black tabular-nums text-[#164d72]">{contact.phone}{contact.extension ? <span className="ml-2 text-[11px] font-semibold text-[#996215]">Ext. {contact.extension}</span> : null}</p></div>
                    <div className="flex w-full shrink-0 gap-2 sm:w-auto"><a href={`tel:${numberForDialer(contact.phone)}`} className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-lg bg-[#17577e] px-4 text-sm font-extrabold text-white hover:bg-[#266d95] sm:flex-none" aria-label={`Call ${contact.title} at ${contact.phone}`}><Phone size={16} aria-hidden="true" /> Call</a><button type="button" onClick={() => void copyNumber(contact.id, contact.phone)} className="inline-flex min-h-11 min-w-11 items-center justify-center gap-1 rounded-lg border border-[#cddde7] px-3 text-xs font-bold" aria-label={`Copy ${contact.phone}`}><Copy size={15} aria-hidden="true" /><span aria-live="polite">{copiedId === contact.id ? "Copied" : "Copy"}</span></button></div>
                  </div>
                  <details className="mt-1 text-[11px] text-[#648298]"><summary className="cursor-pointer py-1 font-semibold text-[#276b91]">Source and calling notes</summary><div className="space-y-1 pt-1">{contact.note && <p>{contact.note}</p>}{contact.verifiedAt && <p className="flex items-center gap-1"><CheckCircle2 size={12} aria-hidden="true" /> Reviewed {formattedDate(contact.verifiedAt)}</p>}<a href={contact.sourceUrl} className="inline-flex items-center gap-1 underline" target="_blank" rel="noopener noreferrer">Verify source <ExternalLink size={12} aria-hidden="true" /></a></div></details>
                </article>
              );
            })}
          </div>
          {!filtered.length && <div className="mt-3 rounded-lg bg-[#f4f8fb] p-3 text-xs text-[#5a778b]">{localHotlines.length ? "No local contacts match the search or category." : "No local hotline has been verified yet."} For immediate danger, use 911 above.</div>}
          <p className="mt-3 flex items-start gap-1.5 text-[11px] leading-5 text-[#6b8292]"><Info size={13} className="mt-0.5 shrink-0" aria-hidden="true" />Local PNP, BFP, MDRRMO, hospital and barangay numbers only appear after Admin source verification.</p>
        </section>
        <footer className="rounded-xl border border-[#dce7ee] bg-white px-4 py-3 text-xs leading-5 text-[#5d788c]">For non-urgent issues, use <Link href="/reports/new" className="font-bold text-[#226a93] underline">Civic Reporting</Link>. It does not dispatch responders. Emergency calls require a supported phone or calling app.</footer>
      </div>
    </main>
  );
}
