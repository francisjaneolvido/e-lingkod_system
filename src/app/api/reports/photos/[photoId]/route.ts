import { requireApiViewer } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { hasModuleAccess } from "@/lib/staff-access";
import { reportAdminScope } from "@/lib/report-scope";
import { apiFailure, json, PRIVATE_HEADERS } from "@/features/civic/server/http";

export async function GET(request: Request, context: { params: Promise<{ photoId: string }> }) {
  try {
    const viewer = await requireApiViewer(request);
    const isAuthorizedStaff = await hasModuleAccess(viewer, "REPORTS");
    const photo = await prisma.reportPhoto.findFirst({
      where: { id: (await context.params).photoId, report: isAuthorizedStaff ? reportAdminScope(viewer) : { reporterId: viewer.id } },
      select: { data: true, mimeType: true, byteSize: true },
    });
    if (!photo) return json({ error: "Photo not found." }, 404);
    return new Response(new Uint8Array(photo.data), {
      headers: { ...PRIVATE_HEADERS, "Content-Type": photo.mimeType, "Content-Length": String(photo.byteSize), "Content-Disposition": "inline; filename=report-evidence.jpg", "Content-Security-Policy": "default-src 'none'; sandbox", "Cross-Origin-Resource-Policy": "same-origin" },
    });
  } catch (error) { return apiFailure(error); }
}
