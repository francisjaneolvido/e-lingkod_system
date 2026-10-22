import "server-only";
import sharp from "sharp";
import { prisma } from "@/lib/prisma";
import { hasModuleAccess } from "@/lib/staff-access";
import { sameOffice } from "@/lib/report-scope";
import { CivicError } from "../validation";
import { MAX_PHOTOS, MAX_PHOTO_BYTES } from "../config";
import { parseResolutionDecision, parseResolutionRemarks, parseResolutionVersion } from "../resolution-validation";
import type { CivicViewer } from "../types";
import { completeWork, requireAcceptedWork } from "@/lib/work-distribution/server";
import { createNotification, notifyAdmins } from "@/lib/notifications/server";

// All image bytes are decoded and re-encoded. This strips device metadata and
// rejects non-image or oversized/multi-frame files rather than trusting MIME.
async function prepareProofPhotos(form: FormData) {
  const files = form.getAll("photos");
  if (files.length < 1 || files.length > MAX_PHOTOS) throw new CivicError("Attach 1–3 photos showing the completed work.");
  const photos: { data: Uint8Array<ArrayBuffer>; byteSize: number; mimeType: string }[] = [];
  for (const file of files) {
    if (!(file instanceof File) || file.size < 1 || file.size > MAX_PHOTO_BYTES) throw new CivicError("Each proof photo must be no larger than 3 MB.");
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) throw new CivicError("Choose JPG, PNG, or WebP proof photos.");
    try {
      const bytes = Buffer.from(await file.arrayBuffer());
      const meta = await sharp(bytes, { limitInputPixels: 24_000_000, animated: false }).metadata();
      if (!["jpeg", "png", "webp"].includes(meta.format || "") || (meta.pages ?? 1) > 1) throw new Error("Invalid image");
      const output = await sharp(bytes, { limitInputPixels: 24_000_000 }).rotate()
        .resize({ width: 1920, height: 1920, fit: "inside", withoutEnlargement: true })
        .jpeg({ quality: 82, mozjpeg: true }).toBuffer();
      if (output.length > MAX_PHOTO_BYTES) throw new Error("Too large");
      photos.push({ data: new Uint8Array(output), byteSize: output.length, mimeType: "image/jpeg" });
    } catch { throw new CivicError("A proof photo could not be processed. Try a clear JPG, PNG, or WebP below 24 megapixels."); }
  }
  return photos;
}

export async function submitResolution(reportId: string, form: FormData, viewer: CivicViewer) {
  if (viewer.role !== "STAFF" || !(await hasModuleAccess(viewer, "REPORTS"))) throw new CivicError("Only the assigned LGU Staff member can submit resolution proof.", 403);
  await requireAcceptedWork(viewer, "REPORTS", "CIVIC_REPORT", reportId);
  const remarks = parseResolutionRemarks(form.get("remarks"));
  const version = parseResolutionVersion(form.get("version"));
  const photos = await prepareProofPhotos(form);
  const result = await prisma.$transaction(async tx => {
    const staff = await tx.user.findFirst({
      where: { id: viewer.id, role: "STAFF", department: viewer.department, staffPermissions: { some: { module: "REPORTS" } } },
      select: { department: true },
    });
    if (!staff?.department) throw new CivicError("Your assigned LGU access has changed.", 403);
    const report = await tx.civicReport.findUnique({
      where: { id: reportId },
      select: { version: true, status: true, assignedOffice: true, assignedStaffId: true, priority: true },
    });
    if (!report) throw new CivicError("Report not found.", 404);
    if (report.version !== version) throw new CivicError("This case was updated. Refresh before submitting proof.", 409);
    if (!sameOffice(report.assignedOffice, staff.department) || report.assignedStaffId !== viewer.id) throw new CivicError("You are not the responsible officer for this case.", 403);
    if (report.status !== "IN_PROGRESS") throw new CivicError("Only In Progress reports can be submitted for verification.", 409);
    const changed = await tx.civicReport.updateMany({
      where: { id: reportId, version, status: "IN_PROGRESS", assignedStaffId: viewer.id },
      data: { status: "PENDING_VERIFICATION", version: { increment: 1 } },
    });
    if (changed.count !== 1) throw new CivicError("Another update was saved first. Refresh the case.", 409);
    const submission = await tx.resolutionSubmission.create({
      data: { reportId, submittedById: viewer.id, remarks, photos: { create: photos } },
      select: { id: true },
    });
    await tx.reportUpdate.create({ data: {
      reportId, actorId: viewer.id, status: "PENDING_VERIFICATION", assignedOffice: report.assignedOffice,
      assignedStaffId: viewer.id, priority: report.priority, action: "PROOF_SUBMITTED", visibility: "PUBLIC",
      note: "The assigned office submitted evidence of completed work. LGU verification is pending.",
    } });
    return { ok: true, submissionId: submission.id };
  });
  await notifyAdmins({ module: "REPORTS", type: "RESOLUTION_VERIFICATION", title: "Civic resolution ready for verification", message: "Assigned staff submitted photographic proof for Super Admin verification.", href: `/admin/reports/${reportId}` });
  return result;
}

