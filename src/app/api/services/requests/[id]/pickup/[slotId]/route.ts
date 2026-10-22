import { requireCitizenApiViewer } from "@/lib/access";
import { assertSameOrigin, readJson, json, apiFailure } from "@/features/civic/server/http";
import { citizenPickupAction } from "@/features/services/server/pickup";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string; slotId: string }> }) {
  try {
    assertSameOrigin(request);
    const viewer = await requireCitizenApiViewer(request);
    const { id, slotId } = await params;
    await citizenPickupAction(id, slotId, await readJson(request), viewer);
    return json({ success: true });
  } catch (error) {
    return apiFailure(error);
  }
}
