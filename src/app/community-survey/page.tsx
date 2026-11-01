import type { Metadata } from "next";
import { connection } from "next/server";
import { notFound } from "next/navigation";
import { requirePageViewer } from "@/lib/access";
import { surveyForCitizen } from "@/features/community/server/data";
import { CommunitySurveyForm } from "@/features/community/components/community-survey-form";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
export const instant=false;
export const metadata:Metadata={title:"Personal Employment and Livelihood Survey | eLingkod Bayan"};
export default async function CommunitySurveyPage({searchParams}:{searchParams:Promise<{year?:string}>}){
 await connection();const viewer=await requirePageViewer("/community-survey");if(viewer.role!=="CITIZEN")notFound();const params=await searchParams;const year=params.year===undefined?new Date().getFullYear():Number(params.year);if(!Number.isInteger(year)||year<2020||year>new Date().getFullYear()+1)notFound();const survey=await surveyForCitizen(viewer.id,year);
 return <><SiteHeader viewer={{name:viewer.name,email:viewer.email,role:viewer.role}}/><main className="min-h-screen bg-card px-5 py-8 sm:px-8"><div className="mx-auto max-w-[1100px]"><CommunitySurveyForm key={year} initial={survey}/></div></main><SiteFooter/></>;
}
