import "server-only";
import { randomBytes } from "node:crypto";
import sharp from "sharp";
import { prisma } from "@/lib/prisma";
import { hasModuleAccess } from "@/lib/staff-access";
import { sameOffice } from "@/lib/report-scope";
import { MAX_PHOTOS, MAX_PHOTO_BYTES } from "../config";
import { CivicError, checkTransition, parseAdminUpdate, parseReportForm } from "../validation";
import type { CivicViewer } from "../types";

function makeTrackingId() {
  const year = new Intl.DateTimeFormat("en", { year: "numeric", timeZone: "Asia/Manila" }).format(new Date());
  return `ELB-${year}-${randomBytes(6).toString("hex").toUpperCase()}`;
}

async function preparePhotos(data: FormData) {
  const files = data.getAll("photos");
  if (!files.length || files.length > MAX_PHOTOS) throw new CivicError(`Attach 1–${MAX_PHOTOS} photos.`);
  const photos: { data: Uint8Array<ArrayBuffer>; byteSize: number; mimeType: string }[] = [];
  for (const file of files) {
    if (!(file instanceof File) || file.size === 0 || file.size > MAX_PHOTO_BYTES) throw new CivicError("Each photo must be a non-empty image of 3 MB or less.");
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) throw new CivicError("Use JPG, PNG, or WebP photos.");
    try {
      const input = Buffer.from(await file.arrayBuffer());
      const metadata = await sharp(input, { limitInputPixels: 24_000_000, animated: false }).metadata();
      if (!["jpeg", "png", "webp"].includes(metadata.format || "") || (metadata.pages ?? 1) > 1) throw new Error("Unsupported image");
      // Decode/re-encode to JPEG. This also removes embedded EXIF/GPS metadata.
      const output = await sharp(input, { limitInputPixels: 24_000_000 }).rotate()
        .resize({ width: 1920, height: 1920, fit: "inside", withoutEnlargement: true })
        .jpeg({ quality: 82, mozjpeg: true }).toBuffer();
      if (output.length > MAX_PHOTO_BYTES) throw new Error("Image too large");
      photos.push({ data: new Uint8Array(output), byteSize: output.length, mimeType: "image/jpeg" });
    } catch { throw new CivicError("A photo could not be processed. Choose a valid JPG, PNG, or WebP image under 24 megapixels."); }
  }
  return photos;
}

export async function submitReport(form: FormData, viewer: CivicViewer) {
  const fields = parseReportForm(form);
  const uniqueSubmission = { reporterId_submissionKey: { reporterId: viewer.id, submissionKey: fields.submissionKey } };
  const existing = await prisma.civicReport.findUnique({ where: uniqueSubmission, select: { id: true, trackingId: true } });
  if (existing) return { ...existing, repeated: true };
  const recentCount = await prisma.civicReport.count({ where: { reporterId: viewer.id, createdAt: { gte: new Date(Date.now() - 60 * 60 * 1000) } } });
  if (recentCount >= 10) throw new CivicError("You have submitted 10 reports this hour. Please wait before sending another concern.", 429);
  const photos = await preparePhotos(form);
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const report = await prisma.civicReport.create({
        data: {
          ...fields, reporterId: viewer.id, trackingId: makeTrackingId(),
          photos: { create: photos },
          updates: { create: { status: "SUBMITTED", actorId: viewer.id, note: "Report submitted. Awaiting review by the community action desk." } },
        },
        select: { id: true, trackingId: true },
      });
      return { ...report, repeated: false };
    } catch (error) {
      if (!error || typeof error !== "object" || !("code" in error) || error.code !== "P2002") throw error;
      // A retry after a lost response returns the original report, never a duplicate.
      const saved = await prisma.civicReport.findUnique({ where: uniqueSubmission, select: { id: true, trackingId: true } });
      if (saved) return { ...saved, repeated: true };
      if (attempt === 2) throw error;
    }
  }
  throw new CivicError("Could not generate a tracking ID. Please try again.", 503);
}

