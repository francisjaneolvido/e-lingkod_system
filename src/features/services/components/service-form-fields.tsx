"use client";

import type { ChangeEvent } from "react";
import { conditionMatches, type ServiceField } from "../catalog";

const baseInput = "elb-field mt-2";

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
    {sections.map(section => <fieldset key={section} className={`elb-form-section ${compact ? "elb-form-section-compact" : ""}`}>
      <legend className="elb-form-legend">{section}</legend>
      <div className="grid gap-x-3 gap-y-3 md:grid-cols-6">
        {visibleFields.filter(field => field.section === section).map(field => <div key={field.key} className={widthClass(field)}>
          <label className="elb-label">
            {field.label}{field.required && <span className="ml-1 text-destructive">*</span>}
            <FieldControl field={field} value={values[field.key] || ""} disabled={disabled} enforceRequired={enforceRequired} onChange={value => onChange(field.key, value)}/>
            {field.help && <span className="elb-help mt-1 block font-normal">{field.help}</span>}
          </label>
        </div>)}
      </div>
    </fieldset>)}
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
