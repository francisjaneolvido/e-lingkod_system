import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import type { CivicViewer } from "@/features/civic/types";

export function sameOffice(a: string | null | undefined, b: string | null | undefined) {
  return Boolean(a?.trim() && b?.trim() && a.trim().replace(/\s+/g, " ").toLocaleLowerCase("en") === b.trim().replace(/\s+/g, " ").toLocaleLowerCase("en"));
}

// Staff can see only their own assignments and unclaimed cases routed to their office.
// The Super Admin can see the full municipal queue.
export function reportAdminScope(viewer: CivicViewer): Prisma.CivicReportWhereInput {
  if (viewer.role === "ADMIN") return {};
  if (viewer.role !== "STAFF" || !viewer.department?.trim()) return { id: "__unavailable__" };
  return { assignedOffice: viewer.department.trim(), OR: [
    { assignedStaffId: viewer.id },
    { assignedStaffId: null },
  ] };
}
