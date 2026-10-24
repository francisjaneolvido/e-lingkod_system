import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { accounts } from '../../demo/fixtures/dataset.mjs';
import { snapshot,assertPreserved,writeJson } from './storage.mjs';
export async function fixtureReport({db,directory}){
  const {prisma}=await import('../../src/lib/prisma.ts');
  const state=JSON.parse(fs.readFileSync(path.join(directory,'journal.json'),'utf8'));
  assert.equal(state.ready,true,'Import is not complete');
  const baseline=JSON.parse(fs.readFileSync(path.join(directory,'baseline.json'),'utf8'));
  await assertPreserved(db,baseline);
  const ids=accounts.filter(a=>!state.collisions.includes(a.key)).map(a=>state.completed['register:'+a.key].id);
  const records=await prisma.communitySurvey.findMany({where:{userId:{in:ids}},select:{surveyYear:true,status:true,consentAggregated:true}});
  const years={};for(const r of records){const key=r.surveyYear+':'+r.status;years[key]=(years[key]||0)+1;}
  const submitted=records.filter(r=>r.status==='SUBMITTED'&&r.consentAggregated).reduce((sum,r)=>(sum[r.surveyYear]=(sum[r.surveyYear]||0)+1,sum),{});
  const organizations=await prisma.establishment.findMany({where:{ownerId:{in:ids}},select:{id:true,ownerId:true,surveys:{select:{surveyYear:true,status:true}}}});
  const annuals={};for(const r of organizations.flatMap(o=>o.surveys)){const key=r.surveyYear+':'+r.status;annuals[key]=(annuals[key]||0)+1;}
  const current=await snapshot(db),addedRowsByTable={};for(const [table,rows] of Object.entries(current)){const old=new Set(baseline[table]||[]);const n=rows.filter(r=>!old.has(r)).length;if(n)addedRowsByTable[table]=n;}
  const logins=fs.existsSync(path.join(directory,'credentials-verification.json'))?JSON.parse(fs.readFileSync(path.join(directory,'credentials-verification.json'),'utf8')):null;
  const result={target:state.target,addedAccounts:ids.length,skippedAccountCollisions:state.collisions.length,heldFixtureOperations:state.conflicts,existingRecordsPreserved:true,addedRowsByTable,individualAnnualStatuses:years,eligibleIndividualSubmissionsByYear:submitted,establishmentRecords:organizations.length,establishmentAnnualStatuses:annuals,credentials:logins,checkedAt:new Date().toISOString()};
  writeJson(path.join(directory,'fixture-counts.json'),result);
  const quote=value=>'"'+String(value??'').replaceAll('"','""')+'"';
  const rows=[['Display name','Email','Password','Role','Group','User ID','Establishment ID']];
  for(const a of accounts.filter(a=>!state.collisions.includes(a.key))){const id=state.completed['register:'+a.key].id;const user=await prisma.user.findUniqueOrThrow({where:{id}});rows.push([user.name,a.email,a.password,user.role,a.group,id,organizations.find(o=>o.ownerId===id)?.id||'']);}
  fs.writeFileSync(path.join(directory,'managed-accounts.csv'),rows.map(r=>r.map(quote).join(',')).join('\r\n')+'\r\n',{mode:0o600});
  return result;
}
