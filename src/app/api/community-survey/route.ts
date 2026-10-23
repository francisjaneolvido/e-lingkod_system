import { requireApiViewer } from "@/lib/access";
import { CivicError } from "@/features/civic/validation";
import { assertSameOrigin, readJson, json, apiFailure } from "@/features/civic/server/http";
import { changeCitizenConsent, ownedSurveyState, saveCitizenSurvey, surveyYear, withdrawCitizenSurvey } from "@/features/community/server/survey-lifecycle";

export async function GET(request: Request) {
  try {
    const viewer = await requireApiViewer(request);
    if (viewer.role !== "CITIZEN") throw new CivicError("Only Citizen accounts can view a personal survey.", 403);
    return json(await ownedSurveyState(viewer.id, surveyYear(new URL(request.url).searchParams.get("year") ?? undefined)));
  } catch (error) { return apiFailure(error); }
}
export async function PUT(request: Request) {
  try { assertSameOrigin(request); const viewer = await requireApiViewer(request); return json(await saveCitizenSurvey(await readJson(request), viewer)); }
  catch (error) { return apiFailure(error); }
}
export async function PATCH(request: Request) {
  try { assertSameOrigin(request); const viewer = await requireApiViewer(request); return json(await changeCitizenConsent(await readJson(request), viewer)); }
  catch (error) { return apiFailure(error); }
}
export async function DELETE(request: Request) {
  try { assertSameOrigin(request); const viewer = await requireApiViewer(request); return json(await withdrawCitizenSurvey(await readJson(request), viewer)); }
  catch (error) { return apiFailure(error); }
}
