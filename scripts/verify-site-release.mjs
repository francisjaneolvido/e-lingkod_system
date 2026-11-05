// All writes are confined to a newly created disposable local schema.
import fs from 'node:fs';
import path from 'node:path';
import {randomUUID, randomBytes} from 'node:crypto';
import {spawn, spawnSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';
import assert from 'node:assert/strict';
import dotenv from 'dotenv';
import mariadb from 'mariadb';

const args = process.argv.slice(2);
const envIndex = args.indexOf('--env');
// Anchor preservation checks before the identity migration even after relocation.
const baselineIndex = args.indexOf('--baseline-ref');
const baselineRef = baselineIndex >= 0 ? args[baselineIndex + 1] : '3a8ed665a4a24dec608f292c2b16c9feb50fd02b';
if (!baselineRef || !/^[a-f0-9]{40}$/i.test(baselineRef)) throw Error('Use a full reviewed baseline commit SHA.');
dotenv.config({path: envIndex >= 0 ? args[envIndex + 1] : '.env', quiet:true});
const configured = new URL(process.env.DATABASE_URL || 'mysql://localhost/missing');
if (configured.protocol !== 'mysql:' || !['localhost','127.0.0.1','[::1]'].includes(configured.hostname) || !configured.username) throw Error('Explicit local MySQL configuration required; use --env PATH. Never supply a production connection.');
const name = 'elb_site_release_test_' + randomUUID().replaceAll('-','');
const target = new URL(configured); target.pathname = '/' + name;
const scratch = path.resolve('.scratch/site-release'); fs.mkdirSync(scratch,{recursive:true});
const env = {...process.env, DATABASE_URL:target.href, ELB_SITE_RELEASE_TEST_DATABASE:'true',
  BETTER_AUTH_SECRET:randomBytes(32).toString('hex'), BETTER_AUTH_URL:'http://localhost:3115',
ELB_NEXT_DIST_DIR:args.includes('--build')||args.includes('--production')?'.scratch/site-release/production-next':'.scratch/site-release/dev-next', NEXT_TELEMETRY_DISABLED:'1',
  RESEND_API_KEY:'', STAFF_INVITE_FROM:'', PASSWORD_RESET_FROM:'',
  ELB_PASSWORD_RESET_TRANSPORT:'capture', PASSWORD_RESET_CAPTURE_DIR:path.join(scratch,'mail',name)};
const db = await mariadb.createConnection({host:configured.hostname, port:Number(configured.port||3306),
  user:decodeURIComponent(configured.username), password:decodeURIComponent(configured.password),
  ...(process.env.MYSQL_RSA_PUBLIC_KEY_PATH ? {cachingRsaPublicKey:fs.readFileSync(process.env.MYSQL_RSA_PUBLIC_KEY_PATH,'utf8')} : {})});
const run = command => {const r=spawnSync(process.execPath,command,{env,stdio:'inherit',windowsHide:true});if(r.status!==0)throw Error('Verification failed: '+command.join(' ')+' (exit '+r.status+')');};
let created=false;
try {
  await db.query('CREATE DATABASE `'+name+'` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci');created=true;
  await db.query('USE `'+name+'`');
  console.log('Created guarded disposable database '+name+'. Configured database remains untouched.');
  const migration='20261105010000_citizen_identity_review';
  const baseline=path.join(scratch,'baseline-migrations-'+name);fs.mkdirSync(baseline,{recursive:true});
  for(const item of fs.readdirSync('prisma/migrations')) if(item!==migration) fs.cpSync(path.join('prisma/migrations',item),path.join(baseline,item),{recursive:true});
  const baselineConfig=path.join(scratch,'baseline.config.ts');
  const baselineSchema=path.join(scratch,'baseline-schema.prisma');
  const original=spawnSync('git',['show',baselineRef+':prisma/schema.prisma'],{encoding:'utf8',windowsHide:true});
  if(original.status!==0)throw Error('Read-only baseline schema inspection failed.');
  fs.writeFileSync(baselineSchema,original.stdout);
  fs.writeFileSync(baselineConfig,`import {defineConfig} from 'prisma/config'; export default defineConfig({schema:${JSON.stringify(baselineSchema)},migrations:{path:${JSON.stringify(baseline)}},datasource:{url:process.env.DATABASE_URL!}});`);
  run(['node_modules/prisma/build/index.js','migrate','deploy','--config',baselineConfig]);
  const drift=(schema,config)=>{
    const checked=spawnSync(process.execPath,['node_modules/prisma/build/index.js',...(config?['--config',config]:[]),'migrate','diff','--from-config-datasource','--to-schema',schema,'--script','--exit-code'],{env,encoding:'utf8',windowsHide:true});
    if(![0,2].includes(checked.status))throw Error('Schema comparison failed: '+checked.stderr);
    return {exit:checked.status,sql:checked.stdout};
  };
  const baselineDrift=drift(baselineSchema,baselineConfig);
  await db.query("INSERT INTO user (id,name,email,role,updatedAt) VALUES ('site_preserved_legacy','Synthetic legacy','site.legacy@example.test','CITIZEN',NOW(3))");
  await db.query("INSERT INTO verification (id,identifier,value,expiresAt) VALUES ('site_preserved_auth','synthetic-preservation','synthetic-auth-value','2030-01-01')");
  const [before]=await db.query("SELECT * FROM user WHERE id='site_preserved_legacy'");
  const [beforeToken]=await db.query("SELECT * FROM verification WHERE id='site_preserved_auth'");
  run(['node_modules/prisma/build/index.js','migrate','deploy']);
  const [after]=await db.query("SELECT * FROM user WHERE id='site_preserved_legacy'");
  assert.equal(after.identityStatus,'LEGACY');assert.equal(after.identityVersion,0);
  for(const key of Object.keys(before)) assert.deepEqual(after[key],before[key],key+' preserved');
  const [afterToken]=await db.query("SELECT * FROM verification WHERE id='site_preserved_auth'");assert.deepEqual(afterToken,beforeToken,'existing auth tokens preserved');
  fs.writeFileSync(path.join(scratch,'migration-preservation.json'),JSON.stringify({allExistingUserFieldsPreserved:true,existingAuthTokenPreserved:true,legacyClassification:'LEGACY',newInsertDefault:'SUBMISSION_REQUIRED',database:name},null,2));
  run(['node_modules/prisma/build/index.js','migrate','status']);
  const currentDrift=drift('prisma/schema.prisma');
  fs.writeFileSync(path.join(scratch,'schema-drift.json'),JSON.stringify({baselineRevision:baselineRef,baseline:baselineDrift,current:currentDrift},null,2));
  assert.deepEqual(currentDrift,baselineDrift,'Release must add no schema drift beyond reviewed pre-identity baseline');
  console.log('PASS: migration preserves existing user fields/auth tokens and introduces no new schema drift.');
  run(['--test','--test-concurrency=1','tests/site-release-db.test.mjs',...(fs.existsSync('tests/password-recovery-db.test.mjs')?['tests/password-recovery-db.test.mjs']:[])]);
  if(args.includes('--build')) run(['node_modules/next/dist/bin/next','build']);
  if(args.includes('--serve') || args.includes('--timing')) {
    // Browser fixtures are synthetic and created only after the schema guard above.
    if(fs.existsSync('tests/helpers/prepare-site-release-browser.mjs'))run(['tests/helpers/prepare-site-release-browser.mjs']);
    const serverEnv = args.includes('--timing') ? {...env,
      PASSWORD_RESET_CAPTURE_DIR:'', RESEND_API_KEY:'elb-disposable-provider',
      PASSWORD_RESET_FROM:'eLB <synthetic@example.test>',
      ELB_RECOVERY_PROVIDER_CONTROL_FILE:path.join(scratch,'provider-'+name,'control.json'),
      NODE_OPTIONS:(env.NODE_OPTIONS || '')+' --import='+pathToFileURL(path.resolve('tests/helpers/recovery-provider-preload.mjs')).href,
    } : env;
    const child=spawn(process.execPath,['node_modules/next/dist/bin/next',args.includes('--build')||args.includes('--production')?'start':'dev','--hostname','localhost','--port','3115'],{env:serverEnv,stdio:'inherit',windowsHide:true});
    console.log('Guarded browser server http://localhost:3115. Enter/interrupt to stop and drop disposable database.');
    const stop=()=>{if(child.pid)spawnSync('taskkill',['/PID',String(child.pid),'/T','/F'],{windowsHide:true,stdio:'ignore'});};
    if(args.includes('--timing')) {
      try {
        const checked=spawnSync(process.execPath,['tests/password-recovery-http.mjs'],{env:serverEnv,stdio:'inherit',windowsHide:true});
        if(checked.status!==0)throw Error('HTTP recovery timing regression failed ('+checked.status+').');
      } finally { stop(); }
    } else {
      process.stdin.resume();process.stdin.once('data',stop);process.once('SIGINT',stop);process.once('SIGTERM',stop);
      await new Promise(resolve=>child.once('exit',resolve));process.stdin.pause();
    }
  }
} finally {
  if(created){if(!/^elb_site_release_test_[a-f0-9]{32}$/.test(name)||target.pathname!=='/'+name)throw Error('Unsafe cleanup refused');await db.query('DROP DATABASE `'+name+'`');console.log('Dropped '+name);}
  await db.end();
}
