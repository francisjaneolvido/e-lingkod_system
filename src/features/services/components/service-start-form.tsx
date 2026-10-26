"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Info, Loader2, ShieldCheck } from "lucide-react";
import type { SerializableOnlineServiceDefinition } from "../catalog";
import { ServiceFormFields } from "./service-form-fields";

const control = "mt-1.5 w-full rounded-xl border border-border bg-card px-3.5 py-2.5 text-[13px] text-foreground outline-none transition placeholder:text-muted-foreground focus:border-border focus:ring-2 focus:ring-border";

export function ServiceStartForm({ service }: { service: SerializableOnlineServiceDefinition }) {
  const router = useRouter();
  const [purpose, setPurpose] = useState("");
  const [fields, setFields] = useState<Record<string,string>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const prescreenKeys = new Set(service.prescreenFieldKeys || []);
  const visibleFields = service.intakeMode === "PRESCREEN" ? service.fields.filter(field => prescreenKeys.has(field.key)) : service.fields;

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/services/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ serviceKey: service.key, purpose, fields }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to start request.");
      router.push(`/services/requests/${data.id}`);
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to start request.");
      setBusy(false);
    }
  }

  return <form onSubmit={submit} className="space-y-3">
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-start gap-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-muted text-foreground"><ShieldCheck size={18}/></span>
        <div><h2 className="text-sm font-black text-foreground">{service.intakeMode === "PRESCREEN" ? "Quick eligibility intake" : "Start a request"}</h2><p className="mt-1 text-xs leading-4 text-muted-foreground">{service.intakeMode === "PRESCREEN" ? "Answer the short screening questions first. The office will open the full form only when this is the correct service path." : "You can save an incomplete draft first. Required fields and documents are enforced only when you submit for LGU review."}</p></div>
      </div>
    </div>

    <section className="rounded-2xl border border-border bg-card p-4">
      <label className="block text-xs font-extrabold text-foreground">{service.purposeLabel} {service.intakeMode === "PRESCREEN" && <span className="text-destructive">*</span>}
        {service.purposeOptions ? <select className={control} required={service.intakeMode === "PRESCREEN"} value={purpose} onChange={event => setPurpose(event.target.value)}><option value="">Select an option</option>{service.purposeOptions.map(option => <option key={option} value={option}>{option}</option>)}</select> : <textarea className={control} rows={2} minLength={service.intakeMode === "PRESCREEN" ? 4 : undefined} maxLength={1200} required={service.intakeMode === "PRESCREEN"} value={purpose} onChange={event => setPurpose(event.target.value)} placeholder={service.purposePlaceholder || "Briefly describe what you need."}/>} 
      </label>
      <div className="mt-2 flex items-start gap-2 text-xs leading-4 text-muted-foreground"><Info size={12} className="mt-0.5 shrink-0"/>{service.intakeMode === "PRESCREEN" ? "This first step is used for routing and eligibility screening. It is not yet a final approval." : "You can leave some fields blank now and finish them from My LGU Requests before submission."}</div>
    </section>

    {visibleFields.length > 0 && <ServiceFormFields fields={visibleFields} values={fields} enforceRequired={service.intakeMode === "PRESCREEN"} compact onChange={(key,value) => setFields(current => ({ ...current, [key]: value }))}/>} 

    {error && <p className="rounded-xl border border-border bg-card px-4 py-3 text-xs font-semibold text-destructive">{error}</p>}
    <div className="flex flex-wrap items-center gap-3">
      <button disabled={busy} className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-xs font-extrabold text-white shadow-sm disabled:opacity-60">{busy ? <Loader2 size={16} className="animate-spin"/> : <ArrowRight size={16}/>} {service.intakeMode === "PRESCREEN" ? "Submit for screening" : "Create draft"}</button>
      <span className="text-xs leading-4 text-muted-foreground">No request is approved automatically. LGU validation and final verification still apply.</span>
    </div>
  </form>;
}
