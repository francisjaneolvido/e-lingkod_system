export type ManagedJob = {
  id:string;title:string;employer:string;sector:string;workType:string;barangay:string;location:string;createdById:string;
  description:string;skills:string[];interests:string[];education:string;contactInfo:string;
  externalUrl:string|null;expiresAt:string;status:string;createdAt:string;updatedAt:string;publishedAt:string|null;
  reviewSource:string|null;reviewNote:string|null;reviewRequestedAt:string|null;reviewedAt:string|null;employerVerified:boolean;vacancyVerified:boolean;
};
export type JobsDashboardData = {
  jobs:ManagedJob[];stats:Record<string,number>;totalSurveys:number;
  opportunitySignals:{id:string;title:string;aligned:number}[];
  topSkills:[string,number][];topBarangays:[string,number][];
  batchCount:number;
  insights:Record<"ALL"|"DEMO"|"REAL"|"UNCLASSIFIED",{
    total:number;areaCount:number;topSkills:[string,number][];topBarangays:[string,number][];
    opportunitySignals:{id:string;title:string;aligned:number}[];
  }>;
  batches:{id:string;sourceLabel:string;recordCount:number;createdAt:string;datasetKind:string;
    status:string;voidedAt:string|null;voidReason:string|null;importedBy:string;
    events:{action:string;note:string|null;createdAt:string;actor:string}[];
  }[];
};
export const emptyOpportunity={title:"",employer:"",sector:"Office & admin",workType:"FULL_TIME",barangay:"",location:"",description:"",skills:[] as string[],interests:[] as string[],education:"ANY",contactInfo:"",externalUrl:"",expiresAt:"",reviewSource:""};
export type OpportunityFormValue=typeof emptyOpportunity;
export function toOpportunityForm(job:ManagedJob):OpportunityFormValue{
 return {title:job.title,employer:job.employer,sector:job.sector,workType:job.workType,barangay:job.barangay,
 location:job.location,description:job.description,skills:[...job.skills],interests:[...job.interests],education:job.education,
 contactInfo:job.contactInfo,externalUrl:job.externalUrl||"",expiresAt:job.expiresAt,reviewSource:job.reviewSource||""};
}
export function displayJobStatus(job:Pick<ManagedJob,"status"|"expiresAt">,now:Date):"PUBLISHED"|"DRAFT"|"PENDING_REVIEW"|"RETURNED"|"CLOSED"|"FILLED"|"ARCHIVED"|"EXPIRED"{
 if(job.status==="PUBLISHED"&&job.expiresAt&&new Date(`${job.expiresAt}T23:59:59Z`)<now)return "EXPIRED";
 if(["PUBLISHED","PENDING_REVIEW","RETURNED","CLOSED","FILLED","ARCHIVED"].includes(job.status))return job.status as Exclude<ReturnType<typeof displayJobStatus>,"EXPIRED"|"DRAFT">;
 return "DRAFT";
}
