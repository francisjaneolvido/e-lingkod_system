import {test} from "node:test";
import assert from "node:assert/strict";
import {randomUUID} from "node:crypto";
import {loadServerTypescript} from "./helpers/load-typescript.mjs";

test("Restored pickup requires accepted staff work, owner confirmation and actual ID-checked release",{skip:!process.env.ELB_B2_TEST_DATABASE,timeout:20000},async t=>{
  assert.match(new URL(process.env.DATABASE_URL).pathname.slice(1),/^elb_b1_test_[a-f0-9]{32}$/);
  const hooks=loadServerTypescript();const {prisma}=await import("../src/lib/prisma.ts"),api=await import("../src/features/services/server/pickup.ts");
  const user=async role=>{const id=randomUUID();await prisma.user.create({data:{id,name:"Pickup Tester",email:id+"@example.test",role,department:"BPLO"}});return{id,role,name:"Pickup Tester",email:id+"@example.test",department:"BPLO"};};
  const citizen=await user("CITIZEN"),other=await user("CITIZEN"),staff=await user("STAFF"),admin=await user("ADMIN"),unassigned=await user("STAFF");
  await prisma.staffPermission.createMany({data:[staff,unassigned].map(u=>({userId:u.id,module:"SERVICES"}))});
  const row=await prisma.serviceRequest.create({data:{trackingId:"TEST-"+randomUUID(),serviceKey:"mayors-business-permit",serviceTitle:"Business Permit",requesterId:citizen.id,purpose:"Isolated pickup test",formDataJson:"{}",status:"READY_FOR_RELEASE",assignedDepartment:"BPLO",assignedStaffId:staff.id,releaseApprovedAt:new Date(),releaseApprovedById:admin.id}});
  await prisma.workAssignment.create({data:{module:"SERVICES",entityType:"SERVICE_REQUEST",entityId:row.id,assignedStaffId:staff.id,department:"BPLO",status:"ACCEPTED",acceptedAt:new Date()}});
  const read=()=>prisma.serviceRequest.findUniqueOrThrow({where:{id:row.id}}),deny=(fn,status)=>assert.rejects(fn,e=>e.status===status);
  const proposal={scheduledAt:new Date(Date.now()+3600000).toISOString(),location:"Municipal BPLO counter",instructions:"Bring a valid identification document.",expectedVersion:row.version};let slot;
  try{
    await t.test("unassigned staff, citizen and admin cannot act as releasing staff",async()=>{
      for(const viewer of [citizen,admin,unassigned])await deny(()=>api.proposeServicePickup(row.id,proposal,viewer),403);
      await prisma.workAssignment.update({where:{module_entityType_entityId:{module:"SERVICES",entityType:"SERVICE_REQUEST",entityId:row.id}},data:{status:"OFFERED"}});
      await deny(()=>api.proposeServicePickup(row.id,proposal,staff),409);
      await prisma.workAssignment.update({where:{module_entityType_entityId:{module:"SERVICES",entityType:"SERVICE_REQUEST",entityId:row.id}},data:{status:"ACCEPTED"}});
    });
    await t.test("proposals need release approval, future date and a current version",async()=>{
      await deny(()=>api.proposeServicePickup(row.id,{...proposal,scheduledAt:new Date(0).toISOString()},staff),400);
      await prisma.serviceRequest.update({where:{id:row.id},data:{releaseApprovedAt:null}});await deny(()=>api.proposeServicePickup(row.id,proposal,staff),409);
      await prisma.serviceRequest.update({where:{id:row.id},data:{releaseApprovedAt:new Date()}});
      await api.proposeServicePickup(row.id,proposal,staff);slot=await prisma.servicePickupSlot.findFirstOrThrow({where:{requestId:row.id,status:"PROPOSED"}});
      await deny(()=>api.proposeServicePickup(row.id,proposal,staff),409);assert.equal(await prisma.servicePickupSlot.count({where:{requestId:row.id}}),1);assert.equal((await read()).status,"READY_FOR_RELEASE");
    });
    await t.test("owner-only concurrent confirmation has one winner",async()=>{
      const request={slotId:slot.id,action:"CONFIRM",claimantName:"Citizen Claimant",expectedVersion:(await read()).version};
      await deny(()=>api.respondToServicePickup(row.id,request,other),404);await deny(()=>api.respondToServicePickup(row.id,request,staff),403);
      const results=await Promise.allSettled([api.respondToServicePickup(row.id,request,citizen),api.respondToServicePickup(row.id,request,citizen)]);assert.equal(results.filter(x=>x.status==="fulfilled").length,1);assert.equal(results.find(x=>x.status==="rejected").reason.status,409);
      assert.equal((await prisma.servicePickupSlot.findUniqueOrThrow({where:{id:slot.id}})).status,"CONFIRMED");
    });
    await t.test("owner change request retains old slot history and permits a new proposal",async()=>{
      const beforeChange=(await read()).version;
      await deny(()=>api.proposeServicePickup(row.id,{...proposal,expectedVersion:beforeChange},staff),409);
      await api.respondToServicePickup(row.id,{slotId:slot.id,action:"REQUEST_CHANGE",note:"Please arrange a later pickup time.",expectedVersion:(await read()).version},citizen);
      const oldId=slot.id;await api.proposeServicePickup(row.id,{...proposal,expectedVersion:(await read()).version},staff);
      assert.equal((await prisma.servicePickupSlot.findUniqueOrThrow({where:{id:oldId}})).status,"CANCELLED");
      assert.equal((await prisma.servicePickupSlot.findUniqueOrThrow({where:{id:oldId}})).confirmedClaimantName,"Citizen Claimant","A change request does not erase the earlier confirmed claimant");
      slot=await prisma.servicePickupSlot.findFirstOrThrow({where:{requestId:row.id,status:"PROPOSED"}});
      await api.respondToServicePickup(row.id,{slotId:slot.id,action:"CONFIRM",claimantName:"Citizen Claimant",expectedVersion:(await read()).version},citizen);
    });
    await t.test("release cannot precede scheduled pickup or omit explicit ID verification",async()=>{
      const request={slotId:slot.id,claimantName:"Authorized Alternate Claimant",note:"Physical permit collected at the counter.",idVerified:true,expectedVersion:(await read()).version};
      await deny(()=>api.recordServicePickupRelease(row.id,{...request,idVerified:false},staff),400);
      await deny(()=>api.recordServicePickupRelease(row.id,request,staff),409);
      await deny(()=>api.recordServicePickupRelease(row.id,request,admin),403);
      await prisma.servicePickupSlot.update({where:{id:slot.id},data:{scheduledAt:new Date(Date.now()-60000)}});
      const results=await Promise.allSettled([api.recordServicePickupRelease(row.id,request,staff),api.recordServicePickupRelease(row.id,request,staff)]);assert.equal(results.filter(x=>x.status==="fulfilled").length,1);assert.equal(results.find(x=>x.status==="rejected").reason.status,409);
      assert.equal((await read()).status,"FOR_FINAL_VERIFICATION");assert.equal((await read()).completedAt,null);assert.equal((await prisma.servicePickupSlot.findUniqueOrThrow({where:{id:slot.id}})).status,"CLAIMED");
      assert.equal(await prisma.serviceRequestEvent.count({where:{requestId:row.id,action:"RELEASE_RECORDED"}}),1);
      const claimed=await prisma.servicePickupSlot.findUniqueOrThrow({where:{id:slot.id}});
      assert.equal(claimed.claimantName,"Authorized Alternate Claimant","Differing actual names remain permitted after the required ID check");
      assert.equal(claimed.confirmedClaimantName,"Citizen Claimant","B2-R3 retains the citizen-confirmed claimant after release");
      const confirmation=await prisma.serviceRequestEvent.findFirstOrThrow({where:{requestId:row.id,action:"PICKUP_CONFIRMED"},orderBy:{createdAt:"desc"}}),release=await prisma.serviceRequestEvent.findFirstOrThrow({where:{requestId:row.id,action:"RELEASE_RECORDED"}});
      assert.match(confirmation.note,/Citizen Claimant/);assert.match(release.note,/Citizen-confirmed claimant: Citizen Claimant/);assert.match(release.note,/Actual claimant: Authorized Alternate Claimant/);
    });
    await t.test("changed or completed requests cannot be confirmed/released again",async()=>{
      const expectedVersion=(await read()).version;
      await deny(()=>api.respondToServicePickup(row.id,{slotId:slot.id,action:"CONFIRM",expectedVersion},citizen),409);
      await deny(()=>api.recordServicePickupRelease(row.id,{slotId:slot.id,claimantName:"Citizen Claimant",note:"Duplicate collection attempt",idVerified:true,expectedVersion},staff),409);
    });
  }finally{await prisma.$disconnect();hooks.deregister();}
});


