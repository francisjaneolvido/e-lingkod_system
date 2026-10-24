import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {loadServerTypescript} from './helpers/load-typescript.mjs';
const enabled=/^elb_b3_test_[a-f0-9]{32}$/.test(process.env.ELB_B3_TEST_DATABASE||'');
test('B5-R2 opposing personalized ranks acquire global job locks without deadlock or partial notices',{skip:!enabled,timeout:30000},async()=>{
 const hook=loadServerTypescript(),{prisma}=await import('../src/lib/prisma.ts');
 const method=prisma.$transaction,transaction=method.bind(prisma);let intercepted=false;
 const bothRequested=Promise.withResolvers(),bothAcquired=Promise.withResolvers();const firstRequests=[],firstAcquired=[];
 try{
  const {createOpportunity,mutateOpportunity}=await import('../src/features/jobs/server/mutations.ts');
  const {saveCitizenSurvey,changeCitizenConsent}=await import('../src/features/community/server/survey-lifecycle.ts');
  const {personalOpportunities,checkOpportunityNotices}=await import('../src/features/jobs/server/recommendations.ts');
  const user=async(role,name)=>prisma.user.create({data:{id:randomUUID(),name:'Synthetic '+name,email:randomUUID()+'@example.test',role}});
  const admin=await user('ADMIN','lock administrator'),a=await user('CITIZEN','welder'),b=await user('CITIZEN','driver');
  const year=new Date().getFullYear();
  for(const [person,occupation] of [[a,'Welder'],[b,'Driver']])await saveCitizenSurvey({surveyYear:year,status:'SUBMITTED',barangay:'Bambang',ageGroup:'25-34',educationLevel:'COLLEGE',employmentStatus:'UNEMPLOYED_LOOKING',skills:['Welding','Driving'],occupation,preferredOccupations:['[DEMO] '+occupation+' lock fixture'],consentAggregated:true,consentOpportunityRecommendations:true,expectedVersion:0,expectedConsentVersion:0,requestKey:randomUUID()},person);
  const ids=[];
  for(const [title,skill] of [['Welder','Welding'],['Driver','Driving']]){
   const result=await createOpportunity({title:'[DEMO] '+title+' lock fixture',employer:'[DEMO] Synthetic lock fixture',workType:'FULL_TIME',sector:'Skilled trades',barangay:'Bambang',location:'Los Baños',description:'[DEMO] Synthetic overlapping opportunity for real transaction regression only.',skills:[skill],interests:[],education:'ANY',contactInfo:'Demonstration only; no external messages.',reviewSource:'[DEMO] Synthetic test source; no real employer verification.',payMin:'500',payMax:'700',payCurrency:'PHP',payBasis:'DAY',negotiable:false,certifications:[],isDemo:true,requestKey:randomUUID()},admin);
   await mutateOpportunity(result.id,{action:'SUBMIT_REVIEW',expectedVersion:1,requestKey:randomUUID()},admin);
   await mutateOpportunity(result.id,{action:'APPROVE',expectedVersion:2,requestKey:randomUUID(),employerVerified:true,vacancyVerified:true,note:'[DEMO] Synthetic fixture approval only; no real employer verification.'},admin);ids.push(result.id);
  }
  const prior=await Promise.all([personalOpportunities(a),personalOpportunities(b)]);
  assert.deepEqual(prior[0].matches.map(m=>m.job.id),ids);assert.deepEqual(prior[1].matches.map(m=>m.job.id),[...ids].reverse());
  // This proxy only controls scheduling. All queries and locks execute on real MySQL.
  // Opposite first requests acquire both first locks before continuing, deterministically
  // exposing the old cycle. Equal first requests proceed normally and serialize on MySQL.
  prisma.$transaction=(callback,options)=>!intercepted?transaction(callback,options):transaction(tx=>{
   let first=true;
   return callback(new Proxy(tx,{get(target,key){if(key!=='$queryRawUnsafe')return Reflect.get(target,key);return async(sql,...args)=>{
    if(!/FROM job_opportunity .*FOR UPDATE/.test(sql)||!first)return target.$queryRawUnsafe(sql,...args);
    first=false;firstRequests.push(args[0]);if(firstRequests.length===2)bothRequested.resolve();await bothRequested.promise;
    const rows=await target.$queryRawUnsafe(sql,...args);
    if(firstRequests[0]!==firstRequests[1]){firstAcquired.push(args[0]);if(firstAcquired.length===2)bothAcquired.resolve();await bothAcquired.promise;}
    return rows;
   };}}));
  },options);
  intercepted=true;const results=await Promise.allSettled([checkOpportunityNotices(a),checkOpportunityNotices(b)]);intercepted=false;
  console.log('Controlled MySQL overlap: '+JSON.stringify({firstRequests,firstAcquired,outcomes:results.map(r=>r.status==='fulfilled'?r.value:{error:r.reason.message})}));
  assert.ok(results.every(r=>r.status==='fulfilled'),'Both notice transactions must complete; no deadlock victim: '+JSON.stringify(results.map(r=>r.status==='rejected'?r.reason.message:r.value)));
  assert.deepEqual(results.map(r=>r.value.created),[2,2]);
  for(let i=0;i<2;i++){
   const viewer=[a,b][i];assert.equal(await prisma.jobRecommendation.count({where:{userId:viewer.id}}),2);assert.equal(await prisma.notification.count({where:{userId:viewer.id,type:'JOB_MATCH'}}),2);
   assert.deepEqual((await personalOpportunities(viewer)).matches.map(m=>m.job.id),prior[i].matches.map(m=>m.job.id));
   assert.equal((await checkOpportunityNotices(viewer)).created,0);
  }
  // Pause after ranking but before the current locking reads. A later
  // publication or verification/expiry change must not create stale notices.
  await prisma.jobOpportunity.updateMany({where:{id:{in:ids}},data:{version:{increment:1}}});
  const selected=Promise.withResolvers(),continueLocks=Promise.withResolvers();
  prisma.$transaction=(callback,options)=>transaction(tx=>{
   let first=true;return callback(new Proxy(tx,{get(target,key){if(key!=='$queryRawUnsafe')return Reflect.get(target,key);return async(sql,...args)=>{
    if(first&&/FROM job_opportunity .*FOR UPDATE/.test(sql)){first=false;selected.resolve();await continueLocks.promise;}
    return target.$queryRawUnsafe(sql,...args);
   };}}));
  },options);
  const staleCheck=checkOpportunityNotices(b);
  try{
   await selected.promise;
   await prisma.jobOpportunity.update({where:{id:ids[0]},data:{version:{increment:1}}});
   await prisma.jobOpportunity.update({where:{id:ids[1]},data:{vacancyVerified:false,expiresAt:new Date(0)}});
  }finally{continueLocks.resolve();}
  assert.equal((await staleCheck).created,0);assert.equal(await prisma.jobRecommendation.count({where:{userId:b.id}}),2);
  prisma.$transaction=method;
  // Current-state checks after the overlap must still suppress refusal/withdrawal,
  // publication verification changes, unavailable and expired opportunities.
  const consent=await prisma.citizenProfileConsent.findUniqueOrThrow({where:{userId:a.id}});
  await changeCitizenConsent({matching:false,programs:false,expectedConsentVersion:consent.version},a);
  assert.equal((await checkOpportunityNotices(a)).matchingAllowed,false);
  await prisma.jobOpportunity.update({where:{id:ids[0]},data:{employerVerified:false}});await prisma.jobOpportunity.update({where:{id:ids[1]},data:{expiresAt:new Date(0)}});
  assert.equal((await personalOpportunities(b)).matches.length,0);assert.equal((await checkOpportunityNotices(b)).created,0);
 }finally{bothRequested.resolve();bothAcquired.resolve();intercepted=false;prisma.$transaction=method;await prisma.$disconnect();hook.deregister();}
});
