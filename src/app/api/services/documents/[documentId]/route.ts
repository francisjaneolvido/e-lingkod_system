import { viewerFromHeaders } from "@/lib/access";
import { hasModuleAccess } from "@/lib/staff-access";
import { prisma } from "@/lib/prisma";
import { departmentMatchesService } from "@/features/services/catalog";
import { resolveServiceDefinition } from "@/features/services/server/catalog";

export async function GET(request:Request,{params}:{params:Promise<{documentId:string}>}){
  const viewer=await viewerFromHeaders(request.headers);
  if(!viewer)return new Response("Unauthorized",{status:401});
  const {documentId}=await params;
  const doc=await prisma.serviceRequestDocument.findUnique({where:{id:documentId},include:{request:{select:{requesterId:true,assignedStaffId:true,serviceKey:true}}}});
  if(!doc)return new Response("Not found",{status:404});
  let allowed=viewer.role==="ADMIN"||doc.request.requesterId===viewer.id;
  if(!allowed&&viewer.role==="STAFF"&&await hasModuleAccess(viewer,"SERVICES")){
    const service=await resolveServiceDefinition(doc.request.serviceKey,true);
    allowed=doc.request.assignedStaffId===viewer.id||Boolean(service&&departmentMatchesService(service,viewer.department));
  }
  if(!allowed)return new Response("Forbidden",{status:403});
  // Only approved upload formats are rendered inline. Never trust arbitrary stored MIME values.
  const safeMime = ["image/jpeg", "image/png", "image/webp", "application/pdf"].includes(doc.mimeType)
    ? doc.mimeType : "application/octet-stream";
  const disposition = safeMime === "application/octet-stream" ? "attachment" : "inline";
  const safeFileName = doc.fileName.replace(/[^\x20-\x7e]|["\\]/g, "_");
  const encodedFileName = encodeURIComponent(doc.fileName.replace(/[\r\n]/g, "_"));
  return new Response(new Uint8Array(doc.data), {
    headers: {
      "Content-Type": safeMime,
      "Content-Disposition": `${disposition}; filename="${safeFileName}"; filename*=UTF-8''${encodedFileName}`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "no-referrer",
      "X-Robots-Tag": "noindex, nofollow",
    },
  });
}
