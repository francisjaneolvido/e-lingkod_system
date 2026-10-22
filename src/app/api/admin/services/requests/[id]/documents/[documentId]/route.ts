import { requireApiViewer } from "@/lib/access";
import { assertSameOrigin, readJson, json, apiFailure } from "@/features/civic/server/http";
import { verifyServiceDocument } from "@/features/services/server/mutations";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string; documentId: string }> }) {
  try {
    assertSameOrigin(request);
    const viewer = await requireApiViewer(request, "SERVICES");
    const { id, documentId } = await params;
    await verifyServiceDocument(id, documentId, await readJson(request), viewer);
    return json({ success: true });
  } catch (error) {
    return apiFailure(error);
  }
}
