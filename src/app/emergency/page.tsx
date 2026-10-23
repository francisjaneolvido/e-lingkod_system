import type { Metadata } from "next";
import { connection } from "next/server";
import { prisma } from "@/lib/prisma";
import { OFFICIAL_NUMBERS, normalizedPhone } from "@/features/emergency/domain";
import { PublicEmergency, type PublicHotline, type PublicAlert } from "@/features/emergency/components/public-emergency";

export const metadata: Metadata = { title: "Emergency Hotlines & Alerts | Los Baños | eLingkod Bayan", description: "Emergency numbers and approved local advisories for Los Baños, Laguna." };

export default async function EmergencyPage() {
  // This public alert feed must be evaluated per request with cacheComponents enabled.
  await connection();
  const now = new Date();
  // National hotlines remain visible if the database is down or migration is pending.
  // Never describe an unavailable advisory feed as proof that no warnings exist.
  let dataAvailable = true;
  let numbers: Awaited<ReturnType<typeof prisma.emergencyHotline.findMany>> = [];
  let entries: Awaited<ReturnType<typeof prisma.emergencyAlert.findMany>> = [];
  try {
    [numbers, entries] = await Promise.all([
      prisma.emergencyHotline.findMany({ where: { isActive: true }, orderBy: [{ category: "asc" }, { title: "asc" }], take: 100 }),
      prisma.emergencyAlert.findMany({ where: { status: "PUBLISHED", startsAt: { lte: now }, expiresAt: { gt: now } }, orderBy: { publishedAt: "desc" }, take: 100 }),
    ]);
  } catch (error) {
    dataAvailable = false;
    console.error("[emergency] Live local contacts/advisories unavailable", error instanceof Error ? error.name : "UnknownError");
  }
  const hotlines: PublicHotline[] = [
    ...OFFICIAL_NUMBERS.map(row => ({ ...row })),
    ...numbers.map(row => ({ id: row.id, title: row.title, category: row.category, office: row.office,
      phone: normalizedPhone(row.phone), extension: row.extension, note: row.note,
      sourceUrl: row.sourceUrl, verifiedAt: row.verifiedAt.toISOString() })),
  ];
  const alerts: PublicAlert[] = entries.map(row => ({ id: row.id, title: row.title, details: row.details,
    safetyInstructions: row.safetyInstructions, sourceUrl: row.sourceUrl, issuingOffice: row.issuingOffice,
    severity: row.severity, barangays: JSON.parse(row.barangaysJson) as string[],
    publishedAt: row.publishedAt?.toISOString() ?? null,
    startsAt: row.startsAt.toISOString(), expiresAt: row.expiresAt.toISOString() }));
  return <PublicEmergency hotlines={hotlines} alerts={alerts} dataAvailable={dataAvailable}/>;
}
