"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight, ArrowUpRight, CheckCircle2, ClipboardList,
  FileCheck2, ImagePlus, Info, MapPinned, PhoneCall, Search,
  ShieldAlert, X,
} from "lucide-react";
import { services, type Service, type ServiceGroup } from "../data/services";
import { ServiceDetailDialog } from "../components/service-detail-dialog";
import { ServiceTile } from "../components/service-tile";
import { ServiceIcon } from "../components/service-icon";

const categories = [
  { label: "Lahat ng serbisyo", value: "All" },
  { label: "Para sa komunidad", value: "Community" },
  { label: "Government services", value: "Government" },
  { label: "Trabaho at datos", value: "Opportunities" },
] as const;

type Category = "All" | ServiceGroup;

const searchKeywords: Record<string, string> = {
  civic: "report concern complaint kalsada baha basura streetlight picture larawan gps location geotagging tracking",
  services: "permit tax taxes clearance business license filing document application online",
  emergency: "police pnp bfp fire hospital ospital mdrrmo typhoon bagyo hotline alerts disaster call",
  directory: "guide offices opisina requirements fees bayarin directory department city hall projects ongoing future",
  jobs: "hiring employment employer business work trabaho skills vacancies jobseeker SPES survey",
  census: "worker workforce census social status employment household survey statistics data",
};

