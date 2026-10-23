import type { Metadata } from "next";
import Link from "next/link";
import { requireModulePage } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { OfficeDirectoryConsole } from "@/features/projects/components/office-directory-console";
import { ProjectConsole } from "@/features/projects/components/project-console";
export const metadata: Metadata = { title: "Municipal Projects Desk | E-Lingkod Bayan" };
export default async function MunicipalProjectsAdminPage() {
  const viewer = await requireModulePage("/admin/projects", "PROJECTS");
  // Do not crash the entire desk when one V2 directory model has not been generated yet.
  const results = await Promise.allSettled([
    Promise.resolve().then(() => prisma.municipalProject.findMany({ where: viewer.role === "ADMIN" || viewer.department === "Municipal Planning and Development Office (MPDO)" || viewer.department === "Public Information Office (PIO)" ? {} : {
      OR: [{ createdById: viewer.id }, { leadOffice: viewer.department || "" }],
    }, include: { updates: { orderBy: { createdAt: "desc" }, take: 30 } }, orderBy: { updatedAt: "desc" }, take: 120 })),
    Promise.resolve().then(() => prisma.municipalOfficeDirectoryProposal.findMany({ where: viewer.role === "ADMIN" ? {} : {submittedById: viewer.id}, orderBy: {submittedAt: "desc"}, take: 75 })),
    Promise.resolve().then(() => prisma.municipalOfficeDirectoryEntry.findMany({orderBy: {officeName: "asc"}})),
  ]);
  const failures: string[] = [];
  const names = ["Projects", "Office proposals", "Office directory"] as const;
  results.forEach((result, index) => {
    if (result.status === "rejected") { failures.push(names[index]); console.error(`[admin/projects] ${names[index]} unavailable`, result.reason); }
  });
  const rows = results[0].status === "fulfilled" ? results[0].value : [];
  const officeProposals = results[1].status === "fulfilled" ? results[1].value : [];
  const officeOverrides = results[2].status === "fulfilled" ? results[2].value : [];
  return <div className="space-y-3">{failures.length > 0 && <p role="alert" className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-xs text-amber-900">Could not load: {failures.join(", ")}. Run the pending Municipal Projects migrations and regenerate Prisma Client, then restart the dev server. See terminal logs for details.</p>}<div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#d9e7ef] bg-white p-3 sm:p-4"><div><p className="text-[10px] font-bold tracking-widest text-[#357b99]">MUNICIPAL PROJECTS</p><h1 className="mt-1 text-xl font-black text-[#214d6a]">Projects & publication desk</h1><p className="mt-1 text-xs text-[#708b9d]">Staff drafts → Admin publication → Verified public updates</p></div><Link href="/projects" className="rounded-xl border border-[#c8dce6] px-3 py-2 text-xs font-bold text-[#2e7492]">Open citizen directory ↗</Link></div>{results[1].status === "fulfilled" && results[2].status === "fulfilled" && <OfficeDirectoryConsole admin={viewer.role === "ADMIN"} department={viewer.department || ""} proposals={officeProposals} overrides={officeOverrides.map(o => ({...o, verifiedAt: o.verifiedAt.toISOString()}))}/>}{results[0].status === "fulfilled" && <ProjectConsole admin={viewer.role === "ADMIN"} department={viewer.department || ""} viewerId={viewer.id} allowDemo={process.env.PROJECTS_DEMO_MODE === "true" && process.env.NODE_ENV !== "production"} projects={rows.map(row => ({ ...row, createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString(), budgetPhp: row.budgetPhp?.toString() ?? null, targetCompletion: row.targetCompletion?.toISOString() ?? null, publishedAt: row.publishedAt?.toISOString() || null, updates: row.updates.map(upd => ({ ...upd, createdAt: upd.createdAt.toISOString(), reviewedAt: upd.reviewedAt?.toISOString() || null })) }))}/>}</div>;
}
