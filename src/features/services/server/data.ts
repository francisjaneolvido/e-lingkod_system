import "server-only";
import { prisma } from "@/lib/prisma";
import type { CivicViewer } from "@/features/civic/types";
import { isServiceStatus } from "../domain";
import { departmentMatchesService } from "../catalog";
import { managedServiceCatalog, publishedServiceCatalog, resolveServiceDefinition } from "./catalog";
import { refreshExpiredWorkOffers } from "@/lib/work-distribution/server";

function jsonObject(value: string): Record<string,string> {
  try { const parsed = JSON.parse(value); return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {}; }
  catch { return {}; }
}

export async function citizenServiceRequests(userId: string) {
  const rows = await prisma.serviceRequest.findMany({ where: { requesterId: userId }, orderBy: { updatedAt: "desc" }, select: { id: true, trackingId: true, serviceKey: true, serviceTitle: true, status: true, assignedDepartment: true, assignedStaffId: true, createdAt: true, updatedAt: true } });
  return rows.map(row => ({ ...row, status: isServiceStatus(row.status) ? row.status : "DRAFT", createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString() }));
}

export async function citizenServiceRequest(id: string, userId: string) {
  const row = await prisma.serviceRequest.findFirst({ where: { id, requesterId: userId }, include: {
    documents: { select: { id: true, requirementKey: true, requirementLabel: true, fileName: true, mimeType: true, byteSize: true, uploadedAt: true, verificationStatus: true, verificationNote: true, verifiedAt: true }, orderBy: { uploadedAt: "desc" } },
    events: { where: { visibleToCitizen: true }, select: { id: true, action: true, status: true, note: true, createdAt: true }, orderBy: { createdAt: "asc" } },
    appointments: { select: { id: true, scheduledAt: true, location: true, agenda: true, status: true, citizenNote: true, staffNote: true, confirmedAt: true, completedAt: true, createdAt: true }, orderBy: [{ scheduledAt: "asc" }, { createdAt: "desc" }] },
  }});
  if (!row) return null;
  return { ...row, status: isServiceStatus(row.status) ? row.status : "DRAFT", formData: jsonObject(row.formDataJson), formDataJson: undefined, createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString(), submittedAt: row.submittedAt?.toISOString() ?? null, completedAt: row.completedAt?.toISOString() ?? null, releaseApprovedAt: row.releaseApprovedAt?.toISOString() ?? null,
    documents: row.documents.map(document => ({ ...document, uploadedAt: document.uploadedAt.toISOString(), verifiedAt: document.verifiedAt?.toISOString() ?? null })),
    events: row.events.map(event => ({ ...event, createdAt: event.createdAt.toISOString() })),
    appointments: row.appointments.map(appointment => ({ ...appointment, scheduledAt: appointment.scheduledAt.toISOString(), confirmedAt: appointment.confirmedAt?.toISOString() ?? null, completedAt: appointment.completedAt?.toISOString() ?? null, createdAt: appointment.createdAt.toISOString() })),
  };
}

async function staffServiceKeys(viewer: CivicViewer) {
  if (viewer.role !== "STAFF") return [];
  const services = await publishedServiceCatalog();
  return services.filter(service => departmentMatchesService(service, viewer.department)).map(service => service.key);
}

async function serviceScope(viewer: CivicViewer) {
  if (viewer.role === "ADMIN") return {};
  const keys = await staffServiceKeys(viewer);
  return { OR: [{ assignedStaffId: viewer.id }, ...(keys.length ? [{ serviceKey: { in: keys } }] : [])] };
}

export const serviceWorkflowViews: Record<string, string[]> = {
  new: ["FOR_TRIAGE", "SUBMITTED"], review: ["ASSIGNED", "UNDER_REVIEW", "VALIDATED", "APPOINTMENT_COMPLETED"], action: ["ACTION_REQUIRED"], schedule: ["SCHEDULED", "APPOINTMENT_CONFIRMED"], final: ["FOR_FINAL_VERIFICATION", "READY_FOR_RELEASE"], closed: ["COMPLETED", "DECLINED", "CANCELLED"],
};
// Backward-compatible name used by existing dashboard/tests.
export const workflowViews = serviceWorkflowViews;

