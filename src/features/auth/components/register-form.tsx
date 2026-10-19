"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Mail, UserRound, LoaderCircle, AlertCircle, CheckCircle2 } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { getSafeAuthDestination } from "@/lib/auth-redirect";
import { AuthInput } from "./auth-input";
import { PasswordField } from "./password-field";

export function RegisterForm() {
  const router = useRouter();
  const [accepted, setAccepted] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending || !accepted) return;
    setError("");
    const fields = new FormData(event.currentTarget);
    const firstName = String(fields.get("firstName") ?? "").trim();
    const lastName = String(fields.get("lastName") ?? "").trim();
    const email = String(fields.get("email") ?? "").trim().toLowerCase();
    const password = String(fields.get("password") ?? "");
    const confirmPassword = String(fields.get("confirmPassword") ?? "");
    if (!firstName || !lastName) { setError("Please enter your first and last name."); return; }
    if (password.length < 8 || password.length > 128) { setError("Password must be between 8 and 128 characters."); return; }
    if (password !== confirmPassword) { setError("Passwords do not match."); return; }

    setPending(true);
    try {
      const result = await authClient.signUp.email({
        name: `${firstName} ${lastName}`,
        email,
        password,
        // Role is intentionally NOT sent by clients. Server sets CITIZEN.
      });
      if (result.error) { setError(result.error.message || "Could not create account. Please try again."); return; }
      router.replace(getSafeAuthDestination());
      router.refresh();
    } catch {
      setError("Registration failed. Check that the server and MySQL are running.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div>
      <div className="mb-6 text-center">
        <span className="mb-3 inline-flex items-center rounded-full bg-[#eef8fd] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-[#2382ae]">Join Our Community</span>
        <h2 className="text-[clamp(27px,2.5vw,33px)] font-extrabold leading-tight tracking-[-0.05em] text-[#12466a]">Create an account<span className="text-[#ffae24]">.</span></h2>
        <p className="mt-2 text-[12px] leading-6 text-[#6d899b]">Set up your citizen profile to access eLB services.</p>
      </div>
      <form className="space-y-3.5" onSubmit={handleSubmit}>
        <div className="grid gap-3.5 sm:grid-cols-2">
          <AuthInput id="firstName" name="firstName" label="First Name" icon={UserRound} placeholder="Juan" autoComplete="given-name" required disabled={pending} />
          <AuthInput id="lastName" name="lastName" label="Last Name" icon={UserRound} placeholder="Dela Cruz" autoComplete="family-name" required disabled={pending} />
        </div>
        <AuthInput id="registerEmail" name="email" label="Email Address" icon={Mail} type="email" placeholder="name@example.com" autoComplete="email" required disabled={pending} />
        <PasswordField id="registerPassword" name="password" label="Create Password" placeholder="At least 8 characters" autoComplete="new-password" />
        <PasswordField id="confirmPassword" name="confirmPassword" label="Confirm Password" placeholder="Re-enter your password" autoComplete="new-password" />
        <label className="flex cursor-pointer items-start gap-2.5 pt-1 text-[11px] leading-[19px] text-[#678398]">
          <input type="checkbox" checked={accepted} onChange={event => setAccepted(event.target.checked)} required className="mt-0.5 size-4 shrink-0 accent-[#14638f]" />
          <span>I agree to use this system only for its intended purposes. This is a hackathon prototype; do not enter sensitive personal information.</span>
        </label>
        {error && <p role="alert" className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-xs text-red-700"><AlertCircle size={16} className="mt-0.5 shrink-0" />{error}</p>}
        <button type="submit" disabled={pending || !accepted} className="group flex h-[49px] w-full items-center justify-center gap-2 rounded-xl bg-[#12557e] text-[13px] font-bold text-white shadow-[0_12px_22px_rgba(18,85,126,0.14)] transition hover:-translate-y-0.5 hover:bg-[#0879ab] disabled:cursor-not-allowed disabled:opacity-55 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#12557e]">
          {pending ? <><LoaderCircle size={17} className="animate-spin" /> Creating account...</> : <>Create account <ArrowRight size={17} className="transition group-hover:translate-x-1" /></>}
        </button>
        <p className="flex items-start gap-2 text-[11px] leading-5 text-[#648399]"><CheckCircle2 size={15} className="mt-0.5 shrink-0 text-[#168e76]" /> All self-registered accounts are assigned the Citizen role.</p>
      </form>
      <p className="mt-6 text-center text-[12px] text-[#69879a]">Already have an account?{" "}<Link href="/login" className="font-bold text-[#0f7ba9] underline-offset-4 transition hover:underline">Log in here</Link></p>
    </div>
  );
}
