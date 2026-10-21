import { requireApiViewer } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { CivicError } from "@/features/civic/validation";
import { parseSpesCsv } from "@/features/jobs/domain";
import { spesFingerprint,readSpesFile,findDuplicateSpesBatch,isUniqueConstraintError } from "@/features/jobs/server/spes-import";
import { assertSameOrigin,readMultipart,json,apiFailure } from "@/features/civic/server/http";

export async function POST(request:Request){
  try{
    assertSameOrigin(request);
    const viewer=await requireApiViewer(request,"JOBS");
    const form=await readMultipart(request,350_000);
    const {text,label,datasetKind}=await readSpesFile(form);
    // ALWAYS parse the uploaded bytes again, even after preview. Preview is not permission to bypass validation.
    const records=parseSpesCsv(text);
    if(!records.length)throw new CivicError("No consented records to import.",400);
    const fingerprint=spesFingerprint(records);
    if(form.get("previewHash")!==fingerprint)throw new CivicError("The file or survey details changed. Preview the CSV again before importing.",409);
    const duplicate=await findDuplicateSpesBatch(fingerprint);
    if(duplicate)throw new CivicError(`This survey dataset is already in import history (${duplicate.sourceLabel}). ${duplicate.status==="VOIDED"?"Restore the archived batch instead.":"No records were added."}`,409);
    try{
      const batch=await prisma.$transaction(async tx=>{
        // A database UNIQUE constraint on fingerprint handles concurrent identical imports.
        const result=await tx.spesImportBatch.create({data:{sourceLabel:label,importedById:viewer.id,recordCount:records.length,datasetKind,fingerprint}});
        await tx.spesSurveyRecord.createMany({data:records.map(r=>({batchId:result.id,barangay:r.barangay,education:r.education,skillsJson:JSON.stringify(r.skills),interestsJson:JSON.stringify(r.interests),availability:r.availability}))});
        await tx.spesImportEvent.create({data:{batchId:result.id,actorId:viewer.id,action:"IMPORTED",note:`${datasetKind} source; ${records.length} validated anonymous rows`}});
        return result;
      });
      return json({success:true,count:records.length,batchId:batch.id,datasetKind},201);
    }catch(error){if(isUniqueConstraintError(error))throw new CivicError("This dataset was already imported in another session. No duplicate records were saved.",409);throw error;}
  }catch(error){return apiFailure(error);}
}