test("B2-R3 legacy migration preserves known confirmation and actual names without inventing overwritten history",{skip:!process.env.ELB_B2_PICKUP_LEGACY_FIXTURES},async()=>{
  const database=new URL(process.env.DATABASE_URL).pathname.slice(1);assert.match(database,/^elb_b1_test_[a-f0-9]{32}$/);assert.equal(database,process.env.ELB_B2_TEST_DATABASE);
  const hooks=loadServerTypescript(),{prisma}=await import("../src/lib/prisma.ts");
  try{
    const confirmed=await prisma.servicePickupSlot.findUniqueOrThrow({where:{id:"b2_legacy_pickup_confirmed"}}),claimed=await prisma.servicePickupSlot.findUniqueOrThrow({where:{id:"b2_legacy_pickup_claimed"}});
    assert.equal(confirmed.claimantName,"Legacy Confirmed Claimant");assert.equal(confirmed.confirmedClaimantName,"Legacy Confirmed Claimant");
    assert.equal(claimed.claimantName,"Legacy Actual Claimant");assert.equal(claimed.confirmedClaimantName,null,"Old claimed rows no longer contain an authoritative confirmation name");assert.equal(claimed.status,"CLAIMED");assert(claimed.claimedAt);
  }finally{await prisma.$disconnect();hooks.deregister();}
});


