import 'server-only';
import {createHash} from 'node:crypto';
import {prisma} from '@/lib/prisma';
import {hasModuleAccess} from '@/lib/staff-access';
import type {Prisma} from '@/generated/prisma/client';
import type {CivicViewer} from '@/features/civic/types';
import {CivicError} from '@/features/civic/validation';
import {parseJob} from '../domain';
import {parseVacancyDetails} from '../opportunities-domain';
import {parseReviewDetails,validateJobTransition,type JobAction,type JobStatus} from '../review-workflow';
function fail(message:string,status=400):never{throw new CivicError(message,status);}
const object=(v:unknown):Record<string,unknown>=>v&&typeof v==='object'&&!Array.isArray(v)?v as Record<string,unknown>:fail('Invalid vacancy request.');
const stable=(v:unknown):unknown=>v instanceof Date?v.toISOString():Array.isArray(v)?v.map(stable):v&&typeof v==='object'?Object.fromEntries(Object.entries(v).sort(([a],[b])=>a.localeCompare(b)).map(([k,x])=>[k,stable(x)])):v;
const hash=(v:unknown)=>createHash('sha256').update(JSON.stringify(stable(v))).digest('hex');
async function authority(viewer:CivicViewer){if(!await hasModuleAccess(viewer,'JOBS'))fail('JOBS authority required.',403);}
async function receipt<T extends {id:string}>(viewer:CivicViewer,kind:string,input:Record<string,unknown>,action:(tx:Prisma.TransactionClient)=>Promise<T>,jobId?:string){
 await authority(viewer);
 const payloadHash=hash({kind,jobId:jobId??null,input:Object.fromEntries(Object.entries(input).filter(([k])=>k!=='requestKey'))});
 const requestKey=input.requestKey===undefined?'legacy_'+payloadHash:typeof input.requestKey==='string'&&/^[A-Za-z0-9_-]{8,128}$/.test(input.requestKey)?input.requestKey:fail('Invalid request key.');
 return prisma.$transaction(async tx=>{
  await tx.$queryRawUnsafe('SELECT id FROM user WHERE id=? FOR UPDATE',viewer.id);
  if(jobId){const job=await tx.jobOpportunity.findUnique({where:{id:jobId},select:{createdById:true}});if(!job)fail('Opportunity not found.',404);if(viewer.role!=='ADMIN'&&job.createdById!==viewer.id)fail('Only the creator or Admin may maintain this vacancy.',403);}
  if(['APPROVE','RETURN'].includes(kind)&&viewer.role!=='ADMIN')fail('Only Admin may review publication.',403);
  const prior=await tx.jobMutation.findUnique({where:{actorId_requestKey:{actorId:viewer.id,requestKey}}});
  if(prior){if(prior.payloadHash!==payloadHash)fail('Request key belongs to different vacancy changes.',409);const {snapshot:ignored,...result}=JSON.parse(prior.resultJson);void ignored;return {...result as T,replayed:true};}
  const result=await action(tx);const snapshot=await tx.jobOpportunity.findUniqueOrThrow({where:{id:result.id}});await tx.jobMutation.create({data:{actorId:viewer.id,requestKey,payloadHash,jobId:result.id,resultJson:JSON.stringify({...result,snapshot})}});return {...result,replayed:false};
 },{isolationLevel:'ReadCommitted',maxWait:15000,timeout:20000});
}
const explicitDemo=(title:string,employer:string)=>title.startsWith('[DEMO]')||employer.startsWith('[DEMO]');
export async function createOpportunity(input:unknown,viewer:CivicViewer){
 const raw=object(input),value=parseJob(raw),details=parseVacancyDetails(raw);
 return receipt(viewer,'CREATE',raw,async tx=>{
  const {skills,interests,...fields}=value;
  const row=await tx.jobOpportunity.create({data:{...fields,skillsJson:JSON.stringify(skills),interestsJson:JSON.stringify(interests),...details,isDemo:details.isDemo||explicitDemo(value.title,value.employer),createdById:viewer.id} as Prisma.JobOpportunityUncheckedCreateInput});
  const activity=await tx.jobActivity.create({data:{jobId:row.id,actorId:viewer.id,action:'CREATE'}});return {id:row.id,status:row.status,activityId:activity.id,notificationIds:[] as string[]};
 });
}
export async function mutateOpportunity(id:string,input:unknown,viewer:CivicViewer){
 if(!id||id.length>191)fail('Invalid opportunity.');const raw=object(input),action=raw.action as JobAction;
 if(!['EDIT','SUBMIT_REVIEW','APPROVE','RETURN','CLOSE','FILL','ARCHIVE'].includes(action))fail('Invalid opportunity action.');
 return receipt(viewer,action,raw,async tx=>{
  const job=await tx.jobOpportunity.findUniqueOrThrow({where:{id}});
  const expected=raw.expectedVersion??raw.version;
  if(!Number.isSafeInteger(expected)||expected!==job.version)fail('This opportunity changed. Refresh before saving.',409);
  validateJobTransition(action,job.status as JobStatus,viewer.role==='ADMIN');
  let update:Prisma.JobOpportunityUncheckedUpdateManyInput={},note:string|null=null,nextStatus:JobStatus=job.status as JobStatus;
  if(action==='EDIT'){
   const data=object(raw.job),v=parseJob(data),details=parseVacancyDetails(data);
   const patch:Record<string,unknown>={};
   for(const key of ['occupationCategory','employmentSector','workArrangement','experienceLevel'])if(Object.hasOwn(data,key))patch[key]=details[key as keyof typeof details];
   if(Object.hasOwn(data,'certifications'))patch.certificationsJson=details.certificationsJson;
   if(['payMin','payMax','payCurrency','payBasis','negotiable'].some(k=>Object.hasOwn(data,k)))for(const key of ['payMin','payMax','payCurrency','payBasis','negotiable'])patch[key]=details[key as keyof typeof details];
   const {skills,interests,...fields}=v;
   nextStatus='DRAFT';update={...fields,...patch,skillsJson:JSON.stringify(skills),interestsJson:JSON.stringify(interests),isDemo:job.isDemo||details.isDemo||explicitDemo(v.title,v.employer),status:'DRAFT',reviewedAt:null,reviewedById:null,reviewNote:null,reviewRequestedAt:null,employerVerified:false,vacancyVerified:false,publishedAt:null};
  }else if(action==='SUBMIT_REVIEW'||action==='APPROVE'){
   parseVacancyDetails({...job,payMin:job.payMin?.toFixed(2),payMax:job.payMax?.toFixed(2),certifications:undefined},true);
   if(!job.reviewSource||job.reviewSource.trim().length<12)fail('Record the authorized employer/vacancy source before publication.');
   if(job.expiresAt&&job.expiresAt<=new Date())fail('Update the expired vacancy before publication.',409);
   if(action==='SUBMIT_REVIEW'){nextStatus='PENDING_REVIEW';update={status:nextStatus,reviewRequestedAt:new Date(),reviewNote:null};note='Submitted recorded employer/vacancy source for Admin review.';}
   else {const decision=parseReviewDetails(raw,'APPROVE');nextStatus='PUBLISHED';update={status:nextStatus,reviewedById:viewer.id,reviewedAt:new Date(),reviewNote:decision.note||null,employerVerified:decision.employerVerified,vacancyVerified:decision.vacancyVerified,publishedAt:new Date()};note=decision.note||'Employer and vacancy checked by reviewer.';}
  }else if(action==='RETURN'){
   const decision=parseReviewDetails(raw,'RETURN');nextStatus='RETURNED';update={status:nextStatus,reviewedById:viewer.id,reviewedAt:new Date(),reviewNote:decision.note,employerVerified:false,vacancyVerified:false};note=decision.note;
  }else {nextStatus=action==='CLOSE'?'CLOSED':action==='FILL'?'FILLED':'ARCHIVED';update={status:nextStatus};note='Vacancy marked '+nextStatus.toLowerCase()+'.';}
  const changed=await tx.jobOpportunity.updateMany({where:{id,version:expected as number,status:job.status},data:{...update,version:{increment:1}}});if(changed.count!==1)fail('Vacancy changed concurrently.',409);
  const activity=await tx.jobActivity.create({data:{jobId:id,actorId:viewer.id,action,note,previousStatus:job.status,nextStatus}});const notificationIds:string[]=[];
  if(action==='SUBMIT_REVIEW'){
   const admins=await tx.user.findMany({where:{role:'ADMIN'},select:{id:true}});for(const u of admins){const notice=await tx.notification.create({data:{userId:u.id,module:'JOBS',type:'JOB_REVIEW',title:'Opportunity ready for verification',message:job.title,href:'/admin/jobs'}});notificationIds.push(notice.id);}
  }else if(action==='APPROVE'||action==='RETURN'){const notice=await tx.notification.create({data:{userId:job.createdById,module:'JOBS',type:action==='APPROVE'?'JOB_APPROVED':'JOB_RETURNED',title:action==='APPROVE'?'Opportunity published':'Opportunity returned for correction',message:job.title,href:'/admin/jobs'}});notificationIds.push(notice.id);}
  return {id,status:nextStatus,activityId:activity.id,notificationIds};
 },id);
}
