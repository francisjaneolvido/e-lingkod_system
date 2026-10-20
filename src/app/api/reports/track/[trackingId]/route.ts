import { TRACKING_PATTERN } from "@/features/civic/config";
import { getPublicTracking } from "@/features/civic/server/repository";
import { apiFailure, json } from "@/features/civic/server/http";

export async function GET(_request: Request, context: { params: Promise<{ trackingId: string }> }) {
  try {
    const trackingId = (await context.params).trackingId.trim().toUpperCase();
    if (!TRACKING_PATTERN.test(trackingId)) return json({ error: "No report found for that tracking ID." }, 404);
    const report = await getPublicTracking(trackingId);
    return report ? json(report) : json({ error: "No report found for that tracking ID." }, 404);
  } catch (error) { return apiFailure(error); }
}
