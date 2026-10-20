import Link from "next/link";
import { ArrowRight, ClipboardList } from "lucide-react";
import { currentViewer } from "@/lib/access";
import { listReports } from "@/features/civic/server/repository";
import { ReportCard } from "@/features/civic/components/report-card";
import type { ReportSummary } from "@/features/civic/types";
import s from "@/features/civic/civic.module.css";

export async function RecentActivitySection() {
  const viewer = await currentViewer();
  if (!viewer) return null;
  let reports: ReportSummary[] = [];
  let unavailable = false;
  try { reports = await listReports(viewer, false, 3); }
  catch { unavailable = true; }
  return <section aria-labelledby="recent-activity-heading" className={`${s.page} !min-h-0 !bg-white !py-12`}><div className={s.wrap}>
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4"><div><p className={s.eyebrow}>Your account activity</p><h2 id="recent-activity-heading" className="mt-3 text-2xl font-extrabold tracking-tight text-[#153b63]">Your latest concerns, at a glance.</h2></div><Link href="/reports" className={s.secondary}>All my reports <ArrowRight size={14} /></Link></div>
    {reports.length ? <div className={s.reportGrid}>{reports.map(report => <ReportCard report={report} key={report.id} />)}</div> : <div className={`${s.emptyState} !min-h-48`}><div><span className={s.emptyIcon}><ClipboardList size={24} /></span><h3 className="text-base font-bold">{unavailable ? "Recent activity is temporarily unavailable" : "Your next contribution starts here."}</h3><p>{unavailable ? "Open My Reports or try again shortly." : "Once you submit a concern, its status and latest updates will appear here."}</p><Link href={unavailable ? "/reports" : "/reports/new"} className={s.primary}>{unavailable ? "Open my reports" : "Report a concern"}<ArrowRight size={14} /></Link></div></div>}
  </div></section>;
}
