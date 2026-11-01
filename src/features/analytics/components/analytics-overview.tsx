import type {AnalyticsGroup} from '../domain';
import {OverviewChart} from '@/components/insights/overview-chart';
import {DistributionChart} from '@/components/insights/distribution-chart';
import {factualFinding,overviewBreakdowns} from './overview-model';
export function AnalyticsOverview({group,population}:{group:AnalyticsGroup;population:string}) {
  const charts=overviewBreakdowns(group,population);
  const coverage=charts.find(d=>d.key==='employmentStatus')??charts.find(d=>d.key==='educationLevel')??charts[0];
  return <section className="elb-source-overview" aria-label={group.source+' overview'}>
    <div className="elb-source-title"><h2>{group.source}</h2><p>Separate source population</p></div>
    <dl className="elb-summary-metrics"><div><dt>Eligible {group.unit}</dt><dd>{group.count.toLocaleString()}</dd><p>{population==='INDIVIDUAL'?'One retained submission per eligible respondent.':population==='ESTABLISHMENT'?'Annual organizational records; headcounts are separate.':'Source observations, not unique additional people.'}</p></div>
      {population==='ESTABLISHMENT'?group.measures.filter(m=>m.key==='totalWorkers').map(m=><div key={m.key}><dt>Reported workforce</dt><dd>{m.sum??'Unknown'}</dd><p>Known in {m.known} of {m.denominator} records; {m.unknown} unknown. Not respondent counts.</p></div>):coverage?<div><dt>{coverage.title} recorded</dt><dd>{coverage.known} / {coverage.denominator}</dd><p>{coverage.missing} {coverage.multi?'without selections':'unknown / not recorded'}; no values imputed.</p></div>:null}
    </dl>
    <div className="elb-dashboard-grid">{charts.map(d=>{const props={title:d.title,items:d.items,denominator:d.denominator,description:`${group.unit}; ${d.multi?'multiple responses may exceed 100%':'one response per record'}.`};const donut=!d.multi&&['educationLevel','organizationType','operatingStatus'].includes(d.key);return <div key={d.key} className="elb-dashboard-tile">{donut?<DistributionChart {...props}/>:<OverviewChart {...props} compact/>}<p className="elb-data-story">{factualFinding(d)}</p></div>;})}</div>
  </section>;
}
