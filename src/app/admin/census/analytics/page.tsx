import type { Metadata } from 'next';
import { requireModulePage } from '@/lib/access';
import { manilaYear } from '@/features/analytics/domain';
import { WorkforceAnalytics } from '@/features/analytics/components/workforce-analytics';
export const instant=false;
export const metadata:Metadata={title:'Workforce & Social Analytics | eLingkod Bayan'};
export default async function AnalyticsPage({searchParams}:{searchParams:Promise<Record<string,string|string[]|undefined>>}) {
  await requireModulePage('/admin/census/analytics','CENSUS');
  const query=new URLSearchParams();
  for(const [key,value] of Object.entries(await searchParams))for(const item of Array.isArray(value)?value:value===undefined?[]:[value])query.append(key,item);
  return <WorkforceAnalytics key={query.toString()||'default'} currentYear={manilaYear()} initialQuery={query.toString()}/>;
}
