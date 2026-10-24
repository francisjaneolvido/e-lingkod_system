import type {Metadata} from "next";
import {notFound} from "next/navigation";
import {requireModulePage} from "@/lib/access";
import {prisma} from "@/lib/prisma";
import {decodeTags} from "@/features/jobs/domain";
import {OpportunityEditor} from "@/features/jobs/components/opportunity-editor";
export const instant=false;
export const metadata:Metadata={title:"Edit opportunity | eLingkod Bayan"};
export default async function EditOpportunityPage({params}:{params:Promise<{id:string}>}){
 const viewer=await requireModulePage("/admin/jobs","JOBS");
 const {id}=await params;
 if(!id||id.length>191)notFound();
 const row=await prisma.jobOpportunity.findFirst({where:{id,...(viewer.role==="ADMIN"?{}:{createdById:viewer.id})}});
 if(!row)notFound();
 if(row.status==="PENDING_REVIEW")notFound();
 const job={version:row.version,payMin:row.payMin?.toFixed(2)??null,payMax:row.payMax?.toFixed(2)??null,payCurrency:row.payCurrency,payBasis:row.payBasis,negotiable:row.negotiable,occupationCategory:row.occupationCategory,employmentSector:row.employmentSector,workArrangement:row.workArrangement,experienceLevel:row.experienceLevel,certifications:row.certificationsJson===null?null:decodeTags(row.certificationsJson),isDemo:row.isDemo,createdById: row.createdById,id:row.id,title:row.title,employer:row.employer,sector:row.sector,workType:row.workType,
  barangay:row.barangay,location:row.location,description:row.description,skills:decodeTags(row.skillsJson),
  interests:decodeTags(row.interestsJson),education:row.education,contactInfo:row.contactInfo,externalUrl:row.externalUrl,
  expiresAt:row.expiresAt?.toISOString().slice(0,10)??"",status:row.status,createdAt:row.createdAt.toISOString(),
  updatedAt:row.updatedAt.toISOString(),publishedAt:row.publishedAt?.toISOString()??null,
  reviewSource:row.reviewSource,reviewNote:row.reviewNote,reviewRequestedAt:row.reviewRequestedAt?.toISOString()??null,
  reviewedAt:row.reviewedAt?.toISOString()??null,employerVerified:row.employerVerified,vacancyVerified:row.vacancyVerified};
 return <OpportunityEditor job={job}/>;
}
