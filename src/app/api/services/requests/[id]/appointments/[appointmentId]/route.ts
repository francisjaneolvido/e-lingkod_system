import { requireCitizenApiViewer } from "@/lib/access";
import { assertSameOrigin, readJson, json, apiFailure } from "@/features/civic/server/http";
import { citizenAppointmentAction } from "@/features/services/server/mutations";
export async function PATCH(request:Request,{params}:{params:Promise<{id:string;appointmentId:string}>}){try{assertSameOrigin(request);const viewer=await requireCitizenApiViewer(request);const {id,appointmentId}=await params;await citizenAppointmentAction(id,appointmentId,await readJson(request),viewer);return json({success:true});}catch(error){return apiFailure(error);}}
