import assert from 'node:assert/strict';
import {loadServerTypescript} from './load-typescript.mjs';
if(!/^elb_b3_test_[a-f0-9]{32}$/.test(process.env.ELB_B3_TEST_DATABASE||'')||new URL(process.env.DATABASE_URL).pathname!=='/'+process.env.ELB_B3_TEST_DATABASE)throw Error('Guarded disposable browser database required');
const hook=loadServerTypescript();const {prisma}=await import('../../src/lib/prisma.ts');
try{
 const counts=[];
 for(const [scenario,edits] of [['unchanged',0],['edited',3],['unresolved',1],['validation',0]]){
  const jobs=await prisma.jobOpportunity.findMany({where:{title:'[DEMO] Recovery '+scenario},include:{activities:true}});
  const observed={scenario,vacancies:jobs.length,creates:jobs.flatMap(j=>j.activities).filter(a=>a.action==='CREATE').length,edits:jobs.flatMap(j=>j.activities).filter(a=>a.action==='EDIT').length};counts.push(observed);
  console.log('Persistent browser recovery counts: '+JSON.stringify(observed));
  assert.equal(jobs.length,1,scenario+' must own exactly one vacancy');assert.equal(observed.creates,1);assert.equal(observed.edits,edits);
  if(scenario==='edited')assert.match(jobs[0].description,/Final later amendment/);
 }
 const management=await prisma.jobOpportunity.findMany({where:{title:'[DEMO] Recovery management'},include:{activities:true}});
 assert.equal(management.length,1);const approval=management[0].activities.filter(a=>a.action==='APPROVE');
 assert.equal(approval.length,1);assert.match(approval[0].note,/Original synthetic review/);assert.doesNotMatch(approval[0].note,/Changed note/);
 assert.equal(management[0].activities.filter(a=>a.action==='CREATE').length,1);assert.equal(management[0].activities.filter(a=>a.action==='SUBMIT_REVIEW').length,1);
 console.log('Persistent management counts: '+JSON.stringify({vacancies:1,creates:1,submissions:1,approvals:1,originalNotePreserved:true}));
 console.log(JSON.stringify({passed:true,counts}));
}finally{await prisma.$disconnect();hook.deregister();}
