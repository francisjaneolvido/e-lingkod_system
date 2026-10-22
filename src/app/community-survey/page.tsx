import type { Metadata } from "next";
import { connection } from "next/server";
import { notFound } from "next/navigation";
import { requirePageViewer } from "@/lib/access";
import { surveyForCitizen } from "@/features/community/server/data";
import { CommunitySurveyForm } from "@/features/community/components/community-survey-form";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
export const instant=false;
export const metadata:Metadata={title:"Community Employment & Livelihood Survey | eLingkod Bayan"};
export default async function CommunitySurveyPage(){
 await connection();const viewer=await requirePageViewer("/community-survey");if(viewer.role!=="CITIZEN")notFound();const survey=await surveyForCitizen(viewer.id);
 return <><SiteHeader viewer={{name:viewer.name,email:viewer.email,role:viewer.role}}/><main className="min-h-screen bg-[#f6f9fb] px-5 py-8 sm:px-8"><div className="mx-auto max-w-[1100px]"><CommunitySurveyForm initial={survey}/></div></main><SiteFooter/></>;
}
