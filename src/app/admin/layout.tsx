import type { ReactNode } from "react";
import "@/components/admin/admin-ui.css";
import { connection } from "next/server";
import { requirePageViewer } from "@/lib/access";
import { AdminShell } from "@/components/admin/admin-shell";
import { StaffAccess } from "@/features/civic/components/staff-access";
import { grantedModules, isLGUAccount } from "@/lib/staff-access";

// The LGU workspace reads a Better Auth session and the current database role.
// Both are request-specific; do not try to prerender an authenticated layout.
export const instant = false;

export default async function AdminLayout({ children }: { children: ReactNode }) {
  await connection();
  const viewer = await requirePageViewer("/admin");
  if (!isLGUAccount(viewer)) {
    return <main className="mx-auto min-h-screen max-w-3xl p-8"><StaffAccess /></main>;
  }
  const modules = await grantedModules(viewer);
  return <AdminShell name={viewer.name} email={viewer.email} role={viewer.role} modules={modules} department={viewer.department ?? ""}>{children}</AdminShell>;
}
