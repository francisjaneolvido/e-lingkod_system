import "server-only";
import { prisma } from "@/lib/prisma";
import { CivicError } from "@/features/civic/validation";
import type { CivicViewer } from "@/features/civic/types";
import type { StaffModule } from "@/lib/staff-modules";
import { sameOffice } from "@/lib/report-scope";
import { departmentMatchesService, type OnlineServiceDefinition } from "@/features/services/catalog";
import { createNotification, notifyAdmins } from "@/lib/notifications/server";

export const WORK_ACCEPT_WINDOW_MINUTES = 120;
export type WorkEntityType = "CIVIC_REPORT" | "SERVICE_REQUEST" | "JOB_TASK" | "CENSUS_TASK";
const ACTIVE_STATUSES = ["OFFERED", "ACCEPTED"];

function deadline(minutes = WORK_ACCEPT_WINDOW_MINUTES) { return new Date(Date.now() + Math.max(15, Math.min(minutes, 24 * 60)) * 60_000); }

async function eligibleStaff(module: StaffModule, matchesDepartment: (department: string | null) => boolean, exclude: string[] = []) {
  const candidates = await prisma.user.findMany({
    where: { role: "STAFF", id: exclude.length ? { notIn: exclude } : undefined, staffPermissions: { some: { module } } },
    select: { id: true, name: true, department: true, createdAt: true },
  });
  return candidates.filter(candidate => matchesDepartment(candidate.department));
}

async function balancedCandidate(module: StaffModule, candidates: Array<{id:string;name:string;department:string|null;createdAt:Date}>) {
  if (!candidates.length) return null;
  const ids = candidates.map(c => c.id);
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60_000);
  const [active, recentOffers] = await Promise.all([
    prisma.workAssignment.groupBy({ by: ["assignedStaffId"], where: { module, assignedStaffId: { in: ids }, status: { in: ACTIVE_STATUSES } }, _count: { _all: true } }),
    prisma.notification.groupBy({ by: ["userId"], where: { module, type: "WORK_OFFER", userId: { in: ids }, createdAt: { gte: thirtyDaysAgo } }, _count: { _all: true }, _max: { createdAt: true } }),
  ]);
  const activeMap = new Map(active.map(row => [row.assignedStaffId, row._count._all]));
  const recentMap = new Map(recentOffers.map(row => [row.userId, { count: row._count._all, last: row._max.createdAt?.getTime() ?? 0 }]));
  return [...candidates].sort((a,b) => {
    const aa = activeMap.get(a.id) ?? 0, ba = activeMap.get(b.id) ?? 0;
    if (aa !== ba) return aa - ba;
    const ar = recentMap.get(a.id) ?? {count:0,last:0}, br = recentMap.get(b.id) ?? {count:0,last:0};
    if (ar.count !== br.count) return ar.count - br.count;
    if (ar.last !== br.last) return ar.last - br.last;
    return a.createdAt.getTime() - b.createdAt.getTime() || a.id.localeCompare(b.id);
  })[0];
}

function workHref(entityType: WorkEntityType, entityId: string) {
  if (entityType === "CIVIC_REPORT") return `/admin/reports/${entityId}`;
  if (entityType === "SERVICE_REQUEST") return `/admin/services/${entityId}`;
  return "/admin";
}

async function previouslyOfferedStaff(module: StaffModule, entityType: WorkEntityType, entityId: string) {
  const rows = await prisma.notification.findMany({ where: { module, type: "WORK_OFFER", href: workHref(entityType, entityId) }, select: { userId: true } });
  return [...new Set(rows.map(row => row.userId))];
}

async function saveOffer(input: { module: StaffModule; entityType: WorkEntityType; entityId: string; department?: string | null; staff: {id:string;name:string}; acceptMinutes?: number }) {
  const now = new Date();
  return prisma.workAssignment.upsert({
    where: { module_entityType_entityId: { module: input.module, entityType: input.entityType, entityId: input.entityId } },
    create: { module: input.module, entityType: input.entityType, entityId: input.entityId, department: input.department || null, assignedStaffId: input.staff.id, status: "OFFERED", claimDeadline: deadline(input.acceptMinutes), lastOfferedAt: now, attemptCount: 1 },
    update: { department: input.department || null, assignedStaffId: input.staff.id, status: "OFFERED", claimDeadline: deadline(input.acceptMinutes), lastOfferedAt: now, acceptedAt: null, declinedAt: null, completedAt: null, attemptCount: { increment: 1 } },
  });
}

