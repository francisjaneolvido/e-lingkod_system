import fs from 'node:fs';
import path from 'node:path';
import { randomUUID,createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import mariadb from 'mariadb';
import dotenv from 'dotenv';
import { connectTarget,readTarget,backupDatabase,writeJson,assertMigrationOnly,snapshot,digest } from './storage.mjs';
import { reviewedMigrations } from './prerequisites.mjs';
const [command,...args]=process.argv.slice(2),option=name=>args.find(v=>v.startsWith('--'+name+'='))?.slice(name.length+3);
if(!['prepare','apply','verify','report'].includes(command))throw Error('Use prepare, apply, verify or report with explicit --state-dir and --target');
if(option('target')!=='e_lingkod_bayan')throw Error('Explicit --target=e_lingkod_bayan required');
const directory=option('state-dir');if(!directory)throw Error('Private --state-dir required; keep recovery material outside Git');
const settings=dotenv.parse(fs.readFileSync(option('config')||'.env.hackathon.local'));
if(!settings.HACKATHON_DATABASE_URL)throw Error('Explicit HACKATHON_DATABASE_URL required; no DATABASE_URL fallback');
const baseURL=settings.HACKATHON_AUTH_ORIGIN;
if(!baseURL||new URL(baseURL).hostname!=='localhost'||new URL(baseURL).protocol!=='http:')throw Error('Explicit local localhost auth origin required');
process.env.DATABASE_URL=settings.HACKATHON_DATABASE_URL;
process.env.BETTER_AUTH_URL=baseURL;process.env.NEXT_PUBLIC_APP_URL=baseURL;
const db=await connectTarget(settings.HACKATHON_DATABASE_URL);
let hook;
try{
  const target=await readTarget(db);
  if(command==='prepare'){
    const manifest=fs.existsSync(path.join(directory,'backup-manifest.json'))?JSON.parse(fs.readFileSync(path.join(directory,'backup-manifest.json'),'utf8')):await backupDatabase(db,directory);
    if(JSON.stringify(manifest.target)!==JSON.stringify(target))throw Error('Recovery backup target mismatch');
    await assertMigrationOnly(db,JSON.parse(fs.readFileSync(path.join(directory,'pre-migration-baseline.json'),'utf8')));
    // Demonstrate recovery into a fresh, owned disposable database. The ordinary
    // target is never restored/reset. Private content never enters the report.
    const raw=fs.readFileSync(path.join(directory,'pre-import.sql'),'utf8');
    if(createHash('sha256').update(raw).digest('hex')!==manifest.sha256)throw Error('Private backup integrity mismatch');
    const url=new URL(settings.HACKATHON_DATABASE_URL),name='elb_b3_test_'+randomUUID().replaceAll('-','');
    const server=await mariadb.createConnection({host:url.hostname,port:Number(url.port||3306),user:decodeURIComponent(url.username),password:decodeURIComponent(url.password),timezone:'+00:00',dateStrings:true,bigIntAsNumber:true});
    let verification;
    try{
      await server.query('CREATE DATABASE `'+name+'` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci');await server.query('USE `'+name+'`');
      for(const statement of raw.split(';\n-- ELB-PRIVATE-BACKUP-STATEMENT\n'))if(statement.trim())await server.query(statement);
      for(const {table,rows} of manifest.inventory){const [actual]=await server.query('SELECT COUNT(*) n FROM `'+table+'`');if(Number(actual.n)!==rows)throw Error('Private backup recovery count mismatch');}
      const before=JSON.parse(fs.readFileSync(path.join(directory,'pre-migration-baseline.json'),'utf8'));
      if(digest(await snapshot(server))!==digest(before))throw Error('Restored private backup differs');
      const migrations=await db.query('SELECT migration_name,finished_at,rolled_back_at FROM _prisma_migrations');
      if(migrations.some(m=>!m.finished_at&&!m.rolled_back_at))throw Error('Unfinished application migration needs independent recovery');
      const applied=new Set(migrations.filter(m=>m.finished_at&&!m.rolled_back_at).map(m=>m.migration_name));
      const pending=fs.readdirSync('prisma/migrations').filter(n=>fs.statSync('prisma/migrations/'+n).isDirectory()&&!applied.has(n));
      for(const n of pending){const hash=createHash('sha256').update(fs.readFileSync('prisma/migrations/'+n+'/migration.sql')).digest('hex');if(reviewedMigrations[n]!==hash)throw Error('Unreviewed prerequisite migration: '+n);}
      // Exercise exactly these migrations against recovered pre-existing records.
      const testURL=new URL(url);testURL.pathname='/'+name;
      const migrated=spawnSync(process.execPath,['node_modules/prisma/build/index.js','migrate','deploy'],{env:{...process.env,DATABASE_URL:testURL.href},encoding:'utf8',windowsHide:true});
      if(migrated.status!==0)throw Error('Isolated prerequisite migration rehearsal failed');
      await assertMigrationOnly(server,before);
      verification={target,backupSha256:manifest.sha256,restoredTables:manifest.inventory.length,originalFieldsPreserved:true,reviewedPendingMigrations:pending.map(name=>({name,sha256:reviewedMigrations[name]})),checkedAt:new Date().toISOString()};
      writeJson(path.join(directory,'prerequisite-review.json'),verification);
    }finally{if(!/^elb_b3_test_[a-f0-9]{32}$/.test(name))throw Error('Unsafe recovery cleanup');await server.query('DROP DATABASE IF EXISTS `'+name+'`');await server.end();}
    console.log(JSON.stringify({backupVerified:true,tables:verification.restoredTables,reviewedPrerequisites:verification.reviewedPendingMigrations.map(m=>m.name)}));
  }else{
    const proof=JSON.parse(fs.readFileSync(path.join(directory,'prerequisite-review.json'),'utf8'));
    if(JSON.stringify(proof.target)!==JSON.stringify(target))throw Error('Backup belongs to a different target');
    if(createHash('sha256').update(fs.readFileSync(path.join(directory,'pre-import.sql'))).digest('hex')!==proof.backupSha256)throw Error('Private backup was altered');
    if(command==='apply'){
      // No new prerequisites may slip into a previously reviewed deployment.
      const applied=new Set((await db.query('SELECT migration_name FROM _prisma_migrations WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL')).map(m=>m.migration_name));
      const pending=fs.readdirSync('prisma/migrations').filter(n=>fs.statSync('prisma/migrations/'+n).isDirectory()&&!applied.has(n));
      for(const n of pending){const approved=proof.reviewedPendingMigrations.find(m=>m.name===n);if(!approved||approved.sha256!==createHash('sha256').update(fs.readFileSync('prisma/migrations/'+n+'/migration.sql')).digest('hex'))throw Error('Prerequisite plan changed');}
      if(!fs.existsSync(path.join(directory,'journal.json')))await assertMigrationOnly(db,JSON.parse(fs.readFileSync(path.join(directory,'pre-migration-baseline.json'),'utf8')));
      if(pending.length){if(!args.includes('--migrate-reviewed'))throw Error('Reviewed additive prerequisite migration opt-in required');const deployed=spawnSync(process.execPath,['node_modules/prisma/build/index.js','migrate','deploy'],{env:process.env,encoding:'utf8',windowsHide:true});if(deployed.status!==0)throw Error('Reviewed prerequisite deployment failed; preserve backup and inspect migration state');}
      if(!fs.existsSync(path.join(directory,'journal.json')))await assertMigrationOnly(db,JSON.parse(fs.readFileSync(path.join(directory,'pre-migration-baseline.json'),'utf8')));
    }
    const {loadServerTypescript}=await import('../../tests/helpers/load-typescript.mjs');hook=loadServerTypescript();
    const importer=await import('./import.mjs');const options={db,directory,target,baseURL};
    if(command==='apply')console.log(JSON.stringify(await importer.importFixtures(options)));
    if(command!=='report')console.log(JSON.stringify(await importer.verifyCredentials(options)));
    console.log(JSON.stringify(await (await import('./report.mjs')).fixtureReport(options)));
  }
}finally{if(hook){const {prisma}=await import('../../src/lib/prisma.ts');await prisma.$disconnect();hook.deregister();}await db.end();}
