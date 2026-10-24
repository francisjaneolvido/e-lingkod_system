import { requireApiViewer } from '@/lib/access';
import { analyticsFailure } from '@/features/analytics/server/http';
import { parseAnalyticsFilters, analyticsCsv } from '@/features/analytics/domain';
import { workforceAnalytics } from '@/features/analytics/server/data';
export async function GET(request:Request) {
  try {
    const viewer=await requireApiViewer(request,'CENSUS');
    const filters=parseAnalyticsFilters(new URL(request.url).searchParams);
    const result=await workforceAnalytics(viewer,filters);
    return new Response(analyticsCsv(result),{headers:{'Content-Type':'text/csv; charset=utf-8','Content-Disposition':'attachment; filename="workforce-'+filters.population.toLowerCase()+'-'+filters.year+'.csv"','Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff',Vary:'Cookie'}});
  } catch(error) {return analyticsFailure(error);}
}
