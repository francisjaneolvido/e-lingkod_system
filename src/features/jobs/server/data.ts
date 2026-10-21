import "server-only";
import { prisma } from "@/lib/prisma";
import { decodeTags, scoreMatch, type MatchProfile } from "../domain";

export async function publishedJobs() {
  const rows=await prisma.jobOpportunity.findMany({where:{status:"PUBLISHED",OR:[{expiresAt:null},{expiresAt:{gte:new Date()}}]},orderBy:{publishedAt:"desc"},take:250});
  return rows.map(row=>({id:row.id,title:row.title,employer:row.employer,sector:row.sector,workType:row.workType,barangay:row.barangay,location:row.location,description:row.description,education:row.education,contactInfo:row.contactInfo,externalUrl:row.externalUrl,expiresAt:row.expiresAt?.toISOString()??null,skills:decodeTags(row.skillsJson),interests:decodeTags(row.interestsJson)}));
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
  const [jobs,batches,counts,records,batchCount]=await Promise.all([
    prisma.jobOpportunity.findMany({orderBy:{updatedAt:"desc"},take:200}),
    prisma.spesImportBatch.findMany({orderBy:{createdAt:"desc"},take:30,select:{
      id:true,sourceLabel:true,recordCount:true,createdAt:true,datasetKind:true,status:true,voidedAt:true,voidReason:true,
      importedBy:{select:{name:true}},
      events:{orderBy:{createdAt:"desc"},take:3,select:{action:true,note:true,createdAt:true,actor:{select:{name:true}}}},
    }}),
    prisma.jobOpportunity.groupBy({by:["status"],_count:{_all:true}}),
    prisma.spesSurveyRecord.findMany({where:{batch:{status:"ACTIVE"}},select:{skillsJson:true,interestsJson:true,barangay:true,availability:true,batch:{select:{datasetKind:true}}}}),
    prisma.spesImportBatch.count(),
  ]);
  type InsightKind="DEMO"|"REAL"|"UNCLASSIFIED"|"ALL";
  function summarize(kind:InsightKind){
    const subset=kind==="ALL"?records:records.filter(r=>r.batch.datasetKind===kind);
    const skillCounts=new Map<string,number>();const barangayCounts=new Map<string,number>();
    for(const row of subset){
      for(const skill of decodeTags(row.skillsJson))skillCounts.set(skill,(skillCounts.get(skill)||0)+1);
      barangayCounts.set(row.barangay,(barangayCounts.get(row.barangay)||0)+1);
    }
    const opportunitySignals=jobs.filter(j=>j.status==="PUBLISHED"&&(!j.expiresAt||j.expiresAt>=new Date())).map(j=>{
      const needed=new Set(decodeTags(j.skillsJson));
      const aligned=subset.filter(row=>decodeTags(row.skillsJson).some(skill=>needed.has(skill))&&(row.availability==="ANY"||row.availability===j.workType)).length;
      return {id:j.id,title:j.title,aligned};
    }).sort((a,b)=>b.aligned-a.aligned).slice(0,8);
    return {total:subset.length,areaCount:barangayCounts.size,
      topSkills:[...skillCounts].sort((a,b)=>b[1]-a[1]).slice(0,8),
      topBarangays:[...barangayCounts].sort((a,b)=>b[1]-a[1]).slice(0,8),opportunitySignals};
  }
  const insights={DEMO:summarize("DEMO"),REAL:summarize("REAL"),UNCLASSIFIED:summarize("UNCLASSIFIED"),ALL:summarize("ALL")};
  const all=insights.ALL;
  return {
    insights, batchCount,
    opportunitySignals:all.opportunitySignals,
    jobs:jobs.map(r=>({...r,skills:decodeTags(r.skillsJson),interests:decodeTags(r.interestsJson),createdAt:r.createdAt.toISOString(),updatedAt:r.updatedAt.toISOString(),publishedAt:r.publishedAt?.toISOString()??null,expiresAt:r.expiresAt?.toISOString().slice(0,10)??"",reviewRequestedAt:r.reviewRequestedAt?.toISOString()??null,reviewedAt:r.reviewedAt?.toISOString()??null})),
    batches:batches.map(b=>({...b,createdAt:b.createdAt.toISOString(),voidedAt:b.voidedAt?.toISOString()??null,importedBy:b.importedBy.name,events:b.events.map(e=>({...e,createdAt:e.createdAt.toISOString(),actor:e.actor.name}))})),
    totalSurveys:all.total,topSkills:all.topSkills,topBarangays:all.topBarangays,
    stats:Object.fromEntries(counts.map(c=>[c.status,c._count._all])) as Record<string,number>,
  };
}
export async function profileForCitizen(userId:string):Promise<MatchProfile|null> {
  const r=await prisma.jobseekerProfile.findUnique({where:{userId}});
  return r ? {skills:decodeTags(r.skillsJson),interests:decodeTags(r.interestsJson),education:r.education,preferredArea:r.preferredArea,availability:r.availability} : null;
}
export function rankJobs<T extends {skills:string[];interests:string[];workType:string;barangay:string;education:string}>(jobs:T[],profile:MatchProfile|null) {
  return jobs.map(job=>({...job,match:profile?scoreMatch(profile,job):null})).sort((a,b)=>(b.match?.score??0)-(a.match?.score??0));
}
