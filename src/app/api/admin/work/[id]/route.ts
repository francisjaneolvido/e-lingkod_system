import { requireApiViewer } from "@/lib/access";
import { apiFailure, assertSameOrigin, json, readJson } from "@/features/civic/server/http";
import { acceptOrDeclineWork } from "@/lib/work-distribution/server";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    assertSameOrigin(request);
    const viewer = await requireApiViewer(request);
    const body = await readJson(request) as any;
    const action = body?.action === "DECLINE" ? "DECLINE" : body?.action === "ACCEPT" ? "ACCEPT" : null;
    if (!action) return json({ error: "Choose Accept or Decline." }, 400);
    await acceptOrDeclineWork((await context.params).id, action, viewer, typeof body?.reason === "string" ? body.reason : "");
    return json({ success: true });
  } catch (error) { return apiFailure(error); }
}
