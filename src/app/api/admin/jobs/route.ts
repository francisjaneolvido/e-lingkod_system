import { requireApiViewer } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { parseJob } from "@/features/jobs/domain";
import { assertSameOrigin, readJson, json, apiFailure } from "@/features/civic/server/http";

export async function POST(request:Request) {
  try {
    assertSameOrigin(request);
    const viewer=await requireApiViewer(request,"JOBS");
    const value=parseJob(await readJson(request));
    const job=await prisma.$transaction(async tx=>{
      const created=await tx.jobOpportunity.create({data:{
        title:value.title,employer:value.employer,sector:value.sector,workType:value.workType,
        barangay:value.barangay,location:value.location,description:value.description,
        skillsJson:JSON.stringify(value.skills),interestsJson:JSON.stringify(value.interests),
        education:value.education,contactInfo:value.contactInfo,externalUrl:value.externalUrl,
        expiresAt:value.expiresAt,createdById:viewer.id,
      },select:{id:true}});
      await tx.jobActivity.create({data:{jobId:created.id,actorId:viewer.id,action:"CREATE"}});
      return created;
    });
    return json({success:true,id:job.id},201);
  }catch(error){return apiFailure(error);}
}
