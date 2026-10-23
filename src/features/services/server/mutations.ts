import "server-only";
import { prisma } from "@/lib/prisma";
import type { CivicViewer } from "@/features/civic/types";
import { CivicError } from "@/features/civic/validation";
import {
  createTrackingId,
  parseCitizenServiceFormForService,
  requiredDocumentsComplete,
  requiredDocumentsSubmittable,
  requiredDocumentsVerified,
} from "../domain";
import { activeServiceRequirements, departmentMatchesService } from "../catalog";
import { resolveServiceDefinition } from "./catalog";
import { autoOfferServiceRequest, completeWork, manualAssignWork, requireAcceptedWork } from "@/lib/work-distribution/server";
import { createNotification, notifyAdmins } from "@/lib/notifications/server";
import { recordServicePickupRelease } from "./pickup";

function canEditCitizen(status: string) { return ["DRAFT", "FORM_OPEN", "ACTION_REQUIRED"].includes(status); }

async function ownedRequest(id: string, viewer: CivicViewer) {
  if (viewer.role !== "CITIZEN") throw new CivicError("Only Citizen accounts can manage personal service requests.", 403);
  const row = await prisma.serviceRequest.findFirst({
    where: { id, requesterId: viewer.id },
    include: { documents: { select: { id: true, requirementKey: true, verificationStatus: true, uploadedAt: true }, orderBy: { uploadedAt: "desc" } } },
  });
  if (!row) throw new CivicError("Service request not found.", 404);
  return row;
}

export async function createCitizenServiceRequest(input: unknown, viewer: CivicViewer) {
  if (viewer.role !== "CITIZEN") throw new CivicError("Only Citizen accounts can request LGU services.", 403);
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new CivicError("Invalid service request.");
  const raw = input as Record<string, unknown>;
  const key = typeof raw.serviceKey === "string" ? raw.serviceKey : "";
  const service = await resolveServiceDefinition(key);
  if (!service) throw new CivicError("Choose a valid LGU service.");
  const parsed = parseCitizenServiceFormForService(input, service, service.intakeMode === "PRESCREEN" ? "PRESCREEN" : "PARTIAL");
  const status = service.intakeMode === "PRESCREEN" ? "FOR_TRIAGE" : "DRAFT";
  const trackingId = createTrackingId();
  const created = await prisma.$transaction(async tx => {
    const created = await tx.serviceRequest.create({
      data: {
        trackingId,
        serviceKey: service.key,
        serviceTitle: service.title,
        requesterId: viewer.id,
        purpose: parsed.purpose,
        formDataJson: JSON.stringify(parsed.fields),
        status,
        assignedDepartment: service.processingOffice,
        submittedAt: status === "FOR_TRIAGE" ? new Date() : null,
      },
      select: { id: true, trackingId: true },
    });
    await tx.serviceRequestEvent.create({
      data: {
        requestId: created.id,
        actorId: viewer.id,
        action: status === "FOR_TRIAGE" ? "INTAKE_SUBMITTED" : "REQUEST_STARTED",
        status,
        note: status === "FOR_TRIAGE" ? "Initial service intake submitted for LGU screening." : "Service request draft created. Incomplete drafts can be finished later.",
        visibleToCitizen: true,
      },
    });
    return created;
  });
  if (status === "FOR_TRIAGE") {
    if ((service.assignmentStrategy || "AUTO_BALANCE") === "AUTO_BALANCE") {
      const offered = await autoOfferServiceRequest(created.id, service, [], service.acceptTimeoutMinutes);
      if (!offered) await notifyAdmins({ module: "SERVICES", type: "UNASSIGNED_SERVICE", title: "Service request needs assignment", message: `${service.shortTitle} has no eligible staff available for automatic assignment.`, href: `/admin/services/${created.id}` });
    } else await notifyAdmins({ module: "SERVICES", type: "UNASSIGNED_SERVICE", title: "Service request needs assignment", message: `${service.shortTitle} is configured for manual assignment.`, href: `/admin/services/${created.id}` });
  }
  await createNotification({ userId: viewer.id, module: "SERVICES", type: "REQUEST_RECEIVED", title: `${service.shortTitle} request saved`, message: status === "FOR_TRIAGE" ? "Your initial intake was received for LGU screening." : "Your draft was saved. You can continue it anytime.", href: `/services/requests/${created.id}` });
  return created;
}

