import type {Metadata} from "next";
import {requireModulePage} from "@/lib/access";
import {hasModuleAccess} from "@/lib/staff-access";
import {adminJobData} from "@/features/jobs/server/data";
import {JobConsole} from "@/features/jobs/components/job-console";
export const instant=false;
export const metadata:Metadata={title:"PESO Opportunity Management | eLingkod Bayan"};
export default async function JobsAdminPage({searchParams}:{searchParams:Promise<{updated?:string;view?:string}>}){
  const viewer=await requireModulePage("/admin/jobs","JOBS");
  const [data,params,canViewInsights]=await Promise.all([adminJobData(viewer),searchParams,hasModuleAccess(viewer,"CENSUS")]);
  return <JobConsole viewerId={viewer.id} viewerName={viewer.name} data={data} isSuperAdmin={viewer.role==="ADMIN"} canViewInsights={canViewInsights} initialView={params.view||""} saved={params.updated==="1"} asOf={new Date().toISOString()}/>;
}
