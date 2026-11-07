import test from 'node:test';
import assert from 'node:assert/strict';
import {loadServerTypescript} from './helpers/load-typescript.mjs';
const hook=loadServerTypescript();
const {summarizeGeography}=await import('../src/features/analytics/geographic-domain.ts');
test.after(()=>hook.deregister());

test('applied geography does not remove other exact authorised navigation keys or disclose their aggregates',()=>{
 const result=summarizeGeography([{barangay:'Bambang',trainingInterest:'YES'},{barangay:'Maahas',trainingInterest:'YES'},{barangay:'Anos',trainingInterest:'YES'}],{source:'Synthetic',unit:'respondents',filters:{population:'INDIVIDUAL',period:'YEAR',year:2026,barangay:'Bambang'},scope:['Bambang','Maahas']});
 assert.deepEqual(result.availableRegions.map(region=>region.filterKey).sort(),['Bambang','Maahas']);
 assert.equal(result.cells.length,1);assert.equal(result.cells[0].barangay,'Bambang');
 assert.equal(result.cells[0].eligible,1);assert.ok(!result.availableRegions.some(region=>region.filterKey==='Anos'));
 assert.ok(result.availableRegions.every(region=>Object.keys(region).sort().join(',')==='code,filterKey'));
});

test('navigation keeps exact stored permission keys and never merges aliases into broader data authority',()=>{
 const scope=['Tadlac','Bambang'];
 const result=summarizeGeography([{barangay:'Tadlac',trainingInterest:'YES'},{barangay:'Tadlak',trainingInterest:'YES'}],{source:'Synthetic',unit:'respondents',filters:{population:'INDIVIDUAL',period:'YEAR',year:2026},scope});
 assert.deepEqual(result.availableRegions.map(region=>region.filterKey).sort(),scope.toSorted());
 assert.equal(result.cells.reduce((sum,cell)=>sum+cell.eligible,0),1);
});
