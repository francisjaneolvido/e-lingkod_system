"use client";

import { useState } from "react";
import { ClipboardPenLine, Images, ShieldCheck } from "lucide-react";
import type { ReportDetail } from "../types";
import { AdminUpdateForm, type ReportOfficer } from "./admin-update-form";
import { ResolutionWorkflow } from "./resolution-workflow";
import s from "../civic.module.css";

/** The two actions share one workspace, rather than stacking two very long panels. */
export function CaseActionWorkspace({ report, role, viewerId, officers }: { report: ReportDetail; role: string; viewerId: string; officers: ReportOfficer[] }) {
  const needsReview = report.status === "PENDING_VERIFICATION";
  const isAssignedOfficer = role === "STAFF" && report.assignedStaffId === viewerId;
  const canSeeProof = (role === "ADMIN" && (needsReview || report.resolutionSubmissions.length > 0)) || isAssignedOfficer;
  const [selected, setSelected] = useState<"update" | "proof">(needsReview || (isAssignedOfficer && report.status === "IN_PROGRESS") ? "proof" : "update");
  return <div className={s.caseActionWorkspace} aria-label="LGU case actions">
    <div className={s.caseActionHead}>
      <div><span className={s.overline}>LGU CASE WORKSPACE</span><h2>Case actions</h2><p>Manage the next step or verify completed work.</p></div>
      {needsReview && <span className={s.verificationPill}><ShieldCheck size={14}/> Needs verification</span>}
    </div>
    <div className={`${s.caseActionTabs} ${!canSeeProof ? s.caseActionTabsSingle : ""}`} role="tablist" aria-label="Case action sections">
      <button type="button" id="case-tab-update" role="tab" aria-selected={selected === "update"} aria-controls="case-panel-update" className={selected === "update" ? s.caseActionTabActive : ""} onClick={() => setSelected("update")}><ClipboardPenLine size={16}/> Case update</button>
      {canSeeProof && <button type="button" id="case-tab-proof" role="tab" aria-selected={selected === "proof"} aria-controls="case-panel-proof" className={selected === "proof" ? s.caseActionTabActive : ""} onClick={() => setSelected("proof")}><Images size={16}/> Proof &amp; approval{needsReview ? <span className={s.tabDot} aria-label="Action needed" /> : null}</button>}
    </div>
    <div id="case-panel-update" role="tabpanel" aria-labelledby="case-tab-update" hidden={selected !== "update"}>
      <AdminUpdateForm report={report} role={role} viewerId={viewerId} officers={officers} />
    </div>
    {canSeeProof && <div id="case-panel-proof" role="tabpanel" aria-labelledby="case-tab-proof" hidden={selected !== "proof"}>
      <ResolutionWorkflow report={report} role={role} viewerId={viewerId} />
    </div>}
  </div>;
}
