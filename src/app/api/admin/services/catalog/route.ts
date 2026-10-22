import { requireApiViewer } from "@/lib/access";
import { assertSameOrigin, readJson, json, apiFailure } from "@/features/civic/server/http";
import { saveServiceDefinition } from "@/features/services/server/builder";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const viewer = await requireApiViewer(request, true);
    const saved = await saveServiceDefinition(await readJson(request), viewer);
    return json({ success: true, key: saved.key, published: saved.published });
  } catch (error) { return apiFailure(error); }
}
