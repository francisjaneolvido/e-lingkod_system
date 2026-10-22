import { requireCitizenApiViewer } from "@/lib/access";
import { assertSameOrigin, readMultipart, readJson, json, apiFailure } from "@/features/civic/server/http";
import { removeServiceDocument, uploadServiceDocument } from "@/features/services/server/mutations";
export async function POST(request:Request,{params}:{params:Promise<{id:string}>}){try{assertSameOrigin(request);const viewer=await requireCitizenApiViewer(request);const {id}=await params;const form=await readMultipart(request,6*1024*1024);await uploadServiceDocument(id,form,viewer);return json({success:true},201);}catch(error){return apiFailure(error);}}
export async function DELETE(request:Request,{params}:{params:Promise<{id:string}>}){try{assertSameOrigin(request);const viewer=await requireCitizenApiViewer(request);const {id}=await params;const body=await readJson(request) as any;await removeServiceDocument(id,String(body?.documentId||""),viewer);return json({success:true});}catch(error){return apiFailure(error);}}
