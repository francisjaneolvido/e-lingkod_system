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

  return <section className="space-y-4 rounded-[20px] border border-border bg-card p-5 sm:p-6">
    <header className="flex flex-wrap items-start justify-between gap-3">
      <div className="flex items-start gap-3"><span className="grid size-11 shrink-0 place-items-center rounded-xl bg-muted text-success"><MailPlus size={22}/></span><div><h2 className="text-[17px] font-extrabold text-foreground">Create &amp; invite LGU staff</h2><p className="mt-1 max-w-xl text-[12px] leading-6 text-muted-foreground">Create a new staff invitation. No staff login exists until the recipient activates the account and chooses a password.</p></div></div>
      <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1.5 text-xs font-semibold text-muted-foreground"><ShieldCheck size={13}/> Super Admin only</span>
    </header>
    {deliveryMode === "DEMO" ? <p className="rounded-xl border border-border bg-card px-4 py-3 text-[12px] leading-6 text-warning-foreground"><strong>Local demo mode:</strong> An activation link will appear after you invite a staff member. Copy it securely and open it in the staff browser. <strong>No email will be sent.</strong> Keep the link private.</p> : deliveryMode === "DISABLED" ? <p className="rounded-xl border border-border bg-card px-4 py-3 text-[12px] leading-6 text-destructive">Invitation delivery is not configured. Add Resend credentials for real email invitations, or set <code>STAFF_INVITE_DEMO_LINKS=true</code> in your local <code>.env</code> for hackathon testing.</p> : <p className="rounded-xl border border-border bg-muted px-4 py-3 text-[12px] leading-6 text-success">Email delivery configured. The system will send a single-use activation link to the staff member&apos;s email.</p>}
    <form onSubmit={submit} className="space-y-4">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <label className="text-xs font-bold text-foreground">Full name<input className="elb-admin-field mt-1.5" required maxLength={191} value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Juan Dela Cruz" disabled={pending}/></label>
        <label className="text-xs font-bold text-foreground">Work email<input className="elb-admin-field mt-1.5" type="email" required maxLength={191} autoComplete="off" value={email} onChange={e => setEmail(e.target.value)} placeholder="staff@example.gov.ph" disabled={pending}/></label>
        <label className="text-xs font-bold text-foreground">Department / office<LGUOfficeSelect className="elb-admin-field mt-1.5" value={department} onChange={setDepartment} disabled={pending}/></label>
        <label className="text-xs font-bold text-foreground">Designation<input className="elb-admin-field mt-1.5" required maxLength={120} value={designation} onChange={e => setDesignation(e.target.value)} placeholder="e.g. Response Officer" disabled={pending}/></label>
      </div>
      <LGUOfficeRecommendation office={department} modules={modules} onApply={setModules} disabled={pending}/>
      <fieldset disabled={pending}><legend className="mb-2 text-xs font-bold text-foreground">Authorized service modules</legend><div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{STAFF_MODULES.map(module => <label key={module} className={`elb-admin-module-check ${modules.includes(module) ? "elb-admin-module-check--selected" : ""}`}><input className="size-4 accent-[#136f98]" type="checkbox" checked={modules.includes(module)} onChange={event => setModules(event.target.checked ? [...modules, module] : modules.filter(item => item !== module))}/><span>{STAFF_MODULE_LABELS[module]}{!(["REPORTS", "JOBS", "COMMUNITY_DATA"] as string[]).includes(module) && <small className="ml-1 font-normal text-muted-foreground">(preview)</small>}</span></label>)}</div></fieldset>
      {error && <p role="alert" className="elb-admin-feedback elb-admin-feedback--error"><AlertCircle size={15}/>{error}</p>}
      {notice && <p role="status" className="elb-admin-feedback"><ShieldCheck size={15}/>{notice}</p>}
      {activationLink && <div className="space-y-2 rounded-xl border border-border bg-muted p-4"><p className="text-[12px] font-bold text-success">One-time demo activation link — shown only now</p><p className="break-all rounded-lg bg-card px-3 py-2 font-mono text-xs text-foreground" aria-label="Staff activation link">{activationLink}</p><button className="elb-admin-outline" type="button" onClick={copyLink}>{copied ? <Check size={15}/> : <Copy size={15}/>} {copied ? "Copied" : "Copy activation link"}</button><p className="text-xs text-success">Expires in 48 hours. Creating a replacement link invalidates the previous one.</p></div>}
      <div className="flex justify-end"><button className="elb-admin-primary" disabled={pending || !modules.length || deliveryMode === "DISABLED"}>{pending ? <LoaderCircle size={16} className="animate-spin"/> : <MailPlus size={16}/>} {deliveryMode === "EMAIL" ? "Create & send invitation" : "Create demo invitation"}</button></div>
    </form>
    <div className="border-t border-border pt-5"><div className="mb-3 flex flex-wrap items-center justify-between gap-2"><h3 className="text-[14px] font-extrabold text-foreground">Invitation status</h3><span className="text-xs text-muted-foreground">Latest 100 invitations</span></div>
      {initialInvites.length ? <div className="space-y-2">{initialInvites.map(invite => <div key={invite.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-3.5"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><strong className="text-[12px] text-foreground">{invite.name}</strong><span className={`rounded-full px-2 py-0.5 text-xs font-bold ${invite.status === "PENDING" ? "bg-amber-50 text-amber-700" : invite.status === "ACTIVATED" ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>{invite.status === "PENDING" ? "Awaiting activation" : invite.status === "ACTIVATED" ? "Activated" : invite.status === "EXPIRED" ? "Expired" : "Revoked"}</span></div><p className="mt-1 break-all text-xs text-muted-foreground">{invite.email} · {invite.department} · {invite.modules.length} module(s)</p><p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground"><Clock3 size={12}/> Expires {new Date(invite.expiresAt).toLocaleString("en-PH", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Manila" })}</p></div><div className="flex flex-wrap items-center gap-2">{(invite.status === "PENDING" || invite.status === "EXPIRED") && <button type="button" disabled={workingId === invite.id || invite.status === "EXPIRED" && deliveryMode === "DISABLED"} className="elb-admin-outline" onClick={() => manage(invite.id, "RESEND")}><RefreshCw size={14}/> Resend link</button>}{(invite.status === "PENDING" || invite.status === "EXPIRED") && <button type="button" disabled={workingId === invite.id} className="elb-admin-danger" onClick={() => manage(invite.id, "REVOKE")}><XCircle size={14}/> Revoke</button>}</div></div>)}</div> : <p className="rounded-xl border border-dashed border-border p-7 text-center text-[12px] text-muted-foreground">No staff invitations yet. Create the first invitation above.</p>}
    </div>
  </section>;
}
