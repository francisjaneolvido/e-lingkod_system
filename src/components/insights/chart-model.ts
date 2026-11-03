export type ChartItem = { key: string; label: string; count: number; percent?: number | null; unknown?: boolean };
export type ChartSort = 'source' | 'count' | 'label';
export function donutLabels(rows:readonly {key:string;fraction:number}[]) {
  let offset=0;
  const labels=rows.flatMap((row,index)=>{const angle=(offset+row.fraction/2)*Math.PI*2-Math.PI/2;offset+=row.fraction;return row.fraction>0?[{key:row.key,number:index+1,side:Math.cos(angle)<0?'left':'right',anchorX:100+Math.cos(angle)*60,anchorY:100+Math.sin(angle)*60,y:100+Math.sin(angle)*80}]:[];});
  for(const side of ['left','right']){const ordered=labels.filter(l=>l.side===side).sort((a,b)=>a.y-b.y);for(let i=0;i<ordered.length;i++)ordered[i].y=Math.max(20,ordered[i].y,i?ordered[i-1].y+18:20);for(let i=ordered.length-1;i>=0;i--)ordered[i].y=Math.min(180,ordered[i].y,i<ordered.length-1?ordered[i+1].y-18:180);}
  // Node and browser math engines can differ below a rendered pixel. Keep SVG
  // attributes deterministic across hydration without rounding counts or shares.
  return labels.map(label=>({...label,anchorX:svgCoordinate(label.anchorX),anchorY:svgCoordinate(label.anchorY),y:svgCoordinate(label.y)}));
}
export const svgCoordinate=(value:number)=>Number(value.toFixed(3));
// A part-to-whole is allowed only for an exhaustive, mutually exclusive aggregate.
export function distributionRows(items:readonly ChartItem[],denominator:number,multi=false) {
  if(multi||!Number.isSafeInteger(denominator)||denominator<=0||items.some(i=>!Number.isSafeInteger(i.count)||i.count<0)||new Set(items.map(i=>i.key)).size!==items.length||items.reduce((s,i)=>s+i.count,0)!==denominator)return null;
  const rows=chartRows(items,'count');
  return {total:denominator,rows:rows.map((row,index)=>({...row,start:rows.slice(0,index).reduce((sum,r)=>sum+r.count,0)/denominator,fraction:row.count/denominator,percent:Math.round(row.count/denominator*10000)/100}))};
}
export function chartRows(items: readonly ChartItem[], sort: ChartSort) {
  if (items.some(item => !Number.isSafeInteger(item.count) || item.count < 0)) throw new Error('Invalid aggregate count');
  const rows = items.map(item => {
    // Category identity, not its position in a filtered/sorted result, owns color.
    let hash=2166136261;
    for(const char of item.key)hash=Math.imul(hash^char.codePointAt(0)!,16777619);
    return {...item,series:(hash>>>8)%4+1};
  });
  const compare = (a: string, b: string) => a < b ? -1 : a > b ? 1 : 0;
  if (sort === 'count') rows.sort((a, b) => b.count - a.count || compare(a.key, b.key));
  if (sort === 'label') rows.sort((a, b) => compare(a.label, b.label) || compare(a.key, b.key));
  const largest = rows.reduce((maximum, item) => Math.max(maximum, item.count), 0);
  return rows.map(item => ({ ...item, width: largest === 0 ? 0 : item.count / largest * 100 }));
}
