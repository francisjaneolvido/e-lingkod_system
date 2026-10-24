import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { loadServerTypescript } from './helpers/load-typescript.mjs';
const enabled=/^elb_b3_test_[a-f0-9]{32}$/.test(process.env.ELB_B3_TEST_DATABASE||'');
test('B4 real annual populations, source separation, authority and aggregate exports', {skip:!enabled}, async t=>{
  const hook=loadServerTypescript();
  const {prisma}=await import('../src/lib/prisma.ts');
  const {auth}=await import('../src/lib/auth.ts');
  const {workforceAnalytics}=await import('../src/features/analytics/server/data.ts');
  const {parseAnalyticsFilters,analyticsCsv}=await import('../src/features/analytics/domain.ts');
  const personal=await import('../src/features/community/server/survey-lifecycle.ts');
  const org=await import('../src/features/establishments/server/data.ts');
  const census=await import('../src/features/census/server/data.ts');
  const imports=await import('../src/features/census/server/imports.ts');
  const base=process.env.BETTER_AUTH_URL||'http://localhost:3103';
  async function register(name) {
    const email='analytics.'+name+'@example.test';
    const response=await auth.api.signUpEmail({body:{firstName:'Synthetic',lastName:name,hasNoMiddleName:true,phoneNumber:'+639001234567',email,password:'B4-analytics-test-2026!'},returnHeaders:true});
    return {user:await prisma.user.findUniqueOrThrow({where:{email}}),cookie:response.headers.getSetCookie()[0].split(';')[0]};
  }
  try {
    const registered=await register('admin');
    assert.equal(spawnSync(process.execPath,['scripts/set-admin.mjs',registered.user.email],{env:process.env,encoding:'utf8'}).status,0);
    const admin=await prisma.user.findUniqueOrThrow({where:{id:registered.user.id}});
    const staffLogin=await register('staff'), citizenLogin=await register('citizen'), jobsLogin=await register('jobs');
    const grant=await import('../src/app/api/admin/staff/route.ts');
    for(const [entry,module] of [[staffLogin,'CENSUS'],[jobsLogin,'JOBS']]){
      const response=await grant.POST(new Request(base+'/api/admin/staff',{method:'POST',headers:{origin:base,cookie:registered.cookie,'content-type':'application/json'},body:JSON.stringify({mode:'SAVE',email:entry.user.email,department:'PESO',designation:'Synthetic analytics fixture',modules:[module]})}));
      assert.equal(response.status,200);
    }
    const staff=await prisma.user.findUniqueOrThrow({where:{id:staffLogin.user.id}}),jobs=await prisma.user.findUniqueOrThrow({where:{id:jobsLogin.user.id}});
    await census.setRecordScope(admin,{staffId:staff.id,barangays:['Bambang'],expectedVersion:0});
    const user=async name=>prisma.user.create({data:{id:'b4-'+name,name:'Synthetic '+name,email:'fixture.'+name+'@example.test',role:'CITIZEN'}});
    const [alice,bob,carol,withdrawn,draft,refusal]=await Promise.all(['alice','bob','carol','withdrawn','draft','refusal'].map(user));
    const answer={status:'SUBMITTED',barangay:'Bambang',ageGroup:'25-34',educationLevel:'COLLEGE',employmentStatus:'EMPLOYED_FULL_TIME',skills:['Welding'],consentAggregated:true};
    async function save(owner,year,patch={}){const state=await personal.ownedSurveyState(owner.id,year);return personal.saveCitizenSurvey({...answer,surveyYear:year,...patch,expectedVersion:state.workspaceVersion,expectedConsentVersion:state.consentVersion,requestKey:randomUUID()},owner);}
    await save(alice,2026,{occupation:'Previous revision'});
    await save(alice,2026,{occupation:'Driver',preferredOccupations:['Cook'],qualifications:['NC II'],completedTraining:['Food Safety'],overseasExperience:'FORMER',householdSize:2,consentOpportunityRecommendations:false});
    await save(alice,2026,{status:'DRAFT',barangay:'Maahas',occupation:'Unsubmitted secret',skills:['Draft-only skill']});
    await save(alice,2025,{occupation:'Historical submitted occupation'});
    await save(bob,2026,{barangay:'Maahas',employmentStatus:'UNEMPLOYED_LOOKING',employmentBarriers:['Transportation cost'],overseasExperience:'CURRENT'});
    await save(carol,2026,{employmentStatus:'STUDENT',ageGroup:'18-24',skills:['Baking'],overseasExperience:'NEVER',householdSize:4});
    await save(withdrawn,2026);
    let w=await personal.ownedSurveyState(withdrawn.id,2026);
    await personal.withdrawCitizenSurvey({surveyYear:2026,expectedVersion:w.workspaceVersion,expectedConsentVersion:w.consentVersion,requestKey:randomUUID()},withdrawn);
    w=await personal.ownedSurveyState(withdrawn.id,2026);
    await personal.changeCitizenConsent({matching:true,programs:true,expectedConsentVersion:w.consentVersion,requestKey:randomUUID()},withdrawn);
    await save(draft,2026,{status:'DRAFT'});
    await save(refusal,2026); // Simulate a retained legacy row whose aggregate-purpose consent is false.
    await prisma.communitySurvey.update({where:{userId_surveyYear:{userId:refusal.id,surveyYear:2026}},data:{consentAggregated:false}});
    const current={population:'INDIVIDUAL',period:'YEAR',year:'2026'};
    const run=(viewer,filters={})=>workforceAnalytics(viewer,parseAnalyticsFilters({...current,...filters},2026));
    await t.test('retained submission, consent purpose, selected years, revisions and withdrawal',async()=>{
      const result=await run(admin);
      assert.equal(result.groups[0].count,3);
      assert.equal((await run(staff)).groups[0].count,2);
      assert.equal((await run(admin,{year:'2025'})).groups[0].count,1);
      const text=JSON.stringify(result);
      assert.ok(!text.includes('Unsubmitted secret')&&!text.includes('Previous revision')&&!text.includes('Draft-only skill'));
      assert.ok(!text.includes(alice.id)&&!text.includes(alice.email)&&!text.includes('Synthetic alice'));
      assert.equal(result.groups[0].breakdowns.find(d=>d.key==='occupation').items.find(i=>i.label==='Driver').count,1);
      assert.equal(result.groups[0].measures.find(m=>m.key==='householdSize').mean,3);
      assert.equal((await run(staff,{employment:'EMPLOYED_FULL_TIME'})).groups[0].count,1);
      assert.equal((await run(admin,{skill:'Welding',overseas:'CURRENT'})).groups[0].count,1);
      assert.equal((await run(admin,{year:'2024'})).groups[0].count,0);
      await assert.rejects(run(staff,{barangay:'Maahas'}),/scope/i);
      await assert.rejects(run(jobs),/CENSUS/);
      await assert.rejects(run(citizenLogin.user),/CENSUS/);
    });
    await t.test('annual establishment snapshot and known workforce are separate from respondents',async()=>{
      const business={surveyYear:2025,businessName:'Synthetic annual organization',officeType:'MAIN',street:'Maahas fixture street',barangay:'Maahas',employerType:'PRIVATE',organizationType:'CORPORATION',industry:'INFORMATION',productsServices:'Synthetic services',operatingStatus:'OPERATING',contactName:'Synthetic Representative',contactPosition:'Manager',contactEmail:'fixture.alice@example.test'};
      const created=await org.createEstablishment({...business,requestKey:randomUUID()},alice);
      async function submit(id,year,values){const state=await org.ownedEstablishmentState(alice,id,year);return org.saveEstablishmentSurvey({...business,surveyYear:year,...values,establishmentId:id,expectedRecordVersion:state.recordVersion,expectedVersion:state.workspaceVersion,requestKey:randomUUID(),correctIdentity:false},alice);}
      await submit(created.establishmentId,2025,{status:'SUBMITTED',totalWorkers:7,regularWorkers:5,nonRegularWorkers:2});
      await submit(created.establishmentId,2026,{status:'SUBMITTED',barangay:'Bambang',totalWorkers:10,regularWorkers:8,nonRegularWorkers:2,partTimeWorkers:2});
      await submit(created.establishmentId,2026,{status:'DRAFT',barangay:'Maahas',totalWorkers:99});
      const unknown=await org.createEstablishment({...business,surveyYear:2026,businessName:'Synthetic unknown workforce',barangay:'Bambang',requestKey:randomUUID()},alice);
      await submit(unknown.establishmentId,2026,{status:'SUBMITTED',businessName:'Synthetic unknown workforce',barangay:'Bambang',totalWorkers:null,regularWorkers:3,nonRegularWorkers:2,partTimeWorkers:2});
      const result=await run(staff,{population:'ESTABLISHMENT'});
      assert.equal(result.groups[0].count,2);
      const total=result.groups[0].measures.find(m=>m.key==='totalWorkers');
      assert.equal(total.sum,10);assert.equal(total.unknown,1);
      assert.equal(result.groups[0].measures.find(m=>m.key==='regularWorkers').sum,11);
      assert.equal((await run(admin)).groups[0].count,3);
      assert.equal((await run(staff,{population:'ESTABLISHMENT',year:'2025'})).groups[0].count,0);
      assert.equal((await run(admin,{population:'ESTABLISHMENT',year:'2025'})).groups[0].count,1);
    });
    await t.test('imports retain exact source/year identity and exclude held/rejected/skipped/unknown-year observations',async()=>{
      const mapping={0:'participantRef',1:'barangay',2:'ageGroup',3:'occupation'};
      const input=(source,year,rows)=>({table:{headers:['Reference','Barangay','Age','Occupation'],rows,fileType:'CSV',sourceFilename:source+'.csv'},mapping,meta:{source,surveyYear:year,activityName:'Synthetic activity',activityType:'TEST',implementingOffice:'PESO',intendedUse:'INTERNAL_STATISTICS',activityDate:'2026-06-01'}});
      const a=await imports.commitImport(admin,input('A',2026,[['1','Bambang','25-34','Driver'],['1','Bambang','25-34','Driver'],['2','Bambang','25-34','Driver'],['3','Bambang','bad','Baker'],['','Bambang','35-44','Teacher']]));
      assert.equal(a.imported,2);assert.equal(a.skipped,1);
      assert.equal((await imports.commitImport(admin,input('A',2026,[['1','Bambang','35-44','Nurse']]))).reviewNeeded,1);
      await imports.commitImport(admin,input('B',2026,[['other','Maahas','45-54','Mechanic']]));
      await imports.commitImport(admin,input('A',2025,[['old','Maahas','55-64','Carpenter']]));
      const legacy=await imports.commitImport(admin,input('LEGACY',2024,[['unknown-year','Bambang','65+','Retired']]));
      await prisma.communityImportRecord.updateMany({where:{batchId:legacy.batchId},data:{surveyYear:null}});
      await prisma.communityImportBatch.update({where:{id:legacy.batchId},data:{surveyYear:null}});
      const result=await run(admin,{population:'IMPORTS'});
      assert.deepEqual(result.groups.map(g=>[g.source,g.count]),[['A',1],['B',1]]);
      assert.equal(result.excluded.unknownSurveyYear,1);
      assert.ok(result.excluded.notAccepted>=4);
      assert.deepEqual((await run(staff,{population:'IMPORTS'})).groups.map(g=>[g.source,g.count]),[['A',1]]);
      assert.equal((await run(admin,{population:'IMPORTS',year:'2025'})).groups[0].count,1);
      assert.ok(JSON.stringify(result.methodology).includes('observations'));
    });
    await t.test('stable-source duplicates and conflicting accepted legacy versions cannot be revived by filters',async()=>{
      const original=await prisma.communityImportRecord.findFirstOrThrow({where:{sourceKey:'A',surveyYear:2026,participantRef:'2',outcome:'ACCEPTED'}});
      const {id,createdAt,...data}=original;void id;void createdAt;
      await prisma.communityImportRecord.create({data:{...data,originalRowNumber:99}});
      let result=await run(admin,{population:'IMPORTS',source:'A'});
      assert.equal(result.groups[0].count,1);
      assert.equal(result.excluded.identicalStableSourceDuplicates,1);
      const filtered=await run(admin,{population:'IMPORTS',source:'A',age:'65+'});
      assert.equal(filtered.excluded.identicalStableSourceDuplicates??0,0);
      await prisma.communityImportRecord.create({data:{...data,originalRowNumber:100,barangay:'Maahas',ageGroup:'35-44',occupation:'Conflicting accepted legacy version'}});
      result=await run(admin,{population:'IMPORTS',source:'A',age:'25-34',barangay:'Bambang'});
      assert.equal(result.groups.length,0);
      assert.equal(result.excluded.conflictingAcceptedSourceRecords,2);
    });
    await t.test('anonymous SPES observations remain distinct from people and other sources',async()=>{
      async function batch(source,year,kind,status='ACTIVE'){return prisma.spesImportBatch.create({data:{sourceLabel:source,surveyYear:year,datasetKind:kind,status,importedById:admin.id,recordCount:2,records:{create:Array.from({length:2},(_,i)=>({originalRowNumber:i+2,barangay:'Bambang',education:'COLLEGE',skillsJson:'["Baking"]',interestsJson:'["Food Safety"]',availability:'ANY'}))}}});}
      await batch('Anonymous real source',2026,'REAL');await batch('Synthetic demo source',2026,'DEMO');await batch('Unknown year',null,'REAL');await batch('Voided source',2026,'REAL','VOIDED');
      const result=await run(staff,{population:'SPES'});
      assert.equal(result.groups[0].count,2);assert.equal(result.groups[0].unit,'source observations');
      assert.equal((await run(staff,{population:'SPES',dataset:'ALL'})).groups.length,2);
      assert.equal(result.excluded.unknownSurveyYear,2);
      assert.equal((await run(staff,{population:'SPES',year:'2025'})).groups.length,0);
    });
    await t.test('roster is current, separate, authorized and distinguishes not configured from zero',async()=>{
      await census.saveAssistanceRoster(admin,{barangay:'Bambang',staffIds:[staff.id],expectedVersion:0});
      await census.saveAssistanceRoster(admin,{barangay:'Maahas',staffIds:[],expectedVersion:0});
      const result=await run(admin);
      assert.equal(result.groups[0].count,3);
      assert.equal(result.rosters.find(r=>r.barangay==='Bambang').count,1);
      assert.equal(result.rosters.find(r=>r.barangay==='Maahas').count,0);
      assert.equal(result.rosters.find(r=>r.barangay==='Anos').count,null);
      assert.deepEqual((await run(staff)).rosters.map(r=>r.barangay),['Bambang']);
    });
    await t.test('public disclosure and JOBS-only data loaders cannot bypass the protected analytics surface',async()=>{
      const old=await import('../src/features/community/server/data.ts');
      await assert.rejects(old.publicEmploymentInsights(),/Public analytics release is unavailable/);
      const jobsData=await (await import('../src/features/jobs/server/data.ts')).adminJobData();
      assert.equal(Object.hasOwn(jobsData,'totalSurveys'),false);
      assert.equal(Object.hasOwn(jobsData,'insights'),false);
      assert.equal(Object.hasOwn(jobsData,'batches'),false);
    });
    await t.test('protected API/export parity, role denial, invalid filters and legacy bypass closure',async()=>{
      const api=await import('../src/app/api/admin/census/analytics/route.ts');
      const exp=await import('../src/app/api/admin/census/analytics/export/route.ts');
      for(const cookie of ['',citizenLogin.cookie,jobsLogin.cookie]){
        for(const handler of [api.GET,exp.GET]){
          const response=await handler(new Request(base+'/api/admin/census/analytics?period=YEAR&year=2026',{headers:{cookie}}));
          assert.ok([401,403].includes(response.status));assert.ok(!JSON.stringify(await response.json()).includes('Driver'));
        }
      }
      const query='?population=INDIVIDUAL&period=YEAR&year=2026&employment=EMPLOYED_FULL_TIME';
      const read=await api.GET(new Request(base+'/api/admin/census/analytics'+query,{headers:{cookie:staffLogin.cookie}}));
      assert.equal(read.status,200);assert.match(read.headers.get('cache-control'),/no-store/);
      const result=await read.json();assert.equal(result.groups[0].count,1);
      const download=await exp.GET(new Request(base+'/api/admin/census/analytics/export'+query,{headers:{cookie:staffLogin.cookie}}));
      assert.equal(download.status,200);assert.equal(await download.text(),analyticsCsv(result));
      assert.equal((await api.GET(new Request(base+'/api/admin/census/analytics?year=2026&year=2025',{headers:{cookie:registered.cookie}}))).status,400);
      const legacy=await import('../src/app/api/admin/jobs/insights/export/route.ts');
      assert.equal((await legacy.GET(new Request(base+'/api/admin/jobs/insights/export',{headers:{cookie:jobsLogin.cookie}}))).status,403);
      const transaction=prisma.$transaction;
      try {
        prisma.$transaction=async()=>{throw Error('mysql://private-connection SELECT private-person@example.test');};
        const failure=await api.GET(new Request(base+'/api/admin/census/analytics',{headers:{cookie:staffLogin.cookie}}));
        assert.equal(failure.status,503);
        const text=await failure.text();
        assert.match(text,/protected workforce and social analytics/i);
        assert.ok(!/mysql:|SELECT|private-person/.test(text));
      } finally {prisma.$transaction=transaction;}
    });
    await t.test('database text collation never widens exact approved barangay authority',async()=>{
      const lower=await user('lowercase-location');
      await save(lower,2026,{barangay:'bambang',occupation:'Outside exact scope'});
      assert.equal((await run(staff)).groups[0].count,2);
      assert.ok(!JSON.stringify(await run(staff)).includes('Outside exact scope'));
      const legacy=await prisma.spesImportBatch.create({data:{sourceLabel:'Noncanonical legacy case',surveyYear:2026,datasetKind:'REAL',status:'ACTIVE',importedById:staff.id,recordCount:1,records:{create:{barangay:'bambang',education:'COLLEGE',skillsJson:'["Private legacy skill"]',interestsJson:'[]',availability:'ANY'}}}});
      assert.equal((await run(staff,{population:'SPES'})).groups.length,1);
      const imports=await (await import('../src/features/analytics/server/legacy-spes.ts')).legacySpesImportData(staff);
      assert.ok(!imports.batches.some(b=>b.id===legacy.id));
    });
    await t.test('B4-R1 scoped legacy workspace never discloses unscoped event text after scope reductions',async()=>{
      const note='2 validated anonymous source rows';
      const batch=await prisma.spesImportBatch.create({data:{sourceLabel:'Scoped event fixture',surveyYear:2026,datasetKind:'REAL',recordCount:2,importedById:staff.id,events:{create:{actorId:admin.id,action:'IMPORTED',note}},records:{create:['Bambang','Maahas'].map(barangay=>({barangay,education:'COLLEGE',skillsJson:'[]',interestsJson:'[]',availability:'ANY'}))}}});
      const legacy=await import('../src/features/analytics/server/legacy-spes.ts');
      assert.ok(JSON.stringify(await legacy.legacySpesImportData(admin)).includes(note));
      let scope=await prisma.censusStaffScope.findUnique({where:{userId:staff.id}});
      await census.setRecordScope(admin,{staffId:staff.id,barangays:['Bambang','Maahas'],expectedVersion:scope.version});
      scope=await prisma.censusStaffScope.findUnique({where:{userId:staff.id}});
      await census.setRecordScope(admin,{staffId:staff.id,barangays:['Bambang'],expectedVersion:scope.version});
      const payload=await legacy.legacySpesImportData(staff);
      assert.equal(payload.batches.find(b=>b.id===batch.id).recordCount,1);
      assert.ok(!JSON.stringify(payload).includes(note),'entire serialized workspace must not contain full-batch notes');
    });
    await t.test('B4-R2 CENSUS scoped import actions match workspace authority without JOBS grants',async()=>{
      const preview=await import('../src/app/api/admin/jobs/import/preview/route.ts');
      const commit=await import('../src/app/api/admin/jobs/import/route.ts');
      const management=await import('../src/app/api/admin/jobs/import/[id]/route.ts');
      function request(cookie,barangay,label,hash){const form=new FormData();form.set('file',new File(['consent,barangay,education,skills,interests,availability\nYES,'+barangay+',COLLEGE,Welding,Skilled trades,ANY'],'source.csv',{type:'text/csv'}));form.set('sourceLabel',label);form.set('surveyYear','2026');form.set('datasetKind','REAL');form.set('authorizedUse','yes');if(hash)form.set('previewHash',hash);return new Request(base+'/api/admin/jobs/import',{method:'POST',headers:{origin:base,cookie},body:form});}
      for(const cookie of [registered.cookie,staffLogin.cookie]){
        const label='Authorized fixture '+cookie.slice(-12);const checked=await preview.POST(request(cookie,'Bambang',label));assert.equal(checked.status,200);
        const hash=(await checked.json()).previewHash;const saved=await commit.POST(request(cookie,'Bambang',label,hash));assert.equal(saved.status,201);const batch=await saved.json();
        const retry=await commit.POST(request(cookie,'Bambang',label,hash));assert.equal(retry.status,200);assert.equal((await retry.json()).batchId,batch.batchId);
        const action=await management.PATCH(new Request(base+'/api/admin/jobs/import/'+batch.batchId,{method:'PATCH',headers:{origin:base,cookie,'content-type':'application/json'},body:JSON.stringify({action:'ARCHIVE',reason:'Synthetic review fixture archive'})}),{params:Promise.resolve({id:batch.batchId})});assert.equal(action.status,cookie===registered.cookie?200:403);
      }
      const ungranted=await register('ungranted');await prisma.user.update({where:{id:ungranted.user.id},data:{role:'STAFF'}});
      for(const cookie of [jobsLogin.cookie,citizenLogin.cookie,ungranted.cookie])for(const endpoint of [preview,commit])assert.equal((await endpoint.POST(request(cookie,'Bambang','Denied fixture','unused'))).status,403);
      for(const endpoint of [preview,commit])assert.equal((await endpoint.POST(request(staffLogin.cookie,'Maahas','Outside scope','unused'))).status,403);
      assert.deepEqual((await prisma.staffPermission.findMany({where:{userId:staff.id}})).map(p=>p.module),['CENSUS']);
    });
    await t.test('B4-R3 unknown source labels never establish stable identity across legacy batches',async()=>{
      const original=await prisma.communityImportRecord.findFirstOrThrow({where:{sourceKey:'A',surveyYear:2026,outcome:'ACCEPTED'}});
      const {id,createdAt,...fields}=original;void id;void createdAt;
      const template=await prisma.communityImportBatch.findUniqueOrThrow({where:{id:original.batchId}});
      const {id:batchId,createdAt:batchCreated,...batchFields}=template;void batchId;void batchCreated;
      for(let i=0;i<2;i++){
        const batch=await prisma.communityImportBatch.create({data:{...batchFields,sourceKey:null,fingerprint:randomUUID()}});
        await prisma.communityImportRecord.create({data:{...fields,batchId:batch.id,sourceKey:null,participantRef:'1',ageGroup:'25-34',occupation:'Driver'}});
      }
      let result=await run(admin,{population:'IMPORTS',source:'Unspecified legacy source'});
      assert.equal(result.groups[0].count,2,'equal values and local references with unknown sources remain separate');
      const batch=await prisma.communityImportBatch.create({data:{...batchFields,sourceKey:' ',fingerprint:randomUUID()}});
      await prisma.communityImportRecord.create({data:{...fields,batchId:batch.id,sourceKey:'',participantRef:'1',ageGroup:'35-44',occupation:'Cook'}});
      result=await run(admin,{population:'IMPORTS',source:'Unspecified legacy source'});
      assert.equal(result.groups[0].count,3,'different values must not be held as conflicting identities');
      assert.equal(result.excluded.conflictingAcceptedSourceRecords??0,0);assert.equal(result.excluded.identicalStableSourceDuplicates??0,0);
      assert.equal((await run(admin,{population:'IMPORTS',source:'Unspecified legacy source',age:'35-44'})).groups[0].count,1);
      assert.equal((await run(admin,{population:'IMPORTS',source:'Unspecified legacy source',year:'2025'})).groups.length,0);
      assert.match(result.methodology.join(' '),/unknown.source|missing.source/i);
      assert.ok(analyticsCsv(result).includes('Unspecified legacy source'));
      assert.match(analyticsCsv(result),/"Unspecified legacy source","source observations","2026","selected_total","","3","3"/);
    });
    await t.test('B4-R4 accent-distinct SPES sources survive MySQL filtering and CSV',async()=>{
      for(const [source,n] of [['Cafe',1],['Café',2]])await prisma.spesImportBatch.create({data:{sourceLabel:source,surveyYear:2026,datasetKind:'REAL',importedById:admin.id,recordCount:n,records:{create:Array.from({length:n},()=>({barangay:'Bambang',education:'COLLEGE',skillsJson:'[]',interestsJson:'[]',availability:'ANY'}))}}});
      for(const [source,n,other] of [['Cafe',1,'Café'],['Café',2,'Cafe']]){
        const result=await run(admin,{population:'SPES',source});assert.equal(result.groups.length,1);assert.equal(result.groups[0].source,source+' [REAL]');assert.equal(result.groups[0].count,n);assert.ok(!analyticsCsv(result).includes(other+' [REAL]'));
      }
      const all=await run(staff,{population:'SPES'});assert.equal(all.groups.find(g=>g.source==='Cafe [REAL]').count,1);assert.equal(all.groups.find(g=>g.source==='Café [REAL]').count,2);
      const normalized=await run(staff,{population:'SPES',source:'  cafe  '});assert.equal(normalized.groups.length,1);assert.equal(normalized.groups[0].count,1);
    });
  } finally {await prisma.$disconnect();hook.deregister();}
});
