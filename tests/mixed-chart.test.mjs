import test from 'node:test';
import assert from 'node:assert/strict';
import {loadServerTypescript} from './helpers/load-typescript.mjs';
const hook=loadServerTypescript();
const model=await import('../src/components/insights/chart-model.ts');
test.after(()=>hook.deregister());
test('exclusive distribution reconciles exact counts and unknowns; multi-response never becomes a pie',()=>{
 const items=[{key:'a',label:'A',count:2},{key:'b',label:'B',count:1},{key:'unknown',label:'Unknown',count:1,unknown:true}];
 const result=model.distributionRows(items,4,false);
 assert.equal(result.total,4);assert.equal(result.rows.reduce((s,r)=>s+r.count,0),4);
 assert.equal(result.rows.find(r=>r.unknown).percent,25);
 assert.equal(result.rows.reduce((s,r)=>s+r.fraction,0),1);
 assert.equal(model.distributionRows(items,4,true),null);
 assert.equal(model.distributionRows(items,5,false),null);
 assert.equal(model.distributionRows([],0,false),null);
 assert.equal(model.distributionRows([{key:'a',label:'A',count:-1}],1,false),null);
});
test('distribution labels and colors survive sorting; no categories are silently omitted',()=>{
 const items=Array.from({length:11},(_,i)=>({key:'c'+i,label:'Category '+i,count:i+1}));
 const a=model.distributionRows(items,66,false),b=model.distributionRows([...items].reverse(),66,false);
 assert.equal(a.rows.length,11);assert.equal(a.rows.reduce((s,r)=>s+r.count,0),66);
 for(const r of a.rows)assert.equal(r.series,b.rows.find(x=>x.key===r.key).series);
});
test('every nonzero donut segment has a numbered callout and separated labels on either side',()=>{
 const data=model.distributionRows(Array.from({length:11},(_,i)=>({key:'c'+i,label:'Category '+i,count:i?1:80})),90,false);
 const labels=model.donutLabels(data.rows);
 assert.equal(labels.length,11);assert.equal(new Set(labels.map(x=>x.number)).size,11);
 for(const side of ['left','right']){const rows=labels.filter(x=>x.side===side).sort((a,b)=>a.y-b.y);for(let i=1;i<rows.length;i++)assert.ok(rows[i].y-rows[i-1].y>=18);}
});
