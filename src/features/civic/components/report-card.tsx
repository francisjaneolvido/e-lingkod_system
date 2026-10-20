/* eslint-disable @next/next/no-img-element -- Private photo endpoints require the signed-in browser cookie. */
import Link from "next/link";
import { ArrowUpRight, ImageIcon, MapPin } from "lucide-react";
import { categoryLabel, formatReportDate } from "../config";
import type { ReportSummary } from "../types";
import { StatusBadge } from "./status-badge";
import s from "../civic.module.css";

export function ReportCard({ report }: { report: ReportSummary }) {
  return <Link href={`/reports/${report.id}`} className={s.reportCard}>
    <div className={s.reportPhoto}>{report.photoId ? <img loading="lazy" src={`/api/reports/photos/${report.photoId}`} alt={`Evidence for ${report.title}`} /> : <div className={s.photoEmpty}><ImageIcon size={32} /></div>}<StatusBadge status={report.status} /></div>
    <div className={s.reportBody}><span className={s.trackingId}>{report.trackingId}</span><h2>{report.title}</h2><div className={s.reportMeta}><MapPin size={12} /><span>{report.barangay}</span></div><div className={s.reportCardFooter}><span>{categoryLabel(report.category)}<br /><span className="mt-1 block">{formatReportDate(report.createdAt)}</span></span><strong>View report <ArrowUpRight size={13} className="ml-1 inline" /></strong></div></div>
  </Link>;
}
