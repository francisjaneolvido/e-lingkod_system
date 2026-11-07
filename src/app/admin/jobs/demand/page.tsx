import "@/styles/admin-workflows.css";
import {OverviewChart,ChartTable} from '@/components/insights/overview-chart';
import Link from 'next/link';
import {requireModulePage} from '@/lib/access';
import {opportunityDemand} from '@/features/jobs/server/demand';
export const instant=false;
export default async function Page(){
  const viewer=await requireModulePage('/admin/jobs/demand','CENSUS'),data=await opportunityDemand(viewer);
  return <main className="elb-admin-workflow elb-workflow mx-auto max-w-[1344px]">
    <header className="elb-workflow-heading"><Link href="/admin/census/analytics" className="inline-flex min-h-11 items-center text-foreground underline">Workforce and social analytics</Link><h1 className="text-3xl font-semibold text-foreground">Employer demand from reviewed vacancies</h1><p className="mt-3 max-w-3xl text-sm leading-7">Current active publications within your authorized barangay scope. Genuine employer requirements and synthetic demonstrations stay separate.</p></header>
    <dl className="elb-summary-metrics"><div><dt>Genuine active vacancies</dt><dd>{data.genuineVacancies}</dd><p>Reviewed, active publications; not individual respondents.</p></div><div><dt>Demonstration vacancies</dt><dd>{data.demonstrationVacancies}</dd><p>Synthetic examples, excluded from genuine demand.</p></div></dl>
    <div className="elb-dashboard-grid">{([['Genuine skill requirements',data.skills,data.genuineVacancies],['Demonstration skill requirements · not genuine employer demand',data.demonstrationSkills,data.demonstrationVacancies]] as const).map(([title,rows,total])=><div key={title} className="elb-dashboard-tile"><OverviewChart title={title} compact denominator={total} items={rows.map(r=>({key:r.skill,label:r.skill,count:r.vacancies}))} description="Distinct eligible vacancies per required skill. Multiple skills can describe one vacancy; counts do not add to a population."/><p className="elb-data-story">{rows.length?`${rows[0].skill} is recorded in ${rows[0].vacancies} of ${total} eligible vacancies in this source.`:'No recorded requirements in this source view.'}</p></div>)}</div>
    <section className="elb-workflow-panel"><h2 className="text-xl font-semibold text-foreground">Most recent genuine publications</h2><p className="my-3 text-sm">Up to five listings; publication date order, stable listing ID for ties. This is not a hiring-success ranking.</p><ol className="list-decimal space-y-3 pl-5">{data.topVacancies.map(j=><li key={j.id}><Link href={'/opportunities/'+j.id} className="underline">{j.title}</Link> · {j.barangay}</li>)}</ol>{!data.topVacancies.length&&<p>No genuine authorized vacancies in your scope.</p>}</section>
    <details className="elb-admin-history border-y border-border"><summary>Complete skill counts</summary><ChartTable title="Genuine skill requirements" items={data.skills.map(r=>({key:r.skill,label:r.skill,count:r.vacancies}))}/><ChartTable title="Demonstration skill requirements" items={data.demonstrationSkills.map(r=>({key:r.skill,label:r.skill,count:r.vacancies}))}/></details>
    <details className="elb-admin-history border-b border-border"><summary className="cursor-pointer font-semibold text-foreground">Source definitions &amp; access</summary><p className="mt-3 text-sm leading-7">{data.methodology}</p></details>
    <p className="text-sm">Vacancies, individual respondents and establishment workforce remain separate. Public release remains deferred.</p>
  </main>;
}
