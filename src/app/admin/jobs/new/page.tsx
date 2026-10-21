import type {Metadata} from "next";
import {requireModulePage} from "@/lib/access";
import {OpportunityEditor} from "@/features/jobs/components/opportunity-editor";
export const instant=false;
export const metadata:Metadata={title:"Create opportunity | eLingkod Bayan"};
export default async function NewOpportunityPage(){
 await requireModulePage("/admin/jobs/new","JOBS");
 return <OpportunityEditor/>;
}
