import "server-only";
import { prisma } from "@/lib/prisma";
import type { CivicViewer } from "@/features/civic/types";

import { STAFF_MODULES, isStaffModule, type StaffModule } from "@/lib/staff-modules";
export { STAFF_MODULES, STAFF_MODULE_LABELS, isStaffModule } from "@/lib/staff-modules";
export type { StaffModule } from "@/lib/staff-modules";

export function isLGUAccount(viewer: CivicViewer) {
  return viewer.role === "ADMIN" || viewer.role === "STAFF";
}
export async function grantedModules(viewer: CivicViewer): Promise<StaffModule[]> {
  if (viewer.role === "ADMIN") return [...STAFF_MODULES];
  if (viewer.role !== "STAFF") return [];
  const rows = await prisma.staffPermission.findMany({ where: { userId: viewer.id }, select: { module: true } });
  return rows.flatMap(({ module }) => isStaffModule(module) ? [module] : []);
}
export async function hasModuleAccess(viewer: CivicViewer, module: StaffModule): Promise<boolean> {
  if (viewer.role === "ADMIN") return true;
  if (viewer.role !== "STAFF") return false;
  return Boolean(await prisma.staffPermission.findUnique({
    where: { userId_module: { userId: viewer.id, module } }, select: { id: true },
  }));
}
