import 'server-only';
import {prisma} from '@/lib/prisma';
import {recordScope} from '@/features/census/server/data';
import type {CivicViewer} from '@/features/civic/types';
import {demandSkills} from '../opportunities-domain';
import {opportunitiesInTransaction} from './opportunities';
export async function opportunityDemand(viewer:CivicViewer){const scope=await recordScope(viewer);return prisma.$transaction(async tx=>{
 const rows=(await opportunitiesInTransaction(tx)).filter(j=>scope===null||scope.includes(j.barangay));
 const genuine=rows.filter(j=>!j.isDemo),demo=rows.filter(j=>j.isDemo);
 return {genuineVacancies:genuine.length,demonstrationVacancies:demo.length,skills:demandSkills(genuine),demonstrationSkills:demandSkills(demo.map(j=>({...j,isDemo:false}))),topVacancies:genuine.sort((a,b)=>(b.publishedAt||'').localeCompare(a.publishedAt||'')||a.id.localeCompare(b.id)).slice(0,5),methodology:'Distinct active published genuine vacancy requirements, one count per skill per vacancy. Most recent publication first; equal dates use stable listing ID. Demonstrations are separate, never genuine demand or citizen counts. Current CENSUS barangay scope applies; public analytics remain unavailable.'};
},{isolationLevel:'RepeatableRead'});}
