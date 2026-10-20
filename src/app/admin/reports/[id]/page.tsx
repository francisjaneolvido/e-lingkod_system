import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireModulePage } from "@/lib/access";
import { ReportDetailView } from "@/features/civic/components/report-detail";
import { getReport } from "@/features/civic/server/repository";
import { prisma } from "@/lib/prisma";
// Authenticated LGU pages read per-request session and database data.
export const instant = false;

export const metadata: Metadata = { title: "Review Citizen Report | LGU Admin" };
export default async function AdminReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const viewer = await requireModulePage(`/admin/reports/${id}`, "REPORTS");
  const report = await getReport(id, viewer, true);
  if (!report) notFound();
  const officers = viewer.role === "ADMIN" ? await prisma.user.findMany({
    where: { role: "STAFF", department: { not: null }, staffPermissions: { some: { module: "REPORTS" } } },
    select: { id: true, name: true, department: true, designation: true },
    orderBy: [{ department: "asc" }, { name: "asc" }], take: 500,
  }) : [];
  return <ReportDetailView report={report} admin role={viewer.role} viewerId={viewer.id} officers={officers.map(o => ({ id: o.id, name: o.name, department: o.department || "", designation: o.designation || "LGU staff" }))} />;
}
