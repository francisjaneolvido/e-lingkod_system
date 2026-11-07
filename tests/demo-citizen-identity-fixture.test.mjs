import test, {after} from 'node:test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {randomBytes} from 'node:crypto';
import assert from 'node:assert/strict';
import { accounts } from '../demo/fixtures/dataset.mjs';
import { guardedTarget, VERSION } from '../scripts/demo/config.mjs';
import { assertDemoIdentityFixture, seedDemoLegacyIdentity } from '../scripts/demo/identity-fixtures.mjs';
import { assertIdentityFreeDemoExport } from '../scripts/demo/transfer.mjs';
import { demoImportExpectations } from '../scripts/demo/verify.mjs';

// Self-contained synthetic credentials: no private Yesel catalogue or SQL
// export is required by this maintained regression suite.
const temporary=fs.mkdtempSync(path.join(os.tmpdir(),'elb-identity-catalogue-'));
const catalogue=path.join(temporary,'accounts.csv'),previousCatalogue=process.env.DEMO_ACCOUNTS_FILE;
const quote=value=>'"'+String(value).replaceAll('"','""')+'"';
fs.writeFileSync(catalogue,['displayName,email,password,role,scenario',...accounts.map(a=>[a.firstName+' '+a.lastName,a.email,randomBytes(20).toString('hex')+'Aa1!',a.role,a.group+':'+a.scenario].map(quote).join(','))].join('\n')+'\n');
process.env.DEMO_ACCOUNTS_FILE=catalogue;
after(()=>{if(previousCatalogue===undefined)delete process.env.DEMO_ACCOUNTS_FILE;else process.env.DEMO_ACCOUNTS_FILE=previousCatalogue;fs.rmSync(temporary,{recursive:true});});
const url='mysql://synthetic:unused@127.0.0.1/e_lingkod_bayan_demo';
const config={primary:guardedTarget(url)};
const env={DATABASE_URL:url,ELB_DEMO_MODE:VERSION};
test('dedicated demo legacy seeding accepts only known CSV fixture identities and local targets',()=>{
  assert.equal(assertDemoIdentityFixture(config,accounts[0],env).database,'e_lingkod_bayan_demo');
  for(const account of [{...accounts[0],email:'other@example.test'},{...accounts[0],firstName:'Changed'},{...accounts[0],role:'ADMIN'}])assert.throws(()=>assertDemoIdentityFixture(config,account,env),/fixture|identity/i);
  for(const overrides of [{DATABASE_URL:'mysql://localhost/e_lingkod_bayan'},{ELB_DEMO_MODE:''}])assert.throws(()=>assertDemoIdentityFixture(config,accounts[0],{...env,...overrides}),/demo|match|target/i);
  assert.throws(()=>assertDemoIdentityFixture({primary:{url:new URL('mysql://remote.example.test/e_lingkod_bayan_demo')}},accounts[0],env),/local|target/i);
});
test('restore-clone setup requires an exact generated test marker',()=>{
 const database='e_lingkod_bayan_demo_restore_u'+'a'.repeat(32),url='mysql://127.0.0.1/'+database;
 const config={primary:guardedTarget(url,'restore')};
 assert.throws(()=>assertDemoIdentityFixture(config,accounts[0],{DATABASE_URL:url,ELB_DEMO_MODE:VERSION}),/test|restore/i);
 assert.equal(assertDemoIdentityFixture(config,accounts[0],{DATABASE_URL:url,ELB_DEMO_MODE:VERSION,ELB_DEMO_SETUP_TEST_DATABASE:database}).database,database);
});
test('dedicated demo fixture refuses mismatched clients before account reads or writes',async()=>{
 let reads=0,writes=0;
 const client={$queryRawUnsafe:async()=>[{databaseName:'another_database'}],user:{findUniqueOrThrow:async()=>{reads++;},updateMany:async()=>{writes++;}}};
 await assert.rejects(()=>seedDemoLegacyIdentity(config,client,accounts[0],env),/client does not match/);
 assert.equal(reads,0);assert.equal(writes,0);
});
test('dedicated demo fixture never overwrites pending, approved or history-bearing identities',async()=>{
 const account=accounts[0];let writes=0;
 for(const [status,version,documents]of[['PENDING',1,0],['APPROVED',1,0],['LEGACY',0,1]]){
  const client={$queryRawUnsafe:async()=>[{databaseName:'e_lingkod_bayan_demo'}],user:{findUniqueOrThrow:async()=>({...account,id:'synthetic',emailVerified:false,identityStatus:status,identityVersion:version}),updateMany:async()=>{writes++;}},citizenIdentitySubmission:{count:async()=>documents}};
  await assert.rejects(()=>seedDemoLegacyIdentity(config,client,account,env),/untouched|documents|history/);
 }
 assert.equal(writes,0);
});
test('demo export rejects any ID submission or review using counts without reading document bytes',async()=>{
 for(const occupied of ['citizen_identity_submission','citizen_identity_review',null]){
  const queries=[];
  const db={query:async sql=>{queries.push(sql);if(sql==='SHOW TABLES')return[{table:'citizen_identity_submission'},{table:'citizen_identity_review'}];assert.match(sql,/^SELECT COUNT\(\*\) AS n FROM `/);return[{n:occupied&&sql.includes(occupied)?1:0}];}};
  if(occupied)await assert.rejects(()=>assertIdentityFreeDemoExport(db),/refuses identity/);else await assertIdentityFreeDemoExport(db);
  assert(queries.every(sql=>sql==='SHOW TABLES'||sql.startsWith('SELECT COUNT(*)')));
 }
});
test('demo source expectations distinguish exact historical unknown imports from modern validated source rows',()=>{
 const make=modern=>Array.from({length:6},(_,index)=>({participantRef:'DEMO-IMPORT-'+String(index+1).padStart(3,'0'),sourceKey:modern?'DEMO-LEGACY-REGISTRATION':null,surveyYear:modern?2026:null,outcome:modern&&index===5?'REJECTED':'ACCEPTED',batch:{sourceKey:modern?'DEMO-LEGACY-REGISTRATION':null,surveyYear:modern?2026:null}}));
 assert.deepEqual(demoImportExpectations(make(false),2026),{currentBySource:{'DEMO-B3-SOURCE':2},unknownSurveyYearExcluded:6,notAccepted:5});
 assert.deepEqual(demoImportExpectations(make(true),2026),{currentBySource:{'DEMO-B3-SOURCE':2,'DEMO-LEGACY-REGISTRATION':5},unknownSurveyYearExcluded:0,notAccepted:6});
 for(const change of [rows=>rows.pop(),rows=>{rows[0].sourceKey='OTHER';},rows=>{rows[0].outcome='REJECTED';},rows=>{rows[0].batch.surveyYear=2025;}]){const rows=make(true);change(rows);assert.throws(()=>demoImportExpectations(rows,2026));}
});
