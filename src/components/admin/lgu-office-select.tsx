"use client";
import { useState } from "react";
import { LGU_OFFICES, LGU_OFFICE_GROUPS, suggestedModulesForOffice } from "@/lib/lgu-offices";
import { STAFF_MODULE_LABELS, type StaffModule } from "@/lib/staff-modules";

export function LGUOfficeSelect({value,onChange,disabled,className="elb-admin-field mt-2"}:{value:string;onChange:(value:string)=>void;disabled?:boolean;className?:string}){
  const [custom,setCustom]=useState(false),known=LGU_OFFICES.some(x=>x.name===value),other=custom||Boolean(value&&!known);
  return <><select aria-label="Department / office" value={other?"__OTHER__":value} onChange={event=>{const next=event.target.value;setCustom(next==="__OTHER__");onChange(next==="__OTHER__"?"":next);}} disabled={disabled} required className={className}><option value="">Choose an office</option>{LGU_OFFICE_GROUPS.map(group=><optgroup key={group} label={group}>{LGU_OFFICES.filter(x=>x.group===group).map(office=><option key={office.name} value={office.name}>{office.name}</option>)}</optgroup>)}<option value="__OTHER__">Other / custom office</option></select>{other?<input aria-label="Custom department / office" value={value} onChange={event=>onChange(event.target.value)} disabled={disabled} required maxLength={120} className={className} placeholder="Enter the actual authorized office"/>:null}</>;
}
export function LGUOfficeRecommendation({office,modules,onApply,disabled}:{office:string;modules:StaffModule[];onApply:(modules:StaffModule[])=>void;disabled?:boolean}){
  const suggested=suggestedModulesForOffice(office);if(!suggested.length)return null;
  const matches=suggested.length===modules.length&&suggested.every(module=>modules.includes(module));
  return <div className="rounded-2xl border border-border bg-muted p-4 text-xs leading-6 text-foreground"><p>Suggested modules: {suggested.map(module=>STAFF_MODULE_LABELS[module]).join(", ")}. Suggestions do not grant access; review the actual staff responsibilities.</p><button type="button" disabled={disabled||matches} onClick={()=>onApply([...suggested])} className="mt-3 rounded-2xl border border-border bg-card px-4 py-2 font-semibold disabled:opacity-50">{matches?"Suggested modules selected":"Use suggested modules"}</button></div>;
}
