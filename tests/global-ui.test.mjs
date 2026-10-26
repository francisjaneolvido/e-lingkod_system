import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { loadServerTypescript } from './helpers/load-typescript.mjs';
const hook=loadServerTypescript();
const { THEME_BOOTSTRAP }=await import('../src/lib/theme.ts');
const { chartRows }=await import('../src/components/insights/chart-model.ts');
test.after(()=>hook.deregister());

for(const saved of ['light','dark','oled','invalid',null])test(`first-paint theme validates stored ${saved}`,()=>{
 const attributes={},classes=new Set();
 const root={dataset:{},style:{},classList:{toggle:(key,enabled)=>enabled?classes.add(key):classes.delete(key)},setAttribute:(key,value)=>attributes[key]=value};
 vm.runInNewContext(THEME_BOOTSTRAP,{document:{documentElement:root},localStorage:{getItem:()=>saved}});
 const expected=['light','dark','oled'].includes(saved)?saved:'light';
 assert.equal(root.dataset.theme,expected);assert.equal(classes.has('dark'),expected!=='light');assert.equal(root.style.colorScheme,expected==='light'?'light':'dark');
});
test('storage refusal still initializes an explicit readable theme',()=>{
 const root={dataset:{},style:{},classList:{toggle(){}}};
 vm.runInNewContext(THEME_BOOTSTRAP,{document:{documentElement:root},localStorage:{getItem(){throw Error('denied')}}});
 assert.equal(root.dataset.theme,'light');assert.equal(root.style.colorScheme,'light');
});
test('chart sorting keeps exact counts/unknown percent and stable ties without changing input',()=>{
 const input=[{key:'z',label:'Zulu',count:2,percent:null},{key:'a',label:'Alpha',count:2,percent:25},{key:'b',label:'Beta',count:0,percent:0}];
 const original=structuredClone(input),out=chartRows(input,'count');
 assert.deepEqual(input,original);assert.deepEqual(out.map(r=>r.key),['a','z','b']);assert.equal(out[1].percent,null);assert.equal(out[2].count,0);assert.equal(out[0].width,100);assert.equal(out[2].width,0);
 for(const row of chartRows(input,'label'))assert.equal(row.series,out.find(other=>other.key===row.key).series,'Category color changed after sorting');
});
test('empty/zero chart rows never manufacture a percent or nonfinite width',()=>{
 assert.deepEqual(chartRows([],'source'),[]);
 assert.equal(chartRows([{key:'unknown',label:'Unknown',count:0,percent:null}],'source')[0].width,0);
});
test('chart rejects invalid aggregate counts instead of drawing misleading bars',()=>{
 for(const count of [-1,NaN,Infinity,0.5])assert.throws(()=>chartRows([{key:'x',label:'X',count}],'source'));
});
test('adjacent employment categories remain visually distinct after sorting',()=>{
 const items=[{key:'EMPLOYED_FULL_TIME',label:'Employed',count:1},{key:'STUDENT',label:'Student',count:1}];
 const rows=chartRows(items,'source');assert.notEqual(rows[0].series,rows[1].series);
 for(const row of chartRows(items,'count'))assert.equal(row.series,rows.find(other=>other.key===row.key).series);
});
