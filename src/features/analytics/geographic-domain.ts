import { LOS_BANOS_BARANGAYS } from '@/features/emergency/domain';
import { LOS_BANOS_REGIONS, resolveBarangayCode } from '@/features/geography/los-banos';
import { list, type AnalyticsFilters, type AnalyticsRow, type Population } from './domain';

export type GeographicMetricId = 'eligible-records' | 'training-interest-yes' | 'reported-total-workers' | 'recorded-program-interests';
export type GeographicValue = { value: number | null; denominator: number; known: number; missing: number };
export type GeographicLegend = {
  maximum: number | null;
  /** Both bounds are inclusive. Positive integer ranges never overlap; zero is separate. */
  bins: { min: number; max: number }[];
};
export type GeographicMetric = { id: GeographicMetricId; title: string; unit: string; denominatorLabel: string; legend: GeographicLegend };
export type GeographicCell = {
  code: string;
  barangay: string;
  /** Existing exact application key, never a display alias used as authority. */
  filterKey?: string;
  eligible: number;
  values: Partial<Record<GeographicMetricId, GeographicValue>>;
  trainingInterest?: { YES: number; MAYBE: number; NO: number; NOT_NOW: number };
};
export type GeographicSummary = {
  filters: AnalyticsFilters;
  source: string;
  unit: string;
  scope: 'municipal' | 'restricted';
  scopeRationale: string;
  authorizedCodes: string[];
  /** Navigation metadata only. Exact permission keys; no aggregates outside the applied view. */
  availableRegions: {code:string;filterKey:string}[];
  unmappedEligible: number;
  metrics: GeographicMetric[];
  cells: GeographicCell[];
};
type GeographicContext = { filters: AnalyticsFilters; source: string; unit: string; scope: string[] | null };

function legend(values: (number | null)[]): GeographicLegend {
  const known = values.filter((value): value is number => value !== null);
  const maximum = known.length ? Math.max(...known) : null;
  if (maximum === null || maximum === 0) return { maximum, bins: [] };
  // A sparse count range uses fewer than five bins rather than empty or
  // overlapping integer ranges. Five bins are used once maximum is >= five.
  const count = Math.min(5, Math.ceil(maximum));
  const bins: GeographicLegend['bins'] = [];
  let previous = 0;
  for (let index = 1; index <= count; index++) {
    const max = Math.ceil(index * maximum / count);
    bins.push({ min: previous + 1, max });
    previous = max;
  }
  return { maximum, bins };
}

function definitions(population: Population, unit: string): Omit<GeographicMetric, 'legend'>[] {
  const eligible = { id: 'eligible-records' as const, title: population === 'ESTABLISHMENT' ? 'Eligible annual establishment records' : population === 'INDIVIDUAL' ? 'Eligible survey respondents' : 'Eligible source observations', unit, denominatorLabel: 'All eligible records in the applied authorized source group' };
  if (population === 'ESTABLISHMENT') return [eligible, { id: 'reported-total-workers', title: 'Reported total workforce', unit: 'reported workers', denominatorLabel: 'Establishments with known workforce / eligible establishments in this barangay' }];
  if (population === 'SPES') return [eligible, { id: 'recorded-program-interests', title: 'Observations with recorded training/program interests', unit, denominatorLabel: 'All eligible source observations in this barangay' }];
  return [eligible, { id: 'training-interest-yes', title: population === 'INDIVIDUAL' ? 'Respondents reporting training interest Yes' : 'Observations reporting training interest Yes', unit, denominatorLabel: 'All eligible records in this barangay, including missing answers' }];
}

/** Receives the FINAL retained eligible rows from the existing annual/source
 * pass. This does not establish consent, source identity, deduplication or
 * annual eligibility. Exact authority is checked again before alias mapping. */
export function summarizeGeography(rows: AnalyticsRow[], context: GeographicContext): GeographicSummary {
  const { filters, source, unit, scope } = context;
  const availableRegions = (scope === null ? [...LOS_BANOS_BARANGAYS] : scope).flatMap(filterKey => {
    const code = resolveBarangayCode(filterKey);
    return code ? [{code, filterKey}] : [];
  });
  const exactKeys = filters.barangay
    ? scope === null || scope.includes(filters.barangay) ? [filters.barangay] : []
    : scope === null ? [...LOS_BANOS_BARANGAYS] : scope;
  const authorizedCodes = [...new Set(exactKeys.map(resolveBarangayCode).filter((code): code is string => code !== null))];
  const authorized = rows.filter(row =>
    (scope === null || typeof row.barangay === 'string' && scope.includes(row.barangay)) &&
    (!filters.barangay || row.barangay === filters.barangay));
  const grouped = new Map<string, AnalyticsRow[]>();
  let unmappedEligible = 0;
  for (const row of authorized) {
    const code = resolveBarangayCode(row.barangay);
    if (!code || !authorizedCodes.includes(code)) { unmappedEligible++; continue; }
    const items = grouped.get(code) ?? [];
    items.push(row);
    grouped.set(code, items);
  }
  const metricDefinitions = definitions(filters.population, unit);
  const cells: GeographicCell[] = LOS_BANOS_REGIONS.filter(region => authorizedCodes.includes(region.code)).map(region => {
    const items = grouped.get(region.code) ?? [];
    const cell: GeographicCell = {
      code: region.code, barangay: region.name,
      filterKey: exactKeys.find(key => key === region.appName) ?? exactKeys.find(key => resolveBarangayCode(key) === region.code),
      eligible: items.length,
      values: { 'eligible-records': { value: items.length, denominator: authorized.length, known: items.length, missing: 0 } },
    };
    let value: number | null = null;
    let known = 0;
    if (filters.population === 'ESTABLISHMENT') {
      const totals = items.map(row => row.totalWorkers).filter((total): total is number => typeof total === 'number' && Number.isFinite(total) && total >= 0);
      known = totals.length;
      value = known ? totals.reduce((sum, total) => sum + total, 0) : null;
    } else if (filters.population === 'SPES') {
      known = items.filter(row => list(row.trainingPrograms).length > 0).length;
      value = known ? known : null;
    } else {
      const answers = { YES: 0, MAYBE: 0, NO: 0, NOT_NOW: 0 };
      for (const row of items) if (typeof row.trainingInterest === 'string' && Object.hasOwn(answers, row.trainingInterest)) answers[row.trainingInterest as keyof typeof answers]++;
      known = Object.values(answers).reduce((sum, count) => sum + count, 0);
      value = known ? answers.YES : null;
      cell.trainingInterest = answers;
    }
    cell.values[metricDefinitions[1].id] = { value, denominator: items.length, known, missing: items.length - known };
    return cell;
  }).sort((left, right) => left.barangay.localeCompare(right.barangay));
  const metrics = metricDefinitions.map(metric => ({ ...metric, legend: legend(cells.map(cell => cell.values[metric.id]!.value)) }));
  const municipal = scope === null && !filters.barangay;
  return {
    filters, source, unit, scope: municipal ? 'municipal' : 'restricted',
    scopeRationale: filters.barangay ? 'Applied authorized barangay filter: ' + filters.barangay : municipal ? 'Current CENSUS authority permits municipality-wide records.' : 'Only exact barangays in your current CENSUS record scope are included.',
    authorizedCodes, availableRegions, unmappedEligible, metrics, cells,
  };
}
