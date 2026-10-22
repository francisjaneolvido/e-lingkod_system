import type { ServiceRequestStatus } from "./domain";
export type ServiceRequestSummary = {
  id:string;trackingId:string;serviceKey:string;serviceTitle:string;status:ServiceRequestStatus;assignedDepartment:string|null;assignedStaffId:string|null;createdAt:string;updatedAt:string;
};
