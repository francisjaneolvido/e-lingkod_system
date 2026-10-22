import type { Metadata } from "next";
import { requireModulePage } from "@/lib/access";
import { hasModuleAccess } from "@/lib/staff-access";
import { adminEmploymentInsights, type EmploymentInsightFilters } from "@/features/community/server/data";
import { CommunityAdminDashboard } from "@/features/community/components/community-admin-dashboard";
export const instant=false;
export const metadata:Metadata={title:"Job Matching Insights | eLingkod Bayan"};
export default async function CommunityInsightsAdminPage({searchParams}:{searchParams:Promise<Record<string,string|string[]|undefined>>}){
 const viewer=await requireModulePage("/admin/jobs/insights","JOBS");
 const raw=await searchParams;
 const one=(v:string|string[]|undefined)=>Array.isArray(v)?v[0]:v;
 const yearRaw=one(raw.year);
 const filters:EmploymentInsightFilters={
  barangay:one(raw.barangay)||undefined,
  employmentStatus:one(raw.employmentStatus)||undefined,
  educationLevel:one(raw.educationLevel)||undefined,
  ageGroup:one(raw.ageGroup)||undefined,
  source:one(raw.source)||undefined,
  year:yearRaw&&/^\d{4}$/.test(yearRaw)?Number(yearRaw):undefined,
 };
 const [data,canManageData]=await Promise.all([adminEmploymentInsights(filters),hasModuleAccess(viewer,"COMMUNITY_DATA")]);
 return <CommunityAdminDashboard data={data} filters={{barangay:filters.barangay||"",employmentStatus:filters.employmentStatus||"",educationLevel:filters.educationLevel||"",ageGroup:filters.ageGroup||"",source:filters.source||"ALL",year:filters.year?String(filters.year):""}} canManageData={canManageData}/>;
}
