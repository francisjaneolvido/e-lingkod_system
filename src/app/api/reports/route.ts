import { requireApiViewer } from "@/lib/access";
import { MAX_REQUEST_BYTES } from "@/features/civic/config";
import { apiFailure, assertSameOrigin, json, readMultipart } from "@/features/civic/server/http";
import { submitReport } from "@/features/civic/server/mutations";
import { listReports } from "@/features/civic/server/repository";

export async function GET(request: Request) {
  try {
    const viewer = await requireApiViewer(request);
    const cursor = new URL(request.url).searchParams.get("cursor");
    if (!cursor || cursor.length > 191) return json({ error: "Invalid report cursor." }, 400);
    const reports = await listReports(viewer, false, 200, cursor);
    return json({ reports, nextCursor: reports.length === 200 ? reports.at(-1)!.id : null });
  } catch (error) { return apiFailure(error); }
}

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const viewer = await requireApiViewer(request);
    const result = await submitReport(await readMultipart(request, MAX_REQUEST_BYTES), viewer);
    return json(result, result.repeated ? 200 : 201);
  } catch (error) { return apiFailure(error); }
}
