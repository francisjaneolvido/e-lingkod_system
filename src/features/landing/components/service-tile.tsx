import { ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { ServiceIcon } from "./service-icon";
import type { Service } from "../data/services";

type Props = {
  service: Service;
  onExplore: (service: Service) => void;
  isLgu?: boolean;
};

const descriptionLines: Record<string, string> = {
  directory: "LGU offices, services, at ongoing at future projects.",
  jobs: "Tuklasin ang mga local job vacancies at opportunities na akma sa iyong skills.",
  census: "Hiwalay na Community Census module na nakalaan para sa susunod na implementation phase.",
  services: "Mag-file ng permits, IDs at clearances online.",
  emergency: "Emergency contacts at official disaster advisories.",
  civic: "I-report ang concern at i-track ang aksyon.",
};

export function ServiceTile({ service, onExplore, isLgu = false }: Props) {
  return (
    <article id={`service-${service.id}`} className={`group relative flex min-w-0 scroll-mt-28 overflow-hidden rounded-[22px] border border-border bg-card transition duration-200 hover:-translate-y-0.5 hover:border-border hover:shadow-[0_20px_35px_rgba(16,60,95,.07)] min-h-[265px] flex-col p-6 sm:p-7`}>
      <div className="pointer-events-none absolute -bottom-16 -right-16 size-44 rounded-full opacity-50 transition-transform duration-300 group-hover:scale-125" style={{ background: service.surface }} />
      <div className={`relative flex min-w-0 flex-1 flex-col`}>
        <ServiceIcon icon={service.icon} />
        <div className="min-w-0">
          <p className={`mt-5 text-xs font-bold uppercase tracking-[.13em] text-muted-foreground`}>{service.number} / 06 · {service.group}</p>
          <h3 className="mt-2 text-[18px] font-extrabold leading-6 tracking-[-.025em] text-foreground">{service.id === "services" ? <Link href="/services" className="hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2">{service.title}</Link> : service.id === "jobs" ? <Link href="/community-employment" className="hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2">{service.title}</Link> : service.id === "census" ? <Link href="/community-census" className="hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2">{service.title}</Link> : service.title}</h3>
          <p className="mt-2.5 text-[12px] leading-[1.75] text-muted-foreground">{descriptionLines[service.id] ?? service.description}</p>
        </div>
      </div>
      <div className={`relative mt-6 flex items-center justify-between border-t border-border pt-4`}>
        <span className="text-xs font-semibold text-muted-foreground">{service.id === "civic" ? "Citizen reporting · Available" : service.id === "services" ? "Digital requests · Available" : service.id === "jobs" ? "Survey & opportunity discovery · Available" : service.id === "census" ? "Census · Planned" : "Service preview"}</span>
        {service.id === "civic" ? <Link href={isLgu ? "/admin" : "/reports/new"} className="inline-flex min-h-9 items-center gap-2 text-[12px] font-bold text-foreground">{isLgu ? "LGU workspace" : "Report concern"} <ArrowUpRight size={16} /></Link> : service.id === "services" ? <Link href={isLgu ? "/admin/services" : "/services"} className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-primary px-4 text-[12px] font-extrabold text-white transition hover:bg-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-border">{isLgu ? "Service desk" : "Open services"} <ArrowUpRight size={16} /></Link> : service.id === "jobs" ? <Link href={isLgu ? "/admin/jobs" : "/community-employment"} className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-primary px-4 text-[12px] font-extrabold text-white transition hover:bg-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-border">{isLgu ? "Job workspace" : "Open module"} <ArrowUpRight size={16} /></Link> : service.id === "census" ? <Link href={isLgu ? "/admin/census" : "/community-census"} className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-primary px-4 text-[12px] font-extrabold text-white transition hover:bg-primary">Preview census <ArrowUpRight size={16} /></Link> : <button type="button" onClick={() => onExplore(service)} className="inline-flex min-h-9 items-center gap-2 rounded-full text-xs font-bold text-foreground transition hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-border" aria-label={`See ${service.title} details`}>View details <ArrowUpRight size={16} /></button>}
      </div>
    </article>
  );
}
