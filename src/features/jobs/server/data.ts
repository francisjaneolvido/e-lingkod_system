import type {CivicViewer} from "@/features/civic/types";
import {hasModuleAccess} from "@/lib/staff-access";
import {CivicError} from "@/features/civic/validation";
import {publicOpportunities,publicOpportunitySelect,serializeOpportunity} from "./opportunities";
import "server-only";
import { prisma } from "@/lib/prisma";
import { decodeTags, scoreMatch, type MatchProfile } from "../domain";
import { currentProfileConsent } from "@/features/community/server/survey-lifecycle";

export async function publishedJobs() { return publicOpportunities({}); }
/** Public read: only published, non-expired vacancies; never expose reviewer notes or drafts. */
export async function publishedJobById(id:string){
 if(!id||id.length>191)return null;
 const row=await prisma.jobOpportunity.findFirst({where:{id,status:'PUBLISHED',employerVerified:true,vacancyVerified:true,OR:[{expiresAt:null},{expiresAt:{gt:new Date()}}]},select:publicOpportunitySelect});
 return row?serializeOpportunity(row):null;
}

export async function adminJobData(viewer:CivicViewer) {
  if(!viewer || !await hasModuleAccess(viewer,"JOBS"))throw new CivicError("JOBS authority required.",403);
  // Vacancy management does not load or serialize census/SPES records.
  const [jobs,counts]=await Promise.all([prisma.jobOpportunity.findMany({where:viewer.role==="ADMIN"?{}:{createdById:viewer.id},orderBy:{updatedAt:"desc"}}),prisma.jobOpportunity.groupBy({where:viewer.role==="ADMIN"?{}:{createdById:viewer.id},by:["status"],_count:{_all:true}})]);
  return {
    jobs:jobs.map(r=>({...r,payMin:r.payMin?.toFixed(2)??null,payMax:r.payMax?.toFixed(2)??null,certifications:r.certificationsJson===null?null:decodeTags(r.certificationsJson),skills:decodeTags(r.skillsJson),interests:decodeTags(r.interestsJson),createdAt:r.createdAt.toISOString(),updatedAt:r.updatedAt.toISOString(),publishedAt:r.publishedAt?.toISOString()??null,expiresAt:r.expiresAt?.toISOString().slice(0,10)??"",reviewRequestedAt:r.reviewRequestedAt?.toISOString()??null,reviewedAt:r.reviewedAt?.toISOString()??null})),
    stats:Object.fromEntries(counts.map(c=>[c.status,c._count._all])) as Record<string,number>,
  };
}
export async function profileForCitizen(userId:string):Promise<MatchProfile|null> {
  const consent=await currentProfileConsent(userId);
  if(consent&&!consent.matching)return null;
  // An unfinished legacy draft does not replace an authorized optional profile.
  // Submitted or withdrawn participation must still govern profile selection.
  if(await prisma.communitySurvey.findFirst({where:{userId,status:{in:["SUBMITTED","WITHDRAWN"]}},select:{id:true}}))return null;
  // Workspace-only withdrawals have no annual compatibility row.
  if(await prisma.communitySurveyRevision.findFirst({where:{userId,action:"WITHDRAWN"},select:{id:true}}))return null;
  const r=await prisma.jobseekerProfile.findUnique({where:{userId}});
  return r ? {skills:decodeTags(r.skillsJson),interests:decodeTags(r.interestsJson),education:r.education,preferredArea:r.preferredArea,availability:r.availability} : null;
}
export function rankJobs<T extends {skills:string[];interests:string[];workType:string;barangay:string;education:string}>(jobs:T[],profile:MatchProfile|null) {
  return jobs.map(job=>({...job,match:profile?scoreMatch(profile,job):null})).sort((a,b)=>(b.match?.score??0)-(a.match?.score??0));
}
