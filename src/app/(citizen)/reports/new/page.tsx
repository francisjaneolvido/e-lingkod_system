export const instant = false;
import type { Metadata } from "next";
import { requireCitizenPageViewer } from "@/lib/access";
import { CivicShell } from "@/features/civic/components/civic-shell";
import { ReportForm } from "@/features/civic/components/report-form";
export const metadata: Metadata = { title: "Report a concern | E-Lingkod Bayan" };
export default async function NewReportPage() {
  const viewer = await requireCitizenPageViewer("/reports/new");
  return <CivicShell viewer={viewer} active="new"><ReportForm /></CivicShell>;
}
