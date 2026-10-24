import {requireApiViewer} from '@/lib/access';
import {assertSameOrigin,readJson,json,apiFailure} from '@/features/civic/server/http';
import {mutateOpportunity} from '@/features/jobs/server/mutations';
export async function PATCH(request:Request,{params}:{params:Promise<{id:string}>}){try{assertSameOrigin(request);const viewer=await requireApiViewer(request,'JOBS');const {id}=await params;return json({success:true,...await mutateOpportunity(id,await readJson(request),viewer)});}catch(error){return apiFailure(error);}}
