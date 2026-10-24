import {requireApiViewer} from '@/lib/access';
import {assertSameOrigin,readJson,json,apiFailure} from '@/features/civic/server/http';
import {createOpportunity} from '@/features/jobs/server/mutations';
export async function POST(request:Request){try{assertSameOrigin(request);const viewer=await requireApiViewer(request,'JOBS');const result=await createOpportunity(await readJson(request),viewer);return json({success:true,...result},result.replayed?200:201);}catch(error){return apiFailure(error);}}
