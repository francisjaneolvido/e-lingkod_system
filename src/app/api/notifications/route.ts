import { requireApiViewer } from "@/lib/access";
import { apiFailure, assertSameOrigin, json, readJson } from "@/features/civic/server/http";
import { markNotificationRead, notificationFeed } from "@/lib/notifications/server";
import { refreshExpiredWorkOffers } from "@/lib/work-distribution/server";

export async function GET(request: Request) {
  try { const viewer = await requireApiViewer(request); if (viewer.role === "STAFF") await refreshExpiredWorkOffers(10); return json(await notificationFeed(viewer.id, 25)); }
  catch (error) { return apiFailure(error); }
}

export async function PATCH(request: Request) {
  try {
    assertSameOrigin(request);
    const viewer = await requireApiViewer(request);
    const body = await readJson(request) as any;
    await markNotificationRead(viewer.id, typeof body?.id === "string" ? body.id : undefined);
    return json({ success: true });
  } catch (error) { return apiFailure(error); }
}
