import Link from "next/link";
import {FileSearch} from "lucide-react";
import {UtilityHeader} from "@/components/shared/page-layout";
export default function ReportNotFound() {
  return <><UtilityHeader/><main className="elb-account-main elb-account-wide"><section className="elb-account-section"><FileSearch size={30} aria-hidden="true"/><h1 className="mt-4 text-2xl font-semibold">This report is unavailable</h1><p>It may not exist, or it may belong to another account. Sign in with the account that submitted the report.</p><Link href="/reports" className="elb-button elb-button-primary mt-6">Back to my reports</Link></section></main></>;
}
