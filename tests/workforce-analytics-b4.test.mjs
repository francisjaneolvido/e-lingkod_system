import test from 'node:test';
import assert from 'node:assert/strict';
import { loadServerTypescript } from './helpers/load-typescript.mjs';
const hook = loadServerTypescript();
const { parseAnalyticsFilters, summarizeAnalytics, analyticsCsv, manilaYear } = await import('../src/features/analytics/domain.ts');
test.after(() => hook.deregister());
test('B4 annual filters reject silent ignored, repeated and incompatible inputs', () => {
  assert.equal(parseAnalyticsFilters({}, 2026).year, 2026);
  assert.equal(parseAnalyticsFilters({ period: 'YEAR', year: '2024' }, 2026).year, 2024);
  for (const value of [{ year: '2025' }, { period:'YEAR',year:'2025x' }, { population:'ESTABLISHMENT',employment:'OFW' }, { population:'SPES',age:'25-34' }, { population:'UNKNOWN' }, { privateId:'citizen-1' }, { barangay:'Not a barangay' }]) assert.throws(() => parseAnalyticsFilters(value,2026));
  assert.throws(() => parseAnalyticsFilters(new URLSearchParams('year=2026&year=2025'),2026));
  assert.throws(() => parseAnalyticsFilters({population:'SPES',dataset:'__UNKNOWN__'},2026));
  assert.equal(manilaYear(new Date('2026-12-31T16:01:00Z')),2027);
});
test('B4 unknowns, false, zero and multi-select denominators remain distinct', () => {
  const result = summarizeAnalytics([
    { employmentStatus:'EMPLOYED_FULL_TIME', occupation:'Driver', preferredOccupations:['Cook'], skills:['Welding','welding',' Welding '], householdSize:2, currentlyStudying:false, qualifications:['NC II'], completedTraining:['Food Safety'], overseasExperience:'FORMER' },
    { employmentStatus:'UNEMPLOYED_LOOKING', occupation:null, preferredOccupations:['Driver','Driver'], skills:[], householdSize:null, currentlyStudying:true, overseasExperience:'NEVER' },
    { employmentStatus:null, skills:['Welding'], householdSize:4, overseasExperience:'CURRENT' },
  ], 'INDIVIDUAL');
  const get = key => result.breakdowns.find(d=>d.key===key);
  assert.equal(result.count,3);
  assert.equal(get('skills').items.find(i=>i.label==='Welding').count,2);
  assert.equal(get('skills').missing,1);
  assert.equal(get('skills').denominator,3);
  assert.equal(get('employmentStatus').missing,1);
  assert.equal(get('currentlyStudying').known,2);
  assert.equal(get('currentlyStudying').items.find(i=>i.label==='No').count,1);
  assert.equal(get('occupation').items.find(i=>i.label==='Driver').count,1);
  assert.equal(get('preferredOccupations').items.find(i=>i.label==='Driver').count,1);
  assert.equal(get('completedTraining').known,1);
  assert.equal(get('qualifications').known,1);
  assert.equal(get('overseasExperience').items.find(i=>i.key==='former').count,1);
  assert.equal(result.measures.find(m=>m.key==='householdSize').mean,3);
  assert.equal(result.measures.find(m=>m.key==='householdSize').sum,null,'Household members must not become an implied community headcount');
  assert.equal(result.measures.find(m=>m.key==='householdSize').unknown,1);
});
test('B4 workforce sums use known establishments, keep zero, do not infer unknown totals or add overlapping part-time', () => {
  const r=summarizeAnalytics([{totalWorkers:null,regularWorkers:3,nonRegularWorkers:2,partTimeWorkers:2},{totalWorkers:0,regularWorkers:0,nonRegularWorkers:0,partTimeWorkers:0},{totalWorkers:10,regularWorkers:null,nonRegularWorkers:null,partTimeWorkers:3}],'ESTABLISHMENT');
  const get=k=>r.measures.find(m=>m.key===k);
  assert.equal(r.count,3); assert.equal(get('totalWorkers').sum,10); assert.equal(get('totalWorkers').known,2);assert.equal(get('totalWorkers').unknown,1);
  assert.equal(get('regularWorkers').sum,3);assert.equal(get('partTimeWorkers').sum,5);
  assert.equal(summarizeAnalytics([{totalWorkers:null}],'ESTABLISHMENT').measures.find(m=>m.key==='totalWorkers').sum,null);
});
test('B4 empty and sparse percentages are honest and all categories remain available', () => {
  const empty=summarizeAnalytics([],'INDIVIDUAL');
  assert.equal(empty.count,0);assert.ok(empty.breakdowns.every(d=>d.items.every(i=>i.percent===null)));
  const rows=Array.from({length:15},(_,i)=>({occupation:'Occupation '+i}));
  assert.equal(summarizeAnalytics(rows,'INDIVIDUAL').breakdowns.find(d=>d.key==='occupation').items.filter(i=>!i.unknown).length,15);
});
test('B4 imported observations do not manufacture qualifications, OFW or individual fields', () => {
  const imported=summarizeAnalytics([{educationLevel:'COLLEGE',skills:['Baking']}],'SPES');
  assert.equal(imported.count,1);assert.equal(imported.breakdowns.some(d=>d.key==='employmentStatus'),false);
  assert.equal(imported.breakdowns.some(d=>d.key==='qualifications'),false);
});
test('B4 aggregate CSV uses only aggregate contracts and neutralizes spreadsheet formulas', () => {
  const stats=summarizeAnalytics([{occupation:'=HYPERLINK("https://example.test")'}],'INDIVIDUAL');
  const csv=analyticsCsv({filters:parseAnalyticsFilters({},2026),groups:[{source:'Citizen survey',unit:'respondents',...stats}],methodology:['Synthetic contract'],excluded:{},rosters:[]});
  assert.ok(csv.includes("'=HYPERLINK")); assert.ok(csv.includes('denominator')); assert.ok(csv.includes('2026'));
  assert.ok(!csv.includes('userId'));assert.ok(!csv.includes('participantRef'));
});
