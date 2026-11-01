import test from 'node:test';
import assert from 'node:assert/strict';
import {loadServerTypescript} from './helpers/load-typescript.mjs';
const hook=loadServerTypescript();
const {chartRows}=await import('../src/components/insights/chart-model.ts');
test.after(()=>hook.deregister());
test('category colors survive subsets, source reordering and chart sorting',()=>{
 const items=['employment','age','education','skills','barriers'].map((key,i)=>({key,label:key,count:i}));
 const full=chartRows(items,'source');
 for(const row of chartRows(items.slice(1).reverse(),'count'))assert.equal(row.series,full.find(x=>x.key===row.key).series);
});
test('overview exposes complementary available aggregates without combining sources',async()=>{
 const {overviewBreakdowns,factualFinding}=await import('../src/features/analytics/components/overview-model.ts');
 const breakdowns=['employmentStatus','ageGroup','educationLevel','barangay','skills','employmentBarriers','occupation'].map(key=>({key,title:key,denominator:7,multi:key==='skills',known:5,missing:2,items:[{key:'a',label:'Recorded A',count:3,percent:42.86},{key:'unknown',label:'Unknown',count:4,percent:57.14,unknown:true}]}));
 const group={source:'A',count:7,breakdowns};
 assert.equal(overviewBreakdowns(group,'INDIVIDUAL').length,6);
 assert.equal(overviewBreakdowns(group,'ESTABLISHMENT').length,1);
 assert.equal(group.count,7);assert.match(factualFinding(breakdowns[0]),/3 of 7/);
 assert.doesNotMatch(factualFinding(breakdowns[0]),/majority|trend|cause/i);
 assert.match(factualFinding({...breakdowns[0],denominator:0,items:[]}),/No eligible/);
 assert.match(factualFinding({...breakdowns[0],items:[breakdowns[0].items[1]]}),/No recorded category/);
 assert.match(factualFinding({...breakdowns[0],items:[{key:'a',label:'A',count:2,percent:null},{key:'b',label:'B',count:2,percent:null}]}),/Joint highest/);
});
