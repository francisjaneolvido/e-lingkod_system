import {vacancyDetails} from '../../demo/b5-fixtures.mjs';
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import { accounts, staffGrants, individualAnswers, establishmentAnswers, vacancyScenarios, datasetVersion, referenceYear } from '../../demo/fixtures/dataset.mjs';
import { assistanceAssignments, censusImportFixture } from '../../demo/b3-fixtures.mjs';
import { journalStep } from '../demo/operation-journal.mjs';
import { snapshot, digest, writeJson, assertPreserved, readTarget } from './storage.mjs';

// The journal contains private target snapshots. Never put it in a commit/export.
export async function importFixtures({db,directory,target,baseURL,fault}) {
  const {prisma}=await import('../../src/lib/prisma.ts');
  const {auth}=await import('../../src/lib/auth.ts');
  const personal=await import('../../src/features/community/server/survey-lifecycle.ts');
  const domain=await import('../../src/features/community/domain.ts');
  const organizations=await import('../../src/features/establishments/server/data.ts');
  const {INDUSTRIES}=await import('../../src/features/establishments/domain.ts');
  const {LOS_BANOS_BARANGAYS:barangays}=await import('../../src/features/emergency/domain.ts');
  const jobs=await import('../../src/features/jobs/domain.ts');
  fs.mkdirSync(directory,{recursive:true});
  assert.deepEqual(await readTarget(db),target,'Target identity changed');
  const acquired=await db.query("SELECT GET_LOCK('elb_hackathon_additive_v1',0) acquired");
  if(Number(acquired[0].acquired)!==1)throw Error('Another additive import is active');
  const file=path.join(directory,'journal.json'),baselineFile=path.join(directory,'baseline.json');
  const fixtureDigest=digest([datasetVersion,accounts,staffGrants,censusImportFixture,assistanceAssignments,fs.readFileSync(new URL('./import.mjs',import.meta.url),'utf8')]);
  let state;
  try {
    if(fs.existsSync(file))state=JSON.parse(fs.readFileSync(file,'utf8'));
    else {
      const before=await snapshot(db);writeJson(baselineFile,before);
      const collisions=[];
      for(const a of accounts)if(await prisma.user.findUnique({where:{email:a.email}}))collisions.push(a.key);
      state={version:1,target,fixtureDigest,completed:{},pending:null,fingerprint:digest(before),collisions,conflicts:[]};writeJson(file,state);
    }
    assert.deepEqual(state.target,target);assert.equal(state.fixtureDigest,fixtureDigest,'Fixture/importer changed; do not silently reuse old operations');
    if(!state.pending && state.fingerprint!==digest(await snapshot(db)))throw Error('Additive import preservation conflict: manual changes since checkpoint');
    const baseline=JSON.parse(fs.readFileSync(baselineFile,'utf8'));
    const persist=async value=>writeJson(file,value);
    // Idempotent lifecycle operations retain full original payload and versions.
    const prepared=async(name,prepare)=>{try{return await journalStep({db,state,name,persist,prepare,fault:fault?.name===name?fault.when:undefined});}catch(error){const now=await snapshot(db);const changed=state.pending?Object.keys(now).filter(t=>digest(now[t])!==digest(state.pending.before[t])):[];throw new Error(error.message+' [operation '+name+'; changed tables '+changed.join(',')+']',{cause:error});}};
    // Registration and legacy job APIs have no durable request receipt. If an
    // interruption loses their result, fail closed, never infer account ownership
    // or silently adopt a newer record. A retry cannot duplicate that operation.
    async function step(name,prepare,execute){
      if(Object.hasOwn(state.completed,name))return state.completed[name];
      if(state.pending && state.pending.name!==name)throw Error('Resume the original pending operation first');
      if(!state.pending){const before=await snapshot(db);assert.equal(digest(before),state.fingerprint,'Manual edit conflict');const payload=await prepare();assert.equal(digest(await snapshot(db)),state.fingerprint,'Manual edit during preparation');state.pending={name,custom:true,payload,before};await persist(state);}
      if(!state.pending.custom)throw Error('Pending operation kind changed');
      assert.equal(digest(await snapshot(db)),digest(state.pending.before),'Ambiguous non-idempotent operation or manual edit: preserved for review; no adoption');
      if(fault?.name===name&&fault.when==='before')throw Error('Simulated interruption before mutation');
      const result=await execute(state.pending.payload);
      if(fault?.name===name&&fault.when==='after')throw Error('Simulated interruption after commit');
      await assertPreserved(db,baseline);
      state.completed[name]=result??true;state.pending=null;state.fingerprint=digest(await snapshot(db));await persist(state);return result;
    }
    const viewers={};
    for(const account of accounts){
      if(state.collisions.includes(account.key))continue;
      const registered=await step('register:'+account.key,()=>({...account}),async payload=>{
        if(await prisma.user.findUnique({where:{email:payload.email}}))throw Error('Account collision; refusing takeover');
        const result=await auth.api.signUpEmail({body:payload});return {id:result.user.id};
      });
      viewers[account.key]=await prisma.user.findUniqueOrThrow({where:{id:registered.id}});
      assert.equal(viewers[account.key].email,account.email);
    }
    for(const account of accounts.filter(a=>a.role==='ADMIN'&&viewers[a.key])){
      await step('admin:'+account.key,()=>({id:viewers[account.key].id,email:account.email}),async payload=>{
        const user=await prisma.user.findUniqueOrThrow({where:{id:payload.id}});assert.equal(user.role,'CITIZEN');
        const command=spawnSync(process.execPath,['scripts/set-admin.mjs',payload.email],{env:process.env,encoding:'utf8',windowsHide:true});if(command.status!==0)throw Error('Privileged local provision failed');return true;
      });
      viewers[account.key]=await prisma.user.findUniqueOrThrow({where:{id:viewers[account.key].id}});
    }
    const administrator=accounts.find(a=>a.role==='ADMIN'&&viewers[a.key]);
    if(!administrator)throw Error('No newly owned fixture Admin available; existing accounts were preserved');
    const admin=viewers[administrator.key];
    async function route(module,method,payload,id){
      const session=await auth.api.signInEmail({body:{email:administrator.email,password:administrator.password},returnHeaders:true});
      const cookie=session.headers.getSetCookie().map(v=>v.split(';')[0]).join('; ');
      try{const handler=await import(`../../src/app/api/admin/${module}/route.ts`);const response=await handler[method](new Request(baseURL+'/api/admin/'+module.replace('/[id]',id?'/'+id:''),{method,headers:{origin:baseURL,cookie,'content-type':'application/json'},body:JSON.stringify(payload)}),{params:Promise.resolve({id})});const result=await response.json();if(!response.ok)throw Error('Fixture mutation refused: '+response.status+' '+result.error);return result;}
      finally{await auth.handler(new Request(baseURL+'/api/auth/sign-out',{method:'POST',headers:{origin:baseURL,cookie,'content-type':'application/json'},body:'{}'}));}
    }
    for(const account of accounts.filter(a=>a.group==='staff'&&viewers[a.key])){
      await prepared('staff:'+account.key,async()=>({kind:'staff-grant',actorId:admin.id,payload:{email:account.email,mode:'SAVE',...staffGrants[account.index]}}));
      viewers[account.key]=await prisma.user.findUniqueOrThrow({where:{id:viewers[account.key].id}});
    }
    const requestKey=name=>`hackathon_${datasetVersion}_${name}`.replace(/[^A-Za-z0-9_-]/g,'_');
    async function saveIndividual(account,label,answers){const viewer=viewers[account.key];return prepared(account.key+':'+label,async()=>{const current=await personal.ownedSurveyState(viewer.id,answers.surveyYear);return {kind:'individual-save',actorId:viewer.id,payload:{...answers,expectedVersion:current.workspaceVersion,expectedConsentVersion:current.consentVersion,requestKey:requestKey(account.key+'_'+label)}};});}
    for(const account of accounts.filter(a=>a.group==='individual'&&viewers[a.key])){
      const i=account.index,answers=individualAnswers(i,barangays,domain.COMMUNITY_SKILLS);
      if(i%10===0)await saveIndividual(account,'historical',{...answers,surveyYear:referenceYear-1});
      if(account.scenario==='incomplete-draft'){await saveIndividual(account,'draft-only',{surveyYear:referenceYear,status:'DRAFT',barangay:answers.barangay,ageGroup:answers.ageGroup});continue;}
      await saveIndividual(account,'submit',answers);
      if(i<68&&i%8===0)await saveIndividual(account,'revision',{...answers,employmentHistory:'Updated synthetic demonstration history; immutable earlier revision retained.'});
      if(account.scenario==='later-draft')await saveIndividual(account,'later-draft',{...answers,status:'DRAFT',occupation:'Unsubmitted demo change'});
      if(account.scenario==='withdrawn')await prepared(account.key+':withdraw',async()=>{const current=await personal.ownedSurveyState(viewers[account.key].id,referenceYear);return {kind:'individual-withdraw',actorId:viewers[account.key].id,payload:{surveyYear:referenceYear,expectedVersion:current.workspaceVersion,expectedConsentVersion:current.consentVersion,requestKey:requestKey(account.key+'_withdraw')}};});
    }
    for(const account of accounts.filter(a=>a.group==='establishment'&&viewers[a.key])){
      const viewer=viewers[account.key],i=account.index,answers=establishmentAnswers(i,barangays,INDUSTRIES);
      const created=await prepared(account.key+':create',async()=>({kind:'establishment-create',actorId:viewer.id,payload:{...answers,requestKey:requestKey(account.key+'_create')}}));
      async function save(label,value,withdraw=false,correction=false){return prepared(account.key+':'+label,async()=>{const current=await organizations.ownedEstablishmentState(viewer,created.establishmentId,value.surveyYear);return {kind:withdraw?'establishment-withdraw':'establishment-save',actorId:viewer.id,payload:{...value,establishmentId:created.establishmentId,status:value.status??'SUBMITTED',expectedRecordVersion:current.recordVersion,expectedVersion:current.workspaceVersion,requestKey:requestKey(account.key+'_'+label),correctIdentity:correction}};});}
      if(i%4===0)await save('historical',{...answers,surveyYear:referenceYear-1});
      if(account.scenario==='draft-only')continue;
      await save('submit',answers);
      if(i%4===0)await save('revision',{...answers,workforceNotes:'[DEMO] Revised workforce notes; earlier snapshot retained.'});
      if(i===2)await save('identity-correction',{...answers,businessName:answers.businessName+' Corrected'},false,true);
      if(account.scenario==='later-draft')await save('later-draft',{...answers,status:'DRAFT',productsServices:'Unsubmitted synthetic product change.'});
      if(account.scenario==='withdrawn')await save('withdraw',answers,true);
    }
    for(const fixture of vacancyScenarios){
      const i=fixture.index;
      const job={...vacancyDetails(i),title:`[DEMO] ${['Office assistant','Farm worker','Food preparer','Technical assistant'][i%4]} ${String(i+1).padStart(2,'0')}`,employer:`[DEMO] Synthetic Employer ${i+1}`,sector:jobs.SECTORS[i%jobs.SECTORS.length],workType:jobs.WORK_TYPES[i%jobs.WORK_TYPES.length],barangay:barangays[i%barangays.length],location:`Los Baños, Laguna — demo site ${i+1}`,description:'[DEMO] Synthetic opportunity for team testing only. No real recruitment or external applications. Future salary/experience scenarios are fixture annotations only.',skills:[i===15?'Photography':domain.COMMUNITY_SKILLS[i%domain.COMMUNITY_SKILLS.length]],interests:[jobs.INTERESTS[i%jobs.INTERESTS.length]],education:jobs.EDUCATION[i%jobs.EDUCATION.length],contactInfo:'Demonstration only: do not contact or apply externally.',reviewSource:'[DEMO] Synthetic fixture, simulated review only. No actual employer or vacancy verification.',externalUrl:'',expiresAt:''};
      const name=fixture.key+':create';
      if(!state.completed[name]&&!state.pending&&await prisma.jobOpportunity.count({where:{title:job.title}})){if(!state.conflicts.includes(name)){state.conflicts.push(name);await persist(state);}continue;}
      const created=await step(name,()=>job,payload=>route('jobs','POST',payload));
      const actions=fixture.status==='DRAFT'?[]:fixture.status==='PENDING_REVIEW'?['SUBMIT_REVIEW']:fixture.status==='RETURNED'?['SUBMIT_REVIEW','RETURN']:['SUBMIT_REVIEW','APPROVE',...(fixture.status==='CLOSED'?['CLOSE']:fixture.status==='FILLED'?['FILL']:[])];
      for(const action of actions)await step(fixture.key+':'+action,async()=>{const row=await prisma.jobOpportunity.findUniqueOrThrow({where:{id:created.id}});return {action,expectedVersion:row.version,version:row.version,employerVerified:true,vacancyVerified:true,note:'[DEMO] Simulated fixture review; no genuine employer/vacancy verification was performed.'};},payload=>route('jobs/[id]','PATCH',payload,created.id));
    }
    for(const email of ['staff.01@example.test','staff.02@example.test']){
      const account=accounts.find(a=>a.email===email);if(!viewers[account.key])continue;
      await prepared('b3:grant:'+email,async()=>{const target=await prisma.user.findUniqueOrThrow({where:{id:viewers[account.key].id},include:{staffPermissions:true}});return {kind:'staff-grant',actorId:admin.id,payload:{email,mode:'SAVE',department:target.department,designation:target.designation,modules:[...new Set([...target.staffPermissions.map(m=>m.module),'CENSUS'])]}};});
      const target=viewers[account.key];
      await prepared('b3:scope:'+email,async()=>({kind:'record-scope',actorId:admin.id,payload:{staffId:target.id,barangays:email.startsWith('staff.01')?[...barangays]:['Bambang'],expectedVersion:0}}));
    }
    for(const assignment of assistanceAssignments){
      const name='b3:roster:'+assignment.barangay;
      if(!state.completed[name]&&!state.pending&&await prisma.censusAssistanceRoster.findUnique({where:{barangay:assignment.barangay}})){if(!state.conflicts.includes(name)){state.conflicts.push(name);await persist(state);}continue;}
      await prepared(name,async()=>({kind:'assistance-roster',actorId:admin.id,payload:{barangay:assignment.barangay,staffIds:assignment.staffEmails.flatMap(email=>{const account=accounts.find(a=>a.email===email);return account&&viewers[account.key]?[viewers[account.key].id]:[];}),expectedVersion:0}}));
    }
    const first=accounts.find(a=>a.email==='individual.02@example.test');
    if(viewers[first.key]){
      const revision=await prisma.communitySurveyRevision.findFirst({where:{userId:viewers[first.key].id,surveyYear:referenceYear,action:'SUBMITTED'},orderBy:{revision:'asc'}});
      if(revision)for(const action of ['ASSESSED','VERIFIED','APPROVED'])await prepared('b3:review:'+action,async()=>({kind:'review',actorId:admin.id,payload:{kind:'INDIVIDUAL',revisionId:revision.id,action,requestKey:requestKey('b3_review_'+action),note:'[DEMO] Synthetic census review only; not municipal verification.'}}));
    }
    await prepared('b3:source-import',async()=>({kind:'census-import',actorId:admin.id,payload:censusImportFixture}));
    await assertPreserved(db,baseline);state.ready=true;await persist(state);
    const result={target,addedAccounts:Object.keys(viewers).length,collisions:state.collisions,conflicts:state.conflicts,completedOperations:Object.keys(state.completed).length,referenceYear,datasetVersion};
    writeJson(path.join(directory,'import-report.json'),result);return result;
  }finally{await db.query("SELECT RELEASE_LOCK('elb_hackathon_additive_v1')");}
}

