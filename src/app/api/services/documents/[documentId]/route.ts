import { viewerFromHeaders } from "@/lib/access";
import { hasModuleAccess } from "@/lib/staff-access";
import { prisma } from "@/lib/prisma";
import { departmentMatchesService, serviceByKey } from "@/features/services/catalog";

export async function GET(request:Request,{params}:{params:Promise<{documentId:string}>}){
  const viewer=await viewerFromHeaders(request.headers);
  if(!viewer)return new Response("Unauthorized",{status:401});
  const {documentId}=await params;
  const doc=await prisma.serviceRequestDocument.findUnique({where:{id:documentId},include:{request:{select:{requesterId:true,assignedStaffId:true,serviceKey:true}}}});
  if(!doc)return new Response("Not found",{status:404});
  let allowed=viewer.role==="ADMIN"||doc.request.requesterId===viewer.id;
  if(!allowed&&viewer.role==="STAFF"&&await hasModuleAccess(viewer,"SERVICES")){
    const service=serviceByKey(doc.request.serviceKey);
    allowed=doc.request.assignedStaffId===viewer.id||Boolean(service&&departmentMatchesService(service,viewer.department));
  }
  if(!allowed)return new Response("Forbidden",{status:403});
  return new Response(new Uint8Array(doc.data),{headers:{"Content-Type":doc.mimeType,"Content-Disposition":`inline; filename="${doc.fileName.replace(/["\r\n]/g,"")}"`,"Cache-Control":"private, no-store","X-Content-Type-Options":"nosniff"}});
}
