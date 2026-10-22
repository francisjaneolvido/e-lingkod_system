import type { Metadata } from "next";
import { connection } from "next/server";
import { currentViewer } from "@/lib/access";
import { publicEmploymentInsights } from "@/features/community/server/data";
import { EmploymentInsightsView } from "@/features/community/components/employment-insights-view";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
export const instant=false;
export const metadata:Metadata={title:"Employment & Skills Insights | eLingkod Bayan"};
export default async function EmploymentInsightsPage({searchParams}:{searchParams:Promise<Record<string,string|string[]|undefined>>}){
 await connection();const [viewer,params]=await Promise.all([currentViewer(),searchParams]);
 const one=(v:string|string[]|undefined)=>typeof v==="string"?v:"";
 const yearText=one(params.year);const filters={barangay:one(params.barangay),employmentStatus:one(params.employmentStatus),educationLevel:one(params.educationLevel),ageGroup:one(params.ageGroup),source:one(params.source)||"ALL",...(yearText?{year:Number(yearText)}:{})};
 const data=await publicEmploymentInsights(filters);
 return <><SiteHeader viewer={viewer?{name:viewer.name,email:viewer.email,role:viewer.role}:null}/><main className="min-h-screen bg-[#f6f9fb] px-5 py-8 sm:px-8"><div className="mx-auto max-w-[1240px]"><EmploymentInsightsView data={data} filters={{...filters,year:yearText}} signedInCitizen={viewer?.role==="CITIZEN"}/></div></main><SiteFooter/></>;
}
