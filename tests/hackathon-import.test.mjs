import test from 'node:test';
import assert from 'node:assert/strict';
import { loadServerTypescript } from './helpers/load-typescript.mjs';
const enabled=/^elb_b3_test_[a-f0-9]{32}$/.test(process.env.ELB_B3_TEST_DATABASE||'');
test('additive fixture import preserves pre-existing identities and records; exact retry and interruption fail closed', {skip:!enabled}, async()=>{
  const hook=loadServerTypescript();
  const {prisma}=await import('../src/lib/prisma.ts');
  const {auth}=await import('../src/lib/auth.ts');
  const {accounts}=await import('../demo/fixtures/dataset.mjs');
  const {importFixtures,verifyCredentials}=await import('../scripts/hackathon/import.mjs');
  const {connectTarget,readTarget}=await import('../scripts/hackathon/storage.mjs');
  const fs=await import('node:fs'); const os=await import('node:os');const path=await import('node:path');
  const directory=fs.mkdtempSync(path.join(os.tmpdir(),'elb-fixture-import-'));
  const db=await connectTarget(process.env.DATABASE_URL,{test:true});
  const target=await readTarget(db);
  try{
    const collision=accounts.find(a=>a.group==='individual');
    await auth.api.signUpEmail({body:{...collision,password:'Existing-unrelated-password-2026!'}});
    const existing=await prisma.user.findUniqueOrThrow({where:{email:collision.email}});
    const life=await import('../src/features/community/server/survey-lifecycle.ts');
    await life.saveCitizenSurvey({surveyYear:2026,status:'DRAFT',barangay:'Maahas',requestKey:'manual-existing-draft',expectedVersion:0,expectedConsentVersion:0},existing);
    const original=await prisma.user.findUniqueOrThrow({where:{id:existing.id},include:{accounts:true}});
    const draft=await life.ownedSurveyState(existing.id,2026);
    const settings={db,directory,target,baseURL:process.env.BETTER_AUTH_URL||'http://localhost:3103'};
    const scenario=process.env.ELB_FIXTURE_RECOVERY_CASE||'after';
    await assert.rejects(importFixtures({...settings,fault:{name:'individual-02:submit',when:scenario==='before'?'before':'after'}}),/Simulated interruption/);
    const managed=await prisma.user.findUniqueOrThrow({where:{email:'individual.02@example.test'}});
    if(scenario==='before'){
      const prior=await life.ownedSurveyState(managed.id,2026);
      await life.saveCitizenSurvey({surveyYear:2026,status:'DRAFT',barangay:'Maahas',occupation:'Manual preserved answer',expectedVersion:prior.workspaceVersion,expectedConsentVersion:prior.consentVersion,requestKey:'manual-precommit-draft'},managed);
      await life.changeCitizenConsent({matching:false,programs:false,expectedConsentVersion:prior.consentVersion},managed);
      const manual=await life.ownedSurveyState(managed.id,2026);
      await assert.rejects(importFixtures(settings),/conflict|changed|preserved/i);
      assert.deepEqual(await life.ownedSurveyState(managed.id,2026),manual);return;
    }
    assert.equal(await prisma.communitySurveyRevision.count({where:{userId:managed.id,surveyYear:2026}}),1);
    let result=await importFixtures(settings);
    assert.equal(result.addedAccounts,107);assert.equal(result.collisions.length,1);
    assert.deepEqual(await prisma.user.findUniqueOrThrow({where:{id:existing.id},include:{accounts:true}}),original);
    assert.deepEqual(await life.ownedSurveyState(existing.id,2026),draft);
    const counts=await prisma.user.count();result=await importFixtures(settings);assert.equal(await prisma.user.count(),counts);assert.equal(result.addedAccounts,107);
    const logins=await verifyCredentials(settings);assert.equal(logins.verified,107);assert.equal(logins.skipped,1);
    await auth.api.signInEmail({body:{email:collision.email,password:'Existing-unrelated-password-2026!'}});
    assert.equal((await prisma.establishment.count()),20);
    assert.equal((await prisma.jobOpportunity.count()),28);
    assert.equal(fs.existsSync(path.join(directory,'baseline.json')),true);
    assert.equal(await prisma.communitySurveyRevision.count({where:{userId:managed.id,surveyYear:2026}}),1,'committed operation replay does not append a revision');
    const latest=await life.ownedSurveyState(managed.id,2026);
    await life.saveCitizenSurvey({surveyYear:2026,status:'DRAFT',barangay:'Maahas',occupation:'Later legitimate manual edit',expectedVersion:latest.workspaceVersion,expectedConsentVersion:latest.consentVersion,requestKey:'later-manual-draft'},managed);
    const preserved=await life.ownedSurveyState(managed.id,2026);
    await assert.rejects(importFixtures(settings),/manual changes|preservation conflict/i);
    assert.deepEqual(await life.ownedSurveyState(managed.id,2026),preserved);
  }finally{await db.end();await prisma.$disconnect();hook.deregister();fs.rmSync(directory,{recursive:true,force:true});}
});
