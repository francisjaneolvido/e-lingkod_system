// Visual-state fixtures only; never a production seed or measured service activity.
import assert from 'node:assert/strict';
import {loadServerTypescript} from './load-typescript.mjs';
const target=new URL(process.env.DATABASE_URL).pathname.slice(1);
assert.match(target,/^elb_b3_test_[a-f0-9]{32}$/);assert.equal(target,process.env.ELB_B3_TEST_DATABASE);
const hook=loadServerTypescript(),{prisma}=await import('../../src/lib/prisma.ts');
try{
 const citizen=await prisma.user.findUniqueOrThrow({where:{email:'b3.citizen@example.test'}}),admin=await prisma.user.findUniqueOrThrow({where:{email:'b3.admin@example.test'}}),staff=await prisma.user.findUniqueOrThrow({where:{email:'b3.staff@example.test'}});
 await prisma.user.update({where:{id:admin.id},data:{name:'Synthetic Administrator With An Intentionally Long Account Display Name'}});
 await prisma.user.update({where:{id:citizen.id},data:{name:'SyntheticAccessibilityRepresentative With An Intentionally Long Account Name'}});
 await prisma.civicReport.create({data:{id:'ui-report',trackingId:'UI-SYNTHETIC-REPORT',submissionKey:'ui-synthetic',reporterId:citizen.id,category:'ROADS_DRAINAGE',title:'[TEST] Synthetic road concern',description:'Visual fixture only; not a real civic report.',barangay:'Bambang',address:'Synthetic test location',status:'SUBMITTED'}});
 for(const [i,status]of ['SUBMITTED','UNDER_REVIEW','READY_FOR_RELEASE'].entries())await prisma.serviceRequest.create({data:{id:'ui-service-'+i,trackingId:'UI-SYNTHETIC-'+i,serviceKey:'mayors-business-permit',serviceTitle:'Business Permit',requesterId:citizen.id,purpose:'[TEST] Synthetic visual state; not a real request.',formDataJson:'{}',status,assignedDepartment:'BPLO',submittedAt:new Date(),...(status==='READY_FOR_RELEASE'?{releaseApprovedAt:new Date(),releaseApprovedById:admin.id}:{} )}});
 for(const [module,entityType,entityId]of [['SERVICES','SERVICE_REQUEST','ui-service-1'],['REPORTS','CIVIC_REPORT','ui-report']])await prisma.workAssignment.create({data:{module,entityType,entityId,assignedStaffId:staff.id,department:'PESO',status:'OFFERED'}});
 await prisma.emergencyHotline.create({data:{id:'ui-hotline',title:'[TEST] Synthetic hotline',category:'OTHER',office:'Synthetic test office',phone:'00000000000',note:'TEST ONLY — do not call.',sourceUrl:'https://example.test/test',verifiedAt:new Date(),verifiedById:admin.id}});
 console.log('UI-only synthetic fixtures: one civic report, three requests, two assignments, one non-operational hotline.');
}finally{await prisma.$disconnect();hook.deregister();}
