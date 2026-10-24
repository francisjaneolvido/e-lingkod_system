import assert from 'node:assert/strict';
import {accounts,vacancyScenarios} from '../../demo/fixtures/dataset.mjs';
import {vacancyDetails} from '../../demo/b5-fixtures.mjs';
export async function verifyB5(prisma,state){
 const {personalOpportunities}=await import('../../src/features/jobs/server/recommendations.ts');
 const {opportunityDemand}=await import('../../src/features/jobs/server/demand.ts');
 const records=await prisma.jobOpportunity.findMany({where:{id:{in:vacancyScenarios.map(f=>state.completed[f.key+':create'].id)}}});
 assert.equal(records.length,28);let matchingPeople=0,shown=0;
 for(const fixture of vacancyScenarios){const row=records.find(r=>r.id===state.completed[fixture.key+':create'].id),expected=vacancyDetails(fixture.index);
  assert.equal(row.isDemo,true);assert.equal(row.payMin.toFixed(2),expected.payMin);assert.equal(row.payMax.toFixed(2),expected.payMax);
  for(const key of ['payCurrency','payBasis','negotiable','occupationCategory','employmentSector','workArrangement','experienceLevel'])assert.equal(row[key],expected[key]);
  assert.deepEqual(JSON.parse(row.certificationsJson),expected.certifications);
 }
 for(const account of accounts.filter(a=>a.group==='individual')){
  const viewer=await prisma.user.findUniqueOrThrow({where:{email:account.email}}),result=await personalOpportunities(viewer);
  assert.ok(result.matches.length<=5);assert.ok(result.readiness.completion>=0&&result.readiness.completion<=100);
  if(!result.consented||!result.eligible)assert.equal(result.matches.length,0);
  assert.ok(result.matches.every(r=>r.job.isDemo&&r.job.status==='PUBLISHED'));
  if(result.matches.length)matchingPeople++;shown+=result.matches.length;
 }
 assert.ok(matchingPeople>0,'Fixtures must offer some meaningful labelled matching simulations');
 const admin=await prisma.user.findUniqueOrThrow({where:{email:'admin.01@example.test'}}),demand=await opportunityDemand(admin);
 assert.equal(demand.genuineVacancies,0);assert.equal(demand.skills.length,0);assert.equal(demand.demonstrationVacancies,vacancyScenarios.filter(f=>f.status==='PUBLISHED').length);
 const result={managedVacancies:records.length,genuineVacancies:0,activeDemonstrations:demand.demonstrationVacancies,individualProfiles:80,peopleWithSuggestions:matchingPeople,totalSuggestions:shown,maximumPerPerson:5,readOnly:true};
 console.log('B5 persisted demo scenarios verified: '+JSON.stringify(result));return result;
}
