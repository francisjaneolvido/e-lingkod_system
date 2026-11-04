import type { Metadata } from "next";
import { ClipboardList } from "lucide-react";
import { requireModulePage } from "@/lib/access";
import { listReports } from "@/features/civic/server/repository";
import { AdminReportsTable } from "@/components/admin/admin-reports-table";

// Authenticated LGU pages read per-request session and database data.
export const instant = false;

export const metadata: Metadata = { title: "Civic Reports | LGU Admin" };
export default async function AdminReportsPage() {
  const viewer = await requireModulePage("/admin/reports", "REPORTS");
  const reports = await listReports(viewer, true);
  return <div className="space-y-6"><div className="flex items-center gap-3"><div className="rounded-xl bg-muted p-3 text-foreground"><ClipboardList size={24}/></div><div><h1 className="text-2xl font-extrabold tracking-tight">Civic Reporting Management</h1><p className="mt-1 text-[12px] text-muted-foreground">Triage incoming concerns, set priority, route to a department, and assign accountable LGU personnel.</p></div></div><AdminReportsTable initialReports={reports} viewerRole={viewer.role} viewerId={viewer.id} department={viewer.department || ""}/></div>;
}
