import { requireApiViewer } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { CivicError } from "@/features/civic/validation";
import { parseJob } from "@/features/jobs/domain";
import { assertSameOrigin, readJson, json, apiFailure } from "@/features/civic/server/http";

export async function PATCH(request:Request,{params}:{params:Promise<{id:string}>}){
  try{
    assertSameOrigin(request);
    const viewer=await requireApiViewer(request,"JOBS");
    const {id}=await params;
    if(!id || id.length>191)throw new CivicError("Invalid opportunity.",400);
    const input=await readJson(request);
    if(!input || typeof input!=="object" || Array.isArray(input))throw new CivicError("Invalid update.",400);
    const data=input as Record<string,unknown>;
    const action=data.action;
    if(!["EDIT","PUBLISH","ARCHIVE"].includes(String(action)))throw new CivicError("Invalid opportunity action.",400);
    await prisma.$transaction(async tx=>{
      const job=await tx.jobOpportunity.findUnique({where:{id},select:{id:true,status:true,expiresAt:true}});
      if(!job)throw new CivicError("Opportunity not found.",404);
      if(action==="PUBLISH"&&job.expiresAt&&job.expiresAt<new Date())throw new CivicError("Change the expired posting date before publishing.",400);
      if(action==="PUBLISH" && job.status==="PUBLISHED")throw new CivicError("Already published.",409);
      if(action==="ARCHIVE"&&job.status==="ARCHIVED")throw new CivicError("Already archived.",409);
      if(action==="EDIT"){
        const value=parseJob(data.job);
        await tx.jobOpportunity.update({where:{id},data:{...{
          title:value.title,employer:value.employer,sector:value.sector,workType:value.workType,
          barangay:value.barangay,location:value.location,description:value.description,
          skillsJson:JSON.stringify(value.skills),interestsJson:JSON.stringify(value.interests),
          education:value.education,contactInfo:value.contactInfo,externalUrl:value.externalUrl,expiresAt:value.expiresAt,
        },status:job.status==="PUBLISHED"?"DRAFT":job.status,publishedAt:job.status==="PUBLISHED"?null:undefined}});
      }else{
        await tx.jobOpportunity.update({where:{id},data:action==="PUBLISH"?{status:"PUBLISHED",publishedAt:new Date()}:{status:"ARCHIVED"}});
      }
      await tx.jobActivity.create({data:{jobId:id,actorId:viewer.id,action:String(action)}});
    });
    return json({success:true});
  }catch(error){return apiFailure(error);}
}
