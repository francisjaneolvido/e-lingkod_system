import { requireCitizenApiViewer } from "@/lib/access";
import { REPORT_CATEGORIES, MAX_REQUEST_BYTES } from "@/features/civic/config";
import { analyzeEvidence, preparePhotos } from "@/features/civic/server/evidence";
import { apiFailure, assertSameOrigin, json, readMultipart } from "@/features/civic/server/http";
import { CivicError } from "@/features/civic/validation";
import { consumeProviderBudget } from "@/features/civic/server/provider-budget";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const viewer = await requireCitizenApiViewer(request);
    const form = await readMultipart(request, MAX_REQUEST_BYTES);
    const category = form.get("category");
    const selected = REPORT_CATEGORIES.find(item => item.value === category);
    if (!selected) throw new CivicError("Choose a concern type first.");
    const title = form.get("title"), description = form.get("description");
    if (typeof title !== "string" || !title.trim() || title.length > 120 || typeof description !== "string" || !description.trim() || description.length > 2000) throw new CivicError("Enter the report title and description before checking photos.");
    const photos = await preparePhotos(form);
    await consumeProviderBudget(viewer.id, "AI_PREVIEW", photos.length);
    const results = [];
    for (const photo of photos) {
      try {
        const result = await analyzeEvidence(photo.data, selected.value, title, description);
        results.push({ status: result.status, score: result.score, observations: result.observations, feedback: result.feedback });
      } catch (error) {
        if (error instanceof CivicError && error.status === 503) results.push({ status: "UNAVAILABLE", score: null, observations: "", feedback: error.message });
        else throw error;
      }
    }
    return json({ results });
  } catch (error) { return apiFailure(error); }
}
