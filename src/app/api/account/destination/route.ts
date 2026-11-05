import { currentViewer } from "@/lib/access";
import { json } from "@/features/civic/server/http";
import { hasCitizenFeatureAccess } from '@/features/identity/policy';

export async function GET() {
  const viewer = await currentViewer();
  return json({ destination: viewer && !hasCitizenFeatureAccess(viewer) ? '/verification' : viewer && (viewer.role === "ADMIN" || viewer.role === "STAFF") ? "/admin" : "/" });
}
