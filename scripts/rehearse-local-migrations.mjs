import fs from 'node:fs';
import path from 'node:path';
import {randomUUID,createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import mariadb from 'mariadb';
import dotenv from 'dotenv';
import {mysqlRsaOptions} from './lib/mysql-connection.mjs';
import {backupDatabase,digest,writeJson} from './hackathon/storage.mjs';
import {privateSnapshot,privateSchema,assertPrivateOriginalFields} from './lib/private-database-snapshot.mjs';

const option=name=>process.argv.find(a=>a.startsWith('--'+name+'='))?.slice(name.length+3);
const configFile=option('config'),directory=option('state-dir'),expected=option('expect-database');
if(!configFile||!directory||!['e_lingkod_bayan','e_lingkod_bayan_demo'].includes(expected))throw Error('Supply --config, private --state-dir and exact --expect-database. This tool only rehearses; it never deploys to the source.');
const root=process.cwd(),privateRoot=path.resolve(directory),relative=path.relative(root,privateRoot);
if(!path.isAbsolute(directory)||(!relative.startsWith('..'+path.sep)&&relative!=='..'&&!path.isAbsolute(relative)))throw Error('Recovery directory must be absolute and outside the repository.');
const settings=dotenv.parse(fs.readFileSync(configFile)),url=new URL(settings.DATABASE_URL||'mysql://invalid/invalid');
if(url.protocol!=='mysql:'||!['127.0.0.1','localhost','[::1]'].includes(url.hostname)||url.pathname!=='/'+expected||url.search||url.hash)throw Error('Explicit loopback database target mismatch.');
const common={host:url.hostname,port:Number(url.port||3306),user:decodeURIComponent(url.username),password:decodeURIComponent(url.password),...mysqlRsaOptions(settings),dateStrings:true,timezone:'+00:00',bigIntAsNumber:false};
const canonical=b=>b.toString('utf8').replace(/\r\n/g,'\n'),hash=s=>createHash('sha256').update(s).digest('hex');
const reviewed=JSON.parse(fs.readFileSync('prisma/migrations/review-manifest.json','utf8'));
const names=fs.readdirSync('prisma/migrations').filter(n=>fs.existsSync(path.join('prisma/migrations',n,'migration.sql'))).sort();
if(names.length!==reviewed.migrations.length||names.some(n=>reviewed.migrations.find(m=>m.name===n)?.sha256LF!==hash(canonical(fs.readFileSync(path.join('prisma/migrations',n,'migration.sql'))))))throw Error('Migration source differs from the reviewed release manifest.');
fs.mkdirSync(privateRoot,{recursive:true});const proofFile=path.join(privateRoot,'migration-rehearsal.json');
if(fs.existsSync(proofFile))throw Error('A rehearsal already exists here. Retain/review it; choose a new private directory only for a deliberately new rehearsal.');
const source=await mariadb.createConnection({...common,database:expected});let server,clone,cloneCreated=false;
try{
 const [rawTarget]=await source.query('SELECT DATABASE() databaseName,@@port portNumber,@@hostname hostName');
 const target={...rawTarget,portNumber:Number(rawTarget.portNumber)};
 const history=await source.query('SELECT migration_name,checksum,finished_at,rolled_back_at FROM _prisma_migrations');
 if(history.some(m=>!m.finished_at&&!m.rolled_back_at))throw Error('Unfinished source migration requires investigation. No DDL was attempted.');
 for(const applied of history.filter(m=>m.finished_at&&!m.rolled_back_at)){if(!names.includes(applied.migration_name))throw Error('Source migration history is newer or unknown.');const text=canonical(fs.readFileSync(path.join('prisma/migrations',applied.migration_name,'migration.sql')));if(![hash(text),hash(text.replace(/\n/g,'\r\n'))].includes(applied.checksum))throw Error('Recorded migration checksum differs from reviewed source.');}
 const pending=names.filter(n=>!history.some(m=>m.migration_name===n&&m.finished_at&&!m.rolled_back_at));
 const [extras]=await source.query('SELECT (SELECT COUNT(*) FROM information_schema.ROUTINES WHERE ROUTINE_SCHEMA=?)+(SELECT COUNT(*) FROM information_schema.EVENTS WHERE EVENT_SCHEMA=?)+(SELECT COUNT(*) FROM information_schema.KEY_COLUMN_USAGE WHERE TABLE_SCHEMA=? AND REFERENCED_TABLE_SCHEMA IS NOT NULL AND REFERENCED_TABLE_SCHEMA<>?) AS n',[expected,expected,expected,expected]);
 if(Number(extras.n))throw Error('Routines, events or cross-database references require a separately reviewed native recovery procedure.');
 const backup=await backupDatabase(source,privateRoot,{readSnapshot:privateSnapshot}),before=JSON.parse(fs.readFileSync(path.join(privateRoot,'pre-migration-baseline.json'),'utf8')),schemaBefore=await privateSchema(source);
 const raw=fs.readFileSync(path.join(privateRoot,'pre-import.sql'),'utf8');if(hash(raw)!==backup.sha256)throw Error('Private backup checksum mismatch.');
 clone='elb_b3_test_'+randomUUID().replaceAll('-','');server=await mariadb.createConnection(common);
 writeJson(path.join(privateRoot,'owned-clone.json'),{target,clone,operation:'create-intent',created:false,createdAt:new Date().toISOString()});
 await server.query('CREATE DATABASE `'+clone+'` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci');cloneCreated=true;await server.query('USE `'+clone+'`');
 writeJson(path.join(privateRoot,'owned-clone.json'),{target,clone,operation:'restore-and-rehearse',created:true,createdAt:new Date().toISOString()});
 for(const statement of raw.split(';\n-- ELB-PRIVATE-BACKUP-STATEMENT\n'))if(statement.trim())await server.query(statement);
 if(digest(await privateSnapshot(server))!==digest(before))throw Error('Restored private rows/fields differ from backup.');
 if(digest(await privateSchema(server))!==digest(schemaBefore))throw Error('Restored table definitions differ from the source.');
 const cloneURL=new URL(url);cloneURL.pathname='/'+clone;const fd=fs.openSync(path.join(privateRoot,'migration-private.log'),'w');let result;
 try{result=spawnSync(process.execPath,['node_modules/prisma/build/index.js','migrate','deploy'],{cwd:root,env:{...process.env,DATABASE_URL:cloneURL.href,MYSQL_RSA_PUBLIC_KEY_PATH:settings.MYSQL_RSA_PUBLIC_KEY_PATH||''},windowsHide:true,stdio:['ignore',fd,fd]});}finally{fs.closeSync(fd);}
 if(result.status!==0)throw Error('Disposable migration failed; preserve private diagnostics. Source database unchanged.');
 await assertPrivateOriginalFields(server,before);
 const applied=await server.query('SELECT migration_name FROM _prisma_migrations WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL');if(applied.length!==names.length)throw Error('Disposable history is incomplete.');
 if(digest(await privateSnapshot(source))!==digest(before))throw Error('Source changed during rehearsal; stop its writers and repeat deliberately with a fresh backup.');
 const proof={at:new Date().toISOString(),target,backupSha256:backup.sha256,restorationRowsAndFieldsVerified:true,restorationTableDefinitionsVerified:true,includesPrivateAuthenticationFields:true,originalFieldsPreserved:true,reviewedPendingMigrations:pending.map(name=>({name,sha256LF:reviewed.migrations.find(m=>m.name===name).sha256LF})),allMigrations:names.length,sourceDatabaseModified:false,clone,cloneRemoved:false};writeJson(proofFile,proof);console.log(JSON.stringify({restorationVerified:true,preserved:true,pendingRehearsed:pending.length,allMigrations:names.length,sourceDatabaseModified:false}));
}finally{if(server){if(cloneCreated&&/^elb_b3_test_[a-f0-9]{32}$/.test(clone)){await server.query('USE information_schema');await server.query('DROP DATABASE `'+clone+'`');if(fs.existsSync(proofFile)){const proof=JSON.parse(fs.readFileSync(proofFile,'utf8'));proof.cloneRemoved=true;writeJson(proofFile,proof);}}await server.end();}await source.end();}
