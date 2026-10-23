import "server-only";
import { createHash } from "node:crypto";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";
import type { CivicViewer } from "@/features/civic/types";
import { CivicError } from "@/features/civic/validation";
import { parseCommunitySurvey, decodeList } from "../domain";

type Tx = Prisma.TransactionClient;
type Answers = ReturnType<typeof parseCommunitySurvey>;
const listFields = ["skills","trainingCategories","trainingPrograms","trainingBarriers","employmentBarriers","preferredOccupations","businessChallenges","businessSupport","priorityPrograms","publicServiceBarriers","qualifications","completedTraining"] as const;
export function surveyYear(value: unknown) {
  const year=Number(value??new Date().getFullYear());
  if(!Number.isInteger(year)||year<2020||year>new Date().getFullYear()+1)throw new CivicError("Choose a valid survey year.",400);
  return year;
}
function object(value: unknown): Record<string,unknown> {
  if(!value||typeof value!=="object"||Array.isArray(value))throw new CivicError("Invalid survey request.",400);
  return value as Record<string,unknown>;
}
function version(value: unknown) {
  if(!Number.isSafeInteger(value)||Number(value)<0)throw new CivicError("Refresh your profile before saving; its version is required.",400);
  return Number(value);
}
function requestKey(value: unknown) {
  if(typeof value!=="string"||!/^[a-zA-Z0-9_-]{16,64}$/.test(value))throw new CivicError("A valid submission request key is required.",400);
  return value;
}
function citizen(viewer: CivicViewer){if(viewer.role!=="CITIZEN")throw new CivicError("Only Citizen accounts can manage a personal survey.",403);}
function hash(value: unknown){return createHash("sha256").update(JSON.stringify(value)).digest("hex");}

