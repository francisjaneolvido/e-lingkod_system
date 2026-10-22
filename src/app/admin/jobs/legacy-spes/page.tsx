import type {Metadata} from "next";
import Link from "next/link";
import {ArrowLeft, Info} from "lucide-react";
import {requireModulePage} from "@/lib/access";
import {adminJobData} from "@/features/jobs/server/data";
import {SpesImportWorkspace} from "@/features/jobs/components/spes-import-workspace";
import {SpesInsights} from "@/features/jobs/components/spes-insights";
export const instant=false;
export const metadata:Metadata={title:"Legacy SPES Data | eLingkod Bayan"};
export default async function LegacySpesPage(){
 const viewer=await requireModulePage("/admin/jobs/legacy-spes","JOBS");const data=await adminJobData();
 return <div className="space-y-6"><div className="flex flex-wrap items-center justify-between gap-3"><Link href="/admin/jobs" className="inline-flex items-center gap-2 text-sm font-bold text-[#2b7697]"><ArrowLeft size={16}/> Opportunity management</Link><Link href="/admin/jobs/data" className="text-sm font-bold text-[#2b7697]">Employment data management</Link></div><section className="rounded-[20px] border border-[#dce7ed] bg-[#f8fbfc] p-5"><p className="flex items-start gap-2 text-sm leading-6 text-[#5e7d8f]"><Info size={18} className="mt-0.5 shrink-0"/><span><strong className="text-[#24566f]">Legacy SPES workspace.</strong> This page is retained so older SPES batches are not lost. New government activity datasets should use Job Matching Data Management so source metadata, privacy use and quality checks are standardized.</span></p></section><SpesImportWorkspace batches={data.batches} batchCount={data.batchCount} isSuperAdmin={viewer.role==="ADMIN"}/><SpesInsights insights={data.insights}/></div>;
}