export async function updateCitizenServiceRequest(id: string, input: unknown, viewer: CivicViewer, partial = false) {
  const row = await ownedRequest(id, viewer);
  if (!canEditCitizen(row.status)) throw new CivicError("This request can no longer be edited at its current stage.", 409);
  const service = await resolveServiceDefinition(row.serviceKey, true);
  if (!service) throw new CivicError("This service configuration is unavailable.", 409);
  const parsed = parseCitizenServiceFormForService({ ...((input && typeof input === "object") ? input : {}), serviceKey: row.serviceKey }, service, partial ? "PARTIAL" : "FULL");
  await prisma.$transaction(async tx => {
    await tx.serviceRequest.update({ where: { id }, data: { purpose: parsed.purpose, formDataJson: JSON.stringify(parsed.fields), version: { increment: 1 } } });
    if (!partial) await tx.serviceRequestEvent.create({ data: { requestId: id, actorId: viewer.id, action: "FORM_UPDATED", status: row.status, note: "Citizen updated the service request information.", visibleToCitizen: true } });
  });
  return { success: true };
}

export async function submitCitizenServiceRequest(id: string, viewer: CivicViewer) {
  const row = await ownedRequest(id, viewer);
  const service = await resolveServiceDefinition(row.serviceKey, true);
  if (!service) throw new CivicError("This service configuration is unavailable.", 409);
  if (!["DRAFT", "FORM_OPEN", "ACTION_REQUIRED"].includes(row.status)) throw new CivicError("This request is not ready for submission.", 409);
  const form = JSON.parse(row.formDataJson || "{}");
  parseCitizenServiceFormForService({ serviceKey: row.serviceKey, purpose: row.purpose, fields: form }, service, "FULL");
  const keys = row.documents.map(document => document.requirementKey);
  if (!requiredDocumentsComplete(service, keys, form)) throw new CivicError("Upload all currently required documents before submitting for review.", 400);
  if (!requiredDocumentsSubmittable(service, row.documents, form)) throw new CivicError("Replace any required document marked as needing correction before submitting again.", 400);
  await prisma.$transaction(async tx => {
    await tx.serviceRequest.update({ where: { id }, data: { status: "SUBMITTED", submittedAt: new Date(), version: { increment: 1 } } });
    await tx.serviceRequestEvent.create({ data: { requestId: id, actorId: viewer.id, action: "SUBMITTED", status: "SUBMITTED", note: "Request form and required documents submitted for LGU review.", visibleToCitizen: true } });
  });
  if ((service.assignmentStrategy || "AUTO_BALANCE") === "AUTO_BALANCE") {
    const offered = await autoOfferServiceRequest(id, service, [], service.acceptTimeoutMinutes);
    if (!offered) await notifyAdmins({ module: "SERVICES", type: "UNASSIGNED_SERVICE", title: "Service request needs assignment", message: `${service.shortTitle} could not be auto-assigned because no eligible staff are available.`, href: `/admin/services/${id}` });
  } else await notifyAdmins({ module: "SERVICES", type: "UNASSIGNED_SERVICE", title: "Service request needs assignment", message: `${service.shortTitle} is waiting for manual routing.`, href: `/admin/services/${id}` });
  await createNotification({ userId: viewer.id, module: "SERVICES", type: "REQUEST_SUBMITTED", title: "Request received", message: `${service.shortTitle} was submitted and is now entering the LGU queue.`, href: `/services/requests/${id}` });
  return { success: true };
}

export async function cancelCitizenServiceRequest(id: string, viewer: CivicViewer) {
  const row = await ownedRequest(id, viewer);
  if (["COMPLETED", "DECLINED", "CANCELLED", "READY_FOR_RELEASE", "FOR_FINAL_VERIFICATION"].includes(row.status)) throw new CivicError("This request can no longer be cancelled at its current stage.", 409);
  await prisma.$transaction(async tx => {
    await tx.serviceAppointment.updateMany({ where: { requestId: id, status: { in: ["PROPOSED", "CONFIRMED", "CHANGE_REQUESTED"] } }, data: { status: "CANCELLED" } });
    await tx.serviceRequest.update({ where: { id }, data: { status: "CANCELLED", version: { increment: 1 } } });
    await tx.serviceRequestEvent.create({ data: { requestId: id, actorId: viewer.id, action: "CANCELLED", status: "CANCELLED", note: "Request cancelled by the citizen. Any active schedule options were closed.", visibleToCitizen: true } });
  });
  await completeWork("SERVICES", "SERVICE_REQUEST", id);
}

