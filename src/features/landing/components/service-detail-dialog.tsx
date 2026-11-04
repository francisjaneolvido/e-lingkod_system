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
      className="fixed inset-0 m-auto max-h-[min(90dvh,800px)] w-[min(93vw,640px)] overflow-y-auto rounded-[24px] border border-border bg-card p-0 text-foreground shadow-[0_28px_80px_rgba(7,33,58,.25)] backdrop:bg-primary/65 backdrop:backdrop-blur-sm"
    >
      {service && (
        <div>
          <div className="relative overflow-hidden bg-muted px-6 pb-7 pt-7 sm:px-9 sm:pt-9">
            <div className="absolute -right-9 -top-16 size-52 rounded-full border-[28px] opacity-20" style={{ borderColor: service.color }} />
            <div className="relative flex items-start justify-between gap-4">
              <ServiceIcon icon={service.icon} size="lg" className="bg-card/85" />
              <button type="button" onClick={() => dialogRef.current?.close()} aria-label="Close service details" className="flex size-10 items-center justify-center rounded-full border border-border bg-card/90 text-foreground transition hover:bg-card focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"><X size={19} /></button>
            </div>
            <p className="relative mt-6 text-xs font-extrabold uppercase tracking-[.15em] text-foreground">Service {service.number} of 06 · {service.group}</p>
            <h2 id="service-dialog-title" className="relative mt-2 text-2xl font-extrabold tracking-[-.035em] text-foreground sm:text-[30px]">{service.title}</h2>
            <p className="relative mt-3 max-w-lg text-[13px] leading-7 text-foreground">{service.description}</p>
          </div>
          <div className="px-6 py-7 sm:px-9 sm:py-8">
            <h3 className="text-[14px] font-extrabold text-foreground">Ano ang kasama sa serbisyong ito?</h3>
            <ul className="mt-4 space-y-3">
              {service.details.map(({ icon: Icon, text }) => (
                <li key={text} className="flex items-start gap-3 rounded-xl border border-border bg-card px-4 py-3.5 text-[12px] leading-6 text-muted-foreground">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-border bg-card text-foreground"><Icon size={17} /></span>
                  <span className="pt-0.5">{text}</span>
                </li>
              ))}
            </ul>
            {service.note && <p className="mt-5 flex items-start gap-2 rounded-xl bg-muted px-4 py-3 text-xs leading-5 text-warning-foreground"><Info className="mt-0.5 size-4 shrink-0" />{service.note}</p>}
            <div className="mt-6 flex items-start gap-3 border-t border-border pt-5 text-xs leading-5 text-muted-foreground"><CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" /><p><strong className="text-foreground">Hackathon prototype.</strong> {service.id === "jobs" ? "Published opportunities can be explored now; recommendations are informational and do not submit applications." : service.id === "census" ? "The Community Census is a planned module. Employment survey analytics belong to Job Matching and are not treated as census data." : service.id === "civic" ? "Citizen reporting is active in this prototype. This is not an official LGU government website." : service.id === "services" ? "Online LGU Services now supports prototype citizen requests, document uploads, LGU review, scheduling and tracked completion. Exact local requirements must still be verified by the participating LGU." : service.id === "emergency" ? "Verified hotlines and approved advisories are accessible without login. This is a prototype, not an official LGU dispatch service." : "This is a planned service preview."}</p></div>
            <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
              {service.id === "civic" ? (
                <Link href={isLgu ? "/admin" : "/reports/new"} onClick={() => dialogRef.current?.close()} className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-3 text-[12px] font-bold text-white transition hover:bg-primary">{isLgu ? "Open LGU workspace" : "Report a concern"} <ArrowRight size={16} /></Link>
              ) : service.id === "services" ? (
                <Link href={isLgu ? "/admin/services" : "/services"} onClick={() => dialogRef.current?.close()} className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-3 text-[12px] font-bold text-white transition hover:bg-primary">{isLgu ? "Open service desk" : "Open online services"} <ArrowRight size={16} /></Link>
              ) : service.id === "emergency" ? (
                <Link href={isLgu ? "/admin/emergency" : "/emergency"} onClick={() => dialogRef.current?.close()} className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-3 text-[12px] font-bold text-white transition hover:bg-primary">Open emergency hotlines <ArrowRight size={16} /></Link>
              ) : service.id === "jobs" ? (
                <Link href="/community-employment" onClick={() => dialogRef.current?.close()} className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-3 text-[12px] font-bold text-white transition hover:bg-primary">Open community employment <ArrowRight size={16} /></Link>
              ) : service.id === "census" ? (
                <Link href="/community-census" onClick={() => dialogRef.current?.close()} className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-3 text-[12px] font-bold text-white transition hover:bg-primary">Preview community census <ArrowRight size={16} /></Link>
              ) : (
                <span className="text-xs font-semibold text-muted-foreground">Full workflow coming in the next phase</span>
              )}
              <button type="button" onClick={() => dialogRef.current?.close()} className="rounded-full border border-border px-5 py-3 text-[12px] font-bold text-foreground hover:bg-muted">Back to services</button>
            </div>
          </div>
        </div>
      )}
    </dialog>
  );
}
