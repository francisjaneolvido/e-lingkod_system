import 'server-only';
import {prisma} from '@/lib/prisma';
import type {Prisma} from '@/generated/prisma/client';
import type {OpportunityFilters} from '../opportunities-domain';
import {filterOpportunities} from '../opportunities-domain';
import {decodeTags} from '../domain';
export const publicOpportunitySelect={id:true,title:true,employer:true,sector:true,workType:true,barangay:true,location:true,description:true,education:true,contactInfo:true,externalUrl:true,publishedAt:true,expiresAt:true,status:true,version:true,skillsJson:true,interestsJson:true,occupationCategory:true,employmentSector:true,workArrangement:true,experienceLevel:true,payMin:true,payMax:true,payCurrency:true,payBasis:true,negotiable:true,certificationsJson:true,isDemo:true} satisfies Prisma.JobOpportunitySelect;
type Row=Prisma.JobOpportunityGetPayload<{select:typeof publicOpportunitySelect}>;
export function serializeOpportunity(row:Row){const {skillsJson,interestsJson,certificationsJson,payMin,payMax,publishedAt,expiresAt,...fields}=row;return {...fields,negotiable:payMin===null||payMax===null?null:row.negotiable,isDemo:row.isDemo||row.title.startsWith('[DEMO]')||row.employer.startsWith('[DEMO]'),skills:decodeTags(skillsJson),interests:decodeTags(interestsJson),certifications:certificationsJson===null?null:decodeTags(certificationsJson),payMin:payMin?.toFixed(2)??null,payMax:payMax?.toFixed(2)??null,publishedAt:publishedAt?.toISOString()??null,expiresAt:expiresAt?.toISOString()??null};}
export async function opportunitiesInTransaction(tx:Prisma.TransactionClient,now=new Date()){
 const rows=await tx.jobOpportunity.findMany({where:{status:'PUBLISHED',employerVerified:true,vacancyVerified:true,OR:[{expiresAt:null},{expiresAt:{gt:now}}]},orderBy:[{publishedAt:'desc'},{id:'asc'}],select:publicOpportunitySelect});return rows.map(serializeOpportunity);
}
export async function publicOpportunities(filters:OpportunityFilters,now=new Date()){
 return prisma.$transaction(async tx=>filterOpportunities(await opportunitiesInTransaction(tx,now),filters,now),{isolationLevel:'RepeatableRead'});
}
