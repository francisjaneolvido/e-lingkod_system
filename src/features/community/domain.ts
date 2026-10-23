import { CivicError } from "@/features/civic/validation";

export const AGE_GROUPS = ["15-17","18-24","25-34","35-44","45-54","55-64","65+"] as const;
export const EDUCATION_LEVELS = ["ELEMENTARY","HIGH_SCHOOL","SENIOR_HIGH","VOCATIONAL","COLLEGE","POSTGRADUATE"] as const;
export const EMPLOYMENT_STATUSES = [
  "EMPLOYED_FULL_TIME","EMPLOYED_PART_TIME","SELF_EMPLOYED","BUSINESS_OWNER","FREELANCER",
  "INFORMAL_WORKER","SEASONAL_WORKER","OFW","FORMER_OFW","UNEMPLOYED_LOOKING",
  "UNEMPLOYED_NOT_LOOKING","STUDENT","HOMEMAKER","RETIRED","OTHER",
] as const;
export const EMPLOYMENT_LABELS: Record<string,string> = {
  EMPLOYED_FULL_TIME:"Employed — Full-time", EMPLOYED_PART_TIME:"Employed — Part-time", SELF_EMPLOYED:"Self-employed",
  BUSINESS_OWNER:"Business owner / entrepreneur", FREELANCER:"Freelancer", INFORMAL_WORKER:"Informal worker",
  SEASONAL_WORKER:"Seasonal worker", OFW:"OFW", FORMER_OFW:"Former OFW", UNEMPLOYED_LOOKING:"Unemployed — Looking for work",
  UNEMPLOYED_NOT_LOOKING:"Unemployed — Not currently looking", STUDENT:"Student", HOMEMAKER:"Homemaker", RETIRED:"Retired", OTHER:"Other",
};
export const EDUCATION_LABELS: Record<string,string> = {
  ELEMENTARY:"Elementary", HIGH_SCHOOL:"High school", SENIOR_HIGH:"Senior high school", VOCATIONAL:"Vocational / technical",
  COLLEGE:"College", POSTGRADUATE:"Postgraduate",
};

export const COMMUNITY_SKILLS = [
  "Basic Computer Skills","Microsoft Office","Data Entry","Programming","Web Development","Graphic Design","Video Editing",
  "Social Media Management","Digital Marketing","Computer Hardware","Computer Systems Servicing","Networking","Office Administration",
  "Bookkeeping","Accounting","Sales","Customer Service","Inventory Management","Entrepreneurship","Business Management",
  "Electrical Installation","Welding","Carpentry","Plumbing","Automotive Servicing","Driving","Machine Operation","Construction",
  "Electronics Repair","Food Preparation","Baking","Housekeeping","Bartending","Food and Beverage Service","Tourism","Beauty Care",
  "Hairdressing","Massage / Wellness","Crop Production","Animal Production","Agricultural Machinery","Organic Agriculture","Food Processing",
] as const;

export const TRAINING_CATEGORIES = ["Information Technology","Business","Tourism / Hospitality","Technical Trades","Agriculture","Personal Services","Other"] as const;
export const TRAINING_PROGRAMS = [
  "Computer Systems Servicing","Web Development","Programming","Digital Marketing","Graphic Design","Computer Literacy","Networking","Basic Cybersecurity",
  "Entrepreneurship","Bookkeeping","Financial Literacy","Online Selling / E-Commerce","Business Management","Digital Business",
  "Cookery","Bread and Pastry Production","Food and Beverage Services","Housekeeping","Tourism Services","Electrical Installation",
  "Welding","Automotive Servicing","Carpentry","Plumbing","Electronics","Agricultural Crop Production","Organic Agriculture",
  "Animal Production","Food Processing","Beauty Care","Hairdressing","Massage / Wellness","Dressmaking / Tailoring",
] as const;
export const TRAINING_BARRIERS = [
  "Training fees/cost","Transportation cost","Training location is too far","Schedule conflict","Work responsibilities",
  "Childcare/family responsibilities","Lack of information about available training","Internet/device limitations","Training requirements",
  "Disability/accessibility concerns","I do not know which training is appropriate for me","No available training that interests me","Other","No barriers",
] as const;
export const EMPLOYMENT_BARRIERS = [
  "Lack of available jobs","Lack of work experience","Lack of required skills","Lack of certification","Transportation problems",
  "Family responsibilities","Disability/accessibility","Internet/device limitations","Lack of documents","Lack of information about vacancies",
  "Age-related difficulty","Schedule limitations","Other","No major barriers",
] as const;
export const BUSINESS_CHALLENGES = ["Capital","Equipment","Customers/market access","Digital marketing","Business permits","Training","Location","Supply/material costs","Internet connectivity","Staffing","Other"] as const;
export const BUSINESS_SUPPORT = ["Business training","Financial literacy","Livelihood assistance","Skills training","Marketing assistance","Digitalization/e-commerce training","Business registration assistance","Access to government programs","Market linkage","None","Other"] as const;
export const PRIORITY_PROGRAMS = ["Local employment","Skills training","Youth employment","Business support","Livelihood assistance","Digital skills","Agriculture","Transportation/accessibility","PWD employment support","OFW/reintegration assistance","Career guidance","Education support","Other"] as const;
export const PUBLIC_SERVICE_BARRIERS = ["I don't know what programs exist","Information is difficult to find","Office is difficult to reach","Schedule/time constraints","Requirements are unclear","Internet/device limitations","Accessibility issues","I do not think I qualify","No difficulty","Other"] as const;