export async function adminServiceQueue(viewer: CivicViewer, filters?: { status?: string; serviceKey?: string; mine?: boolean; query?: string; view?: string }) {
  await refreshExpiredWorkOffers();
  const conditions: any[] = [await serviceScope(viewer)];
  if (filters?.status) conditions.push({ status: filters.status });
  else if (filters?.view && serviceWorkflowViews[filters.view]) conditions.push({ status: { in: serviceWorkflowViews[filters.view] } });
  if (filters?.serviceKey) conditions.push({ serviceKey: filters.serviceKey });
  if (filters?.mine) conditions.push({ assignedStaffId: viewer.id });
  const query = filters?.query?.trim();
  if (query) conditions.push({ OR: [{ trackingId: { contains: query } }, { serviceTitle: { contains: query } }, { requester: { name: { contains: query } } }, { requester: { email: { contains: query } } }] });
  const rows = await prisma.serviceRequest.findMany({ where: { AND: conditions }, orderBy: [{ updatedAt: "desc" }], take: 300, select: { id: true, trackingId: true, serviceKey: true, serviceTitle: true, status: true, assignedDepartment: true, assignedStaffId: true, createdAt: true, updatedAt: true, submittedAt: true, completedAt: true, requester: { select: { name: true, email: true } }, assignedStaff: { select: { name: true, department: true } } } });
  const assignments = await prisma.workAssignment.findMany({ where: { module: "SERVICES", entityType: "SERVICE_REQUEST", entityId: { in: rows.map(row => row.id) } }, select: { entityId: true, id: true, status: true, claimDeadline: true, assignedStaffId: true } });
  const byEntity = new Map(assignments.map(item => [item.entityId, item]));
  return rows.map(row => ({ ...row, workAssignment: byEntity.get(row.id) ?? null }));
}

export async function adminServiceRequest(id: string, viewer: CivicViewer) {
  await refreshExpiredWorkOffers();
  const row = await prisma.serviceRequest.findFirst({ where: { id, ...(await serviceScope(viewer)) }, include: {
    requester: { select: { id: true, name: true, email: true, phoneNumber: true } },
    assignedStaff: { select: { id: true, name: true, email: true, department: true, designation: true } },
    documents: { select: { id: true, requirementKey: true, requirementLabel: true, fileName: true, mimeType: true, byteSize: true, uploadedAt: true, verificationStatus: true, verificationNote: true, verifiedAt: true, verifiedBy: { select: { name: true } } }, orderBy: { uploadedAt: "desc" } },
    events: { include: { actor: { select: { name: true, role: true } } }, orderBy: { createdAt: "asc" } },
    appointments: { include: { proposedBy: { select: { name: true } } }, orderBy: [{ scheduledAt: "asc" }, { createdAt: "desc" }] },
  }});
  if (!row) return null;
  const workAssignment = await prisma.workAssignment.findUnique({ where: { module_entityType_entityId: { module: "SERVICES", entityType: "SERVICE_REQUEST", entityId: id } }, select: { id: true, status: true, claimDeadline: true, assignedStaffId: true, acceptedAt: true, attemptCount: true } });
  return { ...row, status: isServiceStatus(row.status) ? row.status : "DRAFT", formData: jsonObject(row.formDataJson), workAssignment };
}

