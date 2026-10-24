import test from 'node:test';
import assert from 'node:assert/strict';
import {loadServerTypescript} from './helpers/load-typescript.mjs';
import {connectTarget} from '../scripts/hackathon/storage.mjs';
import {snapshot} from '../scripts/demo/database.mjs';
import {preparePostconditions,assertPostconditions} from '../scripts/demo/migration-postconditions.mjs';
const enabled=/^elb_b3_test_[a-f0-9]{32}$/.test(process.env.ELB_B3_TEST_DATABASE||'');
test('B5 additive migration accepts only expected null fields/demo markers, rejecting post-DDL manual values',{skip:!enabled},async()=>{
 const hook=loadServerTypescript(),{prisma}=await import('../src/lib/prisma.ts');const db=await connectTarget(process.env.DATABASE_URL,{test:true});
 try{
  const admin=await prisma.user.create({data:{id:'b5-ddl-admin',name:'Synthetic migration Admin',email:'b5.ddl@example.test',role:'ADMIN'}});
  const job=await prisma.jobOpportunity.create({data:{title:'[DEMO] Existing synthetic vacancy',employer:'[DEMO] Synthetic office',sector:'Skilled trades',workType:'FULL_TIME',barangay:'Bambang',location:'Los Baños',description:'Synthetic migration fixture only.',skillsJson:'[]',interestsJson:'[]',education:'ANY',contactInfo:'Do not contact externally.',createdById:admin.id,isDemo:true}});
  const additions=['occupationCategory','employmentSector','workArrangement','experienceLevel','payMin','payMax','payCurrency','payBasis','negotiable','certificationsJson','isDemo'];
  // Reconstruct the exact pre-DDL projection; the current migrated schema then
  // exercises the same postcondition contract used by the real demo upgrade.
  const before=await snapshot(db);delete before.job_mutation;delete before.job_recommendation;
  before.job_opportunity=before.job_opportunity.map(value=>{const row=JSON.parse(value);for(const key of additions)delete row[key];return JSON.stringify(row);});
  const postconditions=await preparePostconditions(db,['20261024130000_opportunity_details'],before);
  postconditions.columns.job_opportunity=postconditions.columns.job_opportunity.filter(k=>!additions.includes(k));
  const journal={before,postconditions};await assertPostconditions(db,journal);
  await db.query('UPDATE job_opportunity SET payMin=999.00 WHERE id=?',[job.id]);
  await assert.rejects(assertPostconditions(db,journal),/unexpected value in new column job_opportunity.payMin/);
  assert.equal((await prisma.jobOpportunity.findUniqueOrThrow({where:{id:job.id}})).payMin.toFixed(2),'999.00');
  // Isolated fixture reset between independent probes, never recovery behavior.
  await db.query('UPDATE job_opportunity SET payMin=NULL,isDemo=0 WHERE id=?',[job.id]);
  await assert.rejects(assertPostconditions(db,journal),/unexpected value in new column job_opportunity.isDemo/);
  assert.equal((await prisma.jobOpportunity.findUniqueOrThrow({where:{id:job.id}})).isDemo,false);
 }finally{await db.end();await prisma.$disconnect();hook.deregister();}
});
