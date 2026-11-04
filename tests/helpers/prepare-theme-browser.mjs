// Additional material states, restricted to the invocation's disposable target.
import assert from 'node:assert/strict';
import {loadServerTypescript} from './load-typescript.mjs';
const target=new URL(process.env.DATABASE_URL);assert.equal(target.hostname,'127.0.0.1');assert.match(target.pathname,/^\/elb_b3_test_[a-f0-9]{32}$/);assert.equal(target.pathname.slice(1),process.env.ELB_B3_TEST_DATABASE);
const hook=loadServerTypescript(),{prisma}=await import('../../src/lib/prisma.ts');
try{
 const citizen=await prisma.user.findUniqueOrThrow({where:{email:'b3.citizen@example.test'}}),admin=await prisma.user.findUniqueOrThrow({where:{email:'b3.admin@example.test'}});
 await prisma.emergencyHotline.update({where:{id:'ui-hotline'},data:{extension:'123'}});
 for(const severity of ['CRITICAL','WARNING','ADVISORY','INFORMATION'])await prisma.emergencyAlert.create({data:{id:'ui-alert-'+severity,title:'[TEST] Synthetic '+severity,details:'Synthetic visual state only; not a real alert.',safetyInstructions:'Do not act on this synthetic fixture.',sourceUrl:'https://example.test/visual-fixture',issuingOffice:'Synthetic test office',severity,barangaysJson:'["Bambang"]',status:'PUBLISHED',createdById:admin.id,reviewedById:admin.id,reviewNote:'Synthetic display fixture, not genuine municipal verification.',startsAt:new Date(Date.now()-3600000),expiresAt:new Date(Date.now()+86400000),publishedAt:new Date()}});
 const {createCitizenServiceRequest}=await import('../../src/features/services/server/mutations.ts');
 for(const status of ['DRAFT','FORM_OPEN','ACTION_REQUIRED','SCHEDULED']){
  const created=await createCitizenServiceRequest({serviceKey:'mayors-business-permit',purpose:'Synthetic visual test only',fields:{}},citizen);
  await prisma.serviceRequest.update({where:{id:created.id},data:{id:'ui-state-'+status,status}});
  if(status==='SCHEDULED')await prisma.serviceAppointment.create({data:{requestId:'ui-state-'+status,scheduledAt:new Date(Date.now()+86400000),location:'Synthetic test office',agenda:'Synthetic appointment visual state',status:'CONFIRMED',proposedById:admin.id,confirmedAt:new Date()}});
 }
 console.log('Material fixtures:4 honestly labelled synthetic alert severities, hotline extension, editable/correction/scheduled requests created through service intake.');
}finally{await prisma.$disconnect();hook.deregister();}
