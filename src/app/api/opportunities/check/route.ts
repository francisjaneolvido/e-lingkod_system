import {requireApiViewer} from '@/lib/access';
import {checkOpportunityNotices} from '@/features/jobs/server/recommendations';
import {json,apiFailure,assertSameOrigin} from '@/features/civic/server/http';
export async function POST(request:Request){try{assertSameOrigin(request);const viewer=await requireApiViewer(request);return json(await checkOpportunityNotices(viewer));}catch(error){return apiFailure(error);}}
