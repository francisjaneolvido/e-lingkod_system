'use client';
import type { AnalyticsGroup } from '../domain';
import { OverviewChart } from '@/components/insights/overview-chart';
import { DistributionChart } from '@/components/insights/distribution-chart';
import { overviewBreakdowns } from './overview-model';
import { BarangayMap } from './barangay-map';

const compositions: Record<string, string[]> = {
  INDIVIDUAL: ['employmentStatus', 'educationLevel', 'skills', 'trainingInterest'],
  IMPORTS: ['employmentStatus', 'educationLevel', 'skills', 'trainingInterest'],
  ESTABLISHMENT: ['industry', 'organizationType', 'operatingStatus', 'officeType'],
  SPES: ['skills', 'educationLevel', 'trainingPrograms', 'availability'],
};

export function AnalyticsOverview({ group, population, onFilter, updating = false }: {
  group: AnalyticsGroup; population: string; onFilter?: (key: string) => void; updating?: boolean;
}) {
  const keys = compositions[population] ?? [];
  const charts = keys.map(key => group.breakdowns.find(item => item.key === key));
  const coverage = charts.find(item => item?.key === 'educationLevel') ?? charts[0];
  const workforce = group.measures.find(item => item.key === 'totalWorkers');
  const geography = group.geography;
  const extra = overviewBreakdowns(group, population).filter(item => !keys.includes(item.key));

  function chart(index: number) {
    const data = charts[index];
    if (!data) return <div className="elb-analytics-slot elb-chart-empty"><h3>Measure unavailable</h3><p>This source does not record this measure.</p></div>;
    const props = {
      title: data.title, items: data.items, denominator: data.denominator,
      description: group.unit + (data.multi ? '; multiple responses.' : '; all answers.'),
      contextProvided: true,
    };
    const donut = !data.multi && data.items.length <= 4 && ['educationLevel', 'organizationType', 'operatingStatus', 'availability'].includes(data.key);
    return <div className="elb-analytics-slot" data-summary-slot={index < 2 ? index + 1 : index + 2}>
      {donut ? <DistributionChart {...props} /> : <OverviewChart {...props} compact initialLimit={3} />}
    </div>;
  }

  function map(index: 0 | 1) {
    const metric = geography?.metrics[index];
    return geography && metric
      ? <BarangayMap key={JSON.stringify(geography.filters) + group.source + metric.id} summary={geography} metric={metric} slot={index === 0 ? 3 : 6} onFilter={onFilter} updating={updating} atlas />
      : <div className="elb-analytics-slot"><h3>Geographic measure unavailable</h3><p className="elb-help">No authorized geographic result was supplied.</p></div>;
  }

  return <section className="elb-source-overview reference-atlas" aria-label={group.source + ' overview'}>
    <div className="reference-source-band">
      <div className="elb-source-title"><h2>{group.source}</h2><p>{population === 'INDIVIDUAL' ? 'One retained annual submission per eligible respondent.' : population === 'ESTABLISHMENT' ? 'Annual establishment records; workers are a separate measure.' : 'Source observations; not additional unique people.'}</p></div>
      <dl className="elb-summary-metrics">
        <div><dt>Eligible {group.unit}</dt><dd>{group.count.toLocaleString('en-PH')}</dd></div>
        {population === 'ESTABLISHMENT' && workforce
          ? <div><dt>Known reported workers</dt><dd>{workforce.sum == null ? 'Not recorded' : workforce.sum.toLocaleString('en-PH')}</dd><p>{workforce.known} of {workforce.denominator} establishments; {workforce.unknown} missing.</p></div>
          : coverage && <div><dt>{coverage.title} recorded</dt><dd>{coverage.known.toLocaleString('en-PH')} <span className="elb-metric-context">/ {coverage.denominator.toLocaleString('en-PH')}</span></dd><p>{coverage.missing} {coverage.multi ? 'without selections' : 'unknown / not recorded'}.</p></div>}
      </dl>
    </div>
    <p className="reference-reading-key">This source only, not municipality totals. Missing answers stay in denominators.</p>
    <div className="elb-analytics-grid">{chart(0)}{chart(1)}{map(0)}{chart(2)}{chart(3)}{map(1)}</div>
    {extra.length > 0 && <details className="elb-additional-charts"><summary>More distributions: {extra.map(item => item.title).join(', ')}</summary><div>{extra.map(item => <OverviewChart key={item.key} title={item.title} items={item.items} denominator={item.denominator} description={group.unit} compact />)}</div></details>}
  </section>;
}
