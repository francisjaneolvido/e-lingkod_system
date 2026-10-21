"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { ArrowRight, CheckCircle2, Info, X } from "lucide-react";
import type { Service } from "../data/services";
import { ServiceIcon } from "./service-icon";

type Props = {
  service: Service | null;
  onClose: () => void;
  isLgu?: boolean;
};

export function ServiceDetailDialog({ service, onClose, isLgu = false }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (service && !dialog.open) dialog.showModal();
    if (!service && dialog.open) dialog.close();
  }, [service]);

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      onClick={(event) => {
        if (event.target === dialogRef.current) dialogRef.current?.close();
      }}
      aria-labelledby="service-dialog-title"
      className="fixed inset-0 m-auto max-h-[min(90dvh,800px)] w-[min(93vw,640px)] overflow-y-auto rounded-[24px] border border-[#dbe8f1] bg-white p-0 text-[#173e62] shadow-[0_28px_80px_rgba(7,33,58,.25)] backdrop:bg-[#0b2740]/65 backdrop:backdrop-blur-sm"
    >
      {service && (
        <div>
          <div className="relative overflow-hidden px-6 pb-7 pt-7 sm:px-9 sm:pt-9" style={{ background: service.surface }}>
            <div className="absolute -right-9 -top-16 size-52 rounded-full border-[28px] opacity-20" style={{ borderColor: service.color }} />
            <div className="relative flex items-start justify-between gap-4">
              <ServiceIcon icon={service.icon} size="lg" className="bg-white/85" />
              <button type="button" onClick={() => dialogRef.current?.close()} aria-label="Close service details" className="flex size-10 items-center justify-center rounded-full border border-white bg-white/90 text-[#335977] transition hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#286d9a]"><X size={19} /></button>
            </div>
            <p className="relative mt-6 text-[11px] font-extrabold uppercase tracking-[.15em]" style={{ color: service.color }}>Service {service.number} of 06 · {service.group}</p>
            <h2 id="service-dialog-title" className="relative mt-2 text-2xl font-extrabold tracking-[-.035em] text-[#173e62] sm:text-[30px]">{service.title}</h2>
            <p className="relative mt-3 max-w-lg text-[13px] leading-7 text-[#496b83]">{service.description}</p>
          </div>
          <div className="px-6 py-7 sm:px-9 sm:py-8">
            <h3 className="text-[14px] font-extrabold text-[#153c60]">Ano ang kasama sa serbisyong ito?</h3>
            <ul className="mt-4 space-y-3">
              {service.details.map(({ icon: Icon, text }) => (
                <li key={text} className="flex items-start gap-3 rounded-xl border border-[#e9eff4] bg-[#f8fafc] px-4 py-3.5 text-[12px] leading-6 text-[#4a6982]">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-[#dce8f0] bg-white text-[#153b63]"><Icon size={17} /></span>
                  <span className="pt-0.5">{text}</span>
                </li>
              ))}
            </ul>
            {service.note && <p className="mt-5 flex items-start gap-2 rounded-xl bg-[#fff8e8] px-4 py-3 text-[11px] leading-5 text-[#826c42]"><Info className="mt-0.5 size-4 shrink-0" />{service.note}</p>}
            <div className="mt-6 flex items-start gap-3 border-t border-[#e6edf2] pt-5 text-[11px] leading-5 text-[#617d92]"><CheckCircle2 className="mt-0.5 size-4 shrink-0 text-[#168479]" /><p><strong className="text-[#214e72]">Hackathon prototype.</strong> {service.id === "jobs" ? "Published job opportunities can be explored now; matching is informational and does not submit applications." : service.id === "civic" ? "Citizen reporting is active in this prototype. This is not an official LGU government website." : "This is a planned service preview. No real applications or emergency dispatch happens on this page."}</p></div>
            <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
              {service.id === "civic" ? (
                <Link href={isLgu ? "/admin" : "/reports/new"} onClick={() => dialogRef.current?.close()} className="inline-flex items-center gap-2 rounded-full bg-[#153e66] px-5 py-3 text-[12px] font-bold text-white transition hover:bg-[#216da2]">{isLgu ? "Open LGU workspace" : "Report a concern"} <ArrowRight size={16} /></Link>
              ) : service.id === "jobs" ? (
                <Link href="/opportunities" onClick={() => dialogRef.current?.close()} className="inline-flex items-center gap-2 rounded-full bg-[#153e66] px-5 py-3 text-[12px] font-bold text-white transition hover:bg-[#216da2]">Browse opportunities <ArrowRight size={16} /></Link>
              ) : (
                <span className="text-[11px] font-semibold text-[#66849a]">Full workflow coming in the next phase</span>
              )}
              <button type="button" onClick={() => dialogRef.current?.close()} className="rounded-full border border-[#cddde8] px-5 py-3 text-[12px] font-bold text-[#174568] hover:bg-[#f2f8fc]">Back to services</button>
            </div>
          </div>
        </div>
      )}
    </dialog>
  );
}
