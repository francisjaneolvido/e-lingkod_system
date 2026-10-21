import "server-only";
import sharp from "sharp";
import { prisma } from "@/lib/prisma";
import { MAX_PHOTOS, MAX_PHOTO_BYTES } from "../config";
import { CivicError } from "../validation";
import { parseCitizenFeedback } from "../citizen-feedback-validation";
import type { CivicViewer } from "../types";

// Optional citizen evidence is private to the report owner and assigned LGU desk.
// Strip EXIF/metadata by decoding and re-encoding every image.
async function prepareFeedbackPhotos(files: FormDataEntryValue[]) {
  if (files.length > MAX_PHOTOS) throw new CivicError("Attach up to 3 photos.");
  const photos: { mimeType: string; byteSize: number; data: Uint8Array<ArrayBuffer> }[] = [];
  for (const entry of files) {
    if (!(entry instanceof File) || entry.size < 1 || entry.size > MAX_PHOTO_BYTES) {
      throw new CivicError("Each optional image must be a valid JPG, PNG or WebP under 3 MB.");
    }
    if (!["image/jpeg", "image/png", "image/webp"].includes(entry.type)) throw new CivicError("Use JPG, PNG, or WebP photos.");
    try {
      const buffer = Buffer.from(await entry.arrayBuffer());
      const meta = await sharp(buffer, { limitInputPixels: 24_000_000, animated: false }).metadata();
      if (!["jpeg", "png", "webp"].includes(meta.format || "") || (meta.pages ?? 1) > 1) throw new Error("Bad image");
      const output = await sharp(buffer, { limitInputPixels: 24_000_000 }).rotate()
        .resize({ width: 1920, height: 1920, fit: "inside", withoutEnlargement: true })
        .jpeg({ quality: 82, mozjpeg: true }).toBuffer();
      if (output.length > MAX_PHOTO_BYTES) throw new Error("Image too large");
      photos.push({ mimeType: "image/jpeg", byteSize: output.length, data: new Uint8Array(output) });
    } catch { throw new CivicError("An evidence photo could not be processed. Try another image under 24 megapixels."); }
  }
  return photos;
}

export async function submitCitizenFeedback(reportId: string, form: FormData, viewer: CivicViewer) {
  if (viewer.role !== "CITIZEN") throw new CivicError("Only citizens can respond to resolutions.", 403);
  const input = parseCitizenFeedback(form);
  // Process files before beginning a DB transaction; never keep row locks while decoding.
  const photos = await prepareFeedbackPhotos(input.photos);
  return prisma.$transaction(async tx => {
    const report = await tx.civicReport.findUnique({
      where: { id: reportId },
      select: { id: true, reporterId: true, version: true, status: true, assignedOffice: true,
        assignedStaffId: true, priority: true },
    });
    if (!report || report.reporterId !== viewer.id) throw new CivicError("Report not found.", 404);
    if (report.status !== "RESOLVED") throw new CivicError("Feedback is available only for an approved resolution.", 409);
    if (report.version !== input.version) throw new CivicError("This report changed. Refresh to respond to the latest resolution.", 409);
    const latest = await tx.resolutionSubmission.findFirst({
      where: { reportId, reviewStatus: "APPROVED" },
      orderBy: [{ reviewedAt: "desc" }, { id: "desc" }],
      select: { id: true },
    });
    if (!latest || latest.id !== input.submissionId) throw new CivicError("Select the latest verified resolution before responding.", 409);
    const previous = await tx.citizenResolutionFeedback.findUnique({
      where: { resolutionSubmissionId: latest.id }, select: { id: true },
    });
    if (previous) throw new CivicError("Feedback for this resolution was already submitted.", 409);
    const reopened = input.decision === "DISPUTED";
    const changed = await tx.civicReport.updateMany({
      where: { id: reportId, version: input.version, status: "RESOLVED", reporterId: viewer.id },
      data: { ...(reopened ? { status: "REOPENED" as const } : {}), version: { increment: 1 } },
    });
    if (changed.count !== 1) throw new CivicError("Another update was saved. Refresh and try again.", 409);
    const feedback = await tx.citizenResolutionFeedback.create({
      data: { reportId, reporterId: viewer.id, resolutionSubmissionId: latest.id,
        decision: input.decision, reason: input.reason, ...(photos.length ? { photos: { create: photos } } : {}) },
      select: { id: true },
    });
    await tx.reportUpdate.create({ data: {
      reportId, actorId: viewer.id, status: reopened ? "REOPENED" : "RESOLVED",
      assignedOffice: report.assignedOffice, assignedStaffId: report.assignedStaffId, priority: report.priority,
      visibility: "PUBLIC", action: reopened ? "CITIZEN_DISPUTE" : "CITIZEN_CONFIRMED",
      note: reopened ? `Citizen requested another review: ${input.reason}` : "Citizen confirmed the verified resolution.",
    } });
    return { ok: true, decision: input.decision, status: reopened ? "REOPENED" : "RESOLVED", feedbackId: feedback.id };
  });
}
