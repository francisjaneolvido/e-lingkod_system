import { requireCitizenApiViewer } from "@/lib/access";
import { assertSameOrigin, readJson, json, apiFailure } from "@/features/civic/server/http";
import { cancelCitizenServiceRequest, submitCitizenServiceRequest, updateCitizenServiceRequest } from "@/features/services/server/mutations";

export async function PATCH(request:Request,{params}:{params:Promise<{id:string}>}){
  try{
    assertSameOrigin(request);
    const viewer=await requireCitizenApiViewer(request);
    const {id}=await params;
    const body=await readJson(request) as any;
    const action=String(body?.action||"UPDATE");
    if(action==="SUBMIT") await submitCitizenServiceRequest(id,viewer);
    else if(action==="CANCEL") await cancelCitizenServiceRequest(id,viewer);
    else if(action==="SAVE_DRAFT") await updateCitizenServiceRequest(id,body,viewer,true);
    else await updateCitizenServiceRequest(id,body,viewer,false);
    return json({success:true});
  }catch(error){return apiFailure(error);}
}
