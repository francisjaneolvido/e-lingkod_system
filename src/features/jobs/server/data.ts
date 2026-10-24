import "server-only";
import { prisma } from "@/lib/prisma";
import { decodeTags, scoreMatch, type MatchProfile } from "../domain";
import { currentProfileConsent } from "@/features/community/server/survey-lifecycle";

export async function publishedJobs() {
  const rows=await prisma.jobOpportunity.findMany({where:{status:"PUBLISHED",OR:[{expiresAt:null},{expiresAt:{gte:new Date()}}]},orderBy:{publishedAt:"desc"},take:250});
  return rows.map(row=>({id:row.id,title:row.title,employer:row.employer,sector:row.sector,workType:row.workType,barangay:row.barangay,location:row.location,description:row.description,education:row.education,contactInfo:row.contactInfo,externalUrl:row.externalUrl,publishedAt:row.publishedAt?.toISOString()??row.updatedAt.toISOString(),expiresAt:row.expiresAt?.toISOString()??null,skills:decodeTags(row.skillsJson),interests:decodeTags(row.interestsJson)}));
}
/** Public read: only published, non-expired vacancies; never expose reviewer notes or drafts. */
export async function publishedJobById(id: string) {
  const row = await prisma.jobOpportunity.findFirst({
    where: { id, status: "PUBLISHED", OR: [{ expiresAt: null }, { expiresAt: { gte: new Date() } }] },
    select: {
      id: true, title: true, employer: true, sector: true, workType: true,
      barangay: true, location: true, description: true, education: true,
      contactInfo: true, externalUrl: true, expiresAt: true,
      skillsJson: true, interestsJson: true,
    },
  });
  if (!row) return null;
  return {
    id: row.id, title: row.title, employer: row.employer, sector: row.sector,
    workType: row.workType, barangay: row.barangay, location: row.location,
    description: row.description, education: row.education,
    contactInfo: row.contactInfo, externalUrl: row.externalUrl,
    expiresAt: row.expiresAt?.toISOString() ?? null,
    skills: decodeTags(row.skillsJson), interests: decodeTags(row.interestsJson),
  };
}

export async function adminJobData() {
  // Vacancy management does not load or serialize census/SPES records.
  const [jobs,counts]=await Promise.all([prisma.jobOpportunity.findMany({orderBy:{updatedAt:"desc"},take:200}),prisma.jobOpportunity.groupBy({by:["status"],_count:{_all:true}})]);
  return {
    jobs:jobs.map(r=>({...r,skills:decodeTags(r.skillsJson),interests:decodeTags(r.interestsJson),createdAt:r.createdAt.toISOString(),updatedAt:r.updatedAt.toISOString(),publishedAt:r.publishedAt?.toISOString()??null,expiresAt:r.expiresAt?.toISOString().slice(0,10)??"",reviewRequestedAt:r.reviewRequestedAt?.toISOString()??null,reviewedAt:r.reviewedAt?.toISOString()??null})),
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
