import { ArrowUpRight } from "lucide-react";
import { ServiceIcon } from "./service-icon";
import type { Service } from "../data/services";

type Props = {
  service: Service;
  onExplore: (service: Service) => void;
};

const descriptionLines: Record<string, string> = {
  directory: "Mga opisina, requirements, bayarin at gabay sa pagproseso.",
  jobs: "Hanapin ang trabaho at i-match ang skills sa businesses.",
  census: "Tulong sa pag-unawa sa workforce at social needs ng komunidad.",
  services: "Mag-file ng permits, taxes at clearances online.",
  emergency: "Emergency contacts at official disaster advisories.",
  civic: "I-report ang concern at i-track ang aksyon.",
};

export function ServiceTile({ service, onExplore }: Props) {
  return (
    <article id={`service-${service.id}`} className={`group relative flex min-w-0 scroll-mt-28 overflow-hidden rounded-[22px] border border-[#dce9f1] bg-white transition duration-200 hover:-translate-y-0.5 hover:border-[#9fc8df] hover:shadow-[0_20px_35px_rgba(16,60,95,.07)] min-h-[265px] flex-col p-6 sm:p-7`}>
      <div className="pointer-events-none absolute -bottom-16 -right-16 size-44 rounded-full opacity-50 transition-transform duration-300 group-hover:scale-125" style={{ background: service.surface }} />
      <div className={`relative flex min-w-0 flex-1 flex-col`}>
        <ServiceIcon icon={service.icon} />
        <div className="min-w-0">
          <p className={`mt-5 text-[10px] font-bold uppercase tracking-[.13em] text-[#8ba0b0]`}>{service.number} / 06 · {service.group}</p>
          <h3 className="mt-2 text-[18px] font-extrabold leading-6 tracking-[-.025em] text-[#173f64]">{service.title}</h3>
          <p className="mt-2.5 text-[12px] leading-[1.75] text-[#648198]">{descriptionLines[service.id] ?? service.description}</p>
        </div>
      </div>
      <div className={`relative mt-6 flex items-center justify-between border-t border-[#eaf0f4] pt-4`}>
        <span className="text-[10px] font-semibold text-[#839aaa]">Service preview</span>
        <button type="button" onClick={() => onExplore(service)} className="inline-flex min-h-9 items-center gap-2 rounded-full text-[11px] font-bold text-[#176caa] transition hover:text-[#0c4571] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#176caa]" aria-label={`See ${service.title} details`}>View details <ArrowUpRight size={16} /></button>
      </div>
    </article>
  );
}
