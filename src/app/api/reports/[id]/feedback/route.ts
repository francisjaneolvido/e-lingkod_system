import { requireCitizenApiViewer } from "@/lib/access";
import { submitCitizenFeedback } from "@/features/civic/server/citizen-feedback";
import { MAX_REQUEST_BYTES } from "@/features/civic/config";
import { apiFailure, assertSameOrigin, json, readMultipart } from "@/features/civic/server/http";

// The reporter's identity is checked again inside the transaction. A tracking ID
// or the report URL alone cannot authorize a citizen to change someone else's case.
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    assertSameOrigin(request);
    const viewer = await requireCitizenApiViewer(request);
    const form = await readMultipart(request, MAX_REQUEST_BYTES);
    return json(await submitCitizenFeedback((await context.params).id, form, viewer));
  } catch (error) { return apiFailure(error); }
}