export async function verifyCredentials({directory,baseURL}){
  const {auth}=await import('../../src/lib/auth.ts');const {prisma}=await import('../../src/lib/prisma.ts');
  const state=JSON.parse(fs.readFileSync(path.join(directory,'journal.json'),'utf8'));
  let verified=0,skipped=0,rateLimits=0;
  async function boundedRequest(endpoint,headers,body){let response;for(let attempt=0;attempt<6;attempt++){response=await auth.handler(new Request(baseURL+'/api/auth/'+endpoint,{method:'POST',headers:{origin:baseURL,'content-type':'application/json',...headers},body:JSON.stringify(body)}));if(response.status!==429)return response;rateLimits++;await delay(Math.min(60_000,Math.max(15_000,Number(response.headers.get('retry-after')||15)*1000)));}return response;}
  for(const account of accounts){
    if(state.collisions.includes(account.key)){skipped++;continue;}
    const response=await boundedRequest('sign-in/email',{}, {email:account.email,password:account.password});
    assert.equal(response.status,200,'Real fixture sign-in failed: '+account.key);
    const body=await response.json(),expected=state.completed['register:'+account.key];assert.equal(body.user.id,expected.id);
    const user=await prisma.user.findUniqueOrThrow({where:{id:expected.id}});assert.equal(user.role,account.role);assert.equal(user.emailVerified,false);
    const cookie=response.headers.getSetCookie().map(v=>v.split(';')[0]).join('; ');
    const session=await auth.api.getSession({headers:new Headers({cookie})});assert.equal(session.user.id,expected.id);
    const signedOut=await boundedRequest('sign-out',{cookie},{});assert.equal(signedOut.status,200);verified++;
  }
  const result={verified,skipped,rateLimits,flow:'auth.handler sign-in/email + session + sign-out',checkedAt:new Date().toISOString()};writeJson(path.join(directory,'credentials-verification.json'),result);return result;
}
