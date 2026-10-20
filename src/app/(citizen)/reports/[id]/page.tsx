import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requirePageViewer } from "@/lib/access";
import { CivicShell } from "@/features/civic/components/civic-shell";
import { ReportDetailView } from "@/features/civic/components/report-detail";
import { getReport } from "@/features/civic/server/repository";
export const metadata: Metadata = { title: "Report details | E-Lingkod Bayan" };
export default async function ReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const viewer = await requirePageViewer(`/reports/${id}`);
  const report = await getReport(id, viewer);
  if (!report) notFound();
  return <CivicShell viewer={viewer} active="reports"><ReportDetailView report={report} /></CivicShell>;
}
