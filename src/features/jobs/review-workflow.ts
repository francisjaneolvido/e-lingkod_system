import { CivicError } from "@/features/civic/validation";

export type JobStatus = "DRAFT" | "PENDING_REVIEW" | "RETURNED" | "PUBLISHED" | "CLOSED" | "FILLED" | "ARCHIVED";
export type JobAction = "EDIT" | "SUBMIT_REVIEW" | "APPROVE" | "RETURN" | "CLOSE" | "FILL" | "ARCHIVE";
const allowed:Record<JobAction,readonly JobStatus[]> = {
  EDIT:["DRAFT","RETURNED","PUBLISHED","CLOSED","FILLED","ARCHIVED"],
  SUBMIT_REVIEW:["DRAFT","RETURNED"], APPROVE:["PENDING_REVIEW"], RETURN:["PENDING_REVIEW"],
  CLOSE:["PUBLISHED"],FILL:["PUBLISHED"],ARCHIVE:["DRAFT","RETURNED","PUBLISHED","CLOSED","FILLED"],
};
export function validateJobTransition(action:JobAction,status:JobStatus,isSuperAdmin:boolean) {
  if ((action === "APPROVE" || action === "RETURN") && !isSuperAdmin)
    throw new CivicError("Only the Super Admin can review and approve job vacancies.",403);
  if (!allowed[action]?.includes(status)) throw new CivicError(`Cannot ${action.toLowerCase().replaceAll("_"," ")} a listing with status ${status}.`,409);
}
export function parseReviewDetails(value:Record<string,unknown>,action:JobAction) {
  if(action === "APPROVE") {
    if(value.employerVerified!==true || value.vacancyVerified!==true)
      throw new CivicError("Confirm both the employer identity and job vacancy before approval.",400);
    if(value.note && (typeof value.note!=="string" || value.note.trim().length>1000))
      throw new CivicError("Review note must be under 1,000 characters.",400);
    return {note:typeof value.note==="string"?value.note.trim():"",employerVerified:true,vacancyVerified:true};
  }
  if(action === "RETURN") {
    if(typeof value.note!=="string" || value.note.trim().length<20 || value.note.trim().length>1000)
      throw new CivicError("Explain what must be corrected (20–1,000 characters).",400);
    return {note:value.note.trim(),employerVerified:false,vacancyVerified:false};
  }
  return {note:"",employerVerified:false,vacancyVerified:false};
}
