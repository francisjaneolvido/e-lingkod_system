import 'server-only';
import { apiFailure } from '@/features/civic/server/http';
export function analyticsFailure(error:unknown) {
  // The shared handler rethrows Next control-flow signals and sanitizes logs.
  // Keep its authorization/validation responses; describe analytics outages
  // without unrelated action-desk or migration instructions.
  const response=apiFailure(error);
  return response.status===503 ? Response.json({error:'Unable to load protected workforce and social analytics. Please try again.'},{status:503,headers:{'Cache-Control':'private, no-store',Vary:'Cookie'}}) : response;
}
