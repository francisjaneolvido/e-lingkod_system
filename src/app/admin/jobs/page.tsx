import type {Metadata} from "next";
import {requireModulePage} from "@/lib/access";
import {adminJobData} from "@/features/jobs/server/data";
import {JobConsole} from "@/features/jobs/components/job-console";
export const instant=false;
export const metadata:Metadata={title:"PESO Job Matching | eLingkod Bayan"};
export default async function JobsAdminPage(){
  const viewer=await requireModulePage("/admin/jobs","JOBS");
  return <JobConsole viewerName={viewer.name} data={await adminJobData()}/>;
}
