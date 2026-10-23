import "server-only";
import { prisma } from "@/lib/prisma";
import { decodeList, EMPLOYMENT_LABELS } from "../domain";
import { INTERESTS, type MatchProfile } from "@/features/jobs/domain";
import { currentProfileConsent, ownedSurveyState } from "./survey-lifecycle";

export type InsightRow = {
  source: "CITIZEN_SURVEY"|"HISTORICAL";
  year: number;
  barangay: string;
  ageGroup: string;
  educationLevel: string;
  employmentStatus: string;
  occupation: string;
  industry: string;
  skills: string[];
  trainingInterest: string;
  trainingCategories: string[];
  trainingPrograms: string[];
  trainingBarriers: string[];
  employmentBarriers: string[];
  businessSector: string;
  assistanceNeeded: string[];
  programAwareness: string;
  informationAccess: string;
  participatedConsultation: string;
  priorityPrograms: string[];
  publicServiceBarriers: string[];
  serviceSatisfaction: number|null;
};

function counts(values:string[]) {
  const map=new Map<string,number>();
  for(const value of values.map(v=>v.trim()).filter(Boolean)) map.set(value,(map.get(value)||0)+1);
  return [...map.entries()].sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0]));
}
function flatten(rows:InsightRow[], key:keyof InsightRow):string[]{
  return rows.flatMap(row=>Array.isArray(row[key]) ? row[key] as string[] : [String(row[key]||"")]).filter(Boolean);
}
function summarize(rows:InsightRow[]) {
  const employed=new Set(["EMPLOYED_FULL_TIME","EMPLOYED_PART_TIME","SELF_EMPLOYED","BUSINESS_OWNER","FREELANCER","INFORMAL_WORKER","SEASONAL_WORKER","OFW"]);
  const unemployed=new Set(["UNEMPLOYED_LOOKING","UNEMPLOYED_NOT_LOOKING"]);
  const interestedTraining=rows.filter(r=>r.trainingInterest==="YES"||r.trainingInterest==="MAYBE").length;
  const employedCount=rows.filter(r=>employed.has(r.employmentStatus)).length;
  const unemployedCount=rows.filter(r=>unemployed.has(r.employmentStatus)).length;
  return {
    total:rows.length,
    sourceCounts:{citizen:rows.filter(r=>r.source==="CITIZEN_SURVEY").length,historical:rows.filter(r=>r.source==="HISTORICAL").length},
    employedCount,unemployedCount,interestedTraining,
    employment:counts(rows.map(r=>r.employmentStatus)).map(([key,count])=>({key,label:EMPLOYMENT_LABELS[key]||key,count})),
    barangays:counts(rows.map(r=>r.barangay)).map(([label,count])=>({label,count})),
    education:counts(rows.map(r=>r.educationLevel)).map(([label,count])=>({label,count})),
    skills:counts(flatten(rows,"skills")).map(([label,count])=>({label,count})),
    trainingCategories:counts(flatten(rows,"trainingCategories")).map(([label,count])=>({label,count})),
    trainingPrograms:counts(flatten(rows,"trainingPrograms")).map(([label,count])=>({label,count})),
    trainingBarriers:counts(flatten(rows,"trainingBarriers")).map(([label,count])=>({label,count})),
    employmentBarriers:counts(flatten(rows,"employmentBarriers")).map(([label,count])=>({label,count})),
    occupations:counts(rows.map(r=>r.occupation)).map(([label,count])=>({label,count})),
    industries:counts(rows.map(r=>r.industry)).map(([label,count])=>({label,count})),
    businessSectors:counts(rows.map(r=>r.businessSector)).map(([label,count])=>({label,count})),
    assistance:counts(flatten(rows,"assistanceNeeded")).map(([label,count])=>({label,count})),
    programAwareness:counts(rows.map(r=>r.programAwareness)).map(([label,count])=>({label,count})),
    informationAccess:counts(rows.map(r=>r.informationAccess)).map(([label,count])=>({label,count})),
    consultationParticipation:counts(rows.map(r=>r.participatedConsultation)).map(([label,count])=>({label,count})),
    priorityPrograms:counts(flatten(rows,"priorityPrograms")).map(([label,count])=>({label,count})),
    publicServiceBarriers:counts(flatten(rows,"publicServiceBarriers")).map(([label,count])=>({label,count})),
    averageServiceSatisfaction:rows.some(r=>r.serviceSatisfaction!==null)?Math.round((rows.filter(r=>r.serviceSatisfaction!==null).reduce((n,r)=>n+(r.serviceSatisfaction||0),0)/rows.filter(r=>r.serviceSatisfaction!==null).length)*10)/10:null,
  };
}

