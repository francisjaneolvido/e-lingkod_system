import Link from "next/link";
import { ArrowRight, ShieldCheck } from "lucide-react";
import s from "../civic.module.css";
export function StaffAccess() {
  return <div className={`${s.emptyState} ${s.accessDenied}`}><div><span className={s.emptyIcon}><ShieldCheck size={26} /></span><h1 className="text-xl font-bold">LGU staff access is required.</h1><p>Your Citizen account can submit surveys and track its own reports. Protected LGU workspaces are available only to authorized staff.</p><Link href="/reports" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground">Open my reports <ArrowRight size={15} /></Link><Link href="/" className="ml-3 inline-flex min-h-11 items-center rounded-xl px-4 py-3 text-sm font-semibold text-foreground underline underline-offset-4">Return home</Link></div></div>;
}