// Report routing, claiming, and progress updates are all version-checked.
// This protects a case from two officers silently overwriting each other's work.
export async function updateReport(id: string, body: unknown, viewer: CivicViewer) {
  if (!(await hasModuleAccess(viewer, "REPORTS"))) throw new CivicError("Civic Reports permission is required.", 403);
  if (!body || typeof body !== "object" || Array.isArray(body)) throw new CivicError("Invalid update.");
  const data = body as Record<string, unknown>;
  if (data.action === "CLAIM") {
    if (viewer.role !== "STAFF" || !viewer.department?.trim()) throw new CivicError("Only office staff can claim assigned-office cases.", 403);
    if (!Number.isSafeInteger(data.version) || Number(data.version) < 1) throw new CivicError("Reload the case before claiming.");
    return prisma.$transaction(async tx => {
      // Role grants may have been revoked while this request was in flight.
      const authorized = await tx.user.findFirst({ where: { id: viewer.id, role: "STAFF", department: viewer.department, staffPermissions: { some: { module: "REPORTS" } } }, select: { id: true } });
      if (!authorized) throw new CivicError("Your Civic Reports access changed. Sign in again or contact the Super Admin.", 403);
      const report = await tx.civicReport.findUnique({ where: { id }, select: { status: true, version: true, assignedOffice: true, assignedStaffId: true, priority: true } });
      if (!report) throw new CivicError("Report not found.", 404);
      if (report.version !== data.version) throw new CivicError("This report has a newer update. Refresh and try again.", 409);
      if (!sameOffice(report.assignedOffice, viewer.department) || report.assignedStaffId !== null) throw new CivicError("This case is not available in your office queue.", 403);
      if (["RESOLVED", "REJECTED", "PENDING_VERIFICATION", "REOPENED"].includes(report.status)) throw new CivicError("Closed cases cannot be claimed.", 409);
      const changed = await tx.civicReport.updateMany({ where: { id, version: report.version, assignedOffice: viewer.department.trim(), assignedStaffId: null }, data: { assignedStaffId: viewer.id, version: { increment: 1 } } });
      if (changed.count !== 1) throw new CivicError("Another officer claimed this case. Refresh the queue.", 409);
      await tx.reportUpdate.create({ data: { reportId: id, actorId: viewer.id, status: report.status, assignedOffice: report.assignedOffice, assignedStaffId: viewer.id, priority: report.priority, action: "CLAIM", visibility: "INTERNAL", note: "Case claimed by the responsible officer for their department." } });
      return { ok: true };
    });
  }
  if (data.action !== undefined && data.action !== "UPDATE") throw new CivicError("Invalid case action.");
  const values = parseAdminUpdate(body);
  return prisma.$transaction(async tx => {
    if (viewer.role === "STAFF") {
      const authorized = await tx.user.findFirst({ where: { id: viewer.id, role: "STAFF", department: viewer.department, staffPermissions: { some: { module: "REPORTS" } } }, select: { id: true } });
      if (!authorized) throw new CivicError("Your Civic Reports access changed. Sign in again or contact the Super Admin.", 403);
    }
    const report = await tx.civicReport.findUnique({ where: { id }, select: { status: true, version: true, assignedOffice: true, assignedStaffId: true, priority: true } });
    if (!report) throw new CivicError("Report not found.", 404);
    if (report.version !== values.version) throw new CivicError("This report was updated by another staff member. Refresh it before saving your update.", 409);
    if (report.status === "REOPENED" && viewer.role !== "ADMIN") throw new CivicError("Only the Super Admin can review a reopened report.", 403);
    if (report.status === "PENDING_VERIFICATION") throw new CivicError("Resolution is awaiting Super Admin verification. Use the verification panel.", 409);
    if (values.status === "RESOLVED" || values.status === "PENDING_VERIFICATION") throw new CivicError("Submit photographic proof for Super Admin approval to resolve this case.", 400);
    checkTransition(report.status, values.status);
    const priority = values.priority ?? report.priority;
    let office = values.assignedOffice;
    let assignee = values.assignedStaffId;
    if (viewer.role === "STAFF") {
      // Staff cannot re-route, change priority, or edit anyone else's case.
      if (!viewer.department || !sameOffice(report.assignedOffice, viewer.department) || report.assignedStaffId !== viewer.id) throw new CivicError("Only the assigned officer can update this case.", 403);
      if (office !== report.assignedOffice || assignee !== report.assignedStaffId || priority !== report.priority) throw new CivicError("Only Super Admin can change a case's routing or priority.", 403);
      office = report.assignedOffice;
      assignee = report.assignedStaffId;
    } else if (viewer.role === "ADMIN") {
      // Routing is allowed only to an active office with a REPORTS-authorized employee.
      if (office && office !== report.assignedOffice) {
        const officeStaff = await tx.staffPermission.findFirst({ where: { module: "REPORTS", user: { role: "STAFF", department: office } }, select: { id: true } });
        if (!officeStaff) throw new CivicError("Select an office with an active Civic Reports staff member.", 400);
      }
      if (assignee) {
        const officer = await tx.user.findFirst({ where: { id: assignee, role: "STAFF", department: office, staffPermissions: { some: { module: "REPORTS" } } }, select: { id: true } });
        if (!officer) throw new CivicError("The selected officer no longer belongs to this office or lacks Civic Reports access.", 400);
      }
      if (!office && assignee) throw new CivicError("Choose an office before assigning an officer.", 400);
    } else throw new CivicError("LGU authorization required.", 403);
    if (["IN_PROGRESS", "RESOLVED"].includes(values.status) && !assignee && values.status !== report.status) {
      throw new CivicError("Assign a responsible officer before moving this case to In Progress or Resolved.", 400);
    }
    const routeChanged = office !== report.assignedOffice || assignee !== report.assignedStaffId;
    const priorityChanged = priority !== report.priority;
    const statusChanged = values.status !== report.status;
    // Status changes are always public; internal routing updates are private by default.
    const visibility = statusChanged || values.visibleToCitizen ? "PUBLIC" : "INTERNAL";
    const action = statusChanged ? "STATUS" : routeChanged ? "ASSIGNMENT" : priorityChanged ? "PRIORITY" : "NOTE";
    const updated = await tx.civicReport.updateMany({
      where: { id, version: values.version },
      data: { status: values.status, assignedOffice: office, assignedStaffId: assignee, priority, version: { increment: 1 } },
    });
    if (updated.count !== 1) throw new CivicError("A newer update is available. Refresh the report before saving.", 409);
    await tx.reportUpdate.create({ data: { reportId: id, actorId: viewer.id, status: values.status, assignedOffice: office, assignedStaffId: assignee, priority, note: values.note, visibility, action } });
    return { ok: true };
  });
}
