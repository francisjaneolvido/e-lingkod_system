"use client";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Copy, Check, MailPlus, RefreshCw, XCircle, AlertCircle, LoaderCircle, Clock3, ShieldCheck } from "lucide-react";
import { STAFF_MODULES, STAFF_MODULE_LABELS, type StaffModule } from "@/lib/staff-modules";
import { LGUOfficeSelect, LGUOfficeRecommendation } from "@/components/admin/lgu-office-select";

type Invite = {
  id: string; name: string; email: string; department: string; designation: string;
  modules: StaffModule[]; expiresAt: string; createdAt: string; status: "PENDING" | "EXPIRED" | "REVOKED" | "ACTIVATED";
};
type InvitationResponse = { success?: boolean; error?: string; message?: string; activationUrl?: string; delivery?: "EMAIL" | "DEMO" | "FAILED" };

async function postInvite(payload: unknown): Promise<InvitationResponse> {
  const response = await fetch("/api/admin/staff/invitations", {
    method: "POST", credentials: "same-origin", cache: "no-store",
    headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
  });
  const result = await response.json().catch(() => ({})) as InvitationResponse;
  if (!response.ok) throw new Error(result.error || "Unable to process the invitation. Please try again.");
  return result;
}

export function StaffInviteManager({ initialInvites, deliveryMode }: { initialInvites: Invite[]; deliveryMode: "EMAIL" | "DEMO" | "DISABLED" }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [department, setDepartment] = useState("");
  const [designation, setDesignation] = useState("");
  const [modules, setModules] = useState<StaffModule[]>(["REPORTS"]);
  const [pending, setPending] = useState(false);
  const [workingId, setWorkingId] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [activationLink, setActivationLink] = useState("");
  const [copied, setCopied] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setPending(true); setError(""); setNotice(""); setActivationLink(""); setCopied(false);
    try {
      const result = await postInvite({ action: "INVITE", name, email, department, designation, modules });
      setNotice(result.message || "Invitation created.");
      setActivationLink(result.activationUrl || "");
      setName(""); setEmail(""); setDepartment(""); setDesignation(""); setModules(["REPORTS"]);
      router.refresh();
    } catch (problem) { setError(problem instanceof Error ? problem.message : "Unable to create invitation."); }
    finally { setPending(false); }
  }
  async function manage(id: string, action: "RESEND" | "REVOKE") {
    if (action === "REVOKE" && !window.confirm("Revoke this invitation? Its activation link will stop working immediately.")) return;
    setWorkingId(id); setError(""); setNotice(""); setActivationLink(""); setCopied(false);
    try {
      const result = await postInvite({ action, id });
      setNotice(result.message || "Invitation updated."); setActivationLink(result.activationUrl || ""); router.refresh();
    } catch (problem) { setError(problem instanceof Error ? problem.message : "Unable to update invitation."); }
    finally { setWorkingId(""); }
  }
  async function copyLink() {
    if (!activationLink) return;
    try { await navigator.clipboard.writeText(activationLink); setCopied(true); }
    catch { setError("Unable to copy automatically. Select the link below to copy it."); }
  }

  return <section className="space-y-4 rounded-[20px] border border-[#dbe8ed] bg-white p-5 sm:p-6">
    <header className="flex flex-wrap items-start justify-between gap-3">
      <div className="flex items-start gap-3"><span className="grid size-11 shrink-0 place-items-center rounded-xl bg-[#e4f3f0] text-[#1b8a7b]"><MailPlus size={22}/></span><div><h2 className="text-[17px] font-extrabold text-[#19496a]">Create &amp; invite LGU staff</h2><p className="mt-1 max-w-xl text-[12px] leading-6 text-[#698698]">Create a new staff invitation. No staff login exists until the recipient activates the account and chooses a password.</p></div></div>
      <span className="inline-flex items-center gap-1.5 rounded-full bg-[#eef7fa] px-3 py-1.5 text-[11px] font-semibold text-[#42718a]"><ShieldCheck size={13}/> Super Admin only</span>
    </header>
    {deliveryMode === "DEMO" ? <p className="rounded-xl border border-[#f4dfab] bg-[#fffaf0] px-4 py-3 text-[12px] leading-6 text-[#8a631c]"><strong>Local demo mode:</strong> An activation link will appear after you invite a staff member. Copy it securely and open it in the staff browser. <strong>No email will be sent.</strong> Keep the link private.</p> : deliveryMode === "DISABLED" ? <p className="rounded-xl border border-[#f0d1d1] bg-[#fff5f5] px-4 py-3 text-[12px] leading-6 text-[#8c4545]">Invitation delivery is not configured. Add Resend credentials for real email invitations, or set <code>STAFF_INVITE_DEMO_LINKS=true</code> in your local <code>.env</code> for hackathon testing.</p> : <p className="rounded-xl border border-[#cfe9dc] bg-[#f0faf5] px-4 py-3 text-[12px] leading-6 text-[#356e59]">Email delivery configured. The system will send a single-use activation link to the staff member&apos;s email.</p>}
    <form onSubmit={submit} className="space-y-4">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <label className="text-[11px] font-bold text-[#466c84]">Full name<input className="elb-admin-field mt-1.5" required maxLength={191} value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Juan Dela Cruz" disabled={pending}/></label>
        <label className="text-[11px] font-bold text-[#466c84]">Work email<input className="elb-admin-field mt-1.5" type="email" required maxLength={191} autoComplete="off" value={email} onChange={e => setEmail(e.target.value)} placeholder="staff@example.gov.ph" disabled={pending}/></label>
        <label className="text-[11px] font-bold text-[#466c84]">Department / office<LGUOfficeSelect className="elb-admin-field mt-1.5" value={department} onChange={setDepartment} disabled={pending}/></label>
        <label className="text-[11px] font-bold text-[#466c84]">Designation<input className="elb-admin-field mt-1.5" required maxLength={120} value={designation} onChange={e => setDesignation(e.target.value)} placeholder="e.g. Response Officer" disabled={pending}/></label>
      </div>
      <LGUOfficeRecommendation office={department} modules={modules} onApply={setModules} disabled={pending}/>
      <fieldset disabled={pending}><legend className="mb-2 text-[11px] font-bold text-[#466c84]">Authorized service modules</legend><div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{STAFF_MODULES.map(module => <label key={module} className={`elb-admin-module-check ${modules.includes(module) ? "elb-admin-module-check--selected" : ""}`}><input className="size-4 accent-[#136f98]" type="checkbox" checked={modules.includes(module)} onChange={event => setModules(event.target.checked ? [...modules, module] : modules.filter(item => item !== module))}/><span>{STAFF_MODULE_LABELS[module]}{!(["REPORTS", "JOBS", "COMMUNITY_DATA"] as string[]).includes(module) && <small className="ml-1 font-normal text-[#92a4b2]">(preview)</small>}</span></label>)}</div></fieldset>
      {error && <p role="alert" className="elb-admin-feedback elb-admin-feedback--error"><AlertCircle size={15}/>{error}</p>}
      {notice && <p role="status" className="elb-admin-feedback"><ShieldCheck size={15}/>{notice}</p>}
      {activationLink && <div className="space-y-2 rounded-xl border border-[#c7e5de] bg-[#f1faf6] p-4"><p className="text-[12px] font-bold text-[#245f59]">One-time demo activation link — shown only now</p><p className="break-all rounded-lg bg-white px-3 py-2 font-mono text-[11px] text-[#385e72]" aria-label="Staff activation link">{activationLink}</p><button className="elb-admin-outline" type="button" onClick={copyLink}>{copied ? <Check size={15}/> : <Copy size={15}/>} {copied ? "Copied" : "Copy activation link"}</button><p className="text-[11px] text-[#547d70]">Expires in 48 hours. Creating a replacement link invalidates the previous one.</p></div>}
      <div className="flex justify-end"><button className="elb-admin-primary" disabled={pending || !modules.length || deliveryMode === "DISABLED"}>{pending ? <LoaderCircle size={16} className="animate-spin"/> : <MailPlus size={16}/>} {deliveryMode === "EMAIL" ? "Create & send invitation" : "Create demo invitation"}</button></div>
    </form>
    <div className="border-t border-[#e9f0f3] pt-5"><div className="mb-3 flex flex-wrap items-center justify-between gap-2"><h3 className="text-[14px] font-extrabold text-[#1d4c68]">Invitation status</h3><span className="text-[11px] text-[#7791a1]">Latest 100 invitations</span></div>
      {initialInvites.length ? <div className="space-y-2">{initialInvites.map(invite => <div key={invite.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#e6eef3] bg-[#fafcfd] p-3.5"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><strong className="text-[12px] text-[#254f6c]">{invite.name}</strong><span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${invite.status === "PENDING" ? "bg-amber-50 text-amber-700" : invite.status === "ACTIVATED" ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>{invite.status === "PENDING" ? "Awaiting activation" : invite.status === "ACTIVATED" ? "Activated" : invite.status === "EXPIRED" ? "Expired" : "Revoked"}</span></div><p className="mt-1 break-all text-[11px] text-[#6b899c]">{invite.email} · {invite.department} · {invite.modules.length} module(s)</p><p className="mt-1 flex items-center gap-1 text-[10px] text-[#8b9dac]"><Clock3 size={12}/> Expires {new Date(invite.expiresAt).toLocaleString("en-PH", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Manila" })}</p></div><div className="flex flex-wrap items-center gap-2">{(invite.status === "PENDING" || invite.status === "EXPIRED") && <button type="button" disabled={workingId === invite.id || invite.status === "EXPIRED" && deliveryMode === "DISABLED"} className="elb-admin-outline" onClick={() => manage(invite.id, "RESEND")}><RefreshCw size={14}/> Resend link</button>}{(invite.status === "PENDING" || invite.status === "EXPIRED") && <button type="button" disabled={workingId === invite.id} className="elb-admin-danger" onClick={() => manage(invite.id, "REVOKE")}><XCircle size={14}/> Revoke</button>}</div></div>)}</div> : <p className="rounded-xl border border-dashed border-[#d9e6ee] p-7 text-center text-[12px] text-[#7892a4]">No staff invitations yet. Create the first invitation above.</p>}
    </div>
  </section>;
}
