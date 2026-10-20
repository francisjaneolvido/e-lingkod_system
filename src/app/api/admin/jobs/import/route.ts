import { requireApiViewer } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { CivicError } from "@/features/civic/validation";
import { parseSpesCsv } from "@/features/jobs/domain";
import { assertSameOrigin, readMultipart, json, apiFailure } from "@/features/civic/server/http";

export async function POST(request:Request){
  try{
    assertSameOrigin(request);
    const viewer=await requireApiViewer(request,"JOBS");
    const form=await readMultipart(request,350_000);
    const file=form.get("file");
    if(!(file instanceof File)||file.size>300_000||!file.name.toLowerCase().endsWith(".csv"))throw new CivicError("Select a CSV file no larger than 300 KB.",400);
    const label=String(form.get("sourceLabel")||"").trim();
    if(label.length<4||label.length>120)throw new CivicError("Enter a short survey source label (4–120 characters).",400);
    const records=parseSpesCsv(await file.text());
    if(!records.length)throw new CivicError("No consented records found.",400);
    const batch=await prisma.$transaction(async tx=>{
      const result=await tx.spesImportBatch.create({data:{sourceLabel:label,importedById:viewer.id,recordCount:records.length}});
      await tx.spesSurveyRecord.createMany({data:records.map(r=>({batchId:result.id,barangay:r.barangay,education:r.education,skillsJson:JSON.stringify(r.skills),interestsJson:JSON.stringify(r.interests),availability:r.availability}))});
      return result;
    });
    return json({success:true,count:records.length,batchId:batch.id},201);
  }catch(error){return apiFailure(error);}
}