export async function autoOfferCivicReport(reportId: string, office: string, exclude: string[] = []) {
  const history = await previouslyOfferedStaff("REPORTS", "CIVIC_REPORT", reportId);
  const excluded = [...new Set([...exclude, ...history])];
  const candidates = await eligibleStaff("REPORTS", department => sameOffice(department, office), excluded);
  const staff = await balancedCandidate("REPORTS", candidates);
  if (!staff) {
    await notifyAdmins({ module: "REPORTS", type: "WORK_POOL_EXHAUSTED", title: "Civic case needs manual assignment", message: "No remaining eligible staff accepted the case within the offer cycle. Super Admin can assign it manually.", href: `/admin/reports/${reportId}` });
    return null;
  }
  const assignment = await saveOffer({ module: "REPORTS", entityType: "CIVIC_REPORT", entityId: reportId, department: office, staff });
  await prisma.civicReport.update({ where: { id: reportId }, data: { assignedOffice: office, assignedStaffId: staff.id, version: { increment: 1 } } });
  await prisma.reportUpdate.create({ data: { reportId, actorId: null, status: (await prisma.civicReport.findUniqueOrThrow({where:{id:reportId},select:{status:true}})).status, assignedOffice: office, assignedStaffId: staff.id, action: "AUTO_OFFER", visibility: "INTERNAL", note: `Automatically offered to ${staff.name} using balanced workload distribution.` } });
  await createNotification({ userId: staff.id, module: "REPORTS", type: "WORK_OFFER", title: "New civic case offered", message: "A civic report was routed to you. Accept it before the offer expires.", href: `/admin/reports/${reportId}` });
  return assignment;
}

export async function autoOfferServiceRequest(requestId: string, service: OnlineServiceDefinition, exclude: string[] = [], acceptMinutes = WORK_ACCEPT_WINDOW_MINUTES) {
  const history = await previouslyOfferedStaff("SERVICES", "SERVICE_REQUEST", requestId);
  const excluded = [...new Set([...exclude, ...history])];
  const candidates = await eligibleStaff("SERVICES", department => departmentMatchesService(service, department), excluded);
  const staff = await balancedCandidate("SERVICES", candidates);
  if (!staff) {
    await notifyAdmins({ module: "SERVICES", type: "WORK_POOL_EXHAUSTED", title: "Service request needs manual assignment", message: `No remaining eligible staff accepted this ${service.shortTitle} request within the offer cycle. Super Admin can assign it manually.`, href: `/admin/services/${requestId}` });
    return null;
  }
  const assignment = await saveOffer({ module: "SERVICES", entityType: "SERVICE_REQUEST", entityId: requestId, department: service.departmentCode || service.processingOffice, staff, acceptMinutes });
  await prisma.serviceRequest.update({ where: { id: requestId }, data: { assignedDepartment: service.processingOffice, assignedStaffId: staff.id, status: "ASSIGNED", version: { increment: 1 } } });
  await prisma.serviceRequestEvent.create({ data: { requestId, actorId: null, action: "AUTO_OFFER", status: "ASSIGNED", note: `Request automatically offered to ${staff.name} using balanced workload distribution.`, visibleToCitizen: false } });
  await createNotification({ userId: staff.id, module: "SERVICES", type: "WORK_OFFER", title: `${service.shortTitle} request offered`, message: "A service request is waiting for your acceptance.", href: `/admin/services/${requestId}` });
  return assignment;
}

async function entityLink(assignment: { entityType: string; entityId: string }) {
  return workHref(assignment.entityType as WorkEntityType, assignment.entityId);
}

export async function acceptOrDeclineWork(assignmentId: string, action: "ACCEPT" | "DECLINE", viewer: CivicViewer, reason = "") {
  if (viewer.role !== "STAFF") throw new CivicError("Only LGU staff can respond to workload offers.", 403);
  const assignment = await prisma.workAssignment.findUnique({ where: { id: assignmentId } });
  if (!assignment || assignment.assignedStaffId !== viewer.id) throw new CivicError("This workload offer is not assigned to you.", 403);
  if (assignment.status !== "OFFERED") throw new CivicError("This workload offer is no longer awaiting your response.", 409);
  if (assignment.claimDeadline && assignment.claimDeadline.getTime() < Date.now()) throw new CivicError("This workload offer expired. Refresh your dashboard for the latest assignment.", 409);
  if (action === "ACCEPT") {
    await prisma.workAssignment.update({ where: { id: assignment.id }, data: { status: "ACCEPTED", acceptedAt: new Date(), claimDeadline: null } });
    return { ok: true };
  }
  const note = reason.trim();
  if (note.length < 4) throw new CivicError("Give a short reason so the task can be re-routed fairly.");
  await prisma.workAssignment.update({ where: { id: assignment.id }, data: { status: "DECLINED", declinedAt: new Date(), claimDeadline: null } });
  if (assignment.entityType === "CIVIC_REPORT") {
    await prisma.civicReport.update({ where: { id: assignment.entityId }, data: { assignedStaffId: null, version: { increment: 1 } } });
    const report = await prisma.civicReport.findUnique({ where: { id: assignment.entityId }, select: { assignedOffice: true } });
    if (report?.assignedOffice) await autoOfferCivicReport(assignment.entityId, report.assignedOffice, [viewer.id]);
  } else if (assignment.entityType === "SERVICE_REQUEST") {
    await prisma.serviceRequest.update({ where: { id: assignment.entityId }, data: { assignedStaffId: null, status: "SUBMITTED", version: { increment: 1 } } });
    const request = await prisma.serviceRequest.findUnique({ where: { id: assignment.entityId }, select: { serviceKey: true } });
    if (request) {
      const { resolveServiceDefinition } = await import("@/features/services/server/catalog");
      const service = await resolveServiceDefinition(request.serviceKey, true);
      if (service) await autoOfferServiceRequest(assignment.entityId, service, [viewer.id]);
    }
  }
  await notifyAdmins({ module: assignment.module as StaffModule, type: "WORK_DECLINED", title: "Work offer declined", message: `${viewer.name} declined a task offer: ${note}`, href: await entityLink(assignment) });
  return { ok: true };
}

