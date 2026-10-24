import Link from 'next/link';
import {connection} from 'next/server';
import {currentViewer} from '@/lib/access';
import {SiteHeader} from '@/components/layout/site-header';
import {SiteFooter} from '@/components/layout/site-footer';
import {publicOpportunities} from '@/features/jobs/server/opportunities';
import {personalOpportunities} from '@/features/jobs/server/recommendations';
import {parseOpportunityFilters} from '@/features/jobs/opportunities-domain';
import {OpportunityWorkspace} from '@/features/jobs/components/opportunity-workspace';
export const instant=false;
export const metadata={title:'Employment opportunities | eLingkod Bayan'};
export default async function Page({searchParams}:{searchParams:Promise<Record<string,string|string[]|undefined>>}){await connection();const viewer=await currentViewer();const raw=await searchParams;let filters;try{filters=parseOpportunityFilters(Object.fromEntries(Object.entries(raw).filter(([,v])=>v!==undefined)));}catch{return <main className="mx-auto max-w-3xl p-8"><h1 className="text-2xl font-semibold">Review the opportunity filters</h1><p>Choose valid values and one value per filter.</p><Link href="/opportunities" className="underline">Reset filters</Link></main>;}
const [jobs,personal]=await Promise.all([publicOpportunities(filters),viewer?.role==='CITIZEN'?personalOpportunities(viewer):Promise.resolve(null)]);
return <><SiteHeader viewer={viewer?{name:viewer.name,email:viewer.email,role:viewer.role}:null}/><main className="bg-[#F8FBFE]"><OpportunityWorkspace key={JSON.stringify(filters)} initialJobs={jobs} initialPersonal={personal} filters={filters} citizen={viewer?.role==='CITIZEN'}/></main><SiteFooter/></>;}
