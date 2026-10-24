import 'server-only';
import { prisma } from '@/lib/prisma';
import { recordScope } from '@/features/census/server/data';
import type { CivicViewer } from '@/features/civic/types';
// Preserve the existing import/archive workspace without serializing workforce
// analytics to the JOBS console or disclosing another scope's row totals.
export async function legacySpesImportData(viewer:CivicViewer) {
  const scope=await recordScope(viewer);
  return prisma.$transaction(async tx=>{
    const clauses:string[]=[],values:string[]=[];
    if(scope!==null){
      clauses.push('b.importedById=?');values.push(viewer.id);
      clauses.push(scope.length?'BINARY r.barangay IN ('+scope.map(()=>'?').join(',')+')':'1=0');values.push(...scope);
    }
    const counts=await tx.$queryRawUnsafe<{id:string;recordCount:bigint}[]>('SELECT b.id,COUNT(r.id) recordCount FROM spes_import_batch b LEFT JOIN spes_survey_record r ON r.batchId=b.id'+(clauses.length?' WHERE '+clauses.join(' AND '):'')+' GROUP BY b.id',...values);
    const where={id:{in:counts.map(c=>c.id)}};
    const batchCount=counts.length;
    const batches=await tx.spesImportBatch.findMany({where,orderBy:{createdAt:'desc'},take:30,select:{
      id:true,sourceLabel:true,createdAt:true,datasetKind:true,status:true,voidedAt:true,voidReason:true,
      importedBy:{select:{name:true}},
      events:{orderBy:{createdAt:'desc'},take:3,select:{action:true,note:true,createdAt:true,actor:{select:{name:true}}}},
    }});
    // Free-text audit notes/reasons describe the entire batch, not the scoped
    // projection. Keep the durable originals for Admin; never expose them to
    // Staff even when they originally imported a now partially scoped batch.
    return {batchCount,batches:batches.map(b=>({id:b.id,sourceLabel:b.sourceLabel,recordCount:Number(counts.find(c=>c.id===b.id)!.recordCount),createdAt:b.createdAt.toISOString(),datasetKind:b.datasetKind,status:b.status,voidedAt:b.voidedAt?.toISOString()??null,voidReason:scope===null?b.voidReason:null,importedBy:b.importedBy.name,events:b.events.map(e=>({action:e.action,note:scope===null?e.note:null,createdAt:e.createdAt.toISOString(),actor:e.actor.name}))}))};
  },{isolationLevel:'RepeatableRead'});
}
