import "server-only";
import { createHash } from "node:crypto";
import { prisma } from "@/lib/prisma";
import type { parseSpesCsv } from "../domain";
import type { CivicViewer } from "@/features/civic/types";
import { recordScope, assertBarangay } from "@/features/census/server/data";
import { CivicError } from "@/features/civic/validation";

export type SpesRecord=ReturnType<typeof parseSpesCsv>[number];
export type SpesDatasetKind="DEMO"|"REAL";
export function validateDatasetKind(raw:unknown):SpesDatasetKind{
  if(raw!=="DEMO"&&raw!=="REAL")throw new CivicError("Choose Fictional demo or Authorized real survey data.",400);
  return raw;
}

/** Content-based, order-insensitive fingerprint of strictly validated, anonymous rows. */
export type SpesSourceContext={sourceLabel:string;surveyYear:number;datasetKind:SpesDatasetKind};
export function spesFingerprint(records:SpesRecord[],context?:SpesSourceContext):string {
  const normalized=records.map(r=>JSON.stringify([
    r.barangay.trim().toLowerCase(),r.education,
    [...r.skills].sort(),[...r.interests].sort(),r.availability,
  ])).sort();
  return createHash("sha256").update(JSON.stringify(context?{source:context.sourceLabel.normalize("NFKC").trim().toUpperCase(),year:context.surveyYear,datasetKind:context.datasetKind,rows:normalized}:normalized)).digest("hex");
}

/** Old imports have a NULL fingerprint; compare their stored row sets as well. */
export async function findDuplicateSpesBatch(fingerprint:string,context?:SpesSourceContext){
  const imported=await prisma.spesImportBatch.findUnique({where:{fingerprint},select:{id:true,sourceLabel:true,recordCount:true,createdAt:true,status:true}});
  if(imported)return imported;
 if(context)return null; // Unknown legacy sources/years are never guessed from equal answers.
  const legacy=await prisma.spesImportBatch.findMany({where:{fingerprint:null},select:{id:true,sourceLabel:true,recordCount:true,createdAt:true,status:true,
    records:{select:{barangay:true,education:true,skillsJson:true,interestsJson:true,availability:true}}}});
  for(const batch of legacy){
    if(batch.recordCount===0)continue;
    if(batch.recordCount!==batch.records.length)continue;
    const rows:SpesRecord[]=batch.records.map(r=>({
      barangay:r.barangay,education:r.education,availability:r.availability,
      skills:safeTags(r.skillsJson),interests:safeTags(r.interestsJson),
    }));
    if(spesFingerprint(rows)===fingerprint)return {id:batch.id,sourceLabel:batch.sourceLabel,recordCount:batch.recordCount,createdAt:batch.createdAt,status:batch.status};
  }
  return null;
}
function safeTags(text:string):string[]{try{const data:unknown=JSON.parse(text);return Array.isArray(data)?data.filter((s):s is string=>typeof s==="string"):[];}catch{return [];}}
export async function readSpesFile(form:FormData){
  const file=form.get("file");
  if(!(file instanceof File)||!file.name.toLowerCase().endsWith(".csv")||file.size===0||file.size>300_000)
    throw new CivicError("Choose a non-empty CSV file no larger than 300 KB.",400);
  const label=String(form.get("sourceLabel")||"").trim().replace(/\s+/g," ");
  if(label.length<4||label.length>120)throw new CivicError("Survey source label must be 4–120 characters.",400);
  const datasetKind=validateDatasetKind(form.get("datasetKind"));
  if(datasetKind==="REAL"&&form.get("authorizedUse")!=="yes")throw new CivicError("Confirm you are authorized to use this anonymous, consented real survey data.",400);
  const surveyYear=Number(form.get("surveyYear"));if(!Number.isInteger(surveyYear)||surveyYear<2020||surveyYear>new Date().getFullYear()+1)throw new CivicError("Choose the actual SPES source survey year.",400);
 return {text:await file.text(),label,datasetKind,surveyYear};
}

export function isUniqueConstraintError(error:unknown){
  return Boolean(error&&typeof error==="object"&&"code" in error&&error.code==="P2002");
}

/** Preview and commit share the protected census record contract. */
export async function assertSpesImportScope(viewer:CivicViewer,records:SpesRecord[]) {
  const scope=await recordScope(viewer);
  for(const record of records)assertBarangay(scope,record.barangay);
}
export async function assertSpesReplayScope(viewer:CivicViewer,batchId:string) {
  const scope=await recordScope(viewer);
  if(scope===null)return;
  const batch=await prisma.spesImportBatch.findUniqueOrThrow({where:{id:batchId},select:{importedById:true,records:{select:{barangay:true}}}});
  if(batch.importedById!==viewer.id || batch.records.some(r=>!scope.includes(r.barangay)))
    throw new CivicError('This source import cannot be accessed within your current authority.',403);
}
