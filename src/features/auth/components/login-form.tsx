"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Mail, MoveUpRight, LoaderCircle, AlertCircle } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { getSafeAuthDestination } from "@/lib/auth-redirect";
import { AuthInput } from "./auth-input";
import { PasswordField } from "./password-field";

export function LoginForm() {
  const router = useRouter();
  const [remember, setRemember] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    setError("");
    setPending(true);
    const values = new FormData(event.currentTarget);
    const email = String(values.get("email") ?? "").trim().toLowerCase();
    const password = String(values.get("password") ?? "");
    try {
      const result = await authClient.signIn.email({ email, password, rememberMe: remember });
      if (result.error) {
        setError(result.error.message || "Incorrect email or password. Please try again.");
        return;
      }
      router.replace(getSafeAuthDestination());
      router.refresh();
    } catch {
      setError("Unable to log in right now. Check your connection and try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div>
      <div className="mb-7 text-center lg:mb-8">
        <span className="mb-3 inline-flex items-center rounded-full bg-[#eef8fd] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-[#2382ae]">Citizen Account</span>
        <h2 className="text-[clamp(27px,2.5vw,35px)] font-extrabold leading-tight tracking-[-0.05em] text-[#12466a]">Welcome Back<span className="text-[#ffae24]">!</span></h2>
        <p className="mt-2 text-[12px] leading-6 text-[#6d899b]">Sign in to access reports and community services.</p>
      </div>

      <form className="space-y-4" onSubmit={handleSubmit}>
        <AuthInput id="loginEmail" name="email" label="Email Address" icon={Mail} type="email" autoComplete="email" placeholder="name@example.com" required disabled={pending} />
        <PasswordField id="loginPassword" name="password" label="Password" autoComplete="current-password" />
        <div className="flex flex-wrap items-center justify-between gap-3 pt-0.5">
          <label className="inline-flex cursor-pointer items-center gap-2 text-[11px] text-[#607e92]">
            <input type="checkbox" checked={remember} onChange={event => setRemember(event.target.checked)} className="size-4 rounded border-[#bacfdd] accent-[#14638f]" />
            Remember me
          </label>
          <span className="text-[11px] font-semibold text-[#297da9]" title="Requires an email delivery service">Forgot password? <span className="font-normal text-[#9eb1bd]">(coming soon)</span></span>
        </div>
        {error && <p role="alert" className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-xs text-red-700"><AlertCircle size={16} className="mt-0.5 shrink-0" />{error}</p>}
        <button type="submit" disabled={pending} className="group flex h-[49px] w-full items-center justify-center gap-2 rounded-xl bg-[#12557e] text-[13px] font-bold text-white shadow-[0_12px_22px_rgba(18,85,126,0.14)] transition hover:-translate-y-0.5 hover:bg-[#0879ab] disabled:cursor-wait disabled:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#12557e]">
          {pending ? <><LoaderCircle size={17} className="animate-spin" /> Signing in...</> : <>Log In <ArrowRight size={17} className="transition group-hover:translate-x-1" /></>}
        </button>
      </form>

      <Link href="/" className="mt-3 flex h-[47px] items-center justify-center gap-2 rounded-xl border border-[#9bbdd1] bg-white text-[12px] font-bold text-[#135b83] transition hover:border-[#4c99be] hover:bg-[#f1f9fd] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#166890]">Continue as Guest <MoveUpRight size={16} /></Link>
      <p className="mt-6 text-center text-[12px] text-[#69879a]">Don&apos;t have an account?{" "}<Link href="/register" className="font-bold text-[#0f7ba9] underline-offset-4 transition hover:underline">Register here</Link></p>
    </div>
  );
}
