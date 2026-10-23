"use client";

import { LGU_OFFICES, LGU_OFFICE_GROUPS, suggestedModulesForOffice } from "@/lib/lgu-offices";
import { STAFF_MODULE_LABELS, type StaffModule } from "@/lib/staff-modules";

/** Shared office picker for existing-staff, new-assignment, and invitations. */
export function LGUOfficeSelect({ value, onChange, disabled, className = "elb-admin-field mt-2", required = true }: {
  value: string; onChange: (value: string) => void; disabled?: boolean; className?: string; required?: boolean;
}) {
  const isLegacy = Boolean(value && !LGU_OFFICES.some(office => office.name === value));
  return <select className={className} required={required} value={value} onChange={event => onChange(event.target.value)} disabled={disabled}>
    <option value="">Select LGU office…</option>
    {isLegacy && <option value={value}>{value} (existing / legacy office)</option>}
    {LGU_OFFICE_GROUPS.map(group => <optgroup key={group} label={group}>
      {LGU_OFFICES.filter(office => office.group === group).map(office => <option key={office.name} value={office.name}>{office.name}</option>)}
    </optgroup>)}
  </select>;
}

/** Deliberately opt-in: recommendation never silently changes someone's permissions. */
export function LGUOfficeRecommendation({ office, modules, onApply, disabled }: {
  office: string; modules: StaffModule[]; onApply: (modules: StaffModule[]) => void; disabled?: boolean;
}) {
  const suggestions = suggestedModulesForOffice(office);
  if (!office) return <p className="mt-2 text-[11px] leading-5 text-[#738da0]">Choose a specific LGU office so case routing can find eligible staff. Avoid generic departments such as “Municipal Office.”</p>;
  if (!suggestions.length) return <p className="mt-2 text-[11px] leading-5 text-[#947543]">This is a legacy office value. Select a listed office for reliable assignment and routing.</p>;
  return <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] leading-5 text-[#55788b]">
    <span>Suggested modules: <strong>{suggestions.map(module => STAFF_MODULE_LABELS[module]).join(", ")}</strong></span>
    <button type="button" disabled={disabled || (suggestions.length === modules.length && suggestions.every(module => modules.includes(module)))} onClick={() => onApply(suggestions)} className="rounded-lg border border-[#c3dce7] bg-[#f1f8fb] px-2.5 py-1 font-bold text-[#176c92] disabled:opacity-50">Use suggested modules</button>
    <span className="w-full text-[#7e96a5]">The Super Admin can add/remove permissions after checking the staff member's actual responsibilities.</span>
  </div>;
}
