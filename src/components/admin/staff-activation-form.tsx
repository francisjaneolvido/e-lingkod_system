"use client";
import { useState, type FormEvent } from "react";
import Link from "next/link";
import { CheckCircle2, LockKeyhole, LoaderCircle, AlertCircle, ArrowRight } from "lucide-react";
import { PasswordField } from "@/features/auth/components/password-field";

export function StaffActivationForm({ token }: { token: string }) {
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (busy) return;
    setBusy(true); setError("");
    const values = new FormData(event.currentTarget);
    const password = String(values.get("password") || "");
    const confirmPassword = String(values.get("confirmPassword") || "");
    if (password !== confirmPassword) { setError("Your passwords do not match."); setBusy(false); return; }
    try {
      const response = await fetch("/api/staff/activate", { method: "POST", credentials: "same-origin", cache: "no-store", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token, password, confirmPassword }) });
      const result = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) throw new Error(result.error || "Unable to activate account.");
      setDone(true);
    } catch (problem) { setError(problem instanceof Error ? problem.message : "Unable to activate account."); }
    finally { setBusy(false); }
  }
  if (done) return <div className="space-y-4 text-center"><CheckCircle2 aria-hidden="true" className="mx-auto text-success" size={42}/><h2 className="text-xl font-semibold text-foreground">Your staff account is active!</h2><p className="text-sm leading-6 text-muted-foreground">Log in using your invited email address and the password you just created. Your department and modules are already assigned.</p><Link className="elb-button elb-button-primary" href="/login">Sign in <ArrowRight aria-hidden="true" size={16}/></Link></div>;
  return <form onSubmit={submit} className="space-y-5" aria-busy={busy}><div className="elb-auth-hint flex items-center gap-2"><LockKeyhole aria-hidden="true" size={18} className="shrink-0"/>Your password will never be shown to the Super Admin. Use 12–128 characters.</div><PasswordField id="staffPassword" name="password" label="Create password" minLength={12} autoComplete="new-password"/><PasswordField id="staffPasswordAgain" name="confirmPassword" label="Confirm password" minLength={12} autoComplete="new-password"/>{error && <p role="alert" className="elb-account-alert flex items-start gap-2"><AlertCircle aria-hidden="true" size={16}/>{error}</p>}<button type="submit" disabled={busy} className="elb-button elb-button-primary elb-auth-submit">{busy ? <LoaderCircle aria-hidden="true" size={16} className="animate-spin"/> : <CheckCircle2 aria-hidden="true" size={16}/>} Activate my staff account</button></form>;
}
