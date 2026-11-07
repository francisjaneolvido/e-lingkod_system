"use client";

import { useEffect, useState, useSyncExternalStore, type FormEvent } from "react";
import Link from "next/link";
import { Mail } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { isValidResetPassword, PASSWORD_RESET_PUBLIC_MESSAGE } from "../password-recovery";
import { AuthInput } from "./auth-input";
import { PasswordField } from "./password-field";

const actionClass = "elb-button elb-button-primary elb-auth-submit";
const hydrationSubscribe = () => () => {};

export function RequestPasswordResetForm() {
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const email = String(new FormData(event.currentTarget).get("email") || "").trim().toLowerCase();
    setPending(true); setError(""); setMessage("");
    try {
      const result = await authClient.requestPasswordReset({ email, redirectTo: "/reset-password" });
      if (result.error) {
        setError(result.error.status === 429 ? "Too many requests. Wait a minute before trying again." : "Unable to request a reset right now. Please try again.");
      } else setMessage(PASSWORD_RESET_PUBLIC_MESSAGE);
    } catch { setError("Check your connection and try again."); }
    finally { setPending(false); }
  }
  return <div>
    <div className="elb-auth-heading"><h1>Recover your password</h1><p>Enter the email address you use for eLingkod Bayan. Reset links expire after 30 minutes.</p></div>
    <form method="post" onSubmit={submit} className="space-y-4" aria-busy={pending}>
      <AuthInput id="recoveryEmail" name="email" label="Email address" icon={Mail} type="email" autoComplete="email" required maxLength={191} disabled={pending}/>
      <button className={actionClass} disabled={pending}>{pending ? "Requesting reset…" : "Send reset email"}</button>
      <p role="status" className="elb-auth-result">{message}</p>
      {error && <p role="alert" className="elb-account-alert">{error}</p>}
    </form>
    <Link href="/login" className="mt-6 inline-flex min-h-11 items-center font-semibold text-link underline underline-offset-4">Back to sign in</Link>
  </div>;
}

export function ResetPasswordForm() {
  const ready = useSyncExternalStore(hydrationSubscribe, () => true, () => false);
  const [token, setToken] = useState(() => {
    if (typeof window === "undefined") return "";
    const supplied = new URLSearchParams(window.location.hash.slice(1)).get("token");
    return supplied && /^[A-Za-z0-9_-]{20,256}$/.test(supplied) ? supplied : "";
  });
  const [pending, setPending] = useState(false);
  const [complete, setComplete] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    // Remove the secret from browser history immediately; only component memory retains it.
    window.history.replaceState(window.history.state, "", window.location.pathname);
    const receiveLink = () => {
      const supplied = new URLSearchParams(window.location.hash.slice(1)).get("token");
      setToken(supplied && /^[A-Za-z0-9_-]{20,256}$/.test(supplied) ? supplied : "");
      setComplete(false); setError("");
      window.history.replaceState(window.history.state, "", window.location.pathname);
    };
    window.addEventListener("hashchange", receiveLink);
    return () => window.removeEventListener("hashchange", receiveLink);
  }, []);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending || !token) return;
    const values = new FormData(event.currentTarget);
    const password = String(values.get("newPassword") || "");
    if (!isValidResetPassword(password)) { setError("Use 12–128 characters with uppercase, lowercase, a number and a symbol."); return; }
    if (values.get("confirmPassword") !== password) { setError("Passwords do not match."); return; }
    setError(""); setPending(true);
    try {
      const result = await authClient.resetPassword({ token, newPassword: password });
      if (result.error) setError(result.error.status >= 500 ? "Unable to reset right now. Try this link again, or request another email." : result.error.status === 429 ? "Too many attempts. Wait a minute before retrying." : "This link is invalid, expired or already used. Request a new reset email.");
      else { setComplete(true); setToken(""); }
    } catch { setError("Check your connection, then try this link again."); }
    finally { setPending(false); }
  }
  return <div>
    <div className="elb-auth-heading"><h1>Choose a new password</h1></div>
    {complete ? <p role="status" className="my-6 text-sm leading-6">Your password has been reset and your previous sessions have been signed out. Sign in with your new password. Your account role and ID review status are unchanged.</p> : ready && !token ? <p role="alert" className="my-6 text-sm leading-6">Open the full link from your reset email. If the link has expired or was already used, request another email.</p> : <>
      <p className="my-6 text-sm leading-6 text-muted-foreground">Use 12–128 characters, including uppercase and lowercase letters, a number and a symbol. All previous sessions will be signed out.</p>
      <form method="post" onSubmit={submit} className="space-y-4" aria-busy={pending}>
        <PasswordField id="resetPassword" name="newPassword" label="New password" autoComplete="new-password" minLength={12} maxLength={128} disabled={!ready || pending}/>
        <PasswordField id="resetConfirmPassword" name="confirmPassword" label="Confirm new password" autoComplete="new-password" minLength={12} maxLength={128} disabled={!ready || pending}/>
        <button className={actionClass} disabled={!ready || pending}>{pending ? "Resetting password…" : "Reset password"}</button>
        {error && <p role="alert" className="elb-account-alert">{error}</p>}
      </form>
    </>}
    {!complete && <Link href="/forgot-password" className="mt-5 flex min-h-11 items-center font-semibold text-link underline underline-offset-4">Request another reset email</Link>}
    <Link href="/login" className="mt-3 inline-flex min-h-11 items-center font-semibold text-link underline underline-offset-4">Back to sign in</Link>
  </div>;
}
