import { requireApiViewer } from "@/lib/access";
import { assertSameOrigin, readJson, json, apiFailure } from "@/features/civic/server/http";
import { offerPickupSlots } from "@/features/services/server/pickup";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    assertSameOrigin(request);
    const viewer = await requireApiViewer(request, "SERVICES");
    const { id } = await params;
    await offerPickupSlots(id, await readJson(request), viewer);
    return json({ success: true }, 201);
  } catch (error) {
    return apiFailure(error);
  }
}