export const IMPORT_FIELDS = [
  "IGNORE","participantRef","barangay","ageGroup","educationLevel","employmentStatus","occupation","industry","skills",
  "trainingInterest","trainingCategories","trainingPrograms","trainingBarriers","employmentBarriers","businessSector","assistanceNeeded",
] as const;
export type ImportField = typeof IMPORT_FIELDS[number];

function obj(value: unknown): Record<string,unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new CivicError("Invalid survey data.",400);
  return value as Record<string,unknown>;
}
function req(value: unknown, name: string, max=150): string {
  if (typeof value !== "string" || !value.trim()) throw new CivicError(`${name} is required.`,400);
  const v=value.trim().replace(/\s+/g," "); if(v.length>max) throw new CivicError(`${name} is too long.`,400); return v;
}
function opt(value: unknown, max=250): string | null {
  if (value===null || value===undefined || value==="") return null;
  if (typeof value !== "string") throw new CivicError("Invalid survey field.",400);
  const v=value.trim().replace(/\s+/g," "); if(v.length>max) throw new CivicError("A survey answer is too long.",400); return v || null;
}
function bool(value: unknown): boolean|null { return typeof value === "boolean" ? value : null; }
function list(value: unknown, max=20, itemMax=80): string[] {
  if(value===null||value===undefined||value==="") return [];
  if(!Array.isArray(value)&&typeof value!=="string") throw new CivicError("Choose valid text answers.",400);
  const raw=Array.isArray(value)?value:value.split("|");
  if(raw.length>max||raw.some(v=>typeof v!=="string"||v.trim().length>itemMax)) throw new CivicError("Choose valid answers within the allowed length.",400);
  return [...new Set((raw as string[]).map(v=>v.trim()).filter(Boolean))];
}
function oneOf(value: unknown, allowed: readonly string[], name:string, optional=false): string|null {
  if(optional && (value===null||value===undefined||value==="")) return null;
  if(typeof value!=="string" || !allowed.includes(value)) throw new CivicError(`Choose a valid ${name}.`,400);
  return value;
}

