import type { Metadata } from "next";
import { requirePageViewer } from "@/lib/access";
import { CivicShell } from "@/features/civic/components/civic-shell";
import { ReportsWorkspace } from "@/features/civic/components/reports-workspace";
import { listReports } from "@/features/civic/server/repository";
export const metadata: Metadata = { title: "My Reports | E-Lingkod Bayan" };
export default async function MyReportsPage() {
  const viewer = await requirePageViewer("/reports");
  return <CivicShell viewer={viewer} active="reports"><ReportsWorkspace reports={await listReports(viewer)} /></CivicShell>;
}
