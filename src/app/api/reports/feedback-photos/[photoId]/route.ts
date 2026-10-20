import { requireApiViewer } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { hasModuleAccess } from "@/lib/staff-access";
import { reportAdminScope } from "@/lib/report-scope";
import { apiFailure, json, PRIVATE_HEADERS } from "@/features/civic/server/http";

// Photos from reopened requests are never published by anonymous tracking.
export async function GET(request: Request, context: { params: Promise<{ photoId: string }> }) {
  try {
    const viewer = await requireApiViewer(request);
    const authorizedLGU = await hasModuleAccess(viewer, "REPORTS");
    const photo = await prisma.citizenFeedbackPhoto.findFirst({
      where: { id: (await context.params).photoId,
        feedback: { report: { OR: [
          { reporterId: viewer.id },
          ...(authorizedLGU ? [reportAdminScope(viewer)] : []),
        ] } },
      }, select: { data: true, mimeType: true, byteSize: true },
    });
    if (!photo) return json({ error: "Evidence photo not found." }, 404);
    return new Response(new Uint8Array(photo.data), { headers: {
      ...PRIVATE_HEADERS, "Content-Type": photo.mimeType, "Content-Length": String(photo.byteSize),
      "Content-Disposition": "inline; filename=citizen-feedback.jpg",
      "Content-Security-Policy": "default-src 'none'; sandbox", "Cross-Origin-Resource-Policy": "same-origin",
    } });
  } catch (error) { return apiFailure(error); }
}
