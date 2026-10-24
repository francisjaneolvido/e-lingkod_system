import {requireApiViewer} from '@/lib/access';
import {json,apiFailure} from '@/features/civic/server/http';
import {opportunityDemand} from '@/features/jobs/server/demand';
export async function GET(request:Request){try{return json(await opportunityDemand(await requireApiViewer(request,'CENSUS')));}catch(error){return apiFailure(error);}}
