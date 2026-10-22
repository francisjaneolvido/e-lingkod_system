import { requireApiViewer } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { CivicError } from "@/features/civic/validation";
import { parseCommunitySurvey } from "@/features/community/domain";
import { assertSameOrigin, readJson, json, apiFailure } from "@/features/civic/server/http";

export async function PUT(request:Request){
  try{
    assertSameOrigin(request);
    const viewer=await requireApiViewer(request);
    if(viewer.role!=="CITIZEN")throw new CivicError("Only citizen accounts can save a community profile.",403);
    const value=parseCommunitySurvey(await readJson(request));
    const list=(v:string[])=>JSON.stringify(v);
    const data={
      surveyVersion:1,status:value.status,barangay:value.barangay,ageGroup:value.ageGroup,sex:value.sex,civilStatus:value.civilStatus,pwdStatus:value.pwdStatus,householdSize:value.householdSize,currentlyStudying:value.currentlyStudying,
      educationLevel:value.educationLevel,employmentStatus:value.employmentStatus,occupation:value.occupation,industry:value.industry,workArrangement:value.workArrangement,workLocationScope:value.workLocationScope,employmentLength:value.employmentLength,workRelatedToEducation:value.workRelatedToEducation,interestedNewWork:value.interestedNewWork,
      skillsJson:list(value.skills),skillLevelsJson:JSON.stringify(value.skillLevels),trainingInterest:value.trainingInterest,trainingCategoriesJson:list(value.trainingCategories),trainingProgramsJson:list(value.trainingPrograms),trainingReason:value.trainingReason,trainingBarriersJson:list(value.trainingBarriers),employmentBarriersJson:list(value.employmentBarriers),
      preferredOccupationsJson:list(value.preferredOccupations),preferredIndustry:value.preferredIndustry,preferredWorkArrangement:value.preferredWorkArrangement,preferredWorkLocation:value.preferredWorkLocation,willingOutsideMunicipality:value.willingOutsideMunicipality,interestedGovPrograms:value.interestedGovPrograms,interestedLivelihood:value.interestedLivelihood,interestedEntrepreneurship:value.interestedEntrepreneurship,
      businessType:value.businessType,businessSector:value.businessSector,businessLocationType:value.businessLocationType,businessSize:value.businessSize,businessRegistered:value.businessRegistered,businessYears:value.businessYears,businessChallengesJson:list(value.businessChallenges),businessSupportJson:list(value.businessSupport),
      programAwareness:value.programAwareness,informationAccess:value.informationAccess,participatedConsultation:value.participatedConsultation,inclusivePlanning:value.inclusivePlanning,priorityProgramsJson:list(value.priorityPrograms),publicServiceBarriersJson:list(value.publicServiceBarriers),serviceSatisfaction:value.serviceSatisfaction,feedback:value.feedback,
      consentAggregated:value.consentAggregated,consentOpportunityRecommendations:value.consentOpportunityRecommendations,consentProgramRecommendations:value.consentProgramRecommendations,submittedAt:value.status==="SUBMITTED"?new Date():null,
    };
    await prisma.communitySurvey.upsert({where:{userId_surveyYear:{userId:viewer.id,surveyYear:value.surveyYear}},create:{userId:viewer.id,surveyYear:value.surveyYear,...data},update:data});
    return json({success:true,status:value.status,surveyYear:value.surveyYear});
  }catch(error){return apiFailure(error);}
}

export async function DELETE(request:Request){
  try{
    assertSameOrigin(request);
    const viewer=await requireApiViewer(request);
    if(viewer.role!=="CITIZEN")throw new CivicError("Only citizen accounts can delete their own community profile.",403);
    const url=new URL(request.url);const year=Number(url.searchParams.get("year")||new Date().getFullYear());
    await prisma.communitySurvey.deleteMany({where:{userId:viewer.id,surveyYear:year}});
    return json({success:true});
  }catch(error){return apiFailure(error);}
}
