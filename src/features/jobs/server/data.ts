import "server-only";
import { prisma } from "@/lib/prisma";
import { decodeTags, scoreMatch, type MatchProfile } from "../domain";

export async function publishedJobs() {
  const rows=await prisma.jobOpportunity.findMany({where:{status:"PUBLISHED",OR:[{expiresAt:null},{expiresAt:{gte:new Date()}}]},orderBy:{publishedAt:"desc"},take:250});
  return rows.map(row=>({id:row.id,title:row.title,employer:row.employer,sector:row.sector,workType:row.workType,barangay:row.barangay,location:row.location,description:row.description,education:row.education,contactInfo:row.contactInfo,externalUrl:row.externalUrl,expiresAt:row.expiresAt?.toISOString()??null,skills:decodeTags(row.skillsJson),interests:decodeTags(row.interestsJson)}));
}
export async function adminJobData() {
  const [jobs,batches,counts,records]=await Promise.all([
    prisma.jobOpportunity.findMany({orderBy:{updatedAt:"desc"},take:200}),
    prisma.spesImportBatch.findMany({orderBy:{createdAt:"desc"},take:10,select:{id:true,sourceLabel:true,recordCount:true,createdAt:true}}),
    prisma.jobOpportunity.groupBy({by:["status"],_count:{_all:true}}),
    prisma.spesSurveyRecord.findMany({select:{skillsJson:true,interestsJson:true,barangay:true,availability:true}}),
  ]);
  const skillCounts=new Map<string,number>();const barangayCounts=new Map<string,number>();
  for(const row of records){for(const skill of decodeTags(row.skillsJson))skillCounts.set(skill,(skillCounts.get(skill)||0)+1);barangayCounts.set(row.barangay,(barangayCounts.get(row.barangay)||0)+1);}
  const opportunitySignals=jobs.filter(j=>j.status==="PUBLISHED").map(j=>{
    const needed=new Set(decodeTags(j.skillsJson));
    const aligned=records.filter(row=>decodeTags(row.skillsJson).some(skill=>needed.has(skill)) && (row.availability==="ANY"||row.availability===j.workType)).length;
    return {id:j.id,title:j.title,aligned};
  }).sort((a,b)=>b.aligned-a.aligned).slice(0,8);
  return {opportunitySignals,jobs:jobs.map(r=>({...r,skills:decodeTags(r.skillsJson),interests:decodeTags(r.interestsJson),createdAt:r.createdAt.toISOString(),updatedAt:r.updatedAt.toISOString(),publishedAt:r.publishedAt?.toISOString()??null,expiresAt:r.expiresAt?.toISOString().slice(0,10)??""})),
    batches:batches.map(b=>({...b,createdAt:b.createdAt.toISOString()})),
    totalSurveys:records.length,topSkills:[...skillCounts].sort((a,b)=>b[1]-a[1]).slice(0,8),topBarangays:[...barangayCounts].sort((a,b)=>b[1]-a[1]).slice(0,8),
    stats:Object.fromEntries(counts.map(c=>[c.status,c._count._all])) as Record<string,number>};
}
export async function profileForCitizen(userId:string):Promise<MatchProfile|null> {
  const r=await prisma.jobseekerProfile.findUnique({where:{userId}});
  return r ? {skills:decodeTags(r.skillsJson),interests:decodeTags(r.interestsJson),education:r.education,preferredArea:r.preferredArea,availability:r.availability} : null;
}
export function rankJobs<T extends {skills:string[];interests:string[];workType:string;barangay:string;education:string}>(jobs:T[],profile:MatchProfile|null) {
  return jobs.map(job=>({...job,match:profile?scoreMatch(profile,job):null})).sort((a,b)=>(b.match?.score??0)-(a.match?.score??0));
}
