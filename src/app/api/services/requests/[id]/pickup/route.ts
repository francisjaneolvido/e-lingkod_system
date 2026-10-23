import { requireApiViewer, requireCitizenApiViewer } from "@/lib/access";
import { assertSameOrigin, readJson, json, apiFailure } from "@/features/civic/server/http";
import { proposeServicePickup, respondToServicePickup } from "@/features/services/server/pickup";

export async function POST(request:Request,{params}:{params:Promise<{id:string}>}){
  try{assertSameOrigin(request);const viewer=await requireApiViewer(request,"SERVICES"),{id}=await params;return json(await proposeServicePickup(id,await readJson(request),viewer));}catch(error){return apiFailure(error);}
}
export async function PATCH(request:Request,{params}:{params:Promise<{id:string}>}){
  try{assertSameOrigin(request);const viewer=await requireCitizenApiViewer(request),{id}=await params;return json(await respondToServicePickup(id,await readJson(request),viewer));}catch(error){return apiFailure(error);}
}