export async function requireAcceptedWork(viewer: CivicViewer, module: StaffModule, entityType: WorkEntityType, entityId: string) {
  if (viewer.role === "ADMIN") return;
  if (viewer.role !== "STAFF") throw new CivicError("LGU staff access required.", 403);
  let item = await prisma.workAssignment.findUnique({ where: { module_entityType_entityId: { module, entityType, entityId } }, select: { assignedStaffId: true, status: true } });
  // Backward compatibility for records assigned before V16: preserve the assignment and enroll it as accepted work.
  if (!item) {
    let legacyAssigned = false;
    if (entityType === "CIVIC_REPORT") legacyAssigned = Boolean(await prisma.civicReport.findFirst({ where: { id: entityId, assignedStaffId: viewer.id }, select: { id: true } }));
    if (entityType === "SERVICE_REQUEST") legacyAssigned = Boolean(await prisma.serviceRequest.findFirst({ where: { id: entityId, assignedStaffId: viewer.id }, select: { id: true } }));
    if (legacyAssigned) {
      await manualAssignWork({ module, entityType, entityId, department: viewer.department || null, staffId: viewer.id });
      item = { assignedStaffId: viewer.id, status: "ACCEPTED" };
    }
  }
  if (!item || item.assignedStaffId !== viewer.id || item.status !== "ACCEPTED") throw new CivicError("Accept this assigned task from My Workspace before processing it.", 409);
}

export async function completeWork(module: StaffModule, entityType: WorkEntityType, entityId: string) {
  await prisma.workAssignment.updateMany({ where: { module, entityType, entityId, status: { in: ACTIVE_STATUSES } }, data: { status: "COMPLETED", completedAt: new Date(), claimDeadline: null } });
}

export async function manualAssignWork(input: { module: StaffModule; entityType: WorkEntityType; entityId: string; department?: string | null; staffId: string }) {
  await prisma.workAssignment.upsert({
    where: { module_entityType_entityId: { module: input.module, entityType: input.entityType, entityId: input.entityId } },
    create: { module: input.module, entityType: input.entityType, entityId: input.entityId, department: input.department || null, assignedStaffId: input.staffId, status: "ACCEPTED", acceptedAt: new Date(), attemptCount: 1, lastOfferedAt: new Date() },
    update: { department: input.department || null, assignedStaffId: input.staffId, status: "ACCEPTED", acceptedAt: new Date(), declinedAt: null, completedAt: null, claimDeadline: null, lastOfferedAt: new Date(), attemptCount: { increment: 1 } },
  });
}

export async function refreshExpiredWorkOffers(limit = 25) {
  const expired = await prisma.workAssignment.findMany({ where: { status: "OFFERED", claimDeadline: { lt: new Date() } }, orderBy: { claimDeadline: "asc" }, take: limit });
  for (const item of expired) {
    const previous = item.assignedStaffId ? [item.assignedStaffId] : [];
    await prisma.workAssignment.update({ where: { id: item.id }, data: { status: "EXPIRED", claimDeadline: null } });
    if (item.entityType === "CIVIC_REPORT") {
      await prisma.civicReport.updateMany({ where: { id: item.entityId, assignedStaffId: item.assignedStaffId }, data: { assignedStaffId: null, version: { increment: 1 } } });
      const report = await prisma.civicReport.findUnique({ where: { id: item.entityId }, select: { assignedOffice: true, status: true } });
      if (report?.assignedOffice && !["RESOLVED","REJECTED"].includes(report.status)) await autoOfferCivicReport(item.entityId, report.assignedOffice, previous);
    } else if (item.entityType === "SERVICE_REQUEST") {
      await prisma.serviceRequest.updateMany({ where: { id: item.entityId, assignedStaffId: item.assignedStaffId }, data: { assignedStaffId: null, status: "SUBMITTED", version: { increment: 1 } } });
      const request = await prisma.serviceRequest.findUnique({ where: { id: item.entityId }, select: { serviceKey: true, status: true } });
      if (request && !["COMPLETED","DECLINED","CANCELLED"].includes(request.status)) {
        const { resolveServiceDefinition } = await import("@/features/services/server/catalog");
        const service = await resolveServiceDefinition(request.serviceKey, true);
        if (service) await autoOfferServiceRequest(item.entityId, service, previous);
      }
    }
  }
  return expired.length;
}

export async function staffWorkOffers(userId: string) {
  await refreshExpiredWorkOffers();
  return prisma.workAssignment.findMany({ where: { assignedStaffId: userId, status: "OFFERED" }, orderBy: { claimDeadline: "asc" }, take: 20 });
}
