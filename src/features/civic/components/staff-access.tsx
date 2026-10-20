import Link from "next/link";
import { ArrowRight, ShieldCheck } from "lucide-react";
import s from "../civic.module.css";
export function StaffAccess() {
  return <div className={`${s.emptyState} ${s.accessDenied}`}><div><span className={s.emptyIcon}><ShieldCheck size={26} /></span><h1 className="text-xl font-bold">LGU staff access is required.</h1><p>This account can submit and track its own reports. The action desk is available to authorized staff accounts.</p><Link href="/reports" className={s.primary}>Open my reports <ArrowRight size={15} /></Link></div></div>;
}