function GetDetailsButton({ service, onExplore, children, light = false, isLgu = false }: {
  service: Service; onExplore: (service: Service) => void; children: React.ReactNode; light?: boolean; isLgu?: boolean;
}) {
  if (service.id === "jobs") return <Link href="/community-employment" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-primary px-5 py-2.5 text-[12px] font-extrabold text-white hover:bg-primary">Open employment & livelihood <ArrowUpRight size={17} /></Link>;
  if (service.id === "census") return <Link href="/community-census" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-primary px-5 py-2.5 text-[12px] font-extrabold text-white hover:bg-primary">Preview community census <ArrowUpRight size={17} /></Link>;
  if (service.id === "civic") return <Link href={isLgu ? "/admin" : "/reports/new"} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-card px-5 py-2.5 text-[12px] font-extrabold text-foreground transition hover:bg-muted">{isLgu ? "Open LGU workspace" : "Mag-report ng concern"} <ArrowUpRight size={17} /></Link>;
  return (
    <button type="button" onClick={() => onExplore(service)}
      className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-5 py-2.5 text-[12px] font-extrabold transition focus-visible:outline-2 focus-visible:outline-offset-2 ${light ? "bg-card text-foreground hover:bg-muted focus-visible:outline-white" : "bg-primary text-white hover:bg-primary focus-visible:outline-border"}`}>
      {children}<ArrowUpRight size={17} />
    </button>
  );
}

export function ServicesSection({ isLgu = false }: { isLgu?: boolean }) {
  const [category, setCategory] = useState<Category>("All");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Service | null>(null);
  const normalizedQuery = search.trim().toLowerCase();
  const isDefaultView = !normalizedQuery && category === "All";

  const matches = useMemo(() => services.filter(service => {
    if (category !== "All" && service.group !== category) return false;
    if (!normalizedQuery) return true;
    const haystack = [service.title, service.description, service.shortTitle, service.group,
      searchKeywords[service.id], ...service.details.map(detail => detail.text)].join(" ").toLowerCase();
    return haystack.includes(normalizedQuery);
  }), [category, normalizedQuery]);

  const civic = services[0];
  const online = services[1];
  const emergency = services[2];
  const directory = services[3];
  const jobs = services[4];
  const census = services[5];

  return (
    <section id="services" aria-labelledby="services-heading" className="scroll-mt-24 overflow-hidden bg-card px-5 py-16 sm:px-8 sm:py-20 lg:px-12 lg:py-24">
      <div className="mx-auto max-w-[1344px]">
        <div className="grid items-end gap-7 lg:grid-cols-[minmax(0,1fr)_minmax(280px,390px)] lg:gap-12">
          <div>
            <p className="flex items-center gap-3 text-xs font-extrabold uppercase tracking-[.15em] text-foreground"><span className="h-1 w-8 rounded-full bg-brand-gold" /> Digital service desk</p>
            <h2 id="services-heading" className="mt-4 max-w-[730px] text-[clamp(2rem,3.1vw,3.35rem)] font-extrabold leading-[1.12] tracking-[-.045em] text-foreground">
              Ano ang maitutulong <span className="text-muted-foreground">namin sa&apos;yo?</span>
            </h2>
            <p className="mt-4 max-w-[660px] text-[13px] leading-7 text-muted-foreground sm:text-[14px]">Mula pag-report ng concern hanggang paghanap ng trabaho, alamin kung paano makatutulong ang anim na serbisyo ng E-Lingkod Bayan.</p>
          </div>
          <div>
            <label htmlFor="elb-service-search" className="mb-2 block text-xs font-extrabold text-foreground">Maghanap ng serbisyo</label>
            <div className="relative">
              <Search size={19} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input id="elb-service-search" type="search" value={search} onChange={event => setSearch(event.target.value)} placeholder="Hal. permit, report, bagyo, trabaho..." className="h-13 w-full rounded-2xl border border-border bg-card py-3 pl-12 pr-11 text-[12px] font-medium text-foreground shadow-[0_6px_22px_rgba(18,65,103,.04)] outline-none transition placeholder:font-normal placeholder:text-muted-foreground focus:border-border focus:ring-4 focus:ring-border" />
              {search && <button type="button" aria-label="Clear service search" onClick={() => setSearch("")} className="absolute right-3 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground hover:bg-muted"><X size={17} /></button>}
            </div>
          </div>
        </div>

        <div className="mt-8 flex flex-wrap items-center gap-2" role="group" aria-label="Filter by service category">
          {categories.map(item => (
            <button key={item.value} type="button" aria-pressed={category === item.value} onClick={() => setCategory(item.value)} className={`min-h-10 rounded-full px-4 py-2 text-xs font-extrabold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-border ${category === item.value ? "bg-primary text-white shadow-[0_6px_14px_rgba(20,62,101,.13)]" : "border border-border bg-card text-muted-foreground hover:border-border hover:text-foreground"}`}>
              {item.label}
            </button>
          ))}
          <p className="ml-auto py-2 text-xs font-semibold text-muted-foreground" aria-live="polite">{matches.length} / 6 services</p>
        </div>

        {isDefaultView ? (
          <div className="mt-7 grid gap-4 lg:grid-cols-12 lg:gap-5">
            {/* Featured civic service: an editorial hero instead of another generic card. */}
            <article id="service-civic" className="relative isolate flex min-h-[510px] scroll-mt-28 flex-col overflow-hidden rounded-[26px] bg-primary text-white shadow-[0_16px_38px_rgba(18,62,100,.14)] sm:min-h-[440px] lg:col-span-7 lg:min-h-[490px]">
              <div className="absolute inset-y-0 right-0 w-full sm:w-[58%]">
                <Image src="/images/landing/neighbors-at-work.webp" alt="Illustrative community volunteers supporting a neighborhood clean-up" fill sizes="(max-width:640px) 100vw, (max-width:1024px) 58vw, 35vw" className="object-cover" />
              </div>
              <div className="absolute inset-0 bg-gradient-to-t from-[#123e64] via-[#123e64]/95 to-[#123e64]/50 sm:bg-gradient-to-r sm:from-[#123e64] sm:via-[#123e64] sm:to-[#123e64]/5" />
              <div className="relative flex flex-1 flex-col justify-between p-7 sm:max-w-[70%] sm:p-9 lg:p-10">
                <div>
                  <div className="flex flex-wrap items-center gap-3">
                    <ServiceIcon icon={civic.icon} />
                    <span className="inline-flex items-center rounded-full border border-white/25 bg-card/10 px-3.5 py-2 text-xs font-extrabold uppercase tracking-[.1em] text-on-brand-gold">Featured service · 01 / 06</span>
                  </div>
                  <h3 className="mt-7 max-w-[420px] text-[clamp(2rem,3.1vw,3.2rem)] font-extrabold leading-[1.12] tracking-[-.045em]">May concern sa inyong lugar?</h3>
                  <p className="mt-4 max-w-[390px] text-[13px] leading-7 text-on-brand-muted">I-report ang concern sa komunidad at sundan ang progress nito mula submission hanggang resolution.</p>
                  <div className="mt-6 flex flex-wrap gap-2">
                    {[{ icon: ImagePlus, text: "Photo evidence" }, { icon: MapPinned, text: "GPS location" }, { icon: ClipboardList, text: "Tracking ID" }].map(({ icon: Icon, text }) => (
                      <span key={text} className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-card/10 px-3 py-1.5 text-xs font-semibold text-white"><Icon size={13} />{text}</span>
                    ))}
                  </div>
                </div>
                <div className="mt-8"><GetDetailsButton service={civic} onExplore={setSelected} isLgu={isLgu} light>Mag-report ng concern</GetDetailsButton><p className="mt-3 text-xs text-white/70">Citizen reports · photos, location & progress history</p></div>
              </div>
              <span className="pointer-events-none absolute bottom-6 right-6 hidden rounded-full border border-white/35 bg-primary/70 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur-sm sm:inline">Community illustration</span>
            </article>

            <div className="grid gap-4 lg:col-span-5 lg:grid-rows-2 lg:gap-5">
              <article id="service-services" className="relative isolate flex min-h-[225px] scroll-mt-28 flex-col justify-between overflow-hidden rounded-[25px] border border-border bg-muted p-6 sm:p-8">
                <div className="pointer-events-none absolute -right-8 -top-9 flex size-48 rotate-[-12deg] items-center justify-center rounded-[40px] border-[18px] border-border text-muted-foreground"><FileCheck2 size={88} strokeWidth={1.3}/></div>
                <div className="relative flex max-w-[350px] items-start gap-3">
                  <ServiceIcon icon={online.icon} className="bg-card/90" />
                  <div className="min-w-0">
                    <p className="text-xs font-extrabold uppercase tracking-[.14em] text-foreground">02 · Digital applications</p>
                    <h3 className="mt-3 text-[24px] font-extrabold leading-tight tracking-[-.035em] text-foreground">Online LGU Services</h3>
                    <p className="mt-2 text-[12px] leading-6 text-muted-foreground">Permits, taxes at clearances—mas simpleng proseso, mas kaunting pila.</p>
                  </div>
                </div>
                <div className="relative mt-4 flex flex-wrap items-center justify-between gap-3"><span className="text-xs font-semibold text-muted-foreground">Request · Review · Schedule · Track</span><Link href={isLgu ? "/admin/services" : "/services"} className="inline-flex min-h-10 items-center gap-2 rounded-full bg-card px-4 py-2 text-xs font-extrabold text-foreground transition hover:bg-card focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-border">{isLgu ? "Open service desk" : "Open services"} <ArrowRight size={15} /></Link></div>
              </article>
              <article id="service-emergency" className="relative isolate flex min-h-[225px] scroll-mt-28 flex-col justify-between overflow-hidden rounded-[25px] border border-border bg-muted p-6 sm:p-8">
                <div className="pointer-events-none absolute -right-10 -top-10 flex size-48 rotate-12 items-center justify-center rounded-full border-[17px] border-border text-muted-foreground"><ShieldAlert size={86} strokeWidth={1.3}/></div>
                <div className="relative flex max-w-[350px] items-start gap-3">
                  <ServiceIcon icon={emergency.icon} className="bg-card/90" />
                  <div className="min-w-0">
                    <p className="text-xs font-extrabold uppercase tracking-[.14em] text-foreground">03 · Public safety</p>
                    <h3 className="mt-3 text-[24px] font-extrabold leading-tight tracking-[-.035em] text-foreground">Emergency Hotlines &amp; Alerts</h3>
                    <p className="mt-2 text-[12px] leading-6 text-muted-foreground">One-tap access sa verified hotlines at mga opisyal na advisory.</p>
                  </div>
                </div>
                <div className="relative mt-4 flex flex-wrap items-center justify-between gap-3"><span className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground"><PhoneCall size={13} /> PNP · BFP · Hospital · MDRRMO</span><Link href={isLgu ? "/admin/emergency" : "/emergency"} className="inline-flex min-h-10 items-center gap-2 rounded-full bg-card px-4 py-2 text-xs font-extrabold text-foreground transition hover:bg-card focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-border">{isLgu ? "Open emergency desk" : "Open hotlines"} <ArrowRight size={15} /></Link></div>
              </article>
            </div>
            <div className="lg:col-span-4"><ServiceTile service={directory} onExplore={setSelected} isLgu={isLgu} /></div>
            <div className="lg:col-span-4"><ServiceTile service={jobs} onExplore={setSelected} isLgu={isLgu} /></div>
            <div className="lg:col-span-4"><ServiceTile service={census} onExplore={setSelected} isLgu={isLgu} /></div>
          </div>
        ) : matches.length > 0 ? (
          <div className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-3 xl:gap-5">
            {matches.map(service => <ServiceTile key={service.id} service={service} onExplore={setSelected} isLgu={isLgu} />)}
          </div>
        ) : (
          <div className="mt-7 flex min-h-56 flex-col items-center justify-center rounded-[22px] border border-dashed border-border bg-card px-6 py-8 text-center">
            <Search size={30} className="text-muted-foreground" />
            <h3 className="mt-4 text-[16px] font-extrabold text-foreground">Walang nahanap na serbisyo</h3>
            <p className="mt-2 text-[12px] text-muted-foreground">Subukang baguhin ang keyword o category.</p>
            <button type="button" onClick={() => { setSearch(""); setCategory("All"); }} className="mt-5 rounded-full bg-primary px-5 py-2.5 text-[12px] font-bold text-white">Show all services</button>
          </div>
        )}
        <div className="mt-7 flex items-start gap-3 rounded-xl border border-border bg-card/90 px-4 py-3.5 text-xs leading-[1.7] text-muted-foreground">
          <Info className="mt-0.5 size-4 shrink-0 text-foreground" />
          <p><strong className="text-foreground">Civic Reporting, Online LGU Services and Job Matching / Opportunity Recommendations are available.</strong> Employment survey insights are part of Job Matching. Community Census and municipal projects remain planned modules. Emergency Hotlines & Alerts is available with verified numbers and approved advisories.</p>
        </div>
        <p className="mt-4 flex items-center gap-2 text-xs font-semibold text-muted-foreground"><CheckCircle2 size={15} className="text-success" /> Anim na approved modules · Isang portal para sa komunidad</p>
      </div>
      <ServiceDetailDialog service={selected} onClose={() => setSelected(null)} isLgu={isLgu} />
    </section>
  );
}
