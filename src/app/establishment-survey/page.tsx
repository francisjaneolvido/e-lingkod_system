import type { Metadata } from "next";
import { connection } from "next/server";
import { notFound } from "next/navigation";
import { requirePageViewer } from "@/lib/access";
import { listOwnedEstablishments } from "@/features/establishments/server/data";
import { EstablishmentSurveyForm } from "@/features/establishments/components/establishment-survey-form";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";

export const instant = false;
export const metadata: Metadata = { title: "Establishment Profiling | eLingkod Bayan" };
export default async function EstablishmentSurveyPage() {
  await connection();
  const viewer=await requirePageViewer("/establishment-survey");
  if(viewer.role!=="CITIZEN")notFound();
  const records=await listOwnedEstablishments(viewer);
  return <><SiteHeader viewer={{name:viewer.name,email:viewer.email,role:viewer.role}}/><main className="min-h-screen bg-[#F8FBFE] px-5 py-8 sm:px-8"><div className="mx-auto max-w-[1344px]"><EstablishmentSurveyForm initialRecords={records} currentYear={new Date().getFullYear()}/></div></main><SiteFooter/></>;
}
