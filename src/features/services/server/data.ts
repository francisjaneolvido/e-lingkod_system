import "server-only";
import { prisma } from "@/lib/prisma";
import type { CivicViewer } from "@/features/civic/types";
import { isServiceStatus } from "../domain";
import { ONLINE_SERVICES, departmentMatchesService, serviceByKey } from "../catalog";

function jsonObject(value: string): Record<string,string> {
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

export async function citizenServiceRequests(userId: string) {
  const rows = await prisma.serviceRequest.findMany({
    where: { requesterId: userId },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true, trackingId: true, serviceKey: true, serviceTitle: true, status: true,
      assignedDepartment: true, assignedStaffId: true, createdAt: true, updatedAt: true,
    },
  });
  return rows.map(row => ({ ...row, status: isServiceStatus(row.status) ? row.status : "DRAFT", createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString() }));
}

export async function citizenServiceRequest(id: string, userId: string) {
  const row = await prisma.serviceRequest.findFirst({
    where: { id, requesterId: userId },
    include: {
      documents: {
        select: {
          id: true, requirementKey: true, requirementLabel: true, fileName: true, mimeType: true, byteSize: true,
          uploadedAt: true, verificationStatus: true, verificationNote: true, verifiedAt: true,
        },
        orderBy: { uploadedAt: "desc" },
      },
      events: { where: { visibleToCitizen: true }, select: { id: true, action: true, status: true, note: true, createdAt: true }, orderBy: { createdAt: "asc" } },
      appointments: {
        select: { id: true, scheduledAt: true, location: true, agenda: true, status: true, citizenNote: true, staffNote: true, confirmedAt: true, completedAt: true, createdAt: true },
        orderBy: [{ scheduledAt: "asc" }, { createdAt: "desc" }],
      },
    },
  });
  if (!row) return null;
  return {
    ...row,
    status: isServiceStatus(row.status) ? row.status : "DRAFT",
    formData: jsonObject(row.formDataJson),
    formDataJson: undefined,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    submittedAt: row.submittedAt?.toISOString() ?? null,
    completedAt: row.completedAt?.toISOString() ?? null,
    releaseApprovedAt: row.releaseApprovedAt?.toISOString() ?? null,
    documents: row.documents.map(document => ({ ...document, uploadedAt: document.uploadedAt.toISOString(), verifiedAt: document.verifiedAt?.toISOString() ?? null })),
    events: row.events.map(event => ({ ...event, createdAt: event.createdAt.toISOString() })),
    appointments: row.appointments.map(appointment => ({
      ...appointment,
      scheduledAt: appointment.scheduledAt.toISOString(),
      confirmedAt: appointment.confirmedAt?.toISOString() ?? null,
      completedAt: appointment.completedAt?.toISOString() ?? null,
      createdAt: appointment.createdAt.toISOString(),
    })),
  };
}

function staffServiceKeys(viewer: CivicViewer) {
  if (viewer.role !== "STAFF") return [];
  return ONLINE_SERVICES.filter(service => departmentMatchesService(service, viewer.department)).map(service => service.key);
}

function serviceScope(viewer: CivicViewer) {
  if (viewer.role === "ADMIN") return {};
  const keys = staffServiceKeys(viewer);
  return { OR: [{ assignedStaffId: viewer.id }, ...(keys.length ? [{ serviceKey: { in: keys } }] : [])] };
}

const workflowViews: Record<string, string[]> = {
  new: ["FOR_TRIAGE", "SUBMITTED"],
  review: ["ASSIGNED", "UNDER_REVIEW", "VALIDATED", "APPOINTMENT_COMPLETED"],
  action: ["ACTION_REQUIRED"],
  schedule: ["SCHEDULED", "APPOINTMENT_CONFIRMED"],
  final: ["FOR_FINAL_VERIFICATION", "READY_FOR_RELEASE"],
  closed: ["COMPLETED", "DECLINED", "CANCELLED"],
};