export async function uploadServiceDocument(id: string, form: FormData, viewer: CivicViewer) {
  const row = await ownedRequest(id, viewer);
  if (!canEditCitizen(row.status)) throw new CivicError("Documents cannot be changed at this stage.", 409);
  const service = await resolveServiceDefinition(row.serviceKey, true);
  if (!service) throw new CivicError("Service unavailable.", 409);
  const values = JSON.parse(row.formDataJson || "{}");
  const key = String(form.get("requirementKey") || "");
  const requirement = activeServiceRequirements(service, values).find(item => item.key === key);
  if (!requirement) throw new CivicError("This requirement does not apply to the current form answers.");
  const file = form.get("file");
  if (!(file instanceof File) || file.size <= 0) throw new CivicError("Choose a document to upload.");
  if (file.size > 5 * 1024 * 1024) throw new CivicError("Each document must be 5 MB or smaller.");
  const allowed = ["application/pdf", "image/jpeg", "image/png", "image/webp"];
  if (!allowed.includes(file.type)) throw new CivicError("Upload a PDF, JPG, PNG or WEBP file.");
  const safeName = file.name.replace(/[\\/:*?"<>|\u0000-\u001F]/g, "_").slice(0, 220) || "document";
  const bytes = Buffer.from(await file.arrayBuffer());
  await prisma.$transaction(async tx => {
    await tx.serviceRequestDocument.create({
      data: { requestId: id, requirementKey: key, requirementLabel: requirement.label, fileName: safeName, mimeType: file.type, byteSize: file.size, data: bytes, verificationStatus: "PENDING" },
    });
    await tx.serviceRequestEvent.create({ data: { requestId: id, actorId: viewer.id, action: "DOCUMENT_UPLOADED", status: row.status, note: `Uploaded requirement: ${requirement.label}.`, visibleToCitizen: true } });
  });
  if (row.assignedStaffId) await createNotification({ userId: row.assignedStaffId, module: "SERVICES", type: "CITIZEN_RESUBMISSION", title: "Citizen uploaded a requirement", message: `${requirement.label} was uploaded for ${row.trackingId}.`, href: `/admin/services/${id}` });
  return { success: true };
}

export async function removeServiceDocument(id: string, documentId: string, viewer: CivicViewer) {
  const row = await ownedRequest(id, viewer);
  if (!canEditCitizen(row.status)) throw new CivicError("Documents cannot be changed at this stage.", 409);
  const doc = await prisma.serviceRequestDocument.findFirst({ where: { id: documentId, requestId: id }, select: { id: true, requirementLabel: true } });
  if (!doc) throw new CivicError("Document not found.", 404);
  await prisma.$transaction(async tx => {
    await tx.serviceRequestDocument.delete({ where: { id: documentId } });
    await tx.serviceRequestEvent.create({ data: { requestId: id, actorId: viewer.id, action: "DOCUMENT_REMOVED", status: row.status, note: `Removed requirement: ${doc.requirementLabel}.`, visibleToCitizen: true } });
  });
}

async function adminRequest(id: string, viewer: CivicViewer) {
  if (!["ADMIN", "STAFF"].includes(viewer.role)) throw new CivicError("LGU staff access is required.", 403);
  const row = await prisma.serviceRequest.findUnique({
    where: { id },
    include: {
      appointments: { orderBy: { createdAt: "desc" } },
      documents: { select: { id: true, requirementKey: true, verificationStatus: true, uploadedAt: true }, orderBy: { uploadedAt: "desc" } },
    },
  });
  if (!row) throw new CivicError("Service request not found.", 404);
  if (viewer.role === "STAFF") {
    const service = await resolveServiceDefinition(row.serviceKey, true);
    if (!service) throw new CivicError("Service configuration is unavailable.", 409);
    const departmentAccess = departmentMatchesService(service, viewer.department);
    if (row.assignedStaffId !== viewer.id && !departmentAccess) throw new CivicError("This request is not assigned to your service queue.", 403);
  }
  return row;
}

function note(input: unknown, label = "Remarks", min = 4, max = 1800) {
  if (typeof input !== "string") throw new CivicError(`${label} is required.`);
  const value = input.trim();
  if (value.length < min || value.length > max) throw new CivicError(`${label} must be ${min}–${max} characters.`);
  return value;
}

export async function assignServiceRequest(id: string, input: any, viewer: CivicViewer) {
  if (viewer.role !== "ADMIN") throw new CivicError("Only the Super Admin can assign service requests.", 403);
  const row = await adminRequest(id, viewer);
  const service = await resolveServiceDefinition(row.serviceKey, true);
  if (!service) throw new CivicError("Service configuration is unavailable.", 409);
  const staffId = typeof input?.staffId === "string" ? input.staffId : "";
  const staff = await prisma.user.findFirst({
    where: { id: staffId, role: "STAFF", staffPermissions: { some: { module: "SERVICES" } } },
    select: { id: true, name: true, department: true },
  });
  if (!staff) throw new CivicError("Choose an authorized Online LGU Services staff member.");
  if (!departmentMatchesService(service, staff.department)) throw new CivicError(`Choose staff from the responsible office for ${service.shortTitle}.`);
  await prisma.$transaction(async tx => {
    const nextStatus = row.status === "SUBMITTED" ? "ASSIGNED" : row.status;
    await tx.serviceRequest.update({ where: { id }, data: { assignedStaffId: staff.id, assignedDepartment: service.processingOffice, status: nextStatus, version: { increment: 1 } } });
    await tx.serviceRequestEvent.create({ data: { requestId: id, actorId: viewer.id, action: "ASSIGNED", status: nextStatus, note: `Assigned to ${staff.name} · ${service.processingOffice}.`, visibleToCitizen: true } });
  });
  await manualAssignWork({ module: "SERVICES", entityType: "SERVICE_REQUEST", entityId: id, department: service.departmentCode, staffId: staff.id });
  await createNotification({ userId: staff.id, module: "SERVICES", type: "MANUAL_ASSIGNMENT", title: `${service.shortTitle} assigned to you`, message: "Super Admin assigned this request directly to you.", href: `/admin/services/${id}` });
}

export async function verifyServiceDocument(requestId: string, documentId: string, input: any, viewer: CivicViewer) {
  const row = await adminRequest(requestId, viewer);
  if (viewer.role === "STAFF") await requireAcceptedWork(viewer, "SERVICES", "SERVICE_REQUEST", requestId);
  if (!["SUBMITTED", "ASSIGNED", "UNDER_REVIEW", "ACTION_REQUIRED"].includes(row.status)) throw new CivicError("Documents can only be verified during requirements review.", 409);
  const document = await prisma.serviceRequestDocument.findFirst({ where: { id: documentId, requestId }, select: { id: true, requirementLabel: true } });
  if (!document) throw new CivicError("Document not found.", 404);
  const action = String(input?.action || "");
  if (action === "VERIFY") {
    const remarks = typeof input?.note === "string" ? input.note.trim().slice(0, 1200) : "";
    await prisma.$transaction(async tx => {
      await tx.serviceRequestDocument.update({ where: { id: documentId }, data: { verificationStatus: "VERIFIED", verificationNote: remarks || null, verifiedById: viewer.id, verifiedAt: new Date() } });
      await tx.serviceRequestEvent.create({ data: { requestId, actorId: viewer.id, action: "DOCUMENT_VERIFIED", status: row.status, note: `${document.requirementLabel} was verified.${remarks ? ` ${remarks}` : ""}`, visibleToCitizen: true } });
    });
    return;
  }
  if (action === "REJECT") {
    const reason = note(input?.note, "Document correction note", 8, 1200);
    await prisma.$transaction(async tx => {
      await tx.serviceRequestDocument.update({ where: { id: documentId }, data: { verificationStatus: "REJECTED", verificationNote: reason, verifiedById: viewer.id, verifiedAt: new Date() } });
      await tx.serviceRequest.update({ where: { id: requestId }, data: { status: "ACTION_REQUIRED", version: { increment: 1 } } });
      await tx.serviceRequestEvent.create({ data: { requestId, actorId: viewer.id, action: "DOCUMENT_REJECTED", status: "ACTION_REQUIRED", note: `${document.requirementLabel} needs replacement or correction: ${reason}`, visibleToCitizen: true } });
    });
    await createNotification({ userId: row.requesterId, module: "SERVICES", type: "ACTION_REQUIRED", title: "Service request needs your action", message: `${document.requirementLabel} needs replacement: ${reason}`, href: `/services/requests/${requestId}` });
    return;
  }
  throw new CivicError("Choose a valid document verification action.");
}

export async function staffServiceAction(id: string, input: any, viewer: CivicViewer) {
  const row = await adminRequest(id, viewer);
  if (viewer.role === "STAFF") await requireAcceptedWork(viewer, "SERVICES", "SERVICE_REQUEST", id);
  const action = String(input?.action || "");
  const remarks = typeof input?.note === "string" ? input.note.trim() : "";
  const service = await resolveServiceDefinition(row.serviceKey, true);
  if (!service) throw new CivicError("Service configuration is unavailable.", 409);
  let next = row.status;
  let eventNote = "";
  let staffRecommendation: string | undefined;
  let releaseNote: string | undefined;

  if (action === "OPEN_FORM") {
    if (row.status !== "FOR_TRIAGE") throw new CivicError("This intake is not waiting for pre-screening.", 409);
    next = "FORM_OPEN";
    eventNote = remarks || "Initial screening completed. The full service form is now available to the citizen.";
  } else if (action === "START_REVIEW") {
    if (!["SUBMITTED", "ASSIGNED"].includes(row.status)) throw new CivicError("This request cannot enter review yet.", 409);
    next = "UNDER_REVIEW";
    eventNote = remarks || "LGU requirements review started.";
  } else if (action === "REQUEST_CORRECTION") {
    if (!["SUBMITTED", "ASSIGNED", "UNDER_REVIEW"].includes(row.status)) throw new CivicError("Corrections cannot be requested at this stage.", 409);
    next = "ACTION_REQUIRED";
    eventNote = note(remarks, "Citizen correction instructions", 8);
  } else if (action === "VALIDATE") {
    if (!["SUBMITTED", "ASSIGNED", "UNDER_REVIEW"].includes(row.status)) throw new CivicError("This request cannot be validated at this stage.", 409);
    const values = JSON.parse(row.formDataJson || "{}");
    parseCitizenServiceFormForService({ serviceKey: row.serviceKey, purpose: row.purpose, fields: values }, service, "FULL");
    if (!requiredDocumentsVerified(service, row.documents, values)) throw new CivicError("Verify every currently required document before validating the request.", 409);
    next = "VALIDATED";
    eventNote = remarks || "Form information and required documents were validated by LGU staff.";
  } else if (action === "COMPLETE_APPOINTMENT") {
    if (row.status !== "APPOINTMENT_CONFIRMED") throw new CivicError("A confirmed schedule is required before recording the activity outcome.", 409);
    const appointment = row.appointments.find(item => item.status === "CONFIRMED");
    if (!appointment) throw new CivicError("Confirmed appointment not found.", 409);
    if (appointment.scheduledAt.getTime() > Date.now()) throw new CivicError("The scheduled date/time has not occurred yet.", 409);
    const outcome = note(remarks, `${service.appointmentMode === "INSPECTION" ? "Inspection" : "Appointment"} outcome`, 8, 1800);
    await prisma.$transaction(async tx => {
      await tx.serviceAppointment.update({ where: { id: appointment.id }, data: { status: "COMPLETED", completedAt: new Date(), staffNote: outcome } });
      await tx.serviceRequest.update({ where: { id }, data: { status: "APPOINTMENT_COMPLETED", version: { increment: 1 } } });
      await tx.serviceRequestEvent.create({ data: { requestId: id, actorId: viewer.id, action: "APPOINTMENT_COMPLETED", status: "APPOINTMENT_COMPLETED", note: `${service.appointmentMode === "INSPECTION" ? "Inspection" : "Scheduled activity"} completed: ${outcome}`, visibleToCitizen: true } });
    });
    return;
  } else if (action === "RECOMMEND_FINAL") {
    const requiredAppointment = !["NONE", "OPTIONAL"].includes(service.appointmentMode);
    const allowed = requiredAppointment ? row.status === "APPOINTMENT_COMPLETED" : ["VALIDATED", "APPOINTMENT_COMPLETED"].includes(row.status);
    if (!allowed) throw new CivicError(requiredAppointment ? "Complete the confirmed scheduled activity before staff recommendation." : "Complete validation before staff recommendation.", 409);
    next = "FOR_FINAL_VERIFICATION";
    staffRecommendation = note(remarks, "Staff recommendation", 12);
    eventNote = "Staff review and recommendation were submitted for Super Admin final verification.";
  } else if (action === "MARK_RELEASED") {
    // Physical documents must go through the confirmed pickup/claimant-ID flow.
    if (service.completionMode === "RELEASE") return recordServicePickupRelease(id, input, viewer);
    if (row.status !== "READY_FOR_RELEASE") throw new CivicError("This request is not ready for release.", 409);
    next = "FOR_FINAL_VERIFICATION";
    releaseNote = note(remarks, "Release / delivery remarks", 8);
    eventNote = `Actual release / service delivery recorded: ${releaseNote}`;
  } else if (action === "DECLINE") {
    const allowed = ["FOR_TRIAGE", "SUBMITTED", "ASSIGNED", "UNDER_REVIEW", "ACTION_REQUIRED", "VALIDATED", "SCHEDULED", "APPOINTMENT_CONFIRMED", "APPOINTMENT_COMPLETED"];
    if (!allowed.includes(row.status)) throw new CivicError("This request can no longer be closed by staff at this stage.", 409);
    next = "DECLINED";
    eventNote = note(remarks, "Reason / referral", 12);
  } else {
    throw new CivicError("Choose a valid service action.");
  }

  await prisma.$transaction(async tx => {
    await tx.serviceRequest.update({ where: { id }, data: { status: next, ...(staffRecommendation ? { staffRecommendation } : {}), ...(releaseNote ? { releaseNote } : {}), version: { increment: 1 } } });
    if (next === "DECLINED") await tx.serviceAppointment.updateMany({ where: { requestId: id, status: { in: ["PROPOSED", "CONFIRMED", "CHANGE_REQUESTED"] } }, data: { status: "CANCELLED" } });
    await tx.serviceRequestEvent.create({ data: { requestId: id, actorId: viewer.id, action, status: next, note: eventNote, visibleToCitizen: true } });
  });
  if (["OPEN_FORM", "REQUEST_CORRECTION", "DECLINE"].includes(action)) {
    const title = action === "OPEN_FORM" ? "Continue your LGU request" : action === "REQUEST_CORRECTION" ? "Service request needs your action" : "Service request update";
    await createNotification({ userId: row.requesterId, module: "SERVICES", type: action === "REQUEST_CORRECTION" ? "ACTION_REQUIRED" : action, title, message: eventNote, href: `/services/requests/${id}` });
  }
  if (action === "RECOMMEND_FINAL" || action === "MARK_RELEASED") {
    await notifyAdmins({ module: "SERVICES", type: action === "RECOMMEND_FINAL" ? "FINAL_VERIFICATION" : "RELEASE_RECORDED", title: action === "RECOMMEND_FINAL" ? "Service request ready for final verification" : "Release recorded — verify completion", message: `${row.trackingId} · ${service.shortTitle}`, href: `/admin/services/${id}` });
  }
  if (next === "DECLINED") await completeWork("SERVICES", "SERVICE_REQUEST", id);
}

type SlotInput = { scheduledAt?: unknown };
export async function scheduleServiceAppointment(id: string, input: any, viewer: CivicViewer) {
  const row = await adminRequest(id, viewer);
  if (viewer.role === "STAFF") await requireAcceptedWork(viewer, "SERVICES", "SERVICE_REQUEST", id);
  const service = await resolveServiceDefinition(row.serviceKey, true);
  if (!service || service.appointmentMode === "NONE") throw new CivicError("This service does not use scheduling in the current workflow.", 409);
  if (row.status !== "VALIDATED") throw new CivicError("The request must be validated before schedule options can be offered.", 409);
  const rawSlots: SlotInput[] = Array.isArray(input?.slots) ? input.slots : [];
  if (rawSlots.length < 2 || rawSlots.length > 5) throw new CivicError("Offer between 2 and 5 schedule options.");
  const slots = rawSlots.map((slot, index) => {
    const scheduledAt = new Date(String(slot?.scheduledAt || ""));
    if (Number.isNaN(scheduledAt.getTime()) || scheduledAt.getTime() < Date.now() + 15 * 60 * 1000) throw new CivicError(`Schedule option ${index + 1} must be a valid future date/time.`);
    return scheduledAt;
  });
  const unique = new Set(slots.map(date => date.toISOString()));
  if (unique.size !== slots.length) throw new CivicError("Schedule options must use different date/times.");
  const location = note(input?.location, "Location", 2, 220);
  const agenda = note(input?.agenda, "Agenda", 4, 1200);
  await prisma.$transaction(async tx => {
    await tx.serviceAppointment.updateMany({ where: { requestId: id, status: { in: ["PROPOSED", "CHANGE_REQUESTED"] } }, data: { status: "CANCELLED" } });
    for (const scheduledAt of slots) await tx.serviceAppointment.create({ data: { requestId: id, scheduledAt, location, agenda, proposedById: viewer.id } });
    await tx.serviceRequest.update({ where: { id }, data: { status: "SCHEDULED", version: { increment: 1 } } });
    await tx.serviceRequestEvent.create({ data: { requestId: id, actorId: viewer.id, action: "SCHEDULE_OPTIONS_SENT", status: "SCHEDULED", note: `${slots.length} schedule options were offered for ${service.appointmentMode === "INSPECTION" ? "inspection" : "the scheduled LGU activity"}.`, visibleToCitizen: true } });
  });
  await createNotification({ userId: row.requesterId, module: "SERVICES", type: "SCHEDULE_AVAILABLE", title: "Choose your LGU schedule", message: `${slots.length} schedule options are now available for ${service.shortTitle}.`, href: `/services/requests/${id}` });
}

export async function citizenAppointmentAction(requestId: string, appointmentId: string, input: any, viewer: CivicViewer) {
  const row = await ownedRequest(requestId, viewer);
  const appointment = await prisma.serviceAppointment.findFirst({ where: { id: appointmentId, requestId }, select: { id: true, status: true, scheduledAt: true } });
  if (!appointment) throw new CivicError("Schedule option not found.", 404);
  const action = String(input?.action || "");
  if (action === "SELECT") {
    if (row.status !== "SCHEDULED" || appointment.status !== "PROPOSED") throw new CivicError("This schedule option is no longer available.", 409);
    await prisma.$transaction(async tx => {
      await tx.serviceAppointment.updateMany({ where: { requestId, status: "PROPOSED", id: { not: appointmentId } }, data: { status: "NOT_SELECTED" } });
      await tx.serviceAppointment.update({ where: { id: appointmentId }, data: { status: "CONFIRMED", confirmedAt: new Date(), citizenNote: typeof input?.note === "string" ? input.note.trim().slice(0, 800) || null : null } });
      await tx.serviceRequest.update({ where: { id: requestId }, data: { status: "APPOINTMENT_CONFIRMED", version: { increment: 1 } } });
      await tx.serviceRequestEvent.create({ data: { requestId, actorId: viewer.id, action: "APPOINTMENT_SELECTED", status: "APPOINTMENT_CONFIRMED", note: `Citizen selected the schedule on ${appointment.scheduledAt.toLocaleString("en-PH")}.`, visibleToCitizen: true } });
    });
    if (row.assignedStaffId) await createNotification({ userId: row.assignedStaffId, module: "SERVICES", type: "SCHEDULE_CONFIRMED", title: "Citizen selected a schedule", message: `A citizen confirmed ${appointment.scheduledAt.toLocaleString("en-PH")}.`, href: `/admin/services/${requestId}` });
  } else if (action === "REQUEST_CHANGE") {
    if (row.status !== "SCHEDULED" || appointment.status !== "PROPOSED") throw new CivicError("Schedule changes are only available while choosing from active options.", 409);
    const reason = note(input?.note, "Reason for schedule change", 4, 800);
    await prisma.$transaction(async tx => {
      await tx.serviceAppointment.updateMany({ where: { requestId, status: "PROPOSED" }, data: { status: "CHANGE_REQUESTED", citizenNote: reason } });
      await tx.serviceRequest.update({ where: { id: requestId }, data: { status: "VALIDATED", version: { increment: 1 } } });
      await tx.serviceRequestEvent.create({ data: { requestId, actorId: viewer.id, action: "SCHEDULE_CHANGE_REQUESTED", status: "VALIDATED", note: `Citizen requested a new set of schedule options: ${reason}`, visibleToCitizen: true } });
    });
    if (row.assignedStaffId) await createNotification({ userId: row.assignedStaffId, module: "SERVICES", type: "SCHEDULE_CHANGE", title: "Citizen requested new schedule options", message: reason, href: `/admin/services/${requestId}` });
  } else {
    throw new CivicError("Choose a valid schedule response.");
  }
}

export async function adminFinalAction(id: string, input: any, viewer: CivicViewer) {
  if (viewer.role !== "ADMIN") throw new CivicError("Super Admin verification is required.", 403);
  const row = await adminRequest(id, viewer);
  const service = await resolveServiceDefinition(row.serviceKey, true);
  if (!service) throw new CivicError("Service configuration is unavailable.", 409);
  const action = String(input?.action || "");
  const remarks = note(input?.note, "Verification remarks", 8, 1500);
  let next: string;
  if (action === "APPROVE_RELEASE") {
    if (row.status !== "FOR_FINAL_VERIFICATION") throw new CivicError("This request is not waiting for final verification.", 409);
    if (service.completionMode !== "RELEASE") throw new CivicError("This service is completed through service verification rather than a document-release step.", 409);
    if (!row.staffRecommendation) throw new CivicError("A staff recommendation is required before release approval.", 409);
    if (row.releaseApprovedAt) throw new CivicError("Release was already approved for this request.", 409);
    next = "READY_FOR_RELEASE";
  } else if (action === "VERIFY_COMPLETED") {
    if (row.status !== "FOR_FINAL_VERIFICATION") throw new CivicError("This request is not waiting for completion verification.", 409);
    if (!row.staffRecommendation) throw new CivicError("Staff recommendation is required before final verification.", 409);
    if (service.completionMode === "RELEASE") {
      if (!row.releaseApprovedAt) throw new CivicError("Approve the request for release before verifying final completion.", 409);
      if (!row.releaseNote) throw new CivicError("Staff must record the actual release / delivery before final completion verification.", 409);
    }
    next = "COMPLETED";
  } else if (action === "RETURN_TO_STAFF") {
    if (row.status !== "FOR_FINAL_VERIFICATION") throw new CivicError("This request is not waiting for final verification.", 409);
    if (row.releaseApprovedAt) throw new CivicError("A release-approved request should be completed instead of returned to ordinary review.", 409);
    next = "UNDER_REVIEW";
  } else {
    throw new CivicError("Choose a valid final verification action.");
  }
  await prisma.$transaction(async tx => {
    await tx.serviceRequest.update({ where: { id }, data: { status: next, finalNote: remarks, ...(action === "APPROVE_RELEASE" ? { releaseApprovedAt: new Date(), releaseApprovedById: viewer.id } : {}), completedAt: next === "COMPLETED" ? new Date() : null, version: { increment: 1 } } });
    await tx.serviceRequestEvent.create({ data: { requestId: id, actorId: viewer.id, action, status: next, note: remarks, visibleToCitizen: true } });
  });
  if (next === "COMPLETED") await completeWork("SERVICES", "SERVICE_REQUEST", id);
  if (next === "READY_FOR_RELEASE") await createNotification({ userId: row.requesterId, module: "SERVICES", type: "READY_FOR_RELEASE", title: `${service.shortTitle} is ready for release`, message: remarks, href: `/services/requests/${id}` });
  else if (next === "COMPLETED") await createNotification({ userId: row.requesterId, module: "SERVICES", type: "COMPLETED", title: `${service.shortTitle} completed`, message: "The LGU verified that your service transaction is complete.", href: `/services/requests/${id}` });
  else if (next === "UNDER_REVIEW" && row.assignedStaffId) await createNotification({ userId: row.assignedStaffId, module: "SERVICES", type: "RETURNED_BY_ADMIN", title: "Request returned for review", message: remarks, href: `/admin/services/${id}` });
}
