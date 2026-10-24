import fs from 'node:fs';
import path from 'node:path';
import mariadb from 'mariadb';
import { createHash } from 'node:crypto';
import { snapshot, digest, identifier } from '../demo/database.mjs';
export { snapshot, digest };
export const writeJson=(file,value)=>{const temporary=file+'.tmp';fs.writeFileSync(temporary,JSON.stringify(value,null,2)+'\n',{mode:0o600});fs.renameSync(temporary,file);};
export async function connectTarget(raw,{test=false}={}) {
  const u=new URL(raw);
  const name=decodeURIComponent(u.pathname.slice(1));
  const isolated=/^elb_b3_test_[a-f0-9]{32}$/.test(name)&&process.env.ELB_B3_TEST_DATABASE===name;
  if(u.protocol!=='mysql:' || !['127.0.0.1','localhost','[::1]'].includes(u.hostname) || (test?!isolated:name!=='e_lingkod_bayan'))throw Error('Explicit local hackathon target guard refused connection');
  return mariadb.createConnection({host:u.hostname,port:Number(u.port||3306),user:decodeURIComponent(u.username),password:decodeURIComponent(u.password),database:name,dateStrings:true,timezone:'+00:00',bigIntAsNumber:true});
}
export async function readTarget(db){const [row]=await db.query('SELECT DATABASE() databaseName,@@hostname hostName,@@port portNumber');return {...row};}
export async function assertPreserved(db,baseline) {
  const current=await snapshot(db);
  for(const [table,rows] of Object.entries(baseline)){
    if(table==='_prisma_migrations')continue;
    const actual=new Set(current[table]||[]);
    for(const row of rows)if(!actual.has(row))throw Error('Pre-existing record changed: '+table+'; stop and preserve recovery backup');
  }
}
export async function assertOriginalFields(db,baseline){
  const current=await snapshot(db);
  for(const [table,rows] of Object.entries(baseline)){
    if(table==='_prisma_migrations')continue;
    const actual=(current[table]||[]).map(JSON.parse);
    for(const serialized of rows){const old=JSON.parse(serialized);if(!actual.some(row=>Object.keys(old).every(key=>JSON.stringify(row[key])===JSON.stringify(old[key]))))throw Error('Migration changed a pre-existing field in '+table);}
  }
}
export async function assertMigrationOnly(db,baseline){
  await assertOriginalFields(db,baseline);
  const current=await snapshot(db);
  const defaults={community_import_batch:{reviewNeededCount:0,skippedCount:0,sourceKey:null,surveyYear:null},community_import_record:{contentHash:null,outcome:'ACCEPTED',outcomeReason:null,sourceKey:null,surveyYear:null},spes_import_batch:{surveyYear:null},spes_survey_record:{originalRowNumber:null}};
  for(const [table,rows] of Object.entries(current)){
    if(table==='_prisma_migrations')continue;
    if(!baseline[table]){if(rows.length)throw Error('Manual records in newly migrated table '+table+'; preserved, import blocked');continue;}
    if(rows.length!==baseline[table].length)throw Error('Rows changed during prerequisite preparation: '+table);
    const old=baseline[table].map(JSON.parse);
    for(const serialized of rows){const row=JSON.parse(serialized),original=old.find(r=>Object.keys(r).every(k=>JSON.stringify(row[k])===JSON.stringify(r[k])));if(!original)throw Error('Pre-existing row changed');for(const key of Object.keys(row).filter(k=>!Object.hasOwn(original,k)))if(!Object.hasOwn(defaults[table]||{},key)||JSON.stringify(row[key])!==JSON.stringify(defaults[table][key]))throw Error('Manual or unexpected new-column value: '+table+'.'+key);}
  }
}
// Full private recovery backup, not the sanitized demo export. It intentionally
// stays outside Git and includes credentials/PII; no values are logged.
export async function backupDatabase(db,directory){
  fs.mkdirSync(directory,{recursive:true});
  const file=path.join(directory,'pre-import.sql');
  if(fs.existsSync(file))throw Error('Recovery backup already exists; refusing replacement');
  await db.query('SET TRANSACTION ISOLATION LEVEL REPEATABLE READ');
  await db.query('START TRANSACTION WITH CONSISTENT SNAPSHOT, READ ONLY');
  try{
    const inventory=[],statements=["SET NAMES utf8mb4","SET time_zone = '+00:00'","SET FOREIGN_KEY_CHECKS = 0"];
    for(const row of await db.query('SHOW FULL TABLES')){
      if(Object.values(row)[1]!=='BASE TABLE')throw Error('Unsupported view in backup; use a reviewed native backup');
      const table=Object.values(row)[0],name=identifier(table);
      const [ddl]=await db.query('SHOW CREATE TABLE '+name);statements.push(ddl['Create Table']);
      const rows=await db.query('SELECT * FROM '+name);inventory.push({table,rows:rows.length});
      for(const record of rows){const columns=Object.keys(record);statements.push('INSERT INTO '+name+' ('+columns.map(identifier).join(',')+') VALUES ('+columns.map(key=>record[key]===null?'NULL':Buffer.isBuffer(record[key])?"X'"+record[key].toString('hex')+"'":db.escape(record[key])).join(',')+')');}
    }
    if((await db.query('SHOW TRIGGERS')).length)throw Error('Triggers require a reviewed native recovery backup');
    const sql=statements.concat('SET FOREIGN_KEY_CHECKS = 1').join(';\n-- ELB-PRIVATE-BACKUP-STATEMENT\n')+';\n';
    fs.writeFileSync(file,sql,{mode:0o600});
    const manifest={createdAt:new Date().toISOString(),target:await readTarget(db),sha256:createHash('sha256').update(sql).digest('hex'),inventory};
    writeJson(path.join(directory,'backup-manifest.json'),manifest);
    writeJson(path.join(directory,'pre-migration-baseline.json'),await snapshot(db));
    return manifest;
  }finally{await db.query('ROLLBACK');}
}