export async function serviceStaffOptions(serviceKey?: string) {
  const rows = await prisma.user.findMany({ where: { role: "STAFF", staffPermissions: { some: { module: "SERVICES" } } }, orderBy: [{ department: "asc" }, { name: "asc" }], select: { id: true, name: true, email: true, department: true, designation: true } });
  const service = serviceKey ? await resolveServiceDefinition(serviceKey, true) : null;
  if (!service) return rows;
  const eligible = rows.filter(row => departmentMatchesService(service, row.department));
  if (!eligible.length) return [];
  const loads = await prisma.workAssignment.groupBy({ by: ["assignedStaffId"], where: { module: "SERVICES", assignedStaffId: { in: eligible.map(row => row.id) }, status: { in: ["OFFERED","ACCEPTED"] } }, _count: { _all: true } });
  const loadMap = new Map(loads.map(row => [row.assignedStaffId, row._count._all]));
  return eligible.map(row => ({ ...row, activeLoad: loadMap.get(row.id) ?? 0 })).sort((a,b) => a.activeLoad - b.activeLoad || a.name.localeCompare(b.name));
}

export async function serviceDashboardCounts(viewer: CivicViewer) {
  await refreshExpiredWorkOffers();
  const scope = await serviceScope(viewer);
  const [newCount, assignedCount, actionCount, scheduledCount, finalCount, completedCount, offeredCount] = await Promise.all([
    prisma.serviceRequest.count({ where: { ...scope, status: { in: ["FOR_TRIAGE", "SUBMITTED"] } } }),
    prisma.serviceRequest.count({ where: { ...scope, status: { in: ["ASSIGNED", "UNDER_REVIEW", "VALIDATED", "APPOINTMENT_COMPLETED"] } } }),
    prisma.serviceRequest.count({ where: { ...scope, status: "ACTION_REQUIRED" } }),
    prisma.serviceRequest.count({ where: { ...scope, status: { in: ["SCHEDULED", "APPOINTMENT_CONFIRMED"] } } }),
    prisma.serviceRequest.count({ where: { ...scope, status: { in: ["FOR_FINAL_VERIFICATION", "READY_FOR_RELEASE"] } } }),
    prisma.serviceRequest.count({ where: { ...scope, status: "COMPLETED" } }),
    viewer.role === "STAFF" ? prisma.workAssignment.count({ where: { module: "SERVICES", entityType: "SERVICE_REQUEST", assignedStaffId: viewer.id, status: "OFFERED" } }) : Promise.resolve(0),
  ]);
  return { newCount, assignedCount, actionCount, scheduledCount, finalCount, completedCount, offeredCount };
}

export async function serviceAdminReport() {
  const since30 = new Date(Date.now() - 30 * 24 * 60 * 60_000);
  const [byService, byStatus, completed, submitted, staffLoads] = await Promise.all([
    prisma.serviceRequest.groupBy({ by: ["serviceKey", "serviceTitle"], where: { createdAt: { gte: since30 } }, _count: { _all: true } }),
    prisma.serviceRequest.groupBy({ by: ["status"], where: { createdAt: { gte: since30 } }, _count: { _all: true } }),
    prisma.serviceRequest.findMany({ where: { completedAt: { gte: since30 } }, select: { submittedAt: true, completedAt: true } }),
    prisma.serviceRequest.count({ where: { submittedAt: { gte: since30 } } }),
    prisma.workAssignment.groupBy({ by: ["assignedStaffId"], where: { module: "SERVICES", status: { in: ["OFFERED","ACCEPTED"] }, assignedStaffId: { not: null } }, _count: { _all: true } }),
  ]);
  const staffIds = staffLoads.flatMap(row => row.assignedStaffId ? [row.assignedStaffId] : []);
  const staff = await prisma.user.findMany({ where: { id: { in: staffIds } }, select: { id: true, name: true, department: true } });
  const staffMap = new Map(staff.map(row => [row.id,row]));
  const turnaroundHours = completed.length ? Math.round((completed.reduce((sum,row) => sum + (row.submittedAt && row.completedAt ? row.completedAt.getTime() - row.submittedAt.getTime() : 0),0) / completed.length / 3_600_000) * 10) / 10 : 0;
  return { submitted, completed: completed.length, turnaroundHours, byService: byService.sort((a,b)=>b._count._all-a._count._all), byStatus, staffLoads: staffLoads.map(row => ({ staff: row.assignedStaffId ? staffMap.get(row.assignedStaffId) : null, count: row._count._all })).filter(row => row.staff) };
}

export { managedServiceCatalog };
