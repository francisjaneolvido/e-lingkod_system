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
      className="public-service-dialog fixed inset-0 m-auto max-h-[min(90dvh,800px)] w-[min(93vw,640px)] overflow-y-auto rounded-[24px] border border-border bg-card p-0 text-foreground backdrop:bg-primary/65 backdrop:backdrop-blur-sm"
    >
      {service && (
        <div>
          <div className="relative overflow-hidden bg-muted px-6 pb-7 pt-7 sm:px-9 sm:pt-9">
            <div className="relative flex items-start justify-between gap-4">
              <ServiceIcon icon={service.icon} size="lg" className="bg-card/85" />
              <button type="button" onClick={() => dialogRef.current?.close()} aria-label="Close service details" className="flex size-10 items-center justify-center rounded-full border border-border bg-card/90 text-foreground transition hover:bg-card focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"><X size={19} /></button>
            </div>
            <p className="relative mt-6 text-sm font-semibold text-muted-foreground">{service.id === "census" ? "Protected records · public statistics pending" : service.group}</p>
            <h2 id="service-dialog-title" className="relative mt-2 text-2xl font-extrabold tracking-[-.035em] text-foreground sm:text-[30px]">{service.title}</h2>
            <p className="relative mt-3 max-w-lg leading-7 text-muted-foreground">{service.id === "census" ? "Worker Census & Social Profiling supports authorized LGU planning. Public census statistics are not currently released." : service.description}</p>
          </div>
          <div className="px-6 py-7 sm:px-9 sm:py-8">
            <h3 className="text-[14px] font-extrabold text-foreground">Ano ang kasama sa serbisyong ito?</h3>
            <ul className="mt-4 space-y-3">
              {(service.id === "census" ? [{ icon: Info, text: "Individual and establishment records remain protected." }, { icon: Info, text: "Only authorized LGU users can access census records and analytics." }, { icon: Info, text: "Visit Citizen Profiling for survey participation information." }] : service.details).map(({ icon: Icon, text }) => (
                <li key={text} className="flex items-start gap-3 rounded-xl border border-border bg-card px-4 py-3.5 text-[12px] leading-6 text-muted-foreground">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-border bg-card text-foreground"><Icon size={17} /></span>
                  <span className="pt-0.5">{text}</span>
                </li>
              ))}
            </ul>
            {service.note && service.id !== "census" && <p className="mt-5 flex items-start gap-2 rounded-xl bg-muted px-4 py-3 text-xs leading-5 text-muted-foreground"><Info className="mt-0.5 size-4 shrink-0" />{service.id === "civic" ? "Your browser asks for permission when you choose to share your location. You can follow recorded updates with your tracking ID." : service.note}</p>}
            <div className="mt-6 flex items-start gap-3 border-t border-border pt-5 text-xs leading-5 text-muted-foreground"><CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" /><p><strong className="text-foreground">Service information.</strong> {service.id === "jobs" ? "Published opportunities can be explored now; recommendations are informational and do not submit applications." : service.id === "census" ? "Public and citizen census analytics remain unavailable. Protected access requires the appropriate LGU permissions." : service.id === "civic" ? "Submit a community concern and follow its recorded status using your tracking ID." : service.id === "services" ? "Online LGU Services supports citizen requests, document uploads, LGU review, scheduling and tracked completion. Check the service guide for current local requirements." : service.id === "emergency" ? "Verified hotlines and approved advisories are accessible without login. Calls open your phone dialer; the website does not dispatch responders." : "Browse published projects and source-backed office contacts. Check each entry for its official reference."}</p></div>
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
                <Link href="/community-census" onClick={() => dialogRef.current?.close()} className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-3 text-[12px] font-bold text-white transition hover:bg-primary">About census access <ArrowRight size={16} /></Link>
              ) : (
                <Link href="/projects" onClick={() => dialogRef.current?.close()} className="elb-button elb-button-primary">Projects &amp; offices <ArrowRight size={16}/></Link>
              )}
              <button type="button" onClick={() => dialogRef.current?.close()} className="rounded-full border border-border px-5 py-3 text-[12px] font-bold text-foreground hover:bg-muted">Back to services</button>
            </div>
          </div>
        </div>
      )}
    </dialog>
  );
}