async function citizenRows(year?:number):Promise<InsightRow[]> {
  const surveys=await prisma.communitySurvey.findMany({
    where:{status:"SUBMITTED",consentAggregated:true,...(year?{surveyYear:year}:{})},
    select:{surveyYear:true,barangay:true,ageGroup:true,educationLevel:true,employmentStatus:true,occupation:true,industry:true,skillsJson:true,trainingInterest:true,trainingCategoriesJson:true,trainingProgramsJson:true,trainingBarriersJson:true,employmentBarriersJson:true,businessSector:true,businessSupportJson:true,programAwareness:true,informationAccess:true,participatedConsultation:true,priorityProgramsJson:true,publicServiceBarriersJson:true,serviceSatisfaction:true},
  });
  return surveys.map(row=>({source:"CITIZEN_SURVEY",year:row.surveyYear,barangay:row.barangay,ageGroup:row.ageGroup,educationLevel:row.educationLevel,employmentStatus:row.employmentStatus,occupation:row.occupation||"",industry:row.industry||"",skills:decodeList(row.skillsJson),trainingInterest:row.trainingInterest||"",trainingCategories:decodeList(row.trainingCategoriesJson),trainingPrograms:decodeList(row.trainingProgramsJson),trainingBarriers:decodeList(row.trainingBarriersJson),employmentBarriers:decodeList(row.employmentBarriersJson),businessSector:row.businessSector||"",assistanceNeeded:decodeList(row.businessSupportJson),programAwareness:row.programAwareness||"",informationAccess:row.informationAccess||"",participatedConsultation:row.participatedConsultation||"",priorityPrograms:decodeList(row.priorityProgramsJson),publicServiceBarriers:decodeList(row.publicServiceBarriersJson),serviceSatisfaction:row.serviceSatisfaction}));
}
async function importedRows(publicOnly:boolean):Promise<InsightRow[]> {
  const records=await prisma.communityImportRecord.findMany({
    where:{batch:{status:"ACTIVE",...(publicOnly?{activity:{intendedUse:"PUBLIC_AGGREGATED"}}:{})}},
    select:{barangay:true,ageGroup:true,educationLevel:true,employmentStatus:true,occupation:true,industry:true,skillsJson:true,trainingInterest:true,trainingCategoriesJson:true,trainingProgramsJson:true,trainingBarriersJson:true,employmentBarriersJson:true,businessSector:true,assistanceNeededJson:true,batch:{select:{activity:{select:{activityDate:true}}}}},
    take:20000,
  });
  return records.map(row=>({source:"HISTORICAL",year:row.batch.activity.activityDate?.getFullYear()||0,barangay:row.barangay||"",ageGroup:row.ageGroup||"",educationLevel:row.educationLevel||"",employmentStatus:row.employmentStatus||"",occupation:row.occupation||"",industry:row.industry||"",skills:decodeList(row.skillsJson),trainingInterest:row.trainingInterest||"",trainingCategories:decodeList(row.trainingCategoriesJson),trainingPrograms:decodeList(row.trainingProgramsJson),trainingBarriers:decodeList(row.trainingBarriersJson),employmentBarriers:decodeList(row.employmentBarriersJson),businessSector:row.businessSector||"",assistanceNeeded:decodeList(row.assistanceNeededJson),programAwareness:"",informationAccess:"",participatedConsultation:"",priorityPrograms:[],publicServiceBarriers:[],serviceSatisfaction:null}));
}

