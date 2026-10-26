import "server-only";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";
import type { CivicViewer } from "@/features/civic/types";
import { CivicError } from "@/features/civic/validation";
import { resolveServiceDefinition } from "./catalog";
import { parsePickupInstant } from "../pickup-time";

type Tx = Prisma.TransactionClient;
function object(value:unknown):Record<string,unknown>{if(!value||typeof value!=="object"||Array.isArray(value))throw new CivicError("Invalid pickup request.",400);return value as Record<string,unknown>;}
function text(value:unknown,label:string,min:number,max:number){if(typeof value!=="string"||value.trim().length<min||value.trim().length>max)throw new CivicError(`${label} must contain ${min}–${max} characters.`,400);return value.trim();}
function version(value:unknown){if(!Number.isSafeInteger(value)||Number(value)<1)throw new CivicError("Refresh this request before continuing; its version is required.",400);return Number(value);}
async function transaction<T>(work:(tx:Tx)=>Promise<T>){try{return await prisma.$transaction(work,{isolationLevel:"RepeatableRead"});}catch(error){if(error&&typeof error==="object"&&"code" in error&&error.code==="P2034")throw new CivicError("This pickup changed. Refresh the request.",409);throw error;}}
async function staffRequest(tx:Tx,id:string,viewer:CivicViewer){
  if(viewer.role!=="STAFF")throw new CivicError("Only the assigned staff member can manage physical pickup.",403);
  const permission=await tx.staffPermission.findUnique({where:{userId_module:{userId:viewer.id,module:"SERVICES"}}});
  const row=await tx.serviceRequest.findFirst({where:{id,assignedStaffId:viewer.id}});
  if(!permission||!row)throw new CivicError("You are not authorized to manage this pickup.",403);
  const work=await tx.workAssignment.findUnique({where:{module_entityType_entityId:{module:"SERVICES",entityType:"SERVICE_REQUEST",entityId:id}}});
  if(work?.assignedStaffId!==viewer.id||work.status!=="ACCEPTED")throw new CivicError("Accept this assigned service task before managing pickup.",409);
  return row;
}
async function ready(serviceKey:string,status:string,approved:Date|null){
  if(status!=="READY_FOR_RELEASE"||!approved)throw new CivicError("Final release approval is required before physical pickup.",409);
  const service=await resolveServiceDefinition(serviceKey,true);
  if(service?.completionMode!=="RELEASE")throw new CivicError("This service does not use physical document pickup.",409);
}
async function lock(tx:Tx,id:string,expectedVersion:number){const changed=await tx.serviceRequest.updateMany({where:{id,version:expectedVersion,status:"READY_FOR_RELEASE"},data:{version:{increment:1}}});if(changed.count!==1)throw new CivicError("This pickup changed. Refresh the request before continuing.",409);}
async function event(tx:Tx,id:string,actorId:string,action:string,status:string,note:string){await tx.serviceRequestEvent.create({data:{requestId:id,actorId,action,status,note,visibleToCitizen:true}});}
export async function proposeServicePickup(id:string,input:unknown,viewer:CivicViewer){
  const raw=object(input),expected=version(raw.expectedVersion),location=text(raw.location,"Pickup location",3,220),instructions=text(raw.instructions,"Pickup instructions",8,1800);
  const scheduledAt=parsePickupInstant(raw.scheduledAt);
  if(!Number.isFinite(scheduledAt.getTime())||scheduledAt.getTime()<=Date.now()||scheduledAt.getTime()>Date.now()+366*86400000)throw new CivicError("Choose a future pickup date within the next year.",400);
  return transaction(async tx=>{
    const row=await staffRequest(tx,id,viewer);await ready(row.serviceKey,row.status,row.releaseApprovedAt);await lock(tx,id,expected);
    if(await tx.servicePickupSlot.findFirst({where:{requestId:id,status:"CONFIRMED"}}))throw new CivicError("The citizen has confirmed a pickup. A change request is needed before replacing it.",409);
    await tx.servicePickupSlot.updateMany({where:{requestId:id,status:{in:["PROPOSED","CHANGE_REQUESTED"]}},data:{status:"CANCELLED"}});
    const slot=await tx.servicePickupSlot.create({data:{requestId:id,scheduledAt,location,instructions,proposedById:viewer.id}});
    await event(tx,id,viewer.id,"PICKUP_PROPOSED",row.status,"A physical pickup time was proposed. Confirm it or request a change.");
    await tx.notification.create({data:{userId:row.requesterId,module:"SERVICES",type:"PICKUP_PROPOSED",title:"Choose your document pickup",message:instructions,href:`/services/requests/${id}`}});
    return {success:true,slotId:slot.id};
  });
}
export async function respondToServicePickup(id:string,input:unknown,viewer:CivicViewer){
  if(viewer.role!=="CITIZEN")throw new CivicError("Only the requesting citizen can respond to pickup.",403);
  const raw=object(input),slotId=text(raw.slotId,"Pickup",1,191),expected=version(raw.expectedVersion),action=raw.action;
  if(action!=="CONFIRM"&&action!=="REQUEST_CHANGE")throw new CivicError("Choose confirmation or a change request.",400);
  return transaction(async tx=>{
    const row=await tx.serviceRequest.findFirst({where:{id,requesterId:viewer.id}});if(!row)throw new CivicError("Service request not found.",404);
    await ready(row.serviceKey,row.status,row.releaseApprovedAt);await lock(tx,id,expected);
    const slot=await tx.servicePickupSlot.findFirst({where:{id:slotId,requestId:id,status:{in:action==="CONFIRM"?["PROPOSED"]:["PROPOSED","CONFIRMED"]}}});
    if(!slot)throw new CivicError("This pickup is no longer awaiting your response.",409);
    if(action==="CONFIRM"&&slot.scheduledAt.getTime()<=Date.now())throw new CivicError("This pickup time has passed. Request a new time.",409);
    const claimantName=action==="CONFIRM"?text(raw.claimantName,"Claimant name",2,180):null;
    const citizenNote=action==="REQUEST_CHANGE"?text(raw.note,"Requested change",8,1800):null;
    await tx.servicePickupSlot.update({where:{id:slotId},data:{status:action==="CONFIRM"?"CONFIRMED":"CHANGE_REQUESTED",confirmedAt:action==="CONFIRM"?new Date():null,claimantName,...(action==="CONFIRM"?{confirmedClaimantName:claimantName}:{}),citizenNote}});
    const note=action==="CONFIRM"?`Citizen confirmed physical document pickup. Citizen-confirmed claimant: ${claimantName}.`:`Citizen requested a pickup change: ${citizenNote}`;
    await event(tx,id,viewer.id,action==="CONFIRM"?"PICKUP_CONFIRMED":"PICKUP_CHANGE_REQUESTED",row.status,note);
    if(row.assignedStaffId)await tx.notification.create({data:{userId:row.assignedStaffId,module:"SERVICES",type:"PICKUP_RESPONSE",title:"Document pickup updated",message:note,href:`/admin/services/${id}`}});
    return {success:true};
  });
}
export async function recordServicePickupRelease(id:string,input:Record<string,unknown>|undefined,viewer:CivicViewer){
  if(input?.idVerified !== true)throw new CivicError("Confirm that the claimant's valid identification was checked in person.",400);
  const raw=object(input),slotId=text(raw.slotId,"Confirmed pickup",1,191),expected=version(raw.expectedVersion),claimantName=text(raw.claimantName,"Actual claimant name",2,180),remarks=text(raw.note,"Release remarks",8,1800);
  return transaction(async tx=>{
    const row=await staffRequest(tx,id,viewer);await ready(row.serviceKey,row.status,row.releaseApprovedAt);await lock(tx,id,expected);
    const slot=await tx.servicePickupSlot.findFirst({where:{id:slotId,requestId:id,status: "CONFIRMED"}});
    if(!slot)throw new CivicError("A citizen-confirmed pickup is required before release.",409);
    if(slot.scheduledAt.getTime()>Date.now())throw new CivicError("The confirmed pickup time has not occurred yet.",409);
    const confirmedClaimantName=slot.confirmedClaimantName??slot.claimantName;
    await tx.servicePickupSlot.update({where:{id:slot.id},data:{status:"CLAIMED",confirmedClaimantName,claimantName,claimedAt:new Date()}});
    const note=`${remarks} Citizen-confirmed claimant: ${confirmedClaimantName??"Not recorded"}. Actual claimant: ${claimantName}. Valid identification checked in person.`;
    await tx.serviceRequest.update({where:{id},data:{status:"FOR_FINAL_VERIFICATION",releaseNote:note}});
    await event(tx,id,viewer.id,"RELEASE_RECORDED","FOR_FINAL_VERIFICATION",note);
    const admins=await tx.user.findMany({where:{role:"ADMIN"},select:{id:true}});
    if(admins.length)await tx.notification.createMany({data:admins.map(admin=>({userId:admin.id,module:"SERVICES",type:"RELEASE_RECORDED",title:"Verify physical document release",message:row.trackingId,href:`/admin/services/${id}`}))});
    return {success:true};
  });
}
