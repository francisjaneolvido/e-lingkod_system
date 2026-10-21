"use client";

import { useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, Building2, CheckCircle2, LoaderCircle, Search, ShieldCheck, Trash2, UserRoundPlus, UsersRound } from "lucide-react";
import { STAFF_MODULES, STAFF_MODULE_LABELS, type StaffModule } from "@/lib/staff-modules";

export type Staff = { id: string; name: string; email: string; department: string | null; designation: string | null; modules: StaffModule[]; createdAt: string };
type StaffPayload = { email: string; department: string; designation: string; modules: StaffModule[]; mode: "SAVE" | "REVOKE" };

async function updateAccess(payload: StaffPayload) {
  const response = await fetch("/api/admin/staff", {
    method: "POST", headers: { "Content-Type": "application/json" }, credentials: "same-origin", body: JSON.stringify(payload),
  });
  const result = await response.json().catch(() => ({})) as { error?: string };
  if (!response.ok) throw new Error(result.error || "Unable to update staff access. Try again.");
}

function PermissionPicker({ value, onChange, disabled }: { value: StaffModule[]; onChange: (next: StaffModule[]) => void; disabled: boolean }) {
  return <fieldset disabled={disabled}>
    <legend className="mb-3 text-sm font-bold text-[#244f6e]">Authorized service modules <span className="font-normal text-[#68879c]">(select at least one)</span></legend>
    <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">{STAFF_MODULES.map(module =>
      <label key={module} className={`elb-admin-module-check flex min-h-12 items-center gap-2.5 ${value.includes(module) ? "elb-admin-module-check--selected" : ""}`}>
        <input type="checkbox" className="size-4 accent-[#136f98]" checked={value.includes(module)} onChange={event => onChange(event.target.checked ? [...value, module] : value.filter(item => item !== module))}/>
        <span className="text-[12px] leading-5">{STAFF_MODULE_LABELS[module]}{module !== "REPORTS" && module !== "JOBS" && <small className="ml-1 font-normal text-[#8299a9]">(preview)</small>}</span>
      </label>)}</div>
  </fieldset>;
}

function StaffCard({ staff }: { staff: Staff }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [department, setDepartment] = useState(staff.department ?? "");
  const [designation, setDesignation] = useState(staff.designation ?? "");
  const [modules, setModules] = useState<StaffModule[]>(staff.modules);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setNotice(""); setError("");
    try { await updateAccess({ email: staff.email, department, designation, modules, mode: "SAVE" }); setNotice("Access updated successfully."); router.refresh(); }
    catch (err) { setError(err instanceof Error ? err.message : "Unable to save changes."); }
    finally { setBusy(false); }
  }
  async function revoke() {
    if (!window.confirm(`Revoke LGU access for ${staff.name}? This will not delete the account or its reports.`)) return;
    setBusy(true); setNotice(""); setError("");
    try { await updateAccess({ email: staff.email, department: "", designation: "", modules: [], mode: "REVOKE" }); setNotice("Staff access revoked."); setEditing(false); router.refresh(); }
    catch (err) { setError(err instanceof Error ? err.message : "Unable to revoke access."); }
    finally { setBusy(false); }
  }

  return <article className="overflow-hidden rounded-2xl border border-[#dae8ef] bg-white shadow-[0_3px_12px_rgba(24,65,93,.03)]">
    <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 sm:px-6">
      <div className="flex min-w-0 items-center gap-3"><span className="grid size-11 shrink-0 place-items-center rounded-xl bg-[#eaf4f8] text-sm font-extrabold text-[#1b6585]">{staff.name[0]?.toUpperCase() || "S"}</span><div className="min-w-0"><h3 className="text-[15px] font-extrabold text-[#214c69]">{staff.name}</h3><p className="mt-0.5 break-all text-[12px] text-[#69859a]">{staff.email}</p></div></div>
      <button type="button" className="elb-admin-outline min-h-10" aria-expanded={editing} onClick={() => { setEditing(value => !value); setError(""); setNotice(""); }}>{editing ? "Close editor" : "Manage access"}</button>
    </div>
    <div className="flex flex-wrap items-center gap-2 border-t border-[#edf2f5] bg-[#f8fbfd] px-5 py-3 sm:px-6">
      <span className="rounded-full bg-[#e7f1f7] px-3 py-1 text-[11px] font-semibold text-[#275d81]">{staff.department || "No department"}</span>
      <span className="rounded-full bg-[#eff3f6] px-3 py-1 text-[11px] font-semibold text-[#56758a]">{staff.designation || "LGU Staff"}</span>
      <span className="rounded-full bg-[#e7f5ed] px-3 py-1 text-[11px] font-semibold text-[#267d67]">{staff.modules.length} assigned modules</span>
    </div>
    {editing && <form onSubmit={save} className="space-y-5 border-t border-[#e7eff3] px-5 py-5 sm:px-6">
      <div className="grid gap-4 sm:grid-cols-2"><label className="block text-[12px] font-bold text-[#395f78]">Department / office<input className="elb-admin-field mt-2" required maxLength={120} value={department} onChange={e => setDepartment(e.target.value)} disabled={busy}/></label><label className="block text-[12px] font-bold text-[#395f78]">Job title / designation<input className="elb-admin-field mt-2" required maxLength={120} value={designation} onChange={e => setDesignation(e.target.value)} disabled={busy}/></label></div>
      <PermissionPicker value={modules} onChange={setModules} disabled={busy}/>
      {error && <p role="alert" className="elb-admin-feedback elb-admin-feedback--error"><AlertCircle size={16}/>{error}</p>}
      {notice && <p role="status" className="elb-admin-feedback"><CheckCircle2 size={16}/>{notice}</p>}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#edf2f5] pt-4"><button type="button" className="elb-admin-danger" disabled={busy} onClick={revoke}><Trash2 size={16}/> Revoke access</button><button type="submit" className="elb-admin-primary" disabled={busy || modules.length === 0}>{busy ? <LoaderCircle size={16} className="animate-spin"/> : <ShieldCheck size={16}/>} Save permissions</button></div>
    </form>}
  </article>;
}

