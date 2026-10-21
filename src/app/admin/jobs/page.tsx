import type {Metadata} from "next";
import {requireModulePage} from "@/lib/access";
import {adminJobData} from "@/features/jobs/server/data";
import {JobConsole} from "@/features/jobs/components/job-console";
export const instant=false;
export const metadata:Metadata={title:"PESO Job Matching | eLingkod Bayan"};
export default async function JobsAdminPage({searchParams}:{searchParams:Promise<{updated?:string}>}){
  const viewer=await requireModulePage("/admin/jobs","JOBS");
  const [data,params]=await Promise.all([adminJobData(),searchParams]);
  return <JobConsole viewerName={viewer.name} data={data} isSuperAdmin={viewer.role==="ADMIN"} saved={params.updated==="1"} asOf={new Date().toISOString()}/>;
}
