import { requireCitizenApiViewer } from "@/lib/access";
import { assertSameOrigin, readJson, json, apiFailure } from "@/features/civic/server/http";
import { createCitizenServiceRequest } from "@/features/services/server/mutations";
export async function POST(request:Request){try{assertSameOrigin(request);const viewer=await requireCitizenApiViewer(request);const created=await createCitizenServiceRequest(await readJson(request),viewer);return json({success:true,...created},201);}catch(error){return apiFailure(error);}}