function AssignExistingAccount() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [department, setDepartment] = useState("");
  const [designation, setDesignation] = useState("");
  const [modules, setModules] = useState<StaffModule[]>(["REPORTS"]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError(""); setNotice("");
    try { await updateAccess({ email, department, designation, modules, mode: "SAVE" }); setNotice("Staff access assigned successfully."); setEmail(""); setDepartment(""); setDesignation(""); setModules(["REPORTS"]); router.refresh(); }
    catch (err) { setError(err instanceof Error ? err.message : "Unable to assign staff access."); }
    finally { setBusy(false); }
  }

  return <section className="rounded-2xl border border-[#dae8ef] bg-white p-5 sm:p-7">
    <div className="flex items-center gap-3"><span className="grid size-11 place-items-center rounded-xl bg-[#e7f5f3] text-[#24847c]"><UserRoundPlus size={21}/></span><div><h2 className="text-[18px] font-extrabold text-[#1c4d69]">Assign an existing account</h2><p className="mt-1 text-[13px] leading-5 text-[#6c869a]">For an account already registered as a citizen. The current password stays unchanged. Staff will use LGU tools instead of citizen-only reporting while assigned.</p></div></div>
    <form onSubmit={submit} className="mt-6 space-y-5">
      <div className="grid gap-4 md:grid-cols-3"><label className="block text-[12px] font-bold text-[#395f78]">Registered email<input type="email" className="elb-admin-field mt-2" required maxLength={191} autoComplete="off" value={email} onChange={e => setEmail(e.target.value)} placeholder="officer@example.gov.ph" disabled={busy}/></label><label className="block text-[12px] font-bold text-[#395f78]">Department / office<input className="elb-admin-field mt-2" required maxLength={120} value={department} onChange={e => setDepartment(e.target.value)} placeholder="e.g. PESO" disabled={busy}/></label><label className="block text-[12px] font-bold text-[#395f78]">Designation<input className="elb-admin-field mt-2" required maxLength={120} value={designation} onChange={e => setDesignation(e.target.value)} placeholder="e.g. Employment Officer" disabled={busy}/></label></div>
      <PermissionPicker value={modules} onChange={setModules} disabled={busy}/>
      {error && <p role="alert" className="elb-admin-feedback elb-admin-feedback--error"><AlertCircle size={16}/>{error}</p>}
      {notice && <p role="status" className="elb-admin-feedback"><CheckCircle2 size={16}/>{notice}</p>}
      <div className="flex justify-end border-t border-[#eef3f6] pt-4"><button type="submit" className="elb-admin-primary" disabled={busy || !modules.length}>{busy ? <LoaderCircle size={16} className="animate-spin"/> : <UserRoundPlus size={16}/>} Assign staff access</button></div>
    </form>
  </section>;
}

export function StaffManager({ initialStaff, view = "directory" }: { initialStaff: Staff[]; view?: "directory" | "assign" }) {
  const [search, setSearch] = useState("");
  const [office, setOffice] = useState("ALL");
  const departments = useMemo(() => Array.from(new Set(initialStaff.map(staff => staff.department?.trim()).filter((value): value is string => !!value))).sort(), [initialStaff]);
  const filtered = useMemo(() => initialStaff.filter(staff => (office === "ALL" || staff.department === office) && [staff.name, staff.email, staff.department || "", staff.designation || ""].some(value => value.toLowerCase().includes(search.toLowerCase().trim()))), [initialStaff, office, search]);
  if (view === "assign") return <AssignExistingAccount/>;
  return <section className="space-y-4">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-[19px] font-extrabold text-[#184c6a]">Active staff directory</h2><p className="mt-1 text-[13px] text-[#6c869a]">Manage assigned offices and module access. Showing up to 200 staff accounts.</p></div><span className="rounded-full border border-[#dbe8ef] bg-white px-4 py-2 text-xs font-semibold text-[#426a83]">{filtered.length} of {initialStaff.length} staff</span></div>
    <div className="flex flex-wrap gap-3 rounded-2xl border border-[#dbe8ef] bg-white p-3"><label className="relative min-w-[200px] flex-1"><Search size={17} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#7390a2]"/><span className="sr-only">Search staff</span><input className="elb-admin-field !pl-10" placeholder="Search name, email, position..." value={search} onChange={e => setSearch(e.target.value)}/></label><label className="min-w-[180px]"><span className="sr-only">Filter by department</span><select className="elb-admin-field" value={office} onChange={e => setOffice(e.target.value)}><option value="ALL">All departments</option>{departments.map(value => <option key={value} value={value}>{value}</option>)}</select></label></div>
    {filtered.length ? <div className="grid gap-4 xl:grid-cols-2">{filtered.map(staff => <StaffCard key={staff.id} staff={staff}/>)}</div> : <div className="grid justify-items-center rounded-2xl border border-dashed border-[#cbdfe8] bg-white px-5 py-12 text-center"><Building2 size={30} className="text-[#6e9bad]"/><h3 className="mt-3 text-[15px] font-bold text-[#285775]">{initialStaff.length ? "No staff match your filters" : "No active staff yet"}</h3><p className="mt-2 text-[13px] text-[#728d9e]">{initialStaff.length ? "Try clearing the search or department filter." : "Invite LGU personnel or assign an existing registered account."}</p></div>}
  </section>;
}
