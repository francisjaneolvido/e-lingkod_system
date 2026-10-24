import {parseOpportunityFilters} from '@/features/jobs/opportunities-domain';
import {publicOpportunities} from '@/features/jobs/server/opportunities';
import {json,apiFailure} from '@/features/civic/server/http';
export async function GET(request:Request){try{const filters=parseOpportunityFilters(new URL(request.url).searchParams);return json({filters,jobs:await publicOpportunities(filters)});}catch(error){return apiFailure(error);}}
