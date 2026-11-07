import test from 'node:test';
import assert from 'node:assert/strict';
import {loadServerTypescript} from './helpers/load-typescript.mjs';
loadServerTypescript();
const {projectPoint,geometryPath}=await import('../src/features/analytics/components/map-model.ts');
const bounds=[121.17,14.10,121.27,14.20];
test('projection keeps north up, fits both axes, and shares identical boundary coordinates',()=>{
 const a=projectPoint([121.17,14.10],bounds),b=projectPoint([121.27,14.20],bounds);
 assert.ok(a[0]<b[0]&&a[1]>b[1]);
 for(const n of [...a,...b])assert.ok(Number.isFinite(n)&&n>=12&&n<=348);
 const common=[121.22,14.15];
 assert.deepEqual(projectPoint(common,bounds),projectPoint([...common],bounds));
});
test('polygon paths preserve separate rings and multipolygon parts without altering coordinates',()=>{
 const ring=[[121.18,14.11],[121.22,14.11],[121.22,14.15],[121.18,14.11]];
 const single=geometryPath({type:'Polygon',coordinates:[ring]},bounds);
 assert.equal((single.match(/M/g)||[]).length,1);assert.equal((single.match(/Z/g)||[]).length,1);
 assert.equal(geometryPath({type:'MultiPolygon',coordinates:[[ring],[ring]]},bounds),single+single);
 assert.ok(!single.includes('NaN'));
});