test("B2-R4 API rejects ambiguous pickup timestamps and stores explicit offsets as UTC",{skip:!process.env.ELB_B2_TEST_DATABASE,timeout:15000},async t=>{
  assert.match(new URL(process.env.DATABASE_URL).pathname.slice(1),/^elb_b1_test_[a-f0-9]{32}$/);
  const hooks=loadServerTypescript(),{prisma}=await import("../src/lib/prisma.ts"),api=await import("../src/features/services/server/pickup.ts");
  try{
    const citizenId=randomUUID(),staffId=randomUUID();
    await prisma.user.createMany({data:[{id:citizenId,name:"Timezone Citizen",email:citizenId+"@example.test",role:"CITIZEN"},{id:staffId,name:"Timezone Staff",email:staffId+"@example.test",role:"STAFF",department:"BPLO"}]});
    await prisma.staffPermission.create({data:{userId:staffId,module:"SERVICES"}});
    const row=await prisma.serviceRequest.create({data:{trackingId:"TEST-"+randomUUID(),serviceKey:"mayors-business-permit",serviceTitle:"Timezone permit",requesterId:citizenId,purpose:"Isolated timezone test",formDataJson:"{}",status:"READY_FOR_RELEASE",assignedStaffId:staffId,releaseApprovedAt:new Date()}});
    await prisma.workAssignment.create({data:{module:"SERVICES",entityType:"SERVICE_REQUEST",entityId:row.id,assignedStaffId:staffId,status:"ACCEPTED",acceptedAt:new Date()}});
    const viewer={id:staffId,role:"STAFF"},date=new Date(Date.now()+2*86400000).toISOString().slice(0,10),expected=date+"T01:30:00.000Z",proposal={location:"Timezone counter",instructions:"Bring valid identification for pickup."};
    await t.test("naive future wall clocks fail without a write",async()=>{
      await assert.rejects(api.proposeServicePickup(row.id,{...proposal,expectedVersion:row.version,scheduledAt:date+"T09:30"},viewer),e=>e.status===400);
      assert.equal((await prisma.serviceRequest.findUniqueOrThrow({where:{id:row.id}})).version,row.version);assert.equal(await prisma.servicePickupSlot.count({where:{requestId:row.id}}),0);
    });
    await t.test("equivalent explicit +08:00 and Z values roundtrip to one real database instant",async()=>{
      for(const scheduledAt of [date+"T09:30:00+08:00",expected]){
        const state=await prisma.serviceRequest.findUniqueOrThrow({where:{id:row.id}}),result=await api.proposeServicePickup(row.id,{...proposal,expectedVersion:state.version,scheduledAt},viewer);
        const stored=await prisma.servicePickupSlot.findUniqueOrThrow({where:{id:result.slotId}});assert.equal(stored.scheduledAt.toISOString(),expected);
      }
    });
  }finally{await prisma.$disconnect();hooks.deregister();}
});
