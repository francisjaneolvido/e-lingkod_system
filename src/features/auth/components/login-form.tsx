"use client";

import { useState, useSyncExternalStore, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Mail, MoveUpRight, LoaderCircle, AlertCircle } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { getSafeAuthDestination } from "@/lib/auth-redirect";
import { AuthInput } from "./auth-input";
import { PasswordField } from "./password-field";

const subscribeReady = () => () => {};
export function LoginForm() {
  const ready = useSyncExternalStore(subscribeReady, () => true, () => false);
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
      let destination = getSafeAuthDestination();
      if (destination === "/") {
        try {
          const response = await fetch("/api/account/destination", { cache: "no-store" });
          if (response.ok) {
            const result = await response.json() as { destination?: string };
            if (result.destination?.startsWith("/") && !result.destination.startsWith("//")) destination = result.destination;
          }
        } catch { /* Keep the normal citizen homepage if destination lookup is unavailable. */ }
      }
      router.replace(destination);
      router.refresh();
    } catch {
      setError("Unable to log in right now. Check your connection and try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div>
      <div className="elb-auth-heading"><h1>Sign in</h1><p>Sign in to your reports and community services.</p></div>

      <form method="post" className="space-y-4" onSubmit={handleSubmit} aria-busy={pending}>
        <AuthInput id="loginEmail" name="email" label="Email address" icon={Mail} type="email" autoComplete="email" placeholder="name@example.com" required disabled={!ready || pending} />
        <PasswordField id="loginPassword" name="password" label="Password" autoComplete="current-password" disabled={pending} />
        <div className="flex flex-wrap items-center justify-between gap-3 pt-0.5">
          <label className="elb-auth-check">
            <input type="checkbox" checked={remember} onChange={event => setRemember(event.target.checked)} className="size-4 rounded border-border accent-[#14638f]" />
            Remember me
          </label>
          <Link href="/forgot-password" className="inline-flex min-h-11 items-center text-sm font-semibold text-link underline underline-offset-4">Forgot password?</Link>
        </div>
        {error && <p role="alert" className="elb-account-alert flex items-start gap-2"><AlertCircle aria-hidden="true" size={16} className="mt-0.5 shrink-0" />{error}</p>}
        <button type="submit" disabled={pending} className="elb-button elb-button-primary elb-auth-submit">
          {pending ? <><LoaderCircle aria-hidden="true" size={17} className="animate-spin" /> Signing in…</> : <>Sign in <ArrowRight aria-hidden="true" size={17} className="transition group-hover:translate-x-1" /></>}
        </button>
      </form>

      <Link href="/" className="elb-auth-guest">Continue as guest <MoveUpRight aria-hidden="true" size={16} /></Link>
      <p className="elb-auth-bottom">Don&apos;t have an account?{" "}<Link href="/register" className="font-bold text-foreground underline-offset-4 transition hover:underline">Create an account</Link></p>
    </div>
  );
}
