import {requireApiViewer} from '@/lib/access';
import {personalOpportunities} from '@/features/jobs/server/recommendations';
import {json,apiFailure} from '@/features/civic/server/http';
export async function GET(request:Request){try{const viewer=await requireApiViewer(request);return json(await personalOpportunities(viewer));}catch(error){return apiFailure(error);}}
