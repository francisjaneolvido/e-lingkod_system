"use client";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { UserRoundPlus, ShieldCheck, Trash2, CheckCircle2, AlertCircle, LoaderCircle, Building2 } from "lucide-react";
import { STAFF_MODULES, STAFF_MODULE_LABELS, type StaffModule } from "@/lib/staff-modules";

type Staff = { id: string; name: string; email: string; department: string | null; designation: string | null; modules: StaffModule[]; createdAt: string };
type StaffPayload = { email: string; department: string; designation: string; modules: StaffModule[]; mode: "SAVE" | "REVOKE" };

async function saveStaff(payload: StaffPayload) {
  const response = await fetch("/api/admin/staff", {
    method: "POST", headers: { "Content-Type": "application/json" }, credentials: "same-origin", body: JSON.stringify(payload),
  });
  const result = await response.json().catch(() => ({})) as { error?: string };
  if (!response.ok) throw new Error(result.error || "Unable to update staff access. Try again.");
}

function PermissionPicker({ value, onChange, disabled }: { value: StaffModule[]; onChange: (modules: StaffModule[]) => void; disabled: boolean }) {
  return <fieldset className="space-y-2" disabled={disabled}><legend className="mb-2 text-[11px] font-bold text-[#466c84]">Assigned modules <span className="font-normal text-[#839bac]">(choose at least one)</span></legend><div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{STAFF_MODULES.map(module => <label key={module} className={`elb-admin-module-check ${value.includes(module) ? "elb-admin-module-check--selected" : ""}`}><input type="checkbox" checked={value.includes(module)} onChange={event => onChange(event.target.checked ? [...value, module] : value.filter(existing => existing !== module))} className="size-4 accent-[#136f98]"/><span>{STAFF_MODULE_LABELS[module]}{module !== "REPORTS" && <small className="ml-1 font-normal text-[#92a4b2]">(preview)</small>}</span></label>)}</div></fieldset>;
}
function StaffEditor({ staff }: { staff: Staff }) {
  const router = useRouter();
  const [department, setDepartment] = useState(staff.department ?? "");
  const [designation, setDesignation] = useState(staff.designation ?? "");
  const [modules, setModules] = useState<StaffModule[]>(staff.modules);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [expanded, setExpanded] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(""); setMessage(""); setBusy(true);
    try { await saveStaff({ email: staff.email, department, designation, modules, mode: "SAVE" }); setMessage("Permissions saved."); router.refresh(); }
    catch (problem) { setError(problem instanceof Error ? problem.message : "Could not save."); }
    finally { setBusy(false); }
  }
  async function revoke() {
    if (!window.confirm(`Remove LGU staff access for ${staff.name}? Their citizen account and existing reports will remain.`)) return;
    setError(""); setBusy(true);
    try { await saveStaff({ email: staff.email, department: "", designation: "", modules: [], mode: "REVOKE" }); router.refresh(); }
    catch (problem) { setError(problem instanceof Error ? problem.message : "Could not revoke."); setBusy(false); }
  }
  return <section className="overflow-hidden rounded-[17px] border border-[#dfe9f0] bg-white"><div className="flex flex-wrap items-center justify-between gap-3 p-5"><div className="flex min-w-0 items-center gap-3"><span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#e8f4f8] font-extrabold text-[#1c688f]">{staff.name[0]?.toUpperCase() ?? "S"}</span><div className="min-w-0"><h3 className="text-[13px] font-extrabold text-[#214b68]">{staff.name}</h3><p className="mt-1 break-all text-[11px] text-[#708a9b]">{staff.email}</p></div></div><button type="button" className="elb-admin-outline" aria-expanded={expanded} onClick={() => setExpanded(value => !value)}>{expanded ? "Close editor" : "Manage access"}</button></div><div className="flex flex-wrap gap-2 border-t border-[#eff3f6] bg-[#f9fbfc] px-5 py-3"><span className="rounded-full bg-[#e5f1f7] px-3 py-1 text-[10px] font-bold text-[#275d81]">{staff.department || "Unassigned department"}</span><span className="rounded-full bg-[#f0f4f7] px-3 py-1 text-[10px] font-bold text-[#638399]">{staff.designation || "LGU Staff"}</span><span className="rounded-full bg-[#ebf6f0] px-3 py-1 text-[10px] font-bold text-[#267d67]">{staff.modules.length} module{staff.modules.length === 1 ? "" : "s"}</span></div>{expanded && <form onSubmit={submit} className="space-y-4 border-t border-[#e5edf2] p-5"><div className="grid gap-3 sm:grid-cols-2"><label className="text-[11px] font-bold text-[#466c84]">Department / office<input className="elb-admin-field mt-1.5" maxLength={120} required value={department} onChange={event => setDepartment(event.target.value)} disabled={busy} placeholder="e.g. MDRRMO"/></label><label className="text-[11px] font-bold text-[#466c84]">Designation<input className="elb-admin-field mt-1.5" maxLength={120} required value={designation} onChange={event => setDesignation(event.target.value)} disabled={busy} placeholder="e.g. Action Officer"/></label></div><PermissionPicker value={modules} onChange={setModules} disabled={busy}/>{error && <p role="alert" className="elb-admin-feedback elb-admin-feedback--error"><AlertCircle size={15}/>{error}</p>}{message && <p role="status" className="elb-admin-feedback"><CheckCircle2 size={15}/>{message}</p>}<div className="flex flex-wrap justify-between gap-3 border-t border-[#eff2f5] pt-4"><button type="button" className="elb-admin-danger" onClick={revoke} disabled={busy}><Trash2 size={15}/> Revoke staff access</button><button type="submit" className="elb-admin-primary" disabled={busy || !modules.length}>{busy ? <LoaderCircle size={15} className="animate-spin"/> : <ShieldCheck size={15}/>} Save permissions</button></div></form>}</section>;
}
export function StaffManager({ initialStaff }: { initialStaff: Staff[] }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [department, setDepartment] = useState("");
  const [designation, setDesignation] = useState("");
  const [modules, setModules] = useState<StaffModule[]>(["REPORTS"]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function addStaff(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError(""); setMessage("");
    try { await saveStaff({ email, department, designation, modules, mode: "SAVE" }); setMessage("Staff access assigned successfully."); setEmail(""); setDepartment(""); setDesignation(""); setModules(["REPORTS"]); router.refresh(); }
    catch (problem) { setError(problem instanceof Error ? problem.message : "Could not save staff account."); }
    finally { setBusy(false); }
  }

  return <div className="space-y-5"><section className="rounded-[18px] border border-[#dbe8ed] bg-white p-5 sm:p-6"><div className="flex items-start gap-3"><span className="grid size-11 shrink-0 place-items-center rounded-xl bg-[#e7f5f3] text-[#247f7c]"><UserRoundPlus size={22}/></span><div><h2 className="text-[16px] font-extrabold text-[#1d4c68]">Assign an existing account</h2><p className="mt-1 text-[11px] leading-6 text-[#7893a4]">For a citizen account that already exists, grant staff access without resetting the existing password. For new LGU personnel, use the invitation form above.</p></div></div>
  <form onSubmit={addStaff} className="mt-5 space-y-5"><div className="grid gap-3 md:grid-cols-3"><label className="text-[11px] font-bold text-[#466c84]">Registered account email<input className="elb-admin-field mt-1.5" type="email" required autoComplete="off" value={email} maxLength={191} onChange={event => setEmail(event.target.value)} placeholder="officer@example.com" disabled={busy}/></label><label className="text-[11px] font-bold text-[#466c84]">Department / office<input className="elb-admin-field mt-1.5" required value={department} maxLength={120} onChange={event => setDepartment(event.target.value)} placeholder="e.g. Public Information Office" disabled={busy}/></label><label className="text-[11px] font-bold text-[#466c84]">Job title<input className="elb-admin-field mt-1.5" required value={designation} maxLength={120} onChange={event => setDesignation(event.target.value)} placeholder="e.g. Information Officer" disabled={busy}/></label></div><PermissionPicker value={modules} onChange={setModules} disabled={busy}/>{error && <p role="alert" className="elb-admin-feedback elb-admin-feedback--error"><AlertCircle size={15}/>{error}</p>}{message && <p role="status" className="elb-admin-feedback"><CheckCircle2 size={15}/>{message}</p>}<div className="flex justify-end"><button className="elb-admin-primary" type="submit" disabled={busy || !modules.length}>{busy ? <LoaderCircle size={16} className="animate-spin"/> : <UserRoundPlus size={16}/>} Assign staff access</button></div></form></section>
  <section><div className="mb-3 flex flex-wrap items-end justify-between gap-2"><div><span className="elb-admin-eyebrow">ASSIGNED PERSONNEL</span><h2 className="mt-1 text-[18px] font-extrabold text-[#1f4b68]">Active staff directory</h2></div><span className="text-[11px] text-[#7f97a7]">Showing up to 200 staff accounts</span></div>{initialStaff.length ? <div className="grid gap-3 xl:grid-cols-2">{initialStaff.map(staff => <StaffEditor key={staff.id} staff={staff}/>)}</div> : <div className="grid justify-items-center rounded-[18px] border border-dashed border-[#cfdfe7] bg-white px-5 py-12 text-center"><Building2 size={28} className="text-[#7bafbd]"/><h3 className="mt-3 text-sm font-extrabold text-[#2c5a75]">No active staff yet</h3><p className="mt-2 max-w-md text-[12px] leading-6 text-[#8497a5]">Send an invitation above to onboard new personnel, or assign an existing citizen account.</p></div>}</section>
  </div>;
}
