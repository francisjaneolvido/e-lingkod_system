export type ChartItem = { key: string; label: string; count: number; percent?: number | null; unknown?: boolean };
export type ChartSort = 'source' | 'count' | 'label';
export function chartRows(items: readonly ChartItem[], sort: ChartSort) {
  if (items.some(item => !Number.isSafeInteger(item.count) || item.count < 0)) throw new Error('Invalid aggregate count');
  const rows = items.map((item, index) => ({ ...item, series: index % 4 + 1 }));
  const compare = (a: string, b: string) => a < b ? -1 : a > b ? 1 : 0;
  if (sort === 'count') rows.sort((a, b) => b.count - a.count || compare(a.key, b.key));
  if (sort === 'label') rows.sort((a, b) => compare(a.label, b.label) || compare(a.key, b.key));
  const largest = rows.reduce((maximum, item) => Math.max(maximum, item.count), 0);
  return rows.map(item => ({ ...item, width: largest === 0 ? 0 : item.count / largest * 100 }));
}
