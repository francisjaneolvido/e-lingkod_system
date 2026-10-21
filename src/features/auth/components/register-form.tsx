"use client";

import { useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Mail, UserRound, Phone, LoaderCircle, AlertCircle, CheckCircle2, Circle } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { getSafeAuthDestination } from "@/lib/auth-redirect";
import { AuthInput } from "./auth-input";
import { PasswordField } from "./password-field";
import { checkRegistration, passwordChecks, type RegistrationFields } from "../registration-validation";

export function RegisterForm() {
  const router = useRouter();
  const [fields, setFields] = useState<RegistrationFields>({firstName:"",lastName:"",middleInitial:"",hasNoMiddleName:false,phoneNumber:"",email:"",password:"",confirmPassword:""});
  const [accepted, setAccepted] = useState(false);
  const [pending, setPending] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const rules = useMemo(() => passwordChecks(fields.password), [fields.password]);
  const validation = useMemo(() => checkRegistration(fields), [fields]);
  const messages = validation.ok ? {} : validation.errors;
  function update<K extends keyof RegistrationFields>(field:K, value:RegistrationFields[K]) {
    setFields(prev => ({...prev,[field]:value}));
    setError("");
  }
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    setSubmitted(true);
    setError("");
    if (!accepted) { setError("Please confirm the registration notice."); return; }
    const checked = checkRegistration(fields);
    if (!checked.ok) {setError("Review the highlighted fields and complete all requirements.");return;}
    setPending(true);
    try {
      const {data} = checked;
      const result = await authClient.signUp.email({
        name:data.name,email:data.email,password:data.password,
        firstName:data.firstName,lastName:data.lastName,middleInitial:data.middleInitial,
        hasNoMiddleName:data.hasNoMiddleName,phoneNumber:data.phoneNumber,
      } as Parameters<typeof authClient.signUp.email>[0] & {
        firstName:string;lastName:string;middleInitial:string;hasNoMiddleName:boolean;phoneNumber:string;
      });
      if (result.error) { setError(result.error.message || "Unable to create account. Please try again."); return; }
      router.replace(getSafeAuthDestination());
      router.refresh();
    } catch {
      setError("Registration failed. Check that the server and MySQL are running.");
    } finally {setPending(false);}
  }
  const message = (key:keyof RegistrationFields) => submitted && messages[key] ? <p role="alert" className="mt-1 text-xs text-red-700">{messages[key]}</p> : null;
  return (
    <div>
      <div className="mb-5 text-center">
        <span className="mb-2 inline-flex items-center rounded-full bg-[#eef8fd] px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-[#2382ae]">Citizen Registration</span>
        <h2 className="text-[clamp(27px,2.5vw,33px)] font-extrabold leading-tight tracking-tight text-[#12466a]">Create your account<span className="text-[#ffae24]">.</span></h2>
        <p className="mt-2 text-[13px] text-[#6d899b]">Complete your details to access citizen services.</p>
      </div>
      <form className="space-y-4" noValidate onSubmit={handleSubmit}>
        <div className="grid gap-3 sm:grid-cols-2">
          <div><AuthInput id="firstName" name="firstName" label="First Name *" icon={UserRound} placeholder="Juan" autoComplete="given-name" required minLength={2} maxLength={100} value={fields.firstName} onChange={e=>update("firstName",e.target.value)} disabled={pending} aria-invalid={submitted&&!!messages.firstName}/>{message("firstName")}</div>
          <div><AuthInput id="lastName" name="lastName" label="Surname *" icon={UserRound} placeholder="Dela Cruz" autoComplete="family-name" required minLength={2} maxLength={100} value={fields.lastName} onChange={e=>update("lastName",e.target.value)} disabled={pending} aria-invalid={submitted&&!!messages.lastName}/>{message("lastName")}</div>
        </div>
        <div>
          <AuthInput id="middleInitial" name="middleInitial" label="Middle Initial *" icon={UserRound} placeholder="M" maxLength={2} value={fields.middleInitial} onChange={e=>update("middleInitial",e.target.value.replace(/[^\p{L}.]/gu, "").slice(0,2))} disabled={pending||fields.hasNoMiddleName} aria-invalid={submitted&&!!messages.middleInitial} />
          <label className="mt-2 inline-flex items-center gap-2 text-xs text-[#456f89]"><input type="checkbox" checked={fields.hasNoMiddleName} onChange={e=>setFields(prev=>({...prev,hasNoMiddleName:e.target.checked,middleInitial:""}))} disabled={pending} className="size-4 accent-[#14638f]"/> I don't have a middle name</label>
          {message("middleInitial")}
        </div>
        <div><AuthInput id="phoneNumber" name="phoneNumber" label="Philippine Mobile Number *" icon={Phone} type="tel" inputMode="numeric" autoComplete="tel-national" placeholder="09XXXXXXXXX" required maxLength={13} value={fields.phoneNumber} onChange={e=>update("phoneNumber",e.target.value.replace(/(?!^)\+/g, "").replace(/[^\d+]/g, "").slice(0,13))} disabled={pending} aria-invalid={submitted&&!!messages.phoneNumber} hint="11-digit 09XXXXXXXXX or +639XXXXXXXXX; numbers only."/>{message("phoneNumber")}</div>
        <div><AuthInput id="registerEmail" name="email" label="Email Address *" icon={Mail} type="email" placeholder="name@example.com" autoComplete="email" required maxLength={191} value={fields.email} onChange={e=>update("email",e.target.value)} disabled={pending} aria-invalid={submitted&&!!messages.email}/>{message("email")}</div>
        <div><PasswordField id="registerPassword" name="password" label="Create Password *" placeholder="Create a strong password" autoComplete="new-password" minLength={12} maxLength={128} value={fields.password} onChange={e=>update("password",e.target.value)} disabled={pending}/>
          <div aria-live="polite" className="mt-3 grid gap-1.5 rounded-xl border border-[#d8e4ed] bg-[#f5fafd] p-3 sm:grid-cols-2">
            {([{key:"length",label:"12–128 characters"},{key:"upper",label:"Uppercase letter (A–Z)"},{key:"lower",label:"Lowercase letter (a–z)"},{key:"number",label:"Number (0–9)"},{key:"symbol",label:"Symbol (!, @, #, etc.)"}] as const).map(rule=><span key={rule.key} className={`flex items-center gap-1.5 text-[11px] ${rules[rule.key]?"text-[#138166]":"text-[#687e92]"}`}>{rules[rule.key]?<CheckCircle2 size={14}/>:<Circle size={14}/>} {rule.label}</span>)}
          </div>{message("password")}
        </div>
        <div><PasswordField id="confirmPassword" name="confirmPassword" label="Confirm Password *" placeholder="Enter password again" autoComplete="new-password" minLength={12} maxLength={128} value={fields.confirmPassword} onChange={e=>update("confirmPassword",e.target.value)} disabled={pending}/>{message("confirmPassword")}{fields.confirmPassword&&fields.confirmPassword===fields.password&&<p className="mt-1 flex items-center gap-1 text-xs text-[#138166]"><CheckCircle2 size={14}/> Passwords match</p>}</div>
        <label className="flex cursor-pointer items-start gap-2.5 pt-1 text-xs leading-5 text-[#678398]"><input type="checkbox" checked={accepted} onChange={e=>setAccepted(e.target.checked)} required disabled={pending} className="mt-0.5 size-4 shrink-0 accent-[#14638f]"/><span>I agree to the registration notice. Do not use real sensitive information for hackathon demo accounts. Mobile numbers are collected for contact purposes; no SMS verification is implemented yet.</span></label>
        {error&&<p role="alert" className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-xs text-red-700"><AlertCircle size={16} className="mt-0.5 shrink-0"/>{error}</p>}
        <button type="submit" disabled={pending||!accepted} className="flex h-[49px] w-full items-center justify-center gap-2 rounded-xl bg-[#12557e] text-[13px] font-bold text-white transition hover:bg-[#0879ab] disabled:cursor-not-allowed disabled:opacity-55 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#12557e]">
          {pending?<><LoaderCircle size={17} className="animate-spin"/> Creating account...</>:<>Create account <ArrowRight size={17}/></>}
        </button>
        <p className="flex items-center gap-2 text-xs text-[#648399]"><CheckCircle2 size={15} className="text-[#168e76]"/> New self-registered accounts always receive Citizen access.</p>
      </form>
      <p className="mt-5 text-center text-xs text-[#69879a]">Already have an account? <Link href="/login" className="font-bold text-[#0f7ba9] hover:underline">Log in here</Link></p>
    </div>
  );
}
