/* eslint-disable @next/next/no-img-element -- Photos are served by an authenticated route, without an optimizer cache. */
import Link from "next/link";
import { ArrowLeft, Building2, CalendarDays, ImageIcon, MapPin, MessageSquareText, UserRound } from "lucide-react";
import { categoryLabel, formatReportDate } from "../config";
import type { ReportDetail } from "../types";
import type { ReportOfficer } from "./admin-update-form";
import { CaseActionWorkspace } from "./case-action-workspace";
import { CopyTracking } from "./copy-tracking";
import { LocationMap } from "./location-map";
import { RefreshControl } from "./refresh-control";
import { ReportTimeline } from "./report-timeline";
import { VerifiedResolution } from "./resolution-workflow";
import { CitizenResolutionFeedback } from "./citizen-resolution-feedback";
import { StatusBadge } from "./status-badge";
import s from "../civic.module.css";

export function ReportDetailView({ report, admin = false, role = "CITIZEN", viewerId = "", officers = [] }: { report: ReportDetail; admin?: boolean; role?: string; viewerId?: string; officers?: ReportOfficer[] }) {
  return <>
    <div className={`${s.hero} ${admin ? s.caseDetailHero : ""}`}><div><Link className={`${s.eyebrow} mb-5`} href={admin ? "/admin/reports" : "/reports"}><ArrowLeft size={12} />{admin ? "Back to action desk" : "Back to my reports"}</Link><h1>{admin ? "Case review" : "Your concern, in focus."}</h1><p>{admin ? `Review: ${report.title}. Manage routing, progress updates, and verification in the Case Actions workspace.` : "See the details you shared and follow each update from the action desk."}</p></div><RefreshControl auto={!admin} /></div>
    {report.status === "RESOLVED" && <div className={`${s.resolutionNote} mb-5`}><strong>An outcome has been recorded.</strong> Read the latest desk remarks below for the resolution details.</div>}
    {report.status === "PENDING_VERIFICATION" && <div className={`${s.resolutionNote} mb-5`}><strong>Submitted for verification.</strong> The LGU is checking the officer's photo proof before confirming the report as resolved.</div>}
    {report.status === "REOPENED" && <div className={`${s.resolutionNote} mb-5`}><strong>Citizen requested another review.</strong> The previous resolution and citizen feedback are recorded below. The action desk will review what remains unresolved.</div>}
    {report.status === "REJECTED" && <div className={`${s.resolutionNote} ${s.notAcceptedNote} mb-5`}><strong>This report was not accepted.</strong> The action desk&apos;s reason and guidance are in the progress trail.</div>}
    <div className={`${s.detailLayout} ${admin ? s.detailLayoutAdmin : ""}`}>
      <div className={s.panel}><div className={s.detailHeader}><div className={s.detailHeaderTop}><div className="flex items-center gap-2"><span className={s.trackingId}>{report.trackingId}</span><CopyTracking value={report.trackingId} /></div><StatusBadge status={report.status} /></div><h2>{report.title}</h2><p className={s.detailDescription}>{report.description}</p></div>
        <dl className={s.detailFacts}><div><dt><MessageSquareText size={11} />Concern type</dt><dd>{categoryLabel(report.category)}</dd></div><div><dt><CalendarDays size={11} />Date submitted</dt><dd>{formatReportDate(report.createdAt, true)}</dd></div><div><dt><MapPin size={11} />Barangay / area</dt><dd>{report.barangay}</dd></div><div><dt><MapPin size={11} />Address / landmark</dt><dd>{report.address}</dd></div>{admin && report.reporter && <div className="col-span-2"><dt><UserRound size={11} />Submitted by</dt><dd>{report.reporter.name}{report.reporter.email && <><br /><span className={s.hint}>{report.reporter.email}</span></>}</dd></div>}</dl>
        <section className={s.evidence}><h3><ImageIcon size={15} />Photo evidence <span className={s.count}>/ {report.photos.length} attached</span></h3><div className={s.evidenceGrid}>{report.photos.map((photo, index) => <a key={photo.id} href={`/api/reports/photos/${photo.id}`} target="_blank" rel="noreferrer" aria-label={`Open photo evidence ${index + 1}`}><img loading="lazy" src={`/api/reports/photos/${photo.id}`} alt={`Report evidence ${index + 1}`} /></a>)}</div><p className={`${s.hint} mt-3`}>Select a photo to open it in full size.</p></section>
        <VerifiedResolution report={report} />
        <CitizenResolutionFeedback report={report} admin={admin} />
        <section className={s.locationDetail}>{report.latitude !== null && report.longitude !== null ? <><LocationMap latitude={report.latitude} longitude={report.longitude} /><p className={`${s.hint} mt-3`}>{report.locationSource === "GPS" ? `Captured using browser GPS${report.gpsAccuracy !== null ? ` · estimated accuracy ±${Math.round(report.gpsAccuracy)} m` : ""}.` : "Coordinates were entered manually."} Location reflects the details supplied by the citizen.</p></> : <p className={s.note}><MapPin size={14} />Address-based location. No GPS coordinates were captured for this report.</p>}</section>
        <ReportTimeline updates={report.updates} admin={admin} embedded />
      </div>
      <aside className={s.detailSide}><div className={s.officeCard}><span><Building2 size={19} /></span><div><h3>Assigned office</h3><p>{report.assignedOffice || "Awaiting desk assignment"}</p>{admin && <p className="mt-2 text-[12px] text-[#5b7d93]">Priority: <strong>{report.priority}</strong></p>}{admin && <p className="mt-1 text-[12px] text-[#5b7d93]">Officer: <strong>{report.assignedStaffName || "Unclaimed"}</strong></p>}</div></div>{admin && <CaseActionWorkspace report={report} role={role} viewerId={viewerId} officers={officers} />}</aside>
    </div>
  </>;
}
