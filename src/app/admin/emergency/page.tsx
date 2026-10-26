import type { Metadata } from "next";
import { requireModulePage } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { belongsToEmergencyOffice } from "@/features/emergency/domain";
import { EmergencyConsole } from "@/features/emergency/components/emergency-console";

export const instant = false;
export const metadata: Metadata = { title: "Emergency & Alerts Desk | eLingkod Bayan" };
export default async function EmergencyAdminPage() {
  const viewer = await requireModulePage("/admin/emergency", "EMERGENCY");
  if (viewer.role === "STAFF" && !belongsToEmergencyOffice(viewer.department)) {
    return <div className="rounded-2xl border border-amber-200 bg-amber-50 p-8"><h1 className="text-xl font-extrabold">Emergency desk office restriction</h1><p className="mt-3 text-sm leading-7">Your account has the Emergency module permission but your assigned office is <strong>{viewer.department || "not specified"}</strong>. Ask your Super Admin to assign an appropriate MDRRMO, PIO, Operations Center, MHO or MSWDO office to use this desk.</p></div>;
  }
  const [hotlines, proposals, alerts] = await Promise.all([
    prisma.emergencyHotline.findMany({ orderBy: { updatedAt: "desc" }, take: 150 }),
    prisma.emergencyHotlineProposal.findMany({ where: viewer.role === "ADMIN" ? {} : { submittedById: viewer.id }, orderBy: { createdAt: "desc" }, take: 150 }),
    prisma.emergencyAlert.findMany({ where: viewer.role === "ADMIN" ? {} : { createdById: viewer.id }, orderBy: { updatedAt: "desc" }, take: 150 }),
  ]);
  return <EmergencyConsole viewerId={viewer.id} admin={viewer.role === "ADMIN"} department={viewer.department ?? ""}
    hotlines={hotlines.map(row=>({id:row.id,title:row.title,category:row.category,office:row.office,phone:row.phone,extension:row.extension,note:row.note,sourceUrl:row.sourceUrl,isActive:row.isActive,verifiedAt:row.verifiedAt.toISOString()}))}
    proposals={proposals.map(row=>({id:row.id,targetId:row.targetId,operation:row.operation,title:row.title,category:row.category,office:row.office,phone:row.phone,extension:row.extension,note:row.note,sourceUrl:row.sourceUrl,status:row.status,submittedById:row.submittedById,reviewedById:row.reviewedById,reviewNote:row.reviewNote,createdAt:row.createdAt.toISOString()}))}
    alerts={alerts.map(row=>({id:row.id,title:row.title,details:row.details,safetyInstructions:row.safetyInstructions,sourceUrl:row.sourceUrl,issuingOffice:row.issuingOffice,severity:row.severity,barangays:JSON.parse(row.barangaysJson) as string[],status:row.status,createdById:row.createdById,reviewNote:row.reviewNote,startsAt:row.startsAt.toISOString(),expiresAt:row.expiresAt.toISOString(),publishedAt:row.publishedAt?.toISOString()??null,createdAt:row.createdAt.toISOString()}))}/>;
}
