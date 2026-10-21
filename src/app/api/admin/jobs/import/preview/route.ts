import { requireApiViewer } from "@/lib/access";
import { previewSpesCsv } from "@/features/jobs/domain";
import { spesFingerprint, readSpesFile, findDuplicateSpesBatch } from "@/features/jobs/server/spes-import";
import { assertSameOrigin, readMultipart, json, apiFailure } from "@/features/civic/server/http";

export async function POST(request:Request){
  try{
    assertSameOrigin(request);
    await requireApiViewer(request,"JOBS");
    const form=await readMultipart(request,350_000);
    const {text}=await readSpesFile(form);
    const checked=previewSpesCsv(text);
    const fingerprint=checked.records.length&&checked.errors.length===0?spesFingerprint(checked.records):null;
    const duplicate=fingerprint?await findDuplicateSpesBatch(fingerprint):null;
    // Only row numbers and validator messages leave the server, never the raw CSV content.
    return json({totalRows:checked.totalRows,validRows:checked.records.length,invalidRows:checked.errors.length,
      issues:checked.errors.slice(0,25),moreIssues:Math.max(0,checked.errors.length-25),
      previewHash:fingerprint,
      duplicate:duplicate?{sourceLabel:duplicate.sourceLabel,recordCount:duplicate.recordCount,status:duplicate.status,createdAt:duplicate.createdAt.toISOString()}:null});
  }catch(error){return apiFailure(error);}
}
