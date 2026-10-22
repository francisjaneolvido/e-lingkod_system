import { requireApiViewer } from "@/lib/access";
import { assertSameOrigin, readJson, json, apiFailure } from "@/features/civic/server/http";
import { CivicError } from "@/features/civic/validation";
import { prisma } from "@/lib/prisma";
import {
  ALERT_SEVERITIES, HOTLINE_CATEGORIES, acceptedSourceUrl, belongsToEmergencyOffice,
  normalizedPhone, parseFutureWindow, safeText, validBarangays,
} from "@/features/emergency/domain";

function invalid(message: string): never { throw new CivicError(message, 400); }
function onlyAdmin(role: string) { if (role !== "ADMIN") throw new CivicError("Only the Super Admin can publish official alerts or approve hotline numbers.", 403); }
function object(input: unknown): Record<string, unknown> {
  if (!input || typeof input !== "object" || Array.isArray(input)) return invalid("Invalid form data.");
  return input as Record<string, unknown>;
}
function requiredId(value: unknown) { return safeText(value, "Record ID", 191); }
function hotlineFields(data: Record<string, unknown>) {
  const category = safeText(data.category, "Category", 30);
  if (!HOTLINE_CATEGORIES.includes(category as typeof HOTLINE_CATEGORIES[number])) invalid("Select a recognized contact category.");
  const phone = normalizedPhone(safeText(data.phone, "Phone", 35));
  const extension = safeText(data.extension ?? "", "Extension", 15, false);
  if (extension && !/^\d{1,8}$/.test(extension)) invalid("Extension must contain digits only.");
  return {
    title: safeText(data.title, "Contact name", 140), category,
    office: safeText(data.office, "Office", 160), phone, extension: extension || null,
    note: safeText(data.note ?? "", "Caller instructions", 350, false) || null,
    sourceUrl: acceptedSourceUrl(safeText(data.sourceUrl, "Official source", 500)),
  };
}
function alertFields(data: Record<string, unknown>) {
  const severity = safeText(data.severity, "Severity", 25);
  if (!ALERT_SEVERITIES.includes(severity as typeof ALERT_SEVERITIES[number])) invalid("Invalid severity.");
  return {
    title: safeText(data.title, "Alert title", 180),
    details: safeText(data.details, "Advisory details", 4000),
    safetyInstructions: safeText(data.safetyInstructions, "Safety instructions", 3000),
    issuingOffice: safeText(data.issuingOffice, "Issuing office", 160),
    sourceUrl: acceptedSourceUrl(safeText(data.sourceUrl, "Official source", 500)),
    severity,
    barangaysJson: JSON.stringify(validBarangays(data.barangays)),
    ...parseFutureWindow(data.startsAt, data.expiresAt),
  };
}

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const viewer = await requireApiViewer(request, "EMERGENCY");
    if (viewer.role === "STAFF" && !belongsToEmergencyOffice(viewer.department))
      throw new CivicError("Emergency & Alerts is restricted to designated MDRRMO, PIO, Operations Center or related safety/welfare staff. Ask your Admin to assign the correct office.", 403);
    const data = object(await readJson(request));
    const action = safeText(data.action, "Action", 40);

    if (action === "hotline.propose") {
      const operation = data.operation === "UPDATE" ? "UPDATE" : "ADD";
      const targetId = operation === "UPDATE" ? requiredId(data.targetId) : null;
      if (targetId && !(await prisma.emergencyHotline.findUnique({ where: { id: targetId } }))) invalid("Contact no longer exists.");
      const saved = await prisma.emergencyHotlineProposal.create({ data: {
        ...hotlineFields(data), targetId, operation, submittedById: viewer.id,
      }, select: { id: true } });
      await prisma.emergencyActionLog.create({ data: { entityType: "HOTLINE_PROPOSAL", entityId: saved.id, action: "SUBMIT", actorId: viewer.id } });
      return json({ ok: true, id: saved.id });
    }
    if (action === "hotline.review") {
      onlyAdmin(viewer.role);
      const id = requiredId(data.id), approved = data.decision === "APPROVE";
      if (!approved && data.decision !== "RETURN") invalid("Invalid review decision.");
      const reviewNote = safeText(data.reviewNote ?? "", "Review reason", 600, false);
      if (!approved && !reviewNote) invalid("Please include a reason for returning the suggestion.");
      const result = await prisma.$transaction(async tx => {
        const proposal = await tx.emergencyHotlineProposal.findUnique({ where: { id } });
        if (!proposal || proposal.status !== "PENDING") invalid("This suggestion has already been reviewed.");
        const changed = await tx.emergencyHotlineProposal.updateMany({ where: { id, status: "PENDING" }, data: {
          status: approved ? "APPROVED" : "RETURNED", reviewedById: viewer.id, reviewedAt: new Date(), reviewNote: reviewNote || null,
        } });
        if (changed.count !== 1) invalid("Suggestion was already reviewed.");
        if (approved) {
          const detail = { title: proposal.title, category: proposal.category, office: proposal.office,
            phone: proposal.phone, extension: proposal.extension, note: proposal.note, sourceUrl: proposal.sourceUrl,
            isActive: true, verifiedAt: new Date(), verifiedById: viewer.id };
          if (proposal.operation === "UPDATE" && proposal.targetId) {
            const updated = await tx.emergencyHotline.updateMany({ where: { id: proposal.targetId }, data: detail });
            if (!updated.count) invalid("Target contact no longer exists.");
          } else await tx.emergencyHotline.create({ data: detail });
        }
        await tx.emergencyActionLog.create({ data: { entityType: "HOTLINE_PROPOSAL", entityId: id, action: approved ? "APPROVE" : "RETURN", actorId: viewer.id, detail: reviewNote || null } });
        return { ok: true };
      });
      return json(result);
    }
    if (action === "hotline.toggle") {
      onlyAdmin(viewer.role);
      const id = requiredId(data.id);
      if (typeof data.active !== "boolean") invalid("Invalid activation option.");
      // Re-activation requires another verification: no stale contact silently goes live.
      if (data.active === true) invalid("To reactivate, submit an updated hotline for Admin source verification.");
      const changed = await prisma.emergencyHotline.updateMany({ where: { id, isActive: true }, data: { isActive: false } });
      if (!changed.count) invalid("Contact is already inactive or no longer exists.");
      await prisma.emergencyActionLog.create({ data: { entityType: "HOTLINE", entityId: id, action: "DEACTIVATE", actorId: viewer.id } });
      return json({ ok: true });
    }
    if (action === "alert.save") {
      const id = data.id ? requiredId(data.id) : null;
      const values = alertFields(data);
      if (id) {
        const original = await prisma.emergencyAlert.findUnique({ where: { id } });
        if (!original) invalid("Alert not found.");
        if (original.createdById !== viewer.id && viewer.role !== "ADMIN") throw new CivicError("You may only edit alerts you created.", 403);
        if (!(["DRAFT", "RETURNED"] as string[]).includes(original.status)) invalid("Only draft/returned alerts may be edited.");
        const updated = await prisma.emergencyAlert.updateMany({ where: { id, status: { in: ["DRAFT", "RETURNED"] } }, data: {
          ...values, status: "DRAFT", reviewNote: null,
        } });
        if (!updated.count) invalid("Alert status changed. Refresh and try again.");
      } else {
        const created = await prisma.emergencyAlert.create({ data: { ...values, createdById: viewer.id }, select: { id: true } });
        await prisma.emergencyActionLog.create({ data: { entityType: "ALERT", entityId: created.id, action: "CREATE", actorId: viewer.id } });
        return json({ ok: true, id: created.id });
      }
      await prisma.emergencyActionLog.create({ data: { entityType: "ALERT", entityId: id!, action: "EDIT", actorId: viewer.id } });
      return json({ ok: true, id });
    }
    if (action === "alert.submit") {
      const id = requiredId(data.id);
      const current = await prisma.emergencyAlert.findUnique({ where: { id } });
      if (!current) invalid("Alert not found.");
      if (viewer.role !== "ADMIN" && current.createdById !== viewer.id) throw new CivicError("Only the author may submit this draft.", 403);
      if (current.expiresAt <= new Date()) invalid("This alert already expired. Edit the schedule first.");
      const moved = await prisma.emergencyAlert.updateMany({ where: { id, status: { in: ["DRAFT", "RETURNED"] } }, data: { status: "PENDING_REVIEW", reviewNote: null } });
      if (!moved.count) invalid("Only a draft or returned alert may be submitted.");
      await prisma.emergencyActionLog.create({ data: { entityType: "ALERT", entityId: id, action: "SUBMIT", actorId: viewer.id } });
      return json({ ok: true });
    }
    if (action === "alert.review") {
      onlyAdmin(viewer.role);
      const id = requiredId(data.id), decision = data.decision;
      if (decision !== "PUBLISH" && decision !== "RETURN") invalid("Invalid review decision.");
      const note = safeText(data.reviewNote ?? "", "Review reason", 600, false);
      if (decision === "RETURN" && !note) invalid("Please explain the corrections required.");
      const item = await prisma.emergencyAlert.findUnique({ where: { id } });
      if (!item || item.status !== "PENDING_REVIEW") invalid("Alert is not waiting for review.");
      const now = new Date();
      if (decision === "PUBLISH" && item.expiresAt <= now) invalid("This alert has expired and cannot be published.");
      const moved = await prisma.emergencyAlert.updateMany({ where: { id, status: "PENDING_REVIEW" }, data: {
        status: decision === "PUBLISH" ? "PUBLISHED" : "RETURNED",
        reviewedById: viewer.id, reviewNote: note || null,
        publishedAt: decision === "PUBLISH" ? now : null,
      } });
      if (!moved.count) invalid("Alert was already reviewed.");
      await prisma.emergencyActionLog.create({ data: { entityType: "ALERT", entityId: id, action: decision, actorId: viewer.id, detail: note || null } });
      return json({ ok: true });
    }
    if (action === "alert.archive") {
      onlyAdmin(viewer.role);
      const id = requiredId(data.id);
      const changed = await prisma.emergencyAlert.updateMany({ where: { id, status: { not: "ARCHIVED" } }, data: { status: "ARCHIVED", archivedAt: new Date() } });
      if (!changed.count) invalid("Alert was already archived or not found.");
      await prisma.emergencyActionLog.create({ data: { entityType: "ALERT", entityId: id, action: "ARCHIVE", actorId: viewer.id } });
      return json({ ok: true });
    }
    return invalid("Unknown emergency management action.");
  } catch (error) {
    // Domain validation errors are returned safely without leaking the database internals.
    if (error instanceof Error && !(error instanceof CivicError) && /^(Enter a valid|Provide a public|Select one|Expiry must|Choose a start|[A-Za-z ]+ must be|Extension must)/.test(error.message))
      return json({ error: error.message }, 400);
    return apiFailure(error);
  }
}