export async function adminServiceQueue(viewer: CivicViewer, filters?: { status?: string; serviceKey?: string; mine?: boolean; query?: string; view?: string }) {
  const conditions: any[] = [serviceScope(viewer)];
  if (filters?.status) conditions.push({ status: filters.status });
  else if (filters?.view && workflowViews[filters.view]) conditions.push({ status: { in: workflowViews[filters.view] } });
  if (filters?.serviceKey) conditions.push({ serviceKey: filters.serviceKey });
  if (filters?.mine) conditions.push({ assignedStaffId: viewer.id });
  const query = filters?.query?.trim();
  if (query) {
    conditions.push({
      OR: [
        { trackingId: { contains: query } },
        { serviceTitle: { contains: query } },
        { requester: { name: { contains: query } } },
        { requester: { email: { contains: query } } },
      ],
    });
  }
  return prisma.serviceRequest.findMany({
    where: { AND: conditions },
    orderBy: [{ updatedAt: "desc" }],
    take: 300,
    select: {
      id: true, trackingId: true, serviceKey: true, serviceTitle: true, status: true, assignedDepartment: true, assignedStaffId: true, createdAt: true, updatedAt: true,
      requester: { select: { name: true, email: true } },
      assignedStaff: { select: { name: true, department: true } },
    },
  });
}

export async function adminServiceRequest(id: string, viewer: CivicViewer) {
  const row = await prisma.serviceRequest.findFirst({
    where: { id, ...serviceScope(viewer) },
    include: {
      requester: { select: { id: true, name: true, email: true, phoneNumber: true } },
      assignedStaff: { select: { id: true, name: true, email: true, department: true, designation: true } },
      documents: {
        select: {
          id: true, requirementKey: true, requirementLabel: true, fileName: true, mimeType: true, byteSize: true, uploadedAt: true,
          verificationStatus: true, verificationNote: true, verifiedAt: true,
          verifiedBy: { select: { name: true } },
        },
        orderBy: { uploadedAt: "desc" },
      },
      events: { include: { actor: { select: { name: true, role: true } } }, orderBy: { createdAt: "asc" } },
      appointments: { include: { proposedBy: { select: { name: true } } }, orderBy: [{ scheduledAt: "asc" }, { createdAt: "desc" }] },
    },
  });
  if (!row) return null;
  return { ...row, status: isServiceStatus(row.status) ? row.status : "DRAFT", formData: jsonObject(row.formDataJson) };
}

export async function serviceStaffOptions(serviceKey?: string) {
  const rows = await prisma.user.findMany({
    where: { role: "STAFF", staffPermissions: { some: { module: "SERVICES" } } },
    orderBy: [{ department: "asc" }, { name: "asc" }],
    select: { id: true, name: true, email: true, department: true, designation: true },
  });
  const service = serviceKey ? serviceByKey(serviceKey) : null;
  return service ? rows.filter(row => departmentMatchesService(service, row.department)) : rows;
}

export async function serviceDashboardCounts(viewer: CivicViewer) {
  const scope = serviceScope(viewer);
  const [newCount, assignedCount, actionCount, scheduledCount, finalCount, completedCount] = await Promise.all([
    prisma.serviceRequest.count({ where: { ...scope, status: { in: ["FOR_TRIAGE", "SUBMITTED"] } } }),
    prisma.serviceRequest.count({ where: { ...scope, status: { in: ["ASSIGNED", "UNDER_REVIEW", "VALIDATED", "APPOINTMENT_COMPLETED"] } } }),
    prisma.serviceRequest.count({ where: { ...scope, status: "ACTION_REQUIRED" } }),
    prisma.serviceRequest.count({ where: { ...scope, status: { in: ["SCHEDULED", "APPOINTMENT_CONFIRMED"] } } }),
    prisma.serviceRequest.count({ where: { ...scope, status: { in: ["FOR_FINAL_VERIFICATION", "READY_FOR_RELEASE"] } } }),
    prisma.serviceRequest.count({ where: { ...scope, status: "COMPLETED" } }),
  ]);
  return { newCount, assignedCount, actionCount, scheduledCount, finalCount, completedCount };
}
