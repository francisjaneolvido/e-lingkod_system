import Link from "next/link";
import { FileSearch } from "lucide-react";
import s from "@/features/civic/civic.module.css";
export default function ReportNotFound() {
  return <main className={s.page}><div className={`${s.wrap} pt-12`}><div className={s.emptyState}><div><span className={s.emptyIcon}><FileSearch size={26} /></span><h1 className="text-xl font-bold">This report is unavailable.</h1><p>It may not exist, or it may belong to another account. Sign in with the account that submitted the report.</p><Link href="/reports" className={s.primary}>Back to my reports</Link></div></div></div></main>;
}
