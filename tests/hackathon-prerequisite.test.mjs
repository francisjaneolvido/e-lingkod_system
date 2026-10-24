import test from 'node:test';
import assert from 'node:assert/strict';
import { loadServerTypescript } from './helpers/load-typescript.mjs';
import { connectTarget,snapshot,assertMigrationOnly } from '../scripts/hackathon/storage.mjs';
const enabled=/^elb_b3_test_[a-f0-9]{32}$/.test(process.env.ELB_B3_TEST_DATABASE||'');
test('additive prerequisites cannot adopt manual census rows after DDL interruption',{skip:!enabled},async()=>{
  const hook=loadServerTypescript();const {prisma}=await import('../src/lib/prisma.ts');
  const db=await connectTarget(process.env.DATABASE_URL,{test:true});
  try{
    const admin=await prisma.user.create({data:{id:'prerequisite-fixture-admin',name:'Synthetic migration Admin',email:'prerequisite.admin@example.test',role:'ADMIN'}});
    const before=await snapshot(db);for(const table of ['census_assistance_roster','census_assistance_member','census_audit'])delete before[table];
    await assertMigrationOnly(db,before);
    const census=await import('../src/features/census/server/data.ts');
    await census.saveAssistanceRoster(admin,{barangay:'Bambang',staffIds:[],expectedVersion:0});
    const manual=await prisma.censusAssistanceRoster.findUniqueOrThrow({where:{barangay:'Bambang'}});
    const audits=await prisma.censusAudit.findMany();
    await assert.rejects(assertMigrationOnly(db,before),/Manual records in newly migrated table/);
    assert.deepEqual(await prisma.censusAssistanceRoster.findUniqueOrThrow({where:{barangay:'Bambang'}}),manual);
    assert.deepEqual(await prisma.censusAudit.findMany(),audits);
  }finally{await db.end();await prisma.$disconnect();hook.deregister();}
});
