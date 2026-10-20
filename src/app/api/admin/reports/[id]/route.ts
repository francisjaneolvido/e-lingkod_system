import { requireApiViewer } from "@/lib/access";
import { updateReport } from "@/features/civic/server/mutations";
import { apiFailure, assertSameOrigin, json, readJson } from "@/features/civic/server/http";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    assertSameOrigin(request);
    const viewer = await requireApiViewer(request, "REPORTS");
    return json(await updateReport((await context.params).id, await readJson(request), viewer));
  } catch (error) { return apiFailure(error); }
}
