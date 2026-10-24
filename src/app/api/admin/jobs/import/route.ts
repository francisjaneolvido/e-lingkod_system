import { requireApiViewer } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { CivicError } from "@/features/civic/validation";
import { parseSpesCsv } from "@/features/jobs/domain";
import { assertSpesImportScope,assertSpesReplayScope,spesFingerprint,readSpesFile,findDuplicateSpesBatch,isUniqueConstraintError } from "@/features/jobs/server/spes-import";
import { assertSameOrigin,readMultipart,json,apiFailure } from "@/features/civic/server/http";

export async function POST(request:Request){
  try{
    assertSameOrigin(request);
    const viewer=await requireApiViewer(request,"CENSUS");
    const form=await readMultipart(request,350_000);
    const {text,label,datasetKind,surveyYear}=await readSpesFile(form);
    const context={sourceLabel:label,surveyYear,datasetKind};
    // ALWAYS parse the uploaded bytes again, even after preview. Preview is not permission to bypass validation.
    const records=parseSpesCsv(text);
    await assertSpesImportScope(viewer,records);
    if(!records.length)throw new CivicError("No consented records to import.",400);
    const fingerprint=spesFingerprint(records,context);
    if(form.get("previewHash")!==fingerprint)throw new CivicError("The file or survey details changed. Preview the CSV again before importing.",409);
    const duplicate=await findDuplicateSpesBatch(fingerprint,context);
    if(duplicate)await assertSpesReplayScope(viewer,duplicate.id);
    if(duplicate)return json({success:true,batchId:duplicate.id,count:duplicate.recordCount,datasetKind,replayed:true,status:duplicate.status});
    try{
      const batch=await prisma.$transaction(async tx=>{
        // A database UNIQUE constraint on fingerprint handles concurrent identical imports.
        const result=await tx.spesImportBatch.create({data:{sourceLabel:label,surveyYear,importedById:viewer.id,recordCount:records.length,datasetKind,fingerprint}});
        await tx.spesSurveyRecord.createMany({data:records.map((r,index)=>({originalRowNumber:index+2,batchId:result.id,barangay:r.barangay,education:r.education,skillsJson:JSON.stringify(r.skills),interestsJson:JSON.stringify(r.interests),availability:r.availability}))});
        await tx.spesImportEvent.create({data:{batchId:result.id,actorId:viewer.id,action:"IMPORTED",note:`${datasetKind} source; ${records.length} validated anonymous source rows; cross-source/person overlap unknown, not unique-person counts`}});
        return result;
      });
      return json({success:true,count:records.length,batchId:batch.id,datasetKind},201);
    }catch(error){if(isUniqueConstraintError(error)){const original=await findDuplicateSpesBatch(fingerprint,context);if(original)await assertSpesReplayScope(viewer,original.id);if(original)return json({success:true,batchId:original.id,count:original.recordCount,datasetKind,replayed:true,status:original.status});}throw error;}
  }catch(error){return apiFailure(error);}
}
