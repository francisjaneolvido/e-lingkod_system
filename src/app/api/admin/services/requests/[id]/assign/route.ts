import { requireApiViewer } from "@/lib/access";
import { assertSameOrigin, readJson, json, apiFailure } from "@/features/civic/server/http";
import { assignServiceRequest } from "@/features/services/server/mutations";
export async function PATCH(request:Request,{params}:{params:Promise<{id:string}>}){try{assertSameOrigin(request);const viewer=await requireApiViewer(request,"SERVICES");const {id}=await params;await assignServiceRequest(id,await readJson(request),viewer);return json({success:true});}catch(error){return apiFailure(error);}}
