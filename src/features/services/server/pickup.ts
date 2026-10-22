import "server-only";

import { prisma } from "@/lib/prisma";
import { CivicError } from "@/features/civic/validation";
import type { CivicViewer } from "@/features/civic/types";
import { resolveServiceDefinition } from "./catalog";
import { departmentMatchesService } from "../catalog";
import { requireAcceptedWork } from "@/lib/work-distribution/server";
import { createNotification, notifyAdmins } from "@/lib/notifications/server";

function limitedText(value: unknown, label: string, min: number, max: number): string {
  if (typeof value !== "string") throw new CivicError(`${label} is required.`);
  const text = value.trim();
  if (text.length < min || text.length > max) throw new CivicError(`${label} must be ${min}–${max} characters.`);
  return text;
}

async function getPickupRequest(id: string, viewer: CivicViewer, citizen = false) {
  if (citizen && viewer.role !== "CITIZEN") throw new CivicError("Citizen sign-in is required.", 403);
  if (!citizen && !["ADMIN", "STAFF"].includes(viewer.role)) throw new CivicError("LGU staff access is required.", 403);
  const row = await prisma.serviceRequest.findFirst({
    where: { id, ...(citizen ? { requesterId: viewer.id } : {}) },
    select: {
      id: true, trackingId: true, requesterId: true, serviceKey: true, status: true,
      version: true, assignedStaffId: true, releaseApprovedAt: true,
    },
  });
  if (!row) throw new CivicError("Service request not found.", 404);
  const service = await resolveServiceDefinition(row.serviceKey, true);
  if (!service || service.completionMode !== "RELEASE") throw new CivicError("Document pickup is only for services releasing physical documents.", 409);
  if (row.status !== "READY_FOR_RELEASE" || !row.releaseApprovedAt) throw new CivicError("Document pickup opens after Admin approves release.", 409);
  if (viewer.role === "STAFF") {
    if (!departmentMatchesService(service, viewer.department) || row.assignedStaffId !== viewer.id)
      throw new CivicError("Only the assigned staff in the processing office can manage this pickup.", 403);
    await requireAcceptedWork(viewer, "SERVICES", "SERVICE_REQUEST", id);
  }
  return { row, service };
}

// Serializes competing choices/edits by advancing the parent request version.
async function claimRequestVersion(tx: any, id: string, version: number) {
  const result = await tx.serviceRequest.updateMany({
    where: { id, version, status: "READY_FOR_RELEASE", releaseApprovedAt: { not: null } },
    data: { version: { increment: 1 } },
  });
  if (result.count !== 1) throw new CivicError("The request changed. Refresh and try again.", 409);
}

export async function offerPickupSlots(id: string, input: any, viewer: CivicViewer) {
  const { row, service } = await getPickupRequest(id, viewer);
  const slots = Array.isArray(input?.slots) ? input.slots : [];
  if (slots.length < 2 || slots.length > 5) throw new CivicError("Offer 2–5 pickup date/time choices.");
  const times = slots.map((item: any, index: number) => {
    const date = new Date(String(item?.scheduledAt || ""));
    if (Number.isNaN(date.getTime()) || date.getTime() < Date.now() + 15 * 60_000)
      throw new CivicError(`Pickup choice ${index + 1} must be a future date/time.`);
    return date;
  });
  if (new Set(times.map((item: Date) => item.toISOString())).size !== times.length) throw new CivicError("Pickup choices must use different date/times.");
  const location = limitedText(input?.location, "Pickup office / location", 3, 220);
  const instructions = limitedText(input?.instructions, "Pickup instructions", 4, 800);

  await prisma.$transaction(async tx => {
    await claimRequestVersion(tx, id, row.version);
    const active = await tx.servicePickupSlot.count({ where: { requestId: id, status: { in: ["PROPOSED", "CONFIRMED"] } } });
    if (active) throw new CivicError("An active pickup offer already exists. Wait for citizen selection or reschedule request.", 409);
    for (const scheduledAt of times) {
      await tx.servicePickupSlot.create({ data: { requestId: id, scheduledAt, location, instructions, proposedById: viewer.id } });
    }
    await tx.serviceRequestEvent.create({ data: { requestId: id, actorId: viewer.id, action: "PICKUP_OPTIONS_SENT", status: row.status, note: `${times.length} document pickup options are available at ${location}.`, visibleToCitizen: true } });
  });
  await createNotification({ userId: row.requesterId, module: "SERVICES", type: "PICKUP_OPTIONS", title: "Choose your document pickup schedule", message: `${service.shortTitle}: ${times.length} pickup choices are ready. Use tracking ID ${row.trackingId} when claiming.`, href: `/services/requests/${id}` });
}