export async function reviewResolution(reportId: string, body: unknown, viewer: CivicViewer) {
  if (viewer.role !== "ADMIN") throw new CivicError("Only the Super Admin can verify a resolution.", 403);
  const input = parseResolutionDecision(body);
  const result = await prisma.$transaction(async tx => {
    const admin = await tx.user.findFirst({ where: { id: viewer.id, role: "ADMIN" }, select: { id: true } });
    if (!admin) throw new CivicError("Super Admin access is required.", 403);
    const report = await tx.civicReport.findUnique({
      where: { id: reportId }, select: { version: true, status: true, assignedOffice: true, assignedStaffId: true, priority: true, reporterId: true },
    });
    if (!report) throw new CivicError("Report not found.", 404);
    if (report.version !== input.version) throw new CivicError("Report changed. Refresh before verifying this submission.", 409);
    if (report.status !== "PENDING_VERIFICATION") throw new CivicError("This report has no outstanding proof to verify.", 409);
    const submission = await tx.resolutionSubmission.findFirst({
      where: { id: input.submissionId, reportId, reviewStatus: "PENDING" },
      select: { id: true, remarks: true, submittedById: true },
    });
    if (!submission) throw new CivicError("That proof submission is no longer eligible for verification.", 409);
    const approved = input.decision === "APPROVE";
    const status = approved ? "RESOLVED" : "IN_PROGRESS";
    const changed = await tx.civicReport.updateMany({
      where: { id: reportId, version: input.version, status: "PENDING_VERIFICATION" },
      data: { status, version: { increment: 1 } },
    });
    if (changed.count !== 1) throw new CivicError("Case changed while reviewing. Refresh and try again.", 409);
    const reviewed = await tx.resolutionSubmission.updateMany({
      where: { id: submission.id, reportId, reviewStatus: "PENDING" },
      data: { reviewStatus: approved ? "APPROVED" : "RETURNED", reviewedById: viewer.id, reviewNote: input.note || null, reviewedAt: new Date() },
    });
    if (reviewed.count !== 1) throw new CivicError("This submission has already been reviewed.", 409);
    await tx.reportUpdate.create({ data: {
      reportId, actorId: viewer.id, status, assignedOffice: report.assignedOffice,
      assignedStaffId: report.assignedStaffId, priority: report.priority,
      action: approved ? "PROOF_APPROVED" : "PROOF_RETURNED", visibility: "PUBLIC",
      note: approved ? `Verified resolution: ${submission.remarks}` : "LGU verification requested additional work. The assigned office will continue addressing the concern.",
    } });
    if (input.note) await tx.reportUpdate.create({ data: {
      reportId, actorId: viewer.id, status, assignedOffice: report.assignedOffice,
      assignedStaffId: report.assignedStaffId, priority: report.priority,
      action: "REVIEW_NOTE", visibility: "INTERNAL", note: input.note,
    } });
    return { ok: true, status, reporterId: report.reporterId, assignedStaffId: report.assignedStaffId };
  });
  if (result.status === "RESOLVED") await completeWork("REPORTS", "CIVIC_REPORT", reportId);
  await createNotification({ userId: result.reporterId, module: "REPORTS", type: result.status === "RESOLVED" ? "REPORT_RESOLVED" : "REPORT_CONTINUING", title: result.status === "RESOLVED" ? "Civic report resolved" : "LGU review will continue", message: result.status === "RESOLVED" ? "Super Admin verified the submitted resolution evidence." : "Super Admin returned the resolution for additional LGU work.", href: `/reports/${reportId}` });
  if (result.status !== "RESOLVED" && result.assignedStaffId) await createNotification({ userId: result.assignedStaffId, module: "REPORTS", type: "RESOLUTION_RETURNED", title: "Resolution returned for more work", message: input.note || "Super Admin requested additional action.", href: `/admin/reports/${reportId}` });
  return { ok: true, status: result.status };
}
