"use client";

import { useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Mail, UserRound, Phone, LoaderCircle, AlertCircle, CheckCircle2, Circle } from "lucide-react";
import { authClient } from "@/lib/auth-client";
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
      router.replace('/verification');
      router.refresh();
    } catch {
      setError("Registration is unavailable. Check your connection and try again.");
    } finally {setPending(false);}
  }
  const message = (key:keyof RegistrationFields) => submitted && messages[key] ? <p role="alert" className="mt-1 text-xs text-destructive">{messages[key]}</p> : null;
  return (
    <div>
      <div className="elb-auth-heading"><h1>Create your account</h1><p>Register your details, then submit an ID for Admin review before using Citizen features.</p></div>

      <form method="post" className="space-y-4" noValidate onSubmit={handleSubmit} aria-busy={pending}>
        <fieldset className="elb-auth-group"><legend>Your details</legend><div className="grid gap-3 sm:grid-cols-2">
          <div><AuthInput id="firstName" name="firstName" label="First name *" icon={UserRound} placeholder="Juan" autoComplete="given-name" required minLength={2} maxLength={100} value={fields.firstName} onChange={e=>update("firstName",e.target.value)} disabled={pending} aria-invalid={submitted&&!!messages.firstName}/>{message("firstName")}</div>
          <div><AuthInput id="lastName" name="lastName" label="Surname *" icon={UserRound} placeholder="Dela Cruz" autoComplete="family-name" required minLength={2} maxLength={100} value={fields.lastName} onChange={e=>update("lastName",e.target.value)} disabled={pending} aria-invalid={submitted&&!!messages.lastName}/>{message("lastName")}</div>
        </div>
        <div>
          <AuthInput id="middleInitial" name="middleInitial" label="Middle initial *" icon={UserRound} placeholder="M" maxLength={2} value={fields.middleInitial} onChange={e=>update("middleInitial",e.target.value.replace(/[^\p{L}.]/gu, "").slice(0,2))} disabled={pending||fields.hasNoMiddleName} aria-invalid={submitted&&!!messages.middleInitial} />
          <label className="elb-auth-check"><input type="checkbox" checked={fields.hasNoMiddleName} onChange={e=>setFields(prev=>({...prev,hasNoMiddleName:e.target.checked,middleInitial:""}))} disabled={pending} className="size-4 accent-[#14638f]"/> I don&apos;t have a middle name</label>
          {message("middleInitial")}
        </div>
        <div><AuthInput id="phoneNumber" name="phoneNumber" label="Philippine mobile number *" icon={Phone} type="tel" inputMode="numeric" autoComplete="tel-national" placeholder="09XXXXXXXXX" required maxLength={13} value={fields.phoneNumber} onChange={e=>update("phoneNumber",e.target.value.replace(/(?!^)\+/g, "").replace(/[^\d+]/g, "").slice(0,13))} disabled={pending} aria-invalid={submitted&&!!messages.phoneNumber} hint="11-digit 09XXXXXXXXX or +639XXXXXXXXX; numbers only."/>{message("phoneNumber")}</div>
        <div><AuthInput id="registerEmail" name="email" label="Email address *" icon={Mail} type="email" placeholder="name@example.com" autoComplete="email" required maxLength={191} value={fields.email} onChange={e=>update("email",e.target.value)} disabled={pending} aria-invalid={submitted&&!!messages.email}/>{message("email")}</div>
        </fieldset><fieldset className="elb-auth-group"><legend>Secure your account</legend>
        <div><PasswordField id="registerPassword" name="password" label="Create password *" placeholder="Create a strong password" autoComplete="new-password" minLength={12} maxLength={128} value={fields.password} onChange={e=>update("password",e.target.value)} disabled={pending}/>
          <div aria-live="polite" className="elb-auth-rules sm:grid-cols-2">
            {([{key:"length",label:"12–128 characters"},{key:"upper",label:"Uppercase letter (A–Z)"},{key:"lower",label:"Lowercase letter (a–z)"},{key:"number",label:"Number (0–9)"},{key:"symbol",label:"Symbol (!, @, #, etc.)"}] as const).map(rule=><span key={rule.key} className={`flex items-center gap-1.5 text-xs ${rules[rule.key]?"text-success":"text-muted-foreground"}`}><span className="sr-only">{rules[rule.key]?"Met: ":"Required: "}</span>{rules[rule.key]?<CheckCircle2 aria-hidden="true" size={14}/>:<Circle aria-hidden="true" size={14}/>} {rule.label}</span>)}
          </div>{message("password")}
        </div>
        <div><PasswordField id="confirmPassword" name="confirmPassword" label="Confirm password *" placeholder="Enter password again" autoComplete="new-password" minLength={12} maxLength={128} value={fields.confirmPassword} onChange={e=>update("confirmPassword",e.target.value)} disabled={pending}/>{message("confirmPassword")}{fields.confirmPassword&&fields.confirmPassword===fields.password&&<p className="mt-1 flex items-center gap-1 text-xs text-success"><CheckCircle2 aria-hidden="true" size={14}/> Passwords match</p>}</div>
        </fieldset>
        <label className="elb-auth-consent"><input type="checkbox" checked={accepted} onChange={e=>setAccepted(e.target.checked)} required disabled={pending} className="mt-0.5 size-4 shrink-0 accent-[#14638f]"/><span>I understand that an ID submission and authenticated Admin approval are required for Citizen features. Review usually takes an estimated 24–72 hours, with no automatic approval. My details and ID are used for account review. Mobile numbers are for contact; SMS verification is not available.</span></label>
        {error&&<p role="alert" className="elb-account-alert flex items-start gap-2"><AlertCircle aria-hidden="true" size={16} className="mt-0.5 shrink-0"/>{error}</p>}
        <button type="submit" disabled={pending||!accepted} className="elb-button elb-button-primary elb-auth-submit">
          {pending?<><LoaderCircle aria-hidden="true" size={17} className="animate-spin"/> Creating account…</>:<>Create account <ArrowRight aria-hidden="true" size={17}/></>}
        </button>
        <p className="flex items-center gap-2 text-xs text-muted-foreground"><CheckCircle2 aria-hidden="true" size={15} className="text-success"/> New self-registered accounts always receive Citizen access.</p>
      </form>
      <p className="elb-auth-bottom">Already have an account? <Link href="/login" className="font-bold text-foreground hover:underline">Sign in</Link></p>
    </div>
  );
}
