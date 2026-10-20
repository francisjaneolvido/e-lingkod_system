import "server-only";
import { prisma } from "@/lib/prisma";
import { hasModuleAccess } from "@/lib/staff-access";
import { reportAdminScope } from "@/lib/report-scope";
import type { Prisma } from "@/generated/prisma/client";
import type { CivicViewer, PublicTracking, ReportDetail, ReportSummary } from "../types";

const summarySelect = {
  id: true, trackingId: true, title: true, category: true, barangay: true, status: true,
  assignedOffice: true, assignedStaffId: true, priority: true, createdAt: true, updatedAt: true,
  assignedStaff: { select: { name: true } },
  photos: { select: { id: true }, orderBy: { createdAt: "asc" as const }, take: 1 },
} satisfies Prisma.CivicReportSelect;

type SummaryRow = Prisma.CivicReportGetPayload<{ select: typeof summarySelect }>;
function serializeSummary(row: SummaryRow, admin: boolean): ReportSummary {
  return {
    id: row.id, trackingId: row.trackingId, title: row.title, category: row.category,
    barangay: row.barangay, status: row.status, assignedOffice: row.assignedOffice,
    assignedStaffId: admin ? row.assignedStaffId : null,
    assignedStaffName: admin ? row.assignedStaff?.name ?? null : null,
    priority: row.priority, createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString(),
    photoId: row.photos[0]?.id ?? null,
  };
}

export async function listReports(viewer: CivicViewer, admin = false, limit = 200, cursor?: string): Promise<ReportSummary[]> {
  if (admin && !(await hasModuleAccess(viewer, "REPORTS"))) return [];
  const rows = await prisma.civicReport.findMany({
    where: admin ? reportAdminScope(viewer) : { reporterId: viewer.id },
    orderBy: admin ? [{ priority: "desc" }, { createdAt: "desc" }, { id: "desc" }] : [{ createdAt: "desc" }, { id: "desc" }],
    take: limit,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    select: { ...summarySelect, ...(admin ? { reporter: { select: { name: true } } } : {}) },
  });
  return rows.map(row => ({ ...serializeSummary(row, admin), ...(admin && "reporter" in row && (viewer.role === "ADMIN" || row.assignedStaffId === viewer.id) ? { reporterName: row.reporter?.name } : {}) }));
}

export async function getReport(id: string, viewer: CivicViewer, admin = false): Promise<ReportDetail | null> {
  if (admin && !(await hasModuleAccess(viewer, "REPORTS"))) return null;
  const row = await prisma.civicReport.findFirst({
    where: { id, ...(admin ? reportAdminScope(viewer) : { reporterId: viewer.id }) },
    select: {
      ...summarySelect, description: true, address: true, latitude: true, longitude: true,
      locationSource: true, gpsAccuracy: true, version: true, reporterId: true,
      photos: { select: { id: true }, orderBy: { createdAt: "asc" } },
      citizenFeedbacks: {
        select: { id: true, resolutionSubmissionId: true, decision: true, reason: true, createdAt: true,
          photos: { select: { id: true }, orderBy: { createdAt: "asc" } },
        },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      },
      resolutionSubmissions: {
        where: admin ? {} : { reviewStatus: "APPROVED" },
        select: { id: true, remarks: true, reviewStatus: true, reviewNote: true, createdAt: true, reviewedAt: true,
          submittedBy: { select: { name: true } }, reviewedBy: { select: { name: true } },
          photos: { select: { id: true }, orderBy: { createdAt: "asc" } },
        },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      },
      updates: {
        where: admin ? {} : { visibility: "PUBLIC" },
        select: { id: true, status: true, note: true, assignedOffice: true, visibility: true, action: true, createdAt: true, actorId: true, actor: { select: { name: true } } },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      },
      ...(admin ? { reporter: { select: { name: true, email: true } } } : {}),
    },
  });
  if (!row) return null;
  return {
    ...serializeSummary(row, admin), description: row.description, address: row.address,
    latitude: row.latitude, longitude: row.longitude, locationSource: row.locationSource,
    gpsAccuracy: row.gpsAccuracy, version: row.version, photos: row.photos,
    // Approved evidence remains available to the report owner even after a dispute.
    resolutionSubmissions: row.resolutionSubmissions.map(item => ({
      id: item.id, reviewStatus: item.reviewStatus, remarks: item.remarks,
      createdAt: item.createdAt.toISOString(), reviewedAt: item.reviewedAt?.toISOString() ?? null,
      submittedByName: item.submittedBy.name, reviewerName: item.reviewedBy?.name ?? null,
      reviewNote: admin ? item.reviewNote : null, photos: item.photos,
    })),
    citizenFeedbacks: row.citizenFeedbacks.map(item => ({
      id: item.id, resolutionSubmissionId: item.resolutionSubmissionId,
      decision: item.decision, reason: item.reason,
      createdAt: item.createdAt.toISOString(), photos: item.photos,
    })),
    updates: row.updates.map(({ actorId, actor, createdAt, ...event }) => ({
      ...event, createdAt: createdAt.toISOString(),
      author: actorId === row.reporterId ? "Citizen" : admin ? actor?.name || "Former LGU staff" : "LGU action desk",
    })),
    ...(admin && "reporter" in row ? { reporter: viewer.role === "ADMIN" || row.assignedStaffId === viewer.id ? row.reporter : { name: "Citizen", email: "" } } : {}),
  };
}

export async function getPublicTracking(trackingId: string): Promise<PublicTracking | null> {
  const row = await prisma.civicReport.findUnique({
    where: { trackingId },
    select: {
      trackingId: true, status: true, assignedOffice: true, createdAt: true, updatedAt: true,
      citizenFeedbacks: {
        select: { id: true, resolutionSubmissionId: true, decision: true, reason: true, createdAt: true,
          photos: { select: { id: true }, orderBy: { createdAt: "asc" } },
        },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      },
      resolutionSubmissions: { where: { reviewStatus: "APPROVED" }, select: { id: true }, take: 1 },
      updates: { where: { visibility: "PUBLIC" }, select: { id: true, status: true, createdAt: true }, orderBy: [{ createdAt: "desc" }, { id: "desc" }] },
    },
  });
  if (!row) return null;
  const { resolutionSubmissions, ...publicRow } = row;
  return {
    ...publicRow,
    verifiedEvidenceAvailable: row.status === "RESOLVED" && resolutionSubmissions.length > 0,
    createdAt: row.createdAt.toISOString(), updatedAt: (row.updates[0]?.createdAt ?? row.createdAt).toISOString(),
    updates: row.updates.map(event => ({ ...event, createdAt: event.createdAt.toISOString() })),
  };
}
