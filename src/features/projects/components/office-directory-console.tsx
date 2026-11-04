"use client";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { LGU_OFFICES, LGU_OFFICE_GROUPS } from "@/lib/lgu-offices";
import { LOS_BANOS_OFFICIAL_CONTACTS } from "@/features/projects/official-los-banos-offices";

type Proposal = { id: string; officeName: string; phone: string | null; extension: string | null; email: string | null; officeHours: string | null; address: string | null; notes: string | null; sourceUrl: string; status: string; reviewNote: string | null };
type Override = { officeName: string; phone: string | null; extension: string | null; email: string | null; officeHours: string | null; address: string | null; notes: string | null; sourceUrl: string; isPublished: boolean; verifiedAt: string };
const input = "mt-1 h-11 w-full rounded-lg border border-input bg-card px-2 text-xs text-foreground";
const action = "min-h-11 rounded-lg bg-primary px-3 py-2 text-xs font-bold text-primary-foreground disabled:cursor-not-allowed disabled:border-dashed disabled:text-muted-foreground disabled:bg-muted";
const secondary = "min-h-11 rounded-lg border border-border px-3 py-2 text-xs font-bold text-foreground disabled:cursor-not-allowed disabled:border-dashed disabled:text-muted-foreground disabled:bg-muted";
export function OfficeDirectoryConsole({ admin, department, proposals, overrides }: { admin: boolean; department: string; proposals: Proposal[]; overrides: Override[] }) {
  const router = useRouter();
  const [office, setOffice] = useState(department && LGU_OFFICES.some(x => x.name === department) ? department : "");
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  const [reason, setReason] = useState<Record<string, string>>({});
  const base = overrides.find(x => x.officeName === office && x.isPublished) ?? LOS_BANOS_OFFICIAL_CONTACTS[office];
  async function send(body: Record<string, unknown>) {
    setBusy(true); setNote("");
    try {
      const res = await fetch("/api/admin/projects/offices", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const result = await res.json() as { ok?: boolean; error?: string };
      if (!res.ok || !result.ok) throw new Error(result.error || "Contact update failed.");
      setNote("Saved successfully. Refreshing the directory.");
      router.refresh();
      return true;
    } catch (e) { setNote(e instanceof Error ? e.message : "Unable to update office."); return false; }
    finally { setBusy(false); }
  }
  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const fields = Object.fromEntries(data.entries());
    const ok = await send({ action: admin ? "office.publish" : "office.propose", ...fields });
    if (ok) setOpen(false);
  }
  return <section className="space-y-3 rounded-xl border border-border bg-card p-3 sm:p-4">
    <div className="flex flex-wrap items-center justify-between gap-2"><div><h2 className="text-sm font-black text-foreground">Office Contact Directory</h2><p className="mt-0.5 text-xs text-muted-foreground">Official Los Baños website references · Admin-approved corrections</p></div><button type="button" className={secondary} onClick={() => setOpen(v => !v)}>{open ? "Close form" : admin ? "+ Verify or correct contact" : "+ Propose correction"}</button></div>
    <div className="flex flex-wrap gap-2 text-xs text-foreground"><span className="rounded-md bg-muted px-2 py-1">{overrides.filter(x => x.isPublished).length} Admin-verified overrides</span><span className="rounded-md bg-muted px-2 py-1">{proposals.filter(x => x.status === "PENDING_REVIEW").length} pending suggestions</span></div>
    {note && <p role="status" className="rounded-lg bg-muted p-2 text-xs text-foreground">{note}</p>}
    {open && <form onSubmit={save} className="grid gap-2 rounded-xl border border-border bg-muted p-3 sm:grid-cols-2"><p className="text-xs text-foreground sm:col-span-2">Verify the number and all entered details against the linked official source. Missing hours/address should remain blank.</p><label className="text-xs font-semibold text-foreground sm:col-span-2">LGU office<select name="officeName" required value={office} onChange={e => setOffice(e.target.value)} className={input}><option value="">Select office</option>{LGU_OFFICE_GROUPS.map(group => <optgroup key={group} label={group}>{LGU_OFFICES.filter(o => o.group === group).map(o => <option key={o.name}>{o.name}</option>)}</optgroup>)}</select></label>
      <label className="text-xs text-foreground">Phone<input name="phone" type="tel" maxLength={35} key={`p-${office}`} defaultValue={base?.phone ?? ""} className={input} placeholder="(049) ..."/></label><label className="text-xs text-foreground">Extension<input name="extension" key={`ex-${office}`} maxLength={15} defaultValue={base?.extension ?? ""} className={input}/></label><label className="text-xs text-foreground">Email<input name="email" type="email" maxLength={190} key={`e-${office}`} defaultValue={base?.email ?? ""} className={input}/></label><label className="text-xs text-foreground">Office hours (optional)<input name="officeHours" maxLength={160} key={`h-${office}`} defaultValue={base?.officeHours ?? ""} className={input} placeholder="Only if officially sourced"/></label><label className="text-xs text-foreground">Office location (optional)<input name="address" maxLength={220} key={`a-${office}`} defaultValue={base?.address ?? ""} className={input}/></label><label className="text-xs text-foreground">Official source URL<input name="sourceUrl" type="url" required maxLength={500} key={`s-${office}`} defaultValue={base?.sourceUrl ?? "https://losbanos.gov.ph/sendmail"} className={input}/></label><label className="text-xs text-foreground sm:col-span-2">Service notes (optional)<input name="notes" maxLength={350} key={`n-${office}`} defaultValue={base?.notes ?? ""} className={input}/></label>
      <div className="flex items-center gap-2 sm:col-span-2"><button type="submit" disabled={busy || !office} className={action}>{admin ? "Verify & publish" : "Submit for Admin review"}</button><button type="button" className={secondary} onClick={() => setOpen(false)}>Cancel</button></div></form>}
    <details className="rounded-lg border border-border px-3 py-2"><summary className="cursor-pointer text-xs font-bold text-foreground">{admin ? "Staff suggestions & previous decisions" : "My office suggestions"} ({proposals.length})</summary><div className="mt-3 space-y-2">{!proposals.length && <p className="text-xs text-muted-foreground">No submitted corrections yet.</p>}{proposals.map(p => <div key={p.id} className="rounded-lg border border-border p-3 text-xs"><div className="flex flex-wrap justify-between gap-2"><b className="text-foreground">{p.officeName}</b><span className="text-muted-foreground">{p.status.replaceAll("_", " ")}</span></div><p className="mt-1 text-muted-foreground">{p.phone ?? "No phone"}{p.extension ? ` ext. ${p.extension}` : ""} · {p.email ?? "No email"}</p><a href={p.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-xs font-semibold text-foreground underline">Verify source ↗</a>{p.reviewNote && <p className="mt-1 text-warning-foreground">Review note: {p.reviewNote}</p>}{admin && p.status === "PENDING_REVIEW" && <div className="mt-2 flex flex-wrap gap-2"><input aria-label={`Reason for ${p.officeName}`} className={input + " max-w-xs"} value={reason[p.id] ?? ""} maxLength={700} onChange={e => setReason(v => ({ ...v, [p.id]: e.target.value }))} placeholder="Reason if returning"/><button disabled={busy} type="button" className={action} onClick={() => void send({action:"office.review",id:p.id,decision:"APPROVE"})}>Approve</button><button disabled={busy} type="button" className={secondary} onClick={() => void send({action:"office.review",id:p.id,decision:"RETURN",reason:reason[p.id] || ""})}>Return</button></div>}</div>)}</div></details>
    <details className="rounded-lg border border-border px-3 py-2"><summary className="cursor-pointer text-xs font-bold text-foreground">Published directory overrides ({overrides.length})</summary><div className="mt-2 space-y-1">{overrides.map(o => <div key={o.officeName} className="flex flex-wrap items-center justify-between gap-2 border-b border-border py-2 text-xs"><span>{o.officeName} — {o.isPublished ? "Published" : "Suppressed"}</span>{admin && o.isPublished && <button disabled={busy} type="button" className={secondary} onClick={() => { if (confirm(`Hide contact for ${o.officeName} until reverified?`)) void send({action:"office.unpublish",officeName:o.officeName}); }}>Hide unverified contact</button>}</div>)}</div></details>
  </section>;
}