export function parseCommunitySurvey(value: unknown) {
  const d=obj(value);
  const surveyYear=Number(d.surveyYear??new Date().getFullYear());
  if(!Number.isInteger(surveyYear)||surveyYear<2020||surveyYear>new Date().getFullYear()+1) throw new CivicError("Choose a valid survey year.",400);
  if(d.status!==undefined&&d.status!=="DRAFT"&&d.status!=="SUBMITTED") throw new CivicError("Choose a valid survey status.",400);
  const status=d.status==="SUBMITTED"?"SUBMITTED":"DRAFT";
  const draft=status==="DRAFT";
  if(!draft&&d.employmentStatus==="STUDENT"&&d.ageGroup==="15-17")throw new CivicError("Student respondents must be aged 18 or older.",400);
  const skills=list(d.skills,20,80);
  if(!draft&&!skills.length) throw new CivicError("Choose at least one skill before submitting.",400);
  const serviceSatisfaction=d.serviceSatisfaction===null||d.serviceSatisfaction===undefined||d.serviceSatisfaction===""?null:Number(d.serviceSatisfaction);
  if(serviceSatisfaction!==null && (!Number.isInteger(serviceSatisfaction)||serviceSatisfaction<1||serviceSatisfaction>5)) throw new CivicError("Service satisfaction must be from 1 to 5.",400);
  for(const key of ["consentAggregated","consentOpportunityRecommendations","consentProgramRecommendations"]){if(d[key]!==undefined&&typeof d[key]!=="boolean")throw new CivicError("Consent choices must be true or false.",400);}
  const consentAggregated=d.consentAggregated===true;
  if(status==="SUBMITTED"&&!consentAggregated) throw new CivicError("Consent for aggregated community statistics is required to submit the survey.",400);
  const feedback=opt(d.feedback,1200);
  const householdSize=d.householdSize===""||d.householdSize===null||d.householdSize===undefined?null:Number(d.householdSize);
  if(householdSize!==null&&(!Number.isInteger(householdSize)||householdSize<1||householdSize>30))throw new CivicError("Household size must be a whole number from 1 to 30.",400);
  return {
    surveyYear,status,
    barangay:draft?opt(d.barangay,100)||"":req(d.barangay,"Barangay",100),
    ageGroup:oneOf(d.ageGroup,AGE_GROUPS,"age group",draft)||"",
    sex:opt(d.sex,30), civilStatus:opt(d.civilStatus,30), pwdStatus:opt(d.pwdStatus,30),
    householdSize,
    currentlyStudying:bool(d.currentlyStudying),
    educationLevel:oneOf(d.educationLevel,EDUCATION_LEVELS,"education level",draft)||"",
    employmentStatus:oneOf(d.employmentStatus,EMPLOYMENT_STATUSES,"employment status",draft)||"",
    employmentHistory:opt(d.employmentHistory,2000),
    overseasExperience:oneOf(d.overseasExperience,["CURRENT","FORMER","NEVER"],"overseas employment experience",true),
    qualifications:list(d.qualifications,30,120),completedTraining:list(d.completedTraining,30,120),
    occupation:opt(d.occupation,150), industry:opt(d.industry,120), workArrangement:opt(d.workArrangement,40), workLocationScope:opt(d.workLocationScope,50), employmentLength:opt(d.employmentLength,50),
    workRelatedToEducation:bool(d.workRelatedToEducation), interestedNewWork:bool(d.interestedNewWork),
    skills, skillLevels:objOrEmpty(d.skillLevels),
    trainingInterest:oneOf(d.trainingInterest,["YES","MAYBE","NO","NOT_NOW"],"training interest",true),
    trainingCategories:list(d.trainingCategories,10), trainingPrograms:list(d.trainingPrograms,20), trainingReason:opt(d.trainingReason,60),
    trainingBarriers:list(d.trainingBarriers,20), employmentBarriers:list(d.employmentBarriers,20),
    preferredOccupations:list(d.preferredOccupations,10), preferredIndustry:opt(d.preferredIndustry,120), preferredWorkArrangement:opt(d.preferredWorkArrangement,40), preferredWorkLocation:opt(d.preferredWorkLocation,120), willingOutsideMunicipality:bool(d.willingOutsideMunicipality),
    interestedGovPrograms:bool(d.interestedGovPrograms), interestedLivelihood:bool(d.interestedLivelihood), interestedEntrepreneurship:bool(d.interestedEntrepreneurship),
    businessType:opt(d.businessType,120), businessSector:opt(d.businessSector,120), businessLocationType:opt(d.businessLocationType,40), businessSize:opt(d.businessSize,30), businessRegistered:opt(d.businessRegistered,30), businessYears:opt(d.businessYears,30),
    businessChallenges:list(d.businessChallenges,20), businessSupport:list(d.businessSupport,20),
    programAwareness:oneOf(d.programAwareness,["YES","SOMEWHAT","NO"],"program awareness",true), informationAccess:opt(d.informationAccess,20), participatedConsultation:opt(d.participatedConsultation,20), inclusivePlanning:opt(d.inclusivePlanning,30),
    priorityPrograms:list(d.priorityPrograms,3), publicServiceBarriers:list(d.publicServiceBarriers,20), serviceSatisfaction, feedback,
    consentAggregated, consentOpportunityRecommendations:Boolean(d.consentOpportunityRecommendations), consentProgramRecommendations:Boolean(d.consentProgramRecommendations),
  };
}
function objOrEmpty(value:unknown):Record<string,string>{
  if(!value||typeof value!=="object"||Array.isArray(value))return {};
  return Object.fromEntries(Object.entries(value as Record<string,unknown>).filter(([k,v])=>k.length<=80&&["Beginner","Intermediate","Advanced"].includes(String(v))).slice(0,30).map(([k,v])=>[k,String(v)]));
}
export function decodeList(value:string|null|undefined):string[]{ try {const a=JSON.parse(value||"[]");return Array.isArray(a)?a.filter(x=>typeof x==="string"):[];}catch{return [];} }
export function encodeList(value:string[]):string{return JSON.stringify(value);}
export function normalizeImportedStatus(value:string):string|null{
  const v=value.trim().toLowerCase().replace(/[^a-z0-9]+/g," ");
  const map:Record<string,string>={"employed":"EMPLOYED_FULL_TIME","working":"EMPLOYED_FULL_TIME","full time":"EMPLOYED_FULL_TIME","part time":"EMPLOYED_PART_TIME","self employed":"SELF_EMPLOYED","business owner":"BUSINESS_OWNER","entrepreneur":"BUSINESS_OWNER","freelancer":"FREELANCER","ofw":"OFW","former ofw":"FORMER_OFW","unemployed":"UNEMPLOYED_LOOKING","unemployed looking":"UNEMPLOYED_LOOKING","student":"STUDENT","homemaker":"HOMEMAKER","retired":"RETIRED"};
  return map[v] || (EMPLOYMENT_STATUSES.includes(value.trim().toUpperCase() as never)?value.trim().toUpperCase():null);
}
export function splitImported(value:string):string[]{return [...new Set(value.split(/[|;,]/).map(v=>v.trim()).filter(Boolean))].slice(0,20);}
