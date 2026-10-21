import { requireCitizenApiViewer } from "@/lib/access";
import { getReport } from "@/features/civic/server/repository";
import { apiFailure, json } from "@/features/civic/server/http";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const viewer = await requireCitizenApiViewer(request);
    const report = await getReport((await context.params).id, viewer);
    return report ? json(report) : json({ error: "Report not found." }, 404);
  } catch (error) { return apiFailure(error); }
}
