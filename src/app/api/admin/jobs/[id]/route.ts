import { requireApiViewer } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";
import { CivicError } from "@/features/civic/validation";
import { parseJob } from "@/features/jobs/domain";
import { parseReviewDetails, validateJobTransition, type JobAction, type JobStatus } from "@/features/jobs/review-workflow";
import { assertSameOrigin, readJson, json, apiFailure } from "@/features/civic/server/http";

// All mutations go through this role-gated and version-checked API.
// Staff may submit; only the Super Admin can approve or return a vacancy.
export async function PATCH(request:Request,{params}:{params:Promise<{id:string}>}){
  try {
    assertSameOrigin(request);
    const viewer=await requireApiViewer(request,"JOBS");
    const {id}=await params;
    if(!id||id.length>191)throw new CivicError("Invalid opportunity.",400);
    const input=await readJson(request);
    if(!input||typeof input!=="object"||Array.isArray(input))throw new CivicError("Invalid update.",400);
    const data=input as Record<string,unknown>;
    const action=data.action;
    const actions=["EDIT","SUBMIT_REVIEW","APPROVE","RETURN","CLOSE","FILL","ARCHIVE"];
    if(typeof action!=="string"||!actions.includes(action))throw new CivicError("Invalid opportunity action.",400);
    const jobAction=action as JobAction;
    const result=await prisma.$transaction(async tx=>{
      const job=await tx.jobOpportunity.findUnique({where:{id},select:{id:true,status:true,version:true,reviewSource:true,expiresAt:true}});
      if(!job)throw new CivicError("Opportunity not found.",404);
      validateJobTransition(jobAction,job.status as JobStatus,viewer.role==="ADMIN");
      let update:Prisma.JobOpportunityUncheckedUpdateManyInput={};let note:string|null=null;
      let nextStatus:JobStatus=job.status as JobStatus;
      if(jobAction==="EDIT"){
        const value=parseJob(data.job);
        nextStatus="DRAFT";
        update={title:value.title,employer:value.employer,sector:value.sector,workType:value.workType,
          barangay:value.barangay,location:value.location,description:value.description,
          skillsJson:JSON.stringify(value.skills),interestsJson:JSON.stringify(value.interests),education:value.education,
          contactInfo:value.contactInfo,externalUrl:value.externalUrl,expiresAt:value.expiresAt,
          reviewSource:value.reviewSource,status:"DRAFT",reviewedAt:null,reviewedById:null,
          reviewNote:null,reviewRequestedAt:null,employerVerified:false,vacancyVerified:false,publishedAt:null};
      }else if(jobAction==="SUBMIT_REVIEW"){
        if(!job.reviewSource||job.reviewSource.trim().length<12)
          throw new CivicError("Edit this draft and add the employer/vacancy information source before submitting for review.",400);
        if(job.expiresAt&&job.expiresAt<new Date())throw new CivicError("Update the expired vacancy date before requesting review.",400);
        nextStatus="PENDING_REVIEW";
        update={status:"PENDING_REVIEW",reviewRequestedAt:new Date(),reviewNote:null};
        note="Submitted employer and vacancy details for Super Admin verification.";
      }else if(jobAction==="APPROVE"||jobAction==="RETURN"){
        const decision=parseReviewDetails(data,jobAction);
        if(jobAction==="APPROVE"&&job.expiresAt&&job.expiresAt<new Date())
          throw new CivicError("This vacancy has expired. Return it for correction before publishing.",409);
        nextStatus=jobAction==="APPROVE"?"PUBLISHED":"RETURNED";
        update={status:nextStatus,reviewedById:viewer.id,
          reviewedAt:new Date(),reviewNote:decision.note||null,
          employerVerified:decision.employerVerified,vacancyVerified:decision.vacancyVerified,
          publishedAt:jobAction==="APPROVE"?new Date():null};
        note=decision.note||"Employer identity and vacancy availability checked by the reviewer.";
      }else if(jobAction==="CLOSE"||jobAction==="FILL"){
        nextStatus=jobAction==="FILL"?"FILLED":"CLOSED";
        update={status:nextStatus};
        note=jobAction==="FILL"?"Employer confirmed the position has been filled.":"Vacancy is no longer available.";
      }else if(jobAction==="ARCHIVE"){
        nextStatus="ARCHIVED";
        update={status:"ARCHIVED"};note="Listing archived from the PESO management workspace.";
      }
      // Optimistic concurrency avoids silently overwriting another review/action.
      const changed=await tx.jobOpportunity.updateMany({where:{id,version:job.version,status:job.status},data:{...update,version:{increment:1}}});
      if(changed.count!==1)throw new CivicError("This opportunity changed. Refresh and try again.",409);
      await tx.jobActivity.create({data:{jobId:id,actorId:viewer.id,action:jobAction,note,
        previousStatus:job.status,nextStatus}});
      return {status:nextStatus};
    });
    return json({success:true,...result});
  }catch(error){return apiFailure(error);}
}
