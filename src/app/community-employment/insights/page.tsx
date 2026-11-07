import type { Metadata } from 'next';
import Link from 'next/link';
import { currentViewer } from '@/lib/access';
import { SiteHeader } from '@/components/layout/site-header';
import { SiteFooter } from '@/components/layout/site-footer';
export const instant=false;
export const metadata:Metadata={title:'Analytics Access | eLingkod Bayan'};
export default async function AnalyticsAccessPage() { const viewer=await currentViewer(); return <><SiteHeader viewer={viewer?{name:viewer.name,email:viewer.email,role:viewer.role,identityStatus:viewer.identityStatus}:null}/><main className="min-h-[60vh] bg-background px-5 py-12"><section className="elb-workflow-heading mx-auto max-w-[1000px]"><p className="text-sm font-semibold text-foreground">Worker Census &amp; Social Profiling</p><h1 className="mt-3 text-3xl font-bold text-foreground">Analytics access</h1><p className="mt-5 max-w-2xl leading-7 text-muted-foreground">Workforce and social analytics are available only to authorized LGU users. Public and citizen statistics are not currently released. Survey participation and your consent choices remain separate from public disclosure.</p><Link className="elb-button elb-button-primary mt-6 w-fit" href="/community-employment">Return to Citizen Profiling</Link></section></main><SiteFooter/></>; }
