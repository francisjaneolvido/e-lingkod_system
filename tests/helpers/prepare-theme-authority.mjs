import { registerLegacyCitizenFixture } from './legacy-citizen-fixture.mjs';
// Synthetic UI-only authority states; no external invitation or ordinary target.
import assert from 'node:assert/strict';
import {loadServerTypescript} from './load-typescript.mjs';
const target=new URL(process.env.DATABASE_URL);assert.equal(target.hostname,'127.0.0.1');assert.match(target.pathname,/^\/elb_b3_test_[a-f0-9]{32}$/);assert.equal(target.pathname.slice(1),process.env.ELB_B3_TEST_DATABASE);
const hook=loadServerTypescript(),{prisma}=await import('../../src/lib/prisma.ts');
try{
 const {auth}=await import('../../src/lib/auth.ts'),admin=await prisma.user.findUniqueOrThrow({where:{email:'b3.admin@example.test'}});
 await registerLegacyCitizenFixture(auth, prisma, {body:{firstName:'Synthetic',lastName:'Operations',hasNoMiddleName:true,phoneNumber:'+639001234567',name:'Synthetic Operations',email:'b3.operations@example.test',password:'B3-browser-password-2026!'}});
 const session=await auth.api.signInEmail({body:{email:admin.email,password:'B3-browser-password-2026!'},returnHeaders:true});const cookie=session.headers.getSetCookie().map(v=>v.split(';')[0]).join('; ');
 const response=await(await import('../../src/app/api/admin/staff/route.ts')).POST(new Request(process.env.BETTER_AUTH_URL+'/api/admin/staff',{method:'POST',headers:{origin:process.env.BETTER_AUTH_URL,cookie,'content-type':'application/json'},body:JSON.stringify({mode:'SAVE',email:'b3.operations@example.test',department:'BPLO',designation:'Synthetic scoped operations UI fixture',modules:['REPORTS','SERVICES','EMERGENCY']})}));assert.equal(response.ok,true);
 const {hashInvitationToken,invitationExpiry,parseInvitationInput,invitationDatabaseFields}=await import('../../src/lib/staff-invitations.ts');
 // Deliberately fixed test-only token on a disposable server; never delivered externally.
 await prisma.staffInvitation.create({data:{...invitationDatabaseFields(parseInvitationInput({name:'Synthetic Activation',email:'activation-ui@example.test',department:'PESO',designation:'Synthetic visual test',modules:['CENSUS']})),tokenHash:hashInvitationToken('t'.repeat(43)),issuedById:admin.id,expiresAt:invitationExpiry()}});
 console.log('Synthetic operations Staff scoped toBPLO and a non-delivered activation-form fixture prepared.');
}finally{await prisma.$disconnect();hook.deregister();}
