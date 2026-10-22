import { requireApiViewer } from "@/lib/access";
import { adminEmploymentInsights } from "@/features/community/server/data";
import { CivicError } from "@/features/civic/validation";

function cell(value:unknown){const text=String(value??"");return /[",\n]/.test(text)?`"${text.replaceAll('"','""')}"`:text;}
export async function GET(request:Request){
  try{
    await requireApiViewer(request,"JOBS");
    const data=await adminEmploymentInsights();
    const rows:string[][]=[["category","item","count","data_scope"]];
    const add=(category:string,items:Array<{label:string;count:number}>)=>items.forEach(item=>rows.push([category,item.label,String(item.count),"combined analytical records"]));
    add("employment_status",data.summary.employment.map(x=>({label:x.label,count:x.count})));
    add("skills",data.summary.skills);add("training_programs",data.summary.trainingPrograms);add("training_barriers",data.summary.trainingBarriers);add("employment_barriers",data.summary.employmentBarriers);add("business_sectors",data.summary.businessSectors);add("barangays",data.summary.barangays);add("priority_programs",data.summary.priorityPrograms);add("public_service_barriers",data.summary.publicServiceBarriers);
    rows.push(["metadata","citizen_survey_records",String(data.summary.sourceCounts.citizen),"source count"],["metadata","historical_records",String(data.summary.sourceCounts.historical),"source count"],["metadata","average_service_accessibility",String(data.summary.averageServiceSatisfaction??""),"optional survey responses / 5"]);
    const csv=rows.map(row=>row.map(cell).join(",")).join("\r\n");
    return new Response(csv,{status:200,headers:{"Content-Type":"text/csv; charset=utf-8","Content-Disposition":`attachment; filename="job-matching-insights-${new Date().toISOString().slice(0,10)}.csv"`,"Cache-Control":"private, no-store","X-Content-Type-Options":"nosniff"}});
  }catch(error){if(error instanceof CivicError)return Response.json({error:error.message},{status:error.status});console.error("[job-matching-insights-export] failed",error instanceof Error?error.name:"UnknownError");return Response.json({error:"Unable to export job matching insights."},{status:503});}
}
