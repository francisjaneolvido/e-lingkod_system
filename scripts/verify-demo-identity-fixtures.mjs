// Full demo rehearsal on a generated disposable restore clone only.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {randomUUID,createHash} from 'node:crypto';
import dotenv from 'dotenv';
import {loadConfig,readDemoConfig,guardedTarget,applicationEnvironment} from './demo/config.mjs';
import {connect,identifier,fingerprint,snapshot} from './demo/database.mjs';
import {accounts} from '../demo/fixtures/dataset.mjs';
const at=process.argv.indexOf('--env');
const original=at>=0?readDemoConfig(dotenv.parse(fs.readFileSync(process.argv[at+1]))):loadConfig();
const name='e_lingkod_bayan_demo_restore_u'+randomUUID().replaceAll('-','');
const url=new URL(original.primary.url);url.pathname='/'+name;
const target=guardedTarget(url.href,'restore'),config={...original,primary:target};
const artifactDirectory=path.resolve('.scratch/site-release','regressions-demo-setup-'+name.slice(-32));
fs.mkdirSync(artifactDirectory,{recursive:true});
fs.copyFileSync('demo/expected-counts.json',path.join(artifactDirectory,'expected-counts.json'));
const hash=file=>createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const originalFiles=Object.fromEntries(['demo/accounts.csv','demo/expected-counts.json'].map(file=>[file,hash(file)]));
Object.assign(process.env,applicationEnvironment(config,target),{ELB_DEMO_SETUP_TEST_DATABASE:name,RESEND_API_KEY:'',STAFF_INVITE_FROM:''});
const {loadServerTypescript}=await import('../tests/helpers/load-typescript.mjs');
const hook=loadServerTypescript();let db,prisma;
try{
 db=await connect(target,true);
 const {setup}=await import('./demo/setup.mjs');
 await setup(config,{artifactDirectory});
 ({prisma}=await import('../src/lib/prisma.ts'));
 const {verify}=await import('./demo/verify.mjs');
 await verify(config,target,{login:false,artifactDirectory});
 const before=await fingerprint(db);
 await setup(config,{artifactDirectory});
 assert.equal(await fingerprint(db),before,'Idempotent setup must preserve the completed dataset.');
 assert.equal(await prisma.user.count(),108);
 assert.equal(await prisma.user.count({where:{identityStatus:'LEGACY'}}),108);
 assert.equal(await prisma.user.count({where:{emailVerified:true}}),0);
 assert.equal(await prisma.citizenIdentitySubmission.count(),0);assert.equal(await prisma.citizenIdentityReview.count(),0);
 const {auth}=await import('../src/lib/auth.ts');let signedIn=0;
 for(const account of accounts){
  const response=await auth.api.signInEmail({body:{email:account.email,password:account.password},asResponse:true});
  assert.equal(response.status,200,'Synthetic credential sign-in failed.');
  const cookie=response.headers.getSetCookie().map(value=>value.split(';')[0]).join('; ');
  const session=await auth.api.getSession({headers:new Headers({cookie})});
  assert.equal(session.user.email,account.email);
  const viewer=await prisma.user.findUniqueOrThrow({where:{id:session.user.id}});
  assert.equal(viewer.role,account.role);assert.equal(viewer.identityStatus,'LEGACY');
  await auth.api.signOut({headers:new Headers({cookie})});signedIn++;
 }
 // Real request rate buckets must not change the managed dataset/export.
 await prisma.rateLimit.create({data:{id:'synthetic-demo-rate',key:'synthetic-demo-rate',count:1,lastRequest:Date.now()}});
 assert.equal(await fingerprint(db),before);
 const captured=await snapshot(db);assert(!('rateLimit'in captured));assert(!('ratelimit'in captured));
 for(const[file,expected]of Object.entries(originalFiles))assert.equal(hash(file),expected,'Tracked fixture artifact changed.');
 fs.writeFileSync(path.join(artifactDirectory,'result.json'),JSON.stringify({database:name,accounts:108,legacyClassifications:108,realBetterAuthApiSignIns:signedIn,idSubmissions:0,idReviews:0,emailVerified:0,idempotentSetup:true,rateBucketsExcluded:true,trackedFixtureHashesUnchanged:true},null,2)+'\n');
 console.log('PASS: full demo setup/verify,108 real Better Auth API sign-ins,explicit legacy identities,no ID documents,idempotent setup,transient rate exclusion,and unchanged tracked fixture files.');
}finally{
 if(prisma)await prisma.$disconnect();
 if(db){if(!/^e_lingkod_bayan_demo_restore_u[a-f0-9]{32}$/.test(name)||target.database!==name)throw Error('Unsafe disposable demo cleanup refused');await db.query('DROP DATABASE '+identifier(name));await db.end();}
 hook.deregister();
}
