import "server-only";
import { prisma } from "@/lib/prisma";
import { decodeList } from "../domain";
import { INTERESTS, type MatchProfile } from "@/features/jobs/domain";
import { currentProfileConsent, ownedSurveyState } from "./survey-lifecycle";
import { CivicError } from "@/features/civic/validation";

// Legacy callers fail closed. D08 permits protected CENSUS-scoped analytics only.
// The public routes render an unavailable notice without loading survey data.
export async function publicEmploymentInsights() { throw new CivicError("Public analytics release is unavailable.", 410); }

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
