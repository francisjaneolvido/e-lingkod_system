import { requireApiViewer } from "@/lib/access";
import { listReports } from "@/features/civic/server/repository";
import { apiFailure, json } from "@/features/civic/server/http";

export async function GET(request: Request) {
  try {
    const viewer = await requireApiViewer(request, "REPORTS");
    const cursor = new URL(request.url).searchParams.get("cursor");
    if (!cursor || cursor.length > 191) return json({ error: "Invalid report cursor." }, 400);
    const reports = await listReports(viewer, true, 200, cursor);
    return json({ reports, nextCursor: reports.length === 200 ? reports.at(-1)!.id : null });
  } catch (error) { return apiFailure(error); }
}
