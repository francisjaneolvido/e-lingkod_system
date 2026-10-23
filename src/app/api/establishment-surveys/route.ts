import { requireApiViewer } from "@/lib/access";
import { assertSameOrigin, readJson, json, apiFailure } from "@/features/civic/server/http";
import { createEstablishment, listOwnedEstablishments, ownedEstablishmentState, saveEstablishmentSurvey, withdrawEstablishmentSurvey } from "@/features/establishments/server/data";

export async function GET(request: Request) {
  try {
    const viewer = await requireApiViewer(request), params = new URL(request.url).searchParams;
    return json(params.has("id") ? await ownedEstablishmentState(viewer, params.get("id")!, params.get("year") ?? undefined) : await listOwnedEstablishments(viewer));
  } catch (error) { return apiFailure(error); }
}
export async function POST(request: Request) {
  try { assertSameOrigin(request); return json(await createEstablishment(await readJson(request), await requireApiViewer(request))); }
  catch (error) { return apiFailure(error); }
}
export async function PUT(request: Request) {
  try { assertSameOrigin(request); return json(await saveEstablishmentSurvey(await readJson(request), await requireApiViewer(request))); }
  catch (error) { return apiFailure(error); }
}
export async function DELETE(request: Request) {
  try { assertSameOrigin(request); return json(await withdrawEstablishmentSurvey(await readJson(request), await requireApiViewer(request))); }
  catch (error) { return apiFailure(error); }
}