function suppress<T extends {count:number}>(items:T[], minimum=5):T[]{return items.filter(item=>item.count>=minimum);}
export type EmploymentInsightFilters={barangay?:string;employmentStatus?:string;educationLevel?:string;ageGroup?:string;source?:string;year?:number};
function filterRows(rows:InsightRow[],filters:EmploymentInsightFilters){return rows.filter(row=>(!filters.barangay||row.barangay===filters.barangay)&&(!filters.employmentStatus||row.employmentStatus===filters.employmentStatus)&&(!filters.educationLevel||row.educationLevel===filters.educationLevel)&&(!filters.ageGroup||row.ageGroup===filters.ageGroup)&&(!filters.source||filters.source==="ALL"||row.source===filters.source)&&(!filters.year||row.year===filters.year));}
export async function publicEmploymentInsights(filters:EmploymentInsightFilters={}) {
  const [citizen,historical]=await Promise.all([citizenRows(),importedRows(true)]);
  const all=[...citizen,...historical];
  const summary=summarize(filterRows(all,filters));
  return {
    ...summary,
    employment:suppress(summary.employment), barangays:suppress(summary.barangays), education:suppress(summary.education),
    skills:suppress(summary.skills),trainingCategories:suppress(summary.trainingCategories),trainingPrograms:suppress(summary.trainingPrograms),
    trainingBarriers:suppress(summary.trainingBarriers),employmentBarriers:suppress(summary.employmentBarriers),occupations:suppress(summary.occupations),industries:suppress(summary.industries),businessSectors:suppress(summary.businessSectors),assistance:suppress(summary.assistance),programAwareness:suppress(summary.programAwareness),informationAccess:suppress(summary.informationAccess),consultationParticipation:suppress(summary.consultationParticipation),priorityPrograms:suppress(summary.priorityPrograms),publicServiceBarriers:suppress(summary.publicServiceBarriers),
    minimumPublicGroupSize:5,
    available:{barangays:[...new Set(all.map(r=>r.barangay).filter(Boolean))].sort(),years:[...new Set(all.map(r=>r.year).filter(Boolean))].sort((a,b)=>b-a)},
  };
}
export async function adminEmploymentInsights(filters:EmploymentInsightFilters={}) {
  const [citizenAll,historicalAll,imports,activities,surveyYears]=await Promise.all([
    citizenRows(),importedRows(false),
    prisma.communityImportBatch.findMany({orderBy:{createdAt:"desc"},take:50,select:{id:true,sourceFilename:true,fileType:true,recordCount:true,validCount:true,invalidCount:true,warningCount:true,duplicateCount:true,status:true,createdAt:true,importedBy:{select:{name:true}},activity:{select:{activityName:true,activityType:true,implementingOffice:true,intendedUse:true,activityDate:true,coverage:true}}}}),
    prisma.governmentActivity.count(),
    prisma.communitySurvey.groupBy({by:["surveyYear"],where:{status:"SUBMITTED",consentAggregated:true},_count:{_all:true},orderBy:{surveyYear:"desc"}}),
  ]);
  const citizen=filterRows(citizenAll,filters);
  const historical=filterRows(historicalAll,filters);
  const all=[...citizenAll,...historicalAll];
  return {summary:summarize([...citizen,...historical]),citizen:summarize(citizen),historical:summarize(historical),activityCount:activities,
    surveyYears:surveyYears.map(y=>({year:y.surveyYear,count:y._count._all})),
    available:{barangays:[...new Set(all.map(r=>r.barangay).filter(Boolean))].sort(),years:[...new Set(all.map(r=>r.year).filter(Boolean))].sort((a,b)=>b-a)},
    imports:imports.map(b=>({...b,createdAt:b.createdAt.toISOString(),activity:{...b.activity,activityDate:b.activity.activityDate?.toISOString().slice(0,10)||null},importedBy:b.importedBy.name})),
  };
}

export async function surveyForCitizen(userId:string,year=new Date().getFullYear()) {
  return ownedSurveyState(userId,year);
}

export async function communityMatchProfile(userId:string):Promise<MatchProfile|null> {
  const consent=await currentProfileConsent(userId);
  if(!consent?.matching)return null;
  const row=await prisma.communitySurvey.findFirst({where:{userId,status:"SUBMITTED"},orderBy:{surveyYear:"desc"}});
  if(!row)return null;
  const interests=row.preferredIndustry&&INTERESTS.includes(row.preferredIndustry as never)?[row.preferredIndustry]:[];
  const availability=row.preferredWorkArrangement||row.workArrangement||"ANY";
  const normalizedAvailability=["FULL_TIME","PART_TIME","TEMPORARY","INTERNSHIP","ANY"].includes(availability)?availability:"ANY";
  const educationMap:Record<string,string>={ELEMENTARY:"ELEMENTARY",HIGH_SCHOOL:"HIGH_SCHOOL",SENIOR_HIGH:"SENIOR_HIGH",VOCATIONAL:"VOCATIONAL",COLLEGE:"COLLEGE",POSTGRADUATE:"COLLEGE"};
  return {skills:decodeList(row.skillsJson),interests,education:educationMap[row.educationLevel]||"COLLEGE",preferredArea:row.preferredWorkLocation||row.barangay,availability:normalizedAvailability};
}
