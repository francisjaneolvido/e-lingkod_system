import "server-only";
import { prisma } from "@/lib/prisma";
import {hasCitizenFeatureAccess} from '@/features/identity/policy';
export async function citizenHomeSnapshot(userId:string){
  const user=await prisma.user.findUnique({where:{id:userId},select:{role:true,identityStatus:true}});
  if(!user||user.role!=='CITIZEN'||!hasCitizenFeatureAccess(user))return null;
  const now=new Date();
  const [activeRequests,actionRequired,upcoming,survey,publishedJobs]=await Promise.all([
    prisma.serviceRequest.count({where:{requesterId:userId,status:{notIn:["COMPLETED","DECLINED","CANCELLED"]}}}),
    prisma.serviceRequest.count({where:{requesterId:userId,status:{in:["FORM_OPEN","ACTION_REQUIRED","SCHEDULED","READY_FOR_RELEASE"]}}}),
    prisma.serviceAppointment.findFirst({where:{request:{requesterId:userId},status:"CONFIRMED",scheduledAt:{gte:now}},orderBy:{scheduledAt:"asc"},select:{scheduledAt:true,location:true,agenda:true,request:{select:{id:true,serviceTitle:true}}}}),
    prisma.communitySurvey.findFirst({where:{userId},orderBy:{surveyYear:"desc"},select:{status:true,consentOpportunityRecommendations:true,updatedAt:true}}),
    prisma.jobOpportunity.count({where:{status:"PUBLISHED"}}),
  ]);
  return {activeRequests,actionRequired,upcoming:upcoming?{...upcoming,scheduledAt:upcoming.scheduledAt.toISOString()}:null,communityProfileComplete:survey?.status==="SUBMITTED",recommendationsEnabled:survey?.consentOpportunityRecommendations===true,publishedJobs};
}
