import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {loadServerTypescript} from './helpers/load-typescript.mjs';
import {journalStep} from '../scripts/demo/operation-journal.mjs';
import {fingerprint,snapshot,digest,metadata,saveMetadata} from '../scripts/demo/database.mjs';
import {connectTarget} from '../scripts/hackathon/storage.mjs';
const enabled=/^elb_b3_test_[a-f0-9]{32}$/.test(process.env.ELB_B3_TEST_DATABASE||'');
test('B5 prepared vacancy mutations replay exact committed results and reject later manual data',{skip:!enabled},async t=>{
 const hook=loadServerTypescript();const {prisma}=await import('../src/lib/prisma.ts');
 const db=await connectTarget(process.env.DATABASE_URL,{test:true});
 try{
  const admin=await prisma.user.create({data:{id:randomUUID(),name:'Synthetic recovery Admin',email:'b5.recovery@example.test',role:'ADMIN'}});
  const {createOpportunity,mutateOpportunity}=await import('../src/features/jobs/server/mutations.ts');
  const payload={title:'[DEMO] Recovery welder',employer:'[DEMO] Synthetic workshop',sector:'Skilled trades',workType:'FULL_TIME',barangay:'Bambang',location:'Los Baños, Laguna',description:'[DEMO] Synthetic recovery fixture; no actual recruitment.',skills:['Welding'],interests:['Skilled trades'],education:'ANY',contactInfo:'Demo only; do not contact externally.',reviewSource:'[DEMO] Synthetic source, no genuine verification.'};
  async function pending(){const created=await createOpportunity({...payload,requestKey:randomUUID()},admin);const row=await prisma.jobOpportunity.findUniqueOrThrow({where:{id:created.id}});const state={completed:{},pending:null,fingerprint:await fingerprint(db)};const operation={kind:'vacancy-mutation',actorId:admin.id,payload:{id:row.id,action:'EDIT',expectedVersion:row.version,requestKey:randomUUID(),job:{...payload,description:payload.description+' Prepared edit.'}}};return {state,operation};}
  await t.test('commit without checkpoint replays once with the original versions and audit identity',async()=>{
   const {state,operation}=await pending();const options={db,state,name:'replay',persist:value=>saveMetadata(db,value),prepare:async()=>operation};
   await assert.rejects(journalStep({...options,fault:'after'}),/Simulated interruption/);
   const recovered=await metadata(db);const result=await journalStep({...options,state:recovered,prepare:async()=>{throw Error('Must replay persisted operation');}});assert.equal(result.id,operation.payload.id);assert.equal(recovered.pending,null);
   assert.equal(await prisma.jobActivity.count({where:{jobId:result.id,action:'EDIT'}}),1);assert.equal(await prisma.jobMutation.count({where:{jobId:result.id}}),2);
  });
  await t.test('later application edit is retained rather than adopted by the original replay',async()=>{
   const {state,operation}=await pending();const options={db,state,name:'later',persist:value=>saveMetadata(db,value),prepare:async()=>operation};await assert.rejects(journalStep({...options,fault:'after'}),/Simulated interruption/);
   let row=await prisma.jobOpportunity.findUniqueOrThrow({where:{id:operation.payload.id}});
   await mutateOpportunity(row.id,{action:'EDIT',expectedVersion:row.version,requestKey:randomUUID(),job:{...payload,description:payload.description+' Later manual application edit.'}},admin);
   row=await prisma.jobOpportunity.findUniqueOrThrow({where:{id:row.id}});const before=digest(await snapshot(db));
   await assert.rejects(journalStep({...options,state:await metadata(db),prepare:async()=>{throw Error("Must replay persisted operation");}}),/Later vacancy edits preserved/);assert.equal(digest(await snapshot(db)),before);assert.equal((await prisma.jobOpportunity.findUniqueOrThrow({where:{id:row.id}})).description,row.description);
  });
  await t.test('even a direct manual change without a version bump is preserved and causes a conflict',async()=>{
   const {state,operation}=await pending();const options={db,state,name:'direct',persist:value=>saveMetadata(db,value),prepare:async()=>operation};await assert.rejects(journalStep({...options,fault:'after'}),/Simulated interruption/);
   await prisma.jobOpportunity.update({where:{id:operation.payload.id},data:{description:'[DEMO] Unrelated direct manual edit; preserve it.'}});
   const before=digest(await snapshot(db));await assert.rejects(journalStep(options),/Later vacancy edits preserved/);assert.equal(digest(await snapshot(db)),before);
  });
 }finally{await db.end();await prisma.$disconnect();hook.deregister();}
});
