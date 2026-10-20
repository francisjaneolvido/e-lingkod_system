import { requireApiViewer } from "@/lib/access";
import { apiFailure, assertSameOrigin, json, readJson, readMultipart } from "@/features/civic/server/http";
import { MAX_REQUEST_BYTES } from "@/features/civic/config";
import { reviewResolution, submitResolution } from "@/features/civic/server/resolution";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    assertSameOrigin(request);
    const viewer = await requireApiViewer(request, "REPORTS");
    const form = await readMultipart(request, MAX_REQUEST_BYTES);
    return json(await submitResolution((await context.params).id, form, viewer));
  } catch (error) { return apiFailure(error); }
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    assertSameOrigin(request);
    const viewer = await requireApiViewer(request, "REPORTS");
    return json(await reviewResolution((await context.params).id, await readJson(request), viewer));
  } catch (error) { return apiFailure(error); }
}
