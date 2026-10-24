import { requireApiViewer } from "@/lib/access";
import { previewSpesCsv } from "@/features/jobs/domain";
import { assertSpesImportScope, assertSpesReplayScope, spesFingerprint, readSpesFile, findDuplicateSpesBatch } from "@/features/jobs/server/spes-import";
import { assertSameOrigin, readMultipart, json, apiFailure } from "@/features/civic/server/http";

export async function POST(request:Request){
  try{
    assertSameOrigin(request);
    const viewer=await requireApiViewer(request,"CENSUS");
    const form=await readMultipart(request,350_000);
    const {text,label,datasetKind,surveyYear}=await readSpesFile(form);
    const context={sourceLabel:label,surveyYear,datasetKind};
    const checked=previewSpesCsv(text);
await assertSpesImportScope(viewer,checked.records);
    const fingerprint=checked.records.length&&checked.errors.length===0?spesFingerprint(checked.records,context):null;
    const duplicate=fingerprint?await findDuplicateSpesBatch(fingerprint,context):null;
    if(duplicate)await assertSpesReplayScope(viewer,duplicate.id);
// Only row numbers and validator messages leave the server, never the raw CSV content.
    return json({totalRows:checked.totalRows,validRows:checked.records.length,invalidRows:checked.errors.length,
      issues:checked.errors.slice(0,25),moreIssues:Math.max(0,checked.errors.length-25),
      previewHash:fingerprint,
      duplicate:duplicate?{sourceLabel:duplicate.sourceLabel,recordCount:duplicate.recordCount,status:duplicate.status,createdAt:duplicate.createdAt.toISOString()}:null});
  }catch(error){return apiFailure(error);}
}
