import { requireApiViewer } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { CivicError } from "@/features/civic/validation";
import { assertSameOrigin,readJson,json,apiFailure } from "@/features/civic/server/http";

/** Only Super Admin can archive/restore an import; individual survey rows are preserved. */
export async function PATCH(request:Request,{params}:{params:Promise<{id:string}>}){
  try{
    assertSameOrigin(request);
    const viewer=await requireApiViewer(request,"CENSUS");
    if(viewer.role!=="ADMIN")throw new CivicError("Only Super Admin can archive or restore survey batches.",403);
    const {id}=await params;
    const body=await readJson(request) as Record<string,unknown>;
    const action=body.action;
    if(action!=="ARCHIVE"&&action!=="RESTORE")throw new CivicError("Choose archive or restore.",400);
    const reason=typeof body.reason==="string"?body.reason.trim():"";
    if(action==="ARCHIVE"&&(reason.length<10||reason.length>500))throw new CivicError("Enter a reason for archiving (10–500 characters).",400);
    const expected=action==="ARCHIVE"?"ACTIVE":"VOIDED";
    const result=await prisma.$transaction(async tx=>{
      const changed=await tx.spesImportBatch.updateMany({where:{id,status:expected},data:action==="ARCHIVE"?{
        status:"VOIDED",voidedAt:new Date(),voidedById:viewer.id,voidReason:reason,
      }:{status:"ACTIVE",voidedAt:null,voidedById:null,voidReason:null}});
      if(changed.count!==1)throw new CivicError("This import is missing or its status was changed by another administrator. Refresh and try again.",409);
      await tx.spesImportEvent.create({data:{batchId:id,actorId:viewer.id,action:action==="ARCHIVE"?"ARCHIVED":"RESTORED",note:action==="ARCHIVE"?reason:"Restored preserved survey records"}});
      return {status:action==="ARCHIVE"?"VOIDED":"ACTIVE"};
    });
    return json({success:true,...result});
  }catch(error){return apiFailure(error);}
}
