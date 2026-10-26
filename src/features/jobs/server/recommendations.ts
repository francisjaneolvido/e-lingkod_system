import 'server-only';
import {prisma} from '@/lib/prisma';
import type {Prisma} from '@/generated/prisma/client';
import type {CivicViewer} from '@/features/civic/types';
import {CivicError} from '@/features/civic/validation';
import {decodeTags} from '../domain';
import {rankOpportunities,readiness,type OpportunityProfile} from '../opportunities-domain';
import {opportunitiesInTransaction} from './opportunities';
const emptyProfile=():OpportunityProfile=>({skills:[],qualifications:[],preferredOccupations:[]});
function profileFrom(row:Record<string,unknown>):OpportunityProfile{
 const duration=String(row.employmentLength||'');
 const experience:Record<string,string>={'No employment experience':'NONE_REQUIRED','Less than one year':'ENTRY_LEVEL','One year or more':'EXPERIENCED'};
 const type=String(row.preferredWorkArrangement||'');
 const arrangement=String(row.workArrangement||'');
 return {skills:decodeTags(String(row.skillsJson||'[]')),qualifications:decodeTags(String(row.qualificationsJson||'[]')),preferredOccupations:decodeTags(String(row.preferredOccupationsJson||'[]')),occupation:typeof row.occupation==='string'?row.occupation:null,education:typeof row.educationLevel==='string'?row.educationLevel:null,preferredArea:String(row.preferredWorkLocation||row.barangay||''),workType:['FULL_TIME','PART_TIME','CONTRACTUAL','PROJECT_BASED','TEMPORARY','INTERNSHIP'].includes(type)?type:null,workArrangement:['ON_SITE','HYBRID','REMOTE'].includes(type)?type:['ON_SITE','HYBRID','REMOTE'].includes(arrangement)?arrangement:null,experienceLevel:experience[duration]??null,trainingInterest:['YES','MAYBE'].includes(String(row.trainingInterest))?true:['NO','NOT_NOW'].includes(String(row.trainingInterest))?false:null,trainingPrograms:decodeTags(String(row.trainingProgramsJson||'[]')),employmentBarriers:decodeTags(String(row.employmentBarriersJson||'[]'))};
}
export async function recommendationsInTransaction(tx:Prisma.TransactionClient,userId:string,now=new Date()){
 const user=await tx.user.findUnique({where:{id:userId},select:{role:true}});
 if(user?.role!=='CITIZEN')return {consented:false,eligible:false,profile:emptyProfile(),matches:[],jobs:[],source:'none'};
 const consent=await tx.citizenProfileConsent.findUnique({where:{userId}});
 const annual=await tx.communitySurvey.findFirst({where:{userId,status:{in:['SUBMITTED','WITHDRAWN']}},orderBy:{surveyYear:'desc'}});
 const withdrawal=await tx.communitySurveyRevision.findFirst({where:{userId,action:'WITHDRAWN'},orderBy:[{surveyYear:'desc'},{revision:'desc'}],select:{surveyYear:true}});
 let profile=emptyProfile(),eligible=false,source='none';
 if(annual&&annual.status==='SUBMITTED'&&(!withdrawal||withdrawal.surveyYear<=annual.surveyYear)){profile=profileFrom(annual);eligible=true;source='submitted survey '+annual.surveyYear;}
 else if(!annual&&!withdrawal){
  const legacy=await tx.jobseekerProfile.findUnique({where:{userId}});
  if(legacy){profile={...emptyProfile(),skills:decodeTags(legacy.skillsJson),education:legacy.education,preferredArea:legacy.preferredArea,workType:legacy.availability};eligible=true;source='authorized legacy profile';}
  else {const draft=await tx.communitySurveyWorkspace.findFirst({where:{userId},orderBy:{surveyYear:'desc'},select:{draftJson:true}});if(draft?.draftJson){try{const v=JSON.parse(draft.draftJson);profile=profileFrom({...v,skillsJson:JSON.stringify(v.skills||[]),qualificationsJson:JSON.stringify(v.qualifications||[]),preferredOccupationsJson:JSON.stringify(v.preferredOccupations||[]),trainingProgramsJson:JSON.stringify(v.trainingPrograms||[]),employmentBarriersJson:JSON.stringify(v.employmentBarriers||[])});source='working draft (not eligible for matching)';}catch{ /* Invalid legacy draft is not a participation record. */ }}}
 }
 const jobs=consent?.matching&&eligible?await opportunitiesInTransaction(tx,now):[];
 return {consented:consent?.matching===true,eligible,profile,matches:consent?.matching&&eligible?rankOpportunities(jobs,profile,now):[],jobs,source};
}
export async function personalOpportunities(viewer:CivicViewer){
 if(viewer.role!=='CITIZEN')throw new CivicError('Only Citizen accounts can access personal readiness.',403);
 return prisma.$transaction(async tx=>{const result=await recommendationsInTransaction(tx,viewer.id);return {consented:result.consented,eligible:result.eligible,source:result.source,matches:result.matches,readiness:readiness(result.profile,result.consented?result.jobs:[])};},{isolationLevel:'RepeatableRead'});
}
export async function checkOpportunityNotices(viewer:CivicViewer){
 if(viewer.role!=='CITIZEN')throw new CivicError('Only Citizen accounts can check personal opportunities.',403);
 return prisma.$transaction(async tx=>{
  // Same user serialization as vacancy receipts; B1 consent writes are locked
  // separately so a consistent snapshot cannot grant consent from stale state.
  await tx.$queryRawUnsafe('SELECT id FROM user WHERE id=? FOR UPDATE',viewer.id);
  await tx.$queryRawUnsafe('SELECT userId FROM citizen_profile_consent WHERE userId=? FOR UPDATE',viewer.id);
  const result=await recommendationsInTransaction(tx,viewer.id);let created=0;
  type LockedJob={id:string;version:number;status:string;expiresAt:Date|null;isDemo:boolean;title:string;employerVerified:boolean;vacancyVerified:boolean};
  const locked=new Map<string,LockedJob>();
  // Personalized rankings can disagree across citizens. Acquire every candidate
  // lock in the same ID order, then retain ranking order for notice creation.
  for(const match of [...result.matches].sort((a,b)=>a.job.id<b.job.id?-1:a.job.id>b.job.id?1:0)){
   const [current]=await tx.$queryRawUnsafe<LockedJob[]>('SELECT id,version,status,expiresAt,isDemo,title,employerVerified,vacancyVerified FROM job_opportunity WHERE id=? FOR UPDATE',match.job.id);
   if(current)locked.set(current.id,current);
  }
  for(const match of result.matches){
   const current=locked.get(match.job.id);
   if(!current||current.version!==match.job.version||current.status!=='PUBLISHED'||!current.employerVerified||!current.vacancyVerified||current.expiresAt&&current.expiresAt<=new Date())continue;
   const where={userId:viewer.id,jobId:current.id,publicationVersion:current.version};
   if(await tx.jobRecommendation.findUnique({where:{userId_jobId_publicationVersion:where}}))continue;
   const notice=await tx.notification.create({data:{userId:viewer.id,module:'JOBS',type:'JOB_MATCH',title:current.isDemo?'[DEMO] Opportunity suggestion':'Opportunity suggestion',message:current.title+' — review the requirements; this is not a hiring or eligibility guarantee.',href:'/opportunities/'+current.id}});
   await tx.jobRecommendation.create({data:{...where,notificationId:notice.id}});created++;
  }
  return {created,matchingAllowed:result.consented&&result.eligible};
 },{isolationLevel:'RepeatableRead',maxWait:15000,timeout:20000});
}
export async function visibleRecommendationIds(tx:Prisma.TransactionClient,userId:string){
 const result=await recommendationsInTransaction(tx,userId);if(!result.consented||!result.eligible||!result.matches.length)return [];
 const rows=await tx.jobRecommendation.findMany({where:{userId,OR:result.matches.map(m=>({jobId:m.job.id,publicationVersion:m.job.version}))},select:{notificationId:true}});return rows.map(r=>r.notificationId);
}
