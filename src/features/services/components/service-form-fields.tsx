"use client";

import type { ChangeEvent } from "react";
import { conditionMatches, type ServiceField } from "../catalog";

const baseInput = "mt-1.5 w-full rounded-xl border border-border bg-card px-3.5 py-2.5 text-[13px] text-foreground outline-none transition placeholder:text-muted-foreground focus:border-border focus:ring-2 focus:ring-border disabled:bg-muted disabled:text-muted-foreground";

function widthClass(field: ServiceField) {
  if (field.width === "full" || field.type === "textarea") return "md:col-span-6";
  if (field.width === "third") return "md:col-span-2";
  return "md:col-span-3";
}

export function ServiceFormFields({
  fields,
  values,
  onChange,
  disabled = false,
  enforceRequired = true,
  compact = false,
}: {
  fields: ServiceField[];
  values: Record<string,string>;
  onChange: (key:string,value:string)=>void;
  disabled?: boolean;
  enforceRequired?: boolean;
  compact?: boolean;
}) {
  const visibleFields = fields.filter(field => conditionMatches(field.condition, values));
  const sections = Array.from(new Set(visibleFields.map(field => field.section)));
  return <div className={compact ? "space-y-3" : "space-y-4"}>
    {sections.map(section => <section key={section} className={`rounded-2xl border border-border bg-card ${compact ? "p-3.5" : "p-4 sm:p-5"}`}>
      <div className="mb-3 flex items-center gap-2"><span className="h-4 w-1 rounded-full bg-primary"/><h3 className="text-xs font-black uppercase tracking-[.1em] text-foreground">{section}</h3></div>
      <div className="grid gap-x-3 gap-y-3 md:grid-cols-6">
        {visibleFields.filter(field => field.section === section).map(field => <div key={field.key} className={widthClass(field)}>
          <label className="block text-xs font-extrabold text-foreground">
            {field.label}{field.required && <span className="ml-1 text-destructive">*</span>}
            <FieldControl field={field} value={values[field.key] || ""} disabled={disabled} enforceRequired={enforceRequired} onChange={value => onChange(field.key, value)}/>
            {field.help && <span className="mt-1 block text-xs font-normal leading-4 text-muted-foreground">{field.help}</span>}
          </label>
        </div>)}
      </div>
    </section>)}
  </div>;
}

function FieldControl({ field, value, onChange, disabled, enforceRequired }: { field: ServiceField; value: string; onChange: (value:string)=>void; disabled:boolean; enforceRequired:boolean }) {
  const props = {
    className: baseInput,
    value,
    disabled,
    required: enforceRequired && field.required,
    onChange: (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => onChange(event.target.value),
  };
  if (field.type === "textarea") return <textarea {...props} rows={3} placeholder={field.placeholder}/>;
  if (field.type === "select") return <select {...props}><option value="">Select an option</option>{field.options?.map(option => <option key={option} value={option}>{option}</option>)}</select>;
  return <input {...props} type={field.type} placeholder={field.placeholder} min={field.min} max={field.max} minLength={field.minLength} maxLength={field.maxLength}/>;
}
