import { requireApiViewer } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { CivicError } from "@/features/civic/validation";
import { parseProfile } from "@/features/jobs/domain";
import { assertSameOrigin, readJson, json, apiFailure } from "@/features/civic/server/http";

export async function PUT(request:Request){
  try{
    assertSameOrigin(request);
    const viewer=await requireApiViewer(request);
    if(viewer.role!=="CITIZEN")throw new CivicError("Only citizen accounts can create personal job profiles.",403);
    const value=parseProfile(await readJson(request));
    await prisma.jobseekerProfile.upsert({where:{userId:viewer.id},create:{userId:viewer.id,skillsJson:JSON.stringify(value.skills),interestsJson:JSON.stringify(value.interests),education:value.education,preferredArea:value.preferredArea,availability:value.availability},update:{skillsJson:JSON.stringify(value.skills),interestsJson:JSON.stringify(value.interests),education:value.education,preferredArea:value.preferredArea,availability:value.availability}});
    return json({success:true});
  }catch(error){return apiFailure(error);}
}
export async function DELETE(request:Request){
  try{
    assertSameOrigin(request);
    const viewer=await requireApiViewer(request);
    if(viewer.role!=="CITIZEN")throw new CivicError("Only citizen accounts can delete their own job profiles.",403);
    await prisma.jobseekerProfile.deleteMany({where:{userId:viewer.id}});
    return json({success:true});
  }catch(error){return apiFailure(error);}
}
