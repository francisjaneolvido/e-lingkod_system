import { requireApiViewer } from '@/lib/access';
import { analyticsFailure } from '@/features/analytics/server/http';
import { parseAnalyticsFilters } from '@/features/analytics/domain';
import { workforceAnalytics } from '@/features/analytics/server/data';
export async function GET(request:Request) {
  try {
    const viewer=await requireApiViewer(request,'CENSUS');
    const filters=parseAnalyticsFilters(new URL(request.url).searchParams);
    return Response.json(await workforceAnalytics(viewer,filters),{headers:{'Cache-Control':'private, no-store',Vary:'Cookie'}});
  } catch(error) {return analyticsFailure(error);}
}
