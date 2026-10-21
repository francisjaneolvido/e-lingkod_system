import "server-only";
import { cache } from "react";
import { headers } from "next/headers";
import { redirect, notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { CivicViewer } from "@/features/civic/types";
import { CivicError } from "@/features/civic/validation";
import { hasModuleAccess, type StaffModule } from "@/lib/staff-access";

export async function viewerFromHeaders(requestHeaders: Headers): Promise<CivicViewer | null> {
  const session = await auth.api.getSession({ headers: requestHeaders });
  if (!session) return null;
  // Always read the current role from MySQL, including after a role is revoked.
  return prisma.user.findUnique({ where: { id: session.user.id }, select: { id: true, name: true, email: true, role: true, department: true, designation: true } });
}

export const currentViewer = cache(async () => viewerFromHeaders(await headers()));

export async function requirePageViewer(destination: string) {
  const viewer = await currentViewer();
  if (!viewer) redirect(`/login?next=${encodeURIComponent(destination)}`);
  return viewer;
}

// Citizen-only actions must be checked at the API boundary, not just hidden in the UI.
export async function requireCitizenApiViewer(request: Request) {
  const viewer = await requireApiViewer(request);
  if (viewer.role !== "CITIZEN") throw new CivicError("Only a Citizen account can submit or manage personal civic reports. Use your LGU workspace for staff actions.", 403);
  return viewer;
}

// Authenticated LGU personnel may browse the public website, but not its citizen-only workspace.
export async function requireCitizenPageViewer(destination: string) {
  const viewer = await requirePageViewer(destination);
  if (viewer.role !== "CITIZEN") redirect("/admin");
  return viewer;
}

export async function requireApiViewer(request: Request, access: boolean | StaffModule = false) {
  const viewer = await viewerFromHeaders(request.headers);
  if (!viewer) throw new CivicError("Please sign in to continue.", 401);
  if (access === true && viewer.role !== "ADMIN") throw new CivicError("Super Admin access is required.", 403);
  if (typeof access === "string" && !(await hasModuleAccess(viewer, access))) throw new CivicError("You are not assigned to this LGU module.", 403);
  return viewer;
}

export async function requireModulePage(destination: string, module: StaffModule) {
  const viewer = await requirePageViewer(destination);
  if (!(await hasModuleAccess(viewer, module))) notFound();
  return viewer;
}
export async function requireSuperAdminPage(destination: string) {
  const viewer = await requirePageViewer(destination);
  if (viewer.role !== "ADMIN") notFound();
  return viewer;
}
