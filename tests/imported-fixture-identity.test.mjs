import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {randomBytes} from 'node:crypto';
import {accounts} from '../demo/fixtures/dataset.mjs';
import {seedImportedLegacy} from '../scripts/hackathon/identity.mjs';

test('import legacy classification requires newly owned exact fixtures and matching native/client targets',async()=>{
 const temporary=fs.mkdtempSync(path.join(os.tmpdir(),'elb-import-identity-')),file=path.join(temporary,'accounts.csv');const previous={DEMO_ACCOUNTS_FILE:process.env.DEMO_ACCOUNTS_FILE,DATABASE_URL:process.env.DATABASE_URL};
 fs.writeFileSync(file,['email,password,role',...accounts.map(a=>[a.email,randomBytes(20).toString('hex')+'Aa1!',a.role].join(','))].join('\n'));process.env.DEMO_ACCOUNTS_FILE=file;process.env.DATABASE_URL='mysql://unused:unused@127.0.0.1:3319/e_lingkod_bayan';
 try{const account=accounts[0];for(const kind of ['valid','collision','preexisting','metadata','documents','client-target','source-target']){let writes=0;const user={id:'owned-new',email:account.email,firstName:account.firstName,lastName:account.lastName,role:'CITIZEN',emailVerified:false,identityVersion:0,identityStatus:'SUBMISSION_REQUIRED'};
 const state={collisions:kind==='collision'?[account.key]:[],completed:{['register:'+account.key]:{id:user.id}}},baseline={user:kind==='preexisting'?[JSON.stringify(user)]:[]};
 const db={query:async()=>[{databaseName:'e_lingkod_bayan',portNumber:kind==='source-target'?3306:3319}]},prisma={$queryRawUnsafe:async()=>[{databaseName:'e_lingkod_bayan',portNumber:kind==='client-target'?3306:3319}],user:{findUniqueOrThrow:async()=>user,updateMany:async()=>{writes++;return {count:1}}},citizenIdentitySubmission:{count:async()=>kind==='documents'?1:0}};
 const action=()=>seedImportedLegacy({prisma,db,account:kind==='metadata'?{...account,firstName:'Changed'}:account,state,baseline});if(kind==='valid'){assert.equal((await action()).classification,'LEGACY');assert.equal(writes,1);}else{await assert.rejects(action);assert.equal(writes,0,kind+' must not write');}}
 }finally{for(const[key,value]of Object.entries(previous)){if(value===undefined)delete process.env[key];else process.env[key]=value;}fs.rmSync(temporary,{recursive:true});}
});