export function decodeSurveyAnswers(value: Record<string,unknown>): Record<string,unknown> {
  const result={...value};
  for(const name of listFields){
    if(!Array.isArray(result[name]))result[name]=decodeList(typeof result[name+"Json"]==="string"?result[name+"Json"] as string:null);
    delete result[name+"Json"];
  }
  if(!result.skillLevels){try{result.skillLevels=JSON.parse(String(result.skillLevelsJson||"{}"));}catch{result.skillLevels={};}}
  delete result.skillLevelsJson;
  for(const name of ["id","userId","surveyVersion","createdAt","updatedAt","submittedAt"])delete result[name];
  for(const name of ["currentlyStudying","workRelatedToEducation","interestedNewWork","willingOutsideMunicipality","interestedGovPrograms","interestedLivelihood","interestedEntrepreneurship","consentAggregated","consentOpportunityRecommendations","consentProgramRecommendations"]){
    if(result[name]===0||result[name]===1)result[name]=result[name]===1;
  }
  return result;
}
function stored(value: string){return decodeSurveyAnswers(object(JSON.parse(value)));}
function currentData(answers: Answers){
  const {skills,skillLevels,trainingCategories,trainingPrograms,trainingBarriers,employmentBarriers,preferredOccupations,businessChallenges,businessSupport,priorityPrograms,publicServiceBarriers,qualifications,completedTraining,...fields}=answers;
  return {...fields,surveyVersion:2,submittedAt:new Date(),
    skillsJson:JSON.stringify(skills),skillLevelsJson:JSON.stringify(skillLevels),
    trainingCategoriesJson:JSON.stringify(trainingCategories),trainingProgramsJson:JSON.stringify(trainingPrograms),
    trainingBarriersJson:JSON.stringify(trainingBarriers),employmentBarriersJson:JSON.stringify(employmentBarriers),
    preferredOccupationsJson:JSON.stringify(preferredOccupations),businessChallengesJson:JSON.stringify(businessChallenges),
    businessSupportJson:JSON.stringify(businessSupport),priorityProgramsJson:JSON.stringify(priorityPrograms),
    publicServiceBarriersJson:JSON.stringify(publicServiceBarriers),qualificationsJson:JSON.stringify(qualifications),completedTrainingJson:JSON.stringify(completedTraining)};
}
async function setConsent(tx:Tx,userId:string,expected:number,matching:boolean,programs:boolean){
  await tx.citizenProfileConsent.upsert({where:{userId},create:{userId},update:{}});
  const changed=await tx.citizenProfileConsent.updateMany({where:{userId,version:expected},data:{matching,programs,version:{increment:1}}});
  if(changed.count!==1)throw new CivicError("Your consent preferences changed. Refresh before saving.",409);
  await tx.communitySurvey.updateMany({where:{userId},data:{consentOpportunityRecommendations:matching,consentProgramRecommendations:programs}});
  return expected+1;
}
export async function currentProfileConsent(userId:string){return prisma.citizenProfileConsent.findUnique({where:{userId}});}
export async function ownedSurveyState(userId:string,year=new Date().getFullYear()){
  year=surveyYear(year);const where={userId_surveyYear:{userId,surveyYear:year}};
  // InnoDB consistent reads share one snapshot; ReadCommitted can mix revisions.
  const [workspace,current,consent,revisions]=await prisma.$transaction(tx=>Promise.all([
    tx.communitySurveyWorkspace.findUnique({where}),tx.communitySurvey.findUnique({where}),tx.citizenProfileConsent.findUnique({where:{userId}}),
    tx.communitySurveyRevision.findMany({where:{userId,surveyYear:year},orderBy:{revision:"desc"},select:{id:true,revision:true,action:true,actorId:true,createdAt:true,answersJson:true}})]),{isolationLevel:"RepeatableRead"});
  const submitted=current?decodeSurveyAnswers(current as unknown as Record<string,unknown>):null;
  const draft=workspace?.draftJson?stored(workspace.draftJson):null;
  const participationStatus=current?.status??(revisions[0]?.action==="WITHDRAWN"?"WITHDRAWN":null);
  const active=draft??(current?.status==="SUBMITTED"?submitted:null);
  return {...(active??{}),surveyYear:year,status:draft?"DRAFT":participationStatus??"DRAFT",
    workspaceVersion:workspace?.version??0,consentVersion:consent?.version??0,
    consentOpportunityRecommendations:consent?.matching??false,consentProgramRecommendations:consent?.programs??false,
    hasDraft:Boolean(draft),submittedStatus:participationStatus,
    submitted:submitted?{...submitted,createdAt:current!.createdAt.toISOString(),updatedAt:current!.updatedAt.toISOString(),submittedAt:current!.submittedAt?.toISOString()??null}:null,
    updatedAt:workspace?.updatedAt.toISOString()??current?.updatedAt.toISOString()??null,
    history:revisions.map(row=>({id:row.id,revision:row.revision,action:row.action,actorId:row.actorId,createdAt:row.createdAt.toISOString(),answers:stored(row.answersJson)}))};
}
function replay(row:{payloadHash:string;resultVersion:number;revision:number;id:string},payloadHash:string){
  if(row.payloadHash!==payloadHash)throw new CivicError("This submission key was already used for different answers. Start a new submission.",409);
  return {success:true,version:row.resultVersion,revision:row.revision,revisionId:row.id,replayed:true};
}
export async function saveCitizenSurvey(input:unknown,viewer:CivicViewer){
  citizen(viewer);const raw=object(input),answers=parseCommunitySurvey(raw),expected=version(raw.expectedVersion);
  const key=answers.status==="SUBMITTED"?requestKey(raw.requestKey):null,payloadHash=hash(answers);
  const revisionKey=key?{userId_requestKey:{userId:viewer.id,requestKey:key}}:null;
  try{return await prisma.$transaction(async tx=>{
    if(revisionKey){const previous=await tx.communitySurveyRevision.findUnique({where:revisionKey});if(previous)return replay(previous,payloadHash);}
    const where={userId_surveyYear:{userId:viewer.id,surveyYear:answers.surveyYear}};
    await tx.communitySurveyWorkspace.upsert({where,create:{userId:viewer.id,surveyYear:answers.surveyYear},update:{}});
    const changed=await tx.communitySurveyWorkspace.updateMany({where:{userId:viewer.id,surveyYear:answers.surveyYear,version:expected},data:{version:{increment:1},draftJson:answers.status==="DRAFT"?JSON.stringify(answers):null}});
    if(changed.count!==1){
      const previous=revisionKey?await tx.communitySurveyRevision.findUnique({where:revisionKey}):null;
      if(previous)return replay(previous,payloadHash);
      throw new CivicError("This survey changed in another tab. Refresh to review the latest answers.",409);
    }
    if(answers.status==="DRAFT")return {success:true,status:"DRAFT",surveyYear:answers.surveyYear,version:expected+1};
    const consentVersion=await setConsent(tx,viewer.id,version(raw.expectedConsentVersion),answers.consentOpportunityRecommendations,answers.consentProgramRecommendations);
    const data=currentData(answers);
    await tx.communitySurvey.upsert({where,create:{userId:viewer.id,...data},update:data});
    const revision=await tx.communitySurveyRevision.count({where:{userId:viewer.id,surveyYear:answers.surveyYear}})+1;
    const saved=await tx.communitySurveyRevision.create({data:{userId:viewer.id,actorId:viewer.id,surveyYear:answers.surveyYear,revision,action:"SUBMITTED",requestKey:key!,payloadHash,resultVersion:expected+1,answersJson:JSON.stringify(answers)}});
    return {success:true,status:"SUBMITTED",surveyYear:answers.surveyYear,version:expected+1,consentVersion,revision,revisionId:saved.id,replayed:false};
  },{isolationLevel:"ReadCommitted"});}
  catch(error){
    if(error&&typeof error==="object"&&"code" in error&&["P2002","P2034"].includes(String(error.code))){
      const previous=revisionKey?await prisma.communitySurveyRevision.findUnique({where:revisionKey}):null;
      if(previous)return replay(previous,payloadHash);
      throw new CivicError("This survey changed while saving. Refresh and try again.",409);
    }
    throw error;
  }
}
export async function changeCitizenConsent(input:unknown,viewer:CivicViewer){
  citizen(viewer);const raw=object(input);
  if(typeof raw.matching!=="boolean"||typeof raw.programs!=="boolean")throw new CivicError("Choose true or false for each optional recommendation purpose.",400);
  const consentVersion=await prisma.$transaction(tx=>setConsent(tx,viewer.id,version(raw.expectedConsentVersion),raw.matching as boolean,raw.programs as boolean));
  return {success:true,consentVersion};
}
export async function withdrawCitizenSurvey(input:unknown,viewer:CivicViewer){
  citizen(viewer);const raw=object(input),year=surveyYear(raw.surveyYear),expected=version(raw.expectedVersion),key=requestKey(raw.requestKey);
  const payloadHash=hash({action:"WITHDRAWN",surveyYear:year});
  return prisma.$transaction(async tx=>{
    const previous=await tx.communitySurveyRevision.findUnique({where:{userId_requestKey:{userId:viewer.id,requestKey:key}}});
    if(previous)return replay(previous,payloadHash);
    const where={userId_surveyYear:{userId:viewer.id,surveyYear:year}};
    const [workspace,current]=await Promise.all([tx.communitySurveyWorkspace.findUnique({where}),tx.communitySurvey.findUnique({where})]);
    if(!workspace&&!current)throw new CivicError("No survey was found for this year.",404);
    const changed=await tx.communitySurveyWorkspace.updateMany({where:{userId:viewer.id,surveyYear:year,version:expected},data:{version:{increment:1},draftJson:null}});
    if(changed.count!==1){
      const repeated=await tx.communitySurveyRevision.findUnique({where:{userId_requestKey:{userId:viewer.id,requestKey:key}}});
      if(repeated)return replay(repeated,payloadHash);
      throw new CivicError("This survey changed. Refresh before withdrawing.",409);
    }
    const consentVersion=await setConsent(tx,viewer.id,version(raw.expectedConsentVersion),false,false);
    if(current)await tx.communitySurvey.update({where,data:{status:"WITHDRAWN"}});
    const revision=await tx.communitySurveyRevision.count({where:{userId:viewer.id,surveyYear:year}})+1;
    const saved=await tx.communitySurveyRevision.create({data:{userId:viewer.id,actorId:viewer.id,surveyYear:year,revision,action:"WITHDRAWN",requestKey:key,payloadHash,resultVersion:expected+1,answersJson:JSON.stringify(current?decodeSurveyAnswers(current as unknown as Record<string,unknown>):{surveyYear:year})}});
    return {success:true,status:"WITHDRAWN",version:expected+1,consentVersion,revisionId:saved.id};
  },{isolationLevel:"ReadCommitted"});
}

