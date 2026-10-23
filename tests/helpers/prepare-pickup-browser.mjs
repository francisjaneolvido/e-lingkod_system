import assert from "node:assert/strict";
import { loadServerTypescript } from "./load-typescript.mjs";

// Only the guarded disposable runner enables this fixture; never application data.
export async function preparePickupBrowser(){
  const database=new URL(process.env.DATABASE_URL).pathname.slice(1);
  assert.match(database,/^elb_b1_test_[a-f0-9]{32}$/);assert.equal(database,process.env.ELB_B2_TEST_DATABASE);
  const hooks=loadServerTypescript();const {auth}=await import("../../src/lib/auth.ts"),{prisma}=await import("../../src/lib/prisma.ts");
  try{
    const users={};
    for(const [key,role] of [["citizen","CITIZEN"],["staff","STAFF"],["admin","ADMIN"]]){
      const result=await auth.api.signUpEmail({body:{name:"Pickup Browser",firstName:"Pickup",lastName:"Browser",hasNoMiddleName:true,phoneNumber:"+639171234569",email:`pickup-${key}@example.test`,password:"Pickup-browser-test-2468"},headers:new Headers({origin:process.env.BETTER_AUTH_URL||"http://localhost:3000"})});
      users[key]=await prisma.user.update({where:{id:result.user.id},data:{role,department:"BPLO"}});
    }
    await prisma.staffPermission.create({data:{userId:users.staff.id,module:"SERVICES"}});
    for (const fixtureId of ["pickup-browser-fixture","pickup-browser-manila-fixture","pickup-browser-utc-fixture","pickup-browser-claimed-fixture"]) {
    await prisma.serviceRequest.create({data:{id:fixtureId,trackingId:"TEST-"+fixtureId,serviceKey:"mayors-business-permit",serviceTitle:"Business Permit",requesterId:users.citizen.id,purpose:"Disposable browser fixture",formDataJson:"{}",status:"READY_FOR_RELEASE",assignedDepartment:"BPLO",assignedStaffId:users.staff.id,releaseApprovedAt:new Date(),releaseApprovedById:users.admin.id}});
    await prisma.workAssignment.create({data:{module:"SERVICES",entityType:"SERVICE_REQUEST",entityId:fixtureId,assignedStaffId:users.staff.id,department:"BPLO",status:"ACCEPTED",acceptedAt:new Date()}});
    if(fixtureId==="pickup-browser-claimed-fixture"){
      await prisma.serviceRequest.update({where:{id:fixtureId},data:{status:"FOR_FINAL_VERIFICATION",releaseNote:"Disposable physical release awaiting final verification."}});
      await prisma.servicePickupSlot.create({data:{requestId:fixtureId,scheduledAt:new Date(Date.now()-3600000),location:"Recorded collection counter",instructions:"Synthetic audit presentation fixture",status:"CLAIMED",proposedById:users.staff.id,confirmedClaimantName:"Confirmed Browser Claimant",claimantName:"Alternate Browser Claimant",confirmedAt:new Date(Date.now()-3600000),claimedAt:new Date()}});
    }
    }
    await prisma.serviceRequestDocument.create({data:{id:"pickup-browser-document",requestId:"pickup-browser-fixture",requirementKey:"valid-id",requirementLabel:"Valid ID",fileName:"test-fixture.png",mimeType:"image/png",verificationStatus:"APPROVED",byteSize:68,data:Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/l9sAAAAASUVORK5CYII=","base64")}});
    console.log("Pickup browser fixture prepared in disposable database only.");
  }finally{await prisma.$disconnect();hooks.deregister();}
}
if(process.env.ELB_PICKUP_BROWSER_FIXTURE==="1")await preparePickupBrowser();