export async function citizenPickupAction(id: string, slotId: string, input: any, viewer: CivicViewer) {
  const { row } = await getPickupRequest(id, viewer, true);
  const slot = await prisma.servicePickupSlot.findFirst({ where: { id: slotId, requestId: id }, select: { id: true, status: true, scheduledAt: true } });
  if (!slot) throw new CivicError("Pickup choice not found.", 404);
  const action = String(input?.action || "");
  if (action === "SELECT") {
    if (slot.status !== "PROPOSED" || slot.scheduledAt.getTime() <= Date.now()) throw new CivicError("This pickup choice is no longer available.", 409);
    await prisma.$transaction(async tx => {
      await claimRequestVersion(tx, id, row.version);
      const selected = await tx.servicePickupSlot.updateMany({ where: { id: slotId, requestId: id, status: "PROPOSED" }, data: { status: "CONFIRMED", confirmedAt: new Date() } });
      if (selected.count !== 1) throw new CivicError("This pickup choice was already taken or changed.", 409);
      await tx.servicePickupSlot.updateMany({ where: { requestId: id, status: "PROPOSED", id: { not: slotId } }, data: { status: "NOT_SELECTED" } });
      await tx.serviceRequestEvent.create({ data: { requestId: id, actorId: viewer.id, action: "PICKUP_CONFIRMED", status: row.status, note: `Document pickup confirmed for ${slot.scheduledAt.toLocaleString("en-PH", { timeZone: "Asia/Manila" })}. Reference: ${row.trackingId}.`, visibleToCitizen: true } });
    });
    if (row.assignedStaffId) await createNotification({ userId: row.assignedStaffId, module: "SERVICES", type: "PICKUP_CONFIRMED", title: "Citizen chose a pickup schedule", message: `${row.trackingId}: pickup scheduled for ${slot.scheduledAt.toLocaleString("en-PH", { timeZone: "Asia/Manila" })}.`, href: `/admin/services/${id}` });
  } else if (action === "REQUEST_CHANGE") {
    if (!["PROPOSED", "CONFIRMED"].includes(slot.status)) throw new CivicError("Only current pickup choices can be rescheduled.", 409);
    const reason = limitedText(input?.note, "Reason for rescheduling", 4, 800);
    await prisma.$transaction(async tx => {
      await claimRequestVersion(tx, id, row.version);
      await tx.servicePickupSlot.updateMany({ where: { requestId: id, status: { in: ["PROPOSED", "CONFIRMED"] } }, data: { status: "CHANGE_REQUESTED", citizenNote: reason } });
      await tx.serviceRequestEvent.create({ data: { requestId: id, actorId: viewer.id, action: "PICKUP_CHANGE_REQUESTED", status: row.status, note: `Citizen asked for new document pickup choices: ${reason}`, visibleToCitizen: true } });
    });
    if (row.assignedStaffId) await createNotification({ userId: row.assignedStaffId, module: "SERVICES", type: "PICKUP_CHANGE", title: "New pickup dates requested", message: `${row.trackingId}: ${reason}`, href: `/admin/services/${id}` });
  } else {
    throw new CivicError("Choose a valid pickup action.");
  }
}

// Called from the authenticated staff mutation AFTER office, permission and accepted-work checks.
export async function recordServicePickupRelease(id: string, input: any, viewer: CivicViewer) {
  const { row, service } = await getPickupRequest(id, viewer);
  const claimantName = limitedText(input?.claimantName, "Claimant's name", 2, 180);
  if (input?.idVerified !== true) throw new CivicError("Confirm that the claimant's identity/authorization was checked.", 400);
  const remarks = limitedText(input?.note, "Actual release / delivery remarks", 8, 1800);
  const slot = await prisma.servicePickupSlot.findFirst({ where: { requestId: id, status: "CONFIRMED" }, orderBy: { confirmedAt: "desc" } });
  if (!slot) throw new CivicError("Citizen must confirm a document pickup schedule before release.", 409);
  if (slot.scheduledAt.getTime() > Date.now()) throw new CivicError("Record document collection only when the confirmed pickup date/time has arrived.", 409);
  await prisma.$transaction(async tx => {
    await claimRequestVersion(tx, id, row.version);
    const updated = await tx.servicePickupSlot.updateMany({ where: { id: slot.id, requestId: id, status: "CONFIRMED" }, data: { status: "CLAIMED", claimantName, claimedAt: new Date() } });
    if (updated.count !== 1) throw new CivicError("Pickup was already recorded. Refresh the page.", 409);
    await tx.serviceRequest.update({ where: { id }, data: { status: "FOR_FINAL_VERIFICATION", releaseNote: remarks } });
    await tx.serviceRequestEvent.create({ data: { requestId: id, actorId: viewer.id, action: "MARK_RELEASED", status: "FOR_FINAL_VERIFICATION", note: `Physical document claimed by ${claimantName}; claimant identity/authorization verified. ${remarks}`, visibleToCitizen: true } });
  });
  await notifyAdmins({ module: "SERVICES", type: "RELEASE_RECORDED", title: "Document pickup recorded — verify completion", message: `${row.trackingId} · ${service.shortTitle}`, href: `/admin/services/${id}` });
}
