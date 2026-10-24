import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
const read=p=>fs.readFileSync(p,'utf8');
class TestCivicError extends Error{constructor(message,status=400){super(message);this.status=status;}}
const src=read('src/features/jobs/domain.ts');
const js=ts.transpileModule(src,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;
const domainModule={exports:{}};
vm.runInNewContext(`(function(require,module,exports){${js}\n})`,{URL}) (name=>{
 if(name==='@/features/civic/validation')return {CivicError:TestCivicError};
 throw Error(name);
},domainModule,domainModule.exports);
const {previewSpesCsv,parseSpesCsv}=domainModule.exports;
const head='consent,barangay,education,skills,interests,availability\n';
const valid='YES,Demo A,COLLEGE,Data entry,Office & admin,FULL_TIME\n';
test('preview validates rows without saving and pinpoints invalid consent',()=>{
 const result=previewSpesCsv(head+valid+'NO,Demo A,COLLEGE,Data entry,Office & admin,FULL_TIME\n');
 assert.equal(result.totalRows,2);assert.equal(result.records.length,1);assert.equal(result.errors.length,1);
 assert.equal(result.errors[0].row,3);assert.match(result.errors[0].message,/consent/);
});
test('preview rejects PII columns and malformed CSV',()=>{
 assert.throws(()=>previewSpesCsv('name,'+head+valid),TestCivicError);
 assert.throws(()=>previewSpesCsv(head+'YES,"unclosed'),TestCivicError);
});
test('strict final parser rejects every invalid CSV, unlike preview',()=>{
 assert.throws(()=>parseSpesCsv(head+valid+'NO,Demo A,COLLEGE,Data entry,Office & admin,FULL_TIME\n'),TestCivicError);
});
test('preview and confirm are separate protected routes',()=>{
 const prev=read('src/app/api/admin/jobs/import/preview/route.ts');
 const confirm=read('src/app/api/admin/jobs/import/route.ts');
 for(const code of [prev,confirm]){assert.match(code,/requireApiViewer\(request,"CENSUS"\)/);assert.match(code,/assertSameOrigin\(request\)/);}
 for(const code of [prev,confirm]){assert.match(code,/assertSpesImportScope\(viewer,/);assert.match(code,/assertSpesReplayScope\(viewer,/);}
 assert.match(prev,/previewSpesCsv/);assert.match(confirm,/parseSpesCsv/);
 assert.match(confirm,/form\.get\("previewHash"\)/);assert.match(confirm,/findDuplicateSpesBatch/);
 assert.match(confirm,/spesImportBatch\.create/);assert.match(confirm,/createMany/);
});
test('fingerprints prevent repeated files and include historical batches',()=>{
 const backend=read('src/features/jobs/server/spes-import.ts');
 assert.match(backend,/createHash\("sha256"\)/);
 assert.match(backend,/\.sort\(\)/);
 assert.match(backend,/fingerprint:null/);
 assert.match(backend,/spesImportBatch\.findUnique/);
 assert.match(backend,/fingerprint/);
});
test('admin archive is reversible, uses audit trail and never deletes survey rows',()=>{
 const route=read('src/app/api/admin/jobs/import/[id]/route.ts');
 assert.match(route,/viewer\.role!=="ADMIN"/);
 assert.match(route,/"ARCHIVE"/);assert.match(route,/"RESTORE"/);
 assert.match(route,/spesImportEvent\.create/);
 assert.doesNotMatch(route,/\.delete\(|\.deleteMany\(/);
});
test('V10.4A migration is additive, preserves old survey data and explicitly labelled demos',()=>{
 const schema=read('prisma/schema.prisma');const sql=read('prisma/migrations/20261021040000_spes_import_review/migration.sql');
 for(const field of ['datasetKind','fingerprint','voidedAt'])assert.match(schema,new RegExp(field));
 assert.match(sql,/LIKE '%fictional%'/);assert.match(sql,/CREATE UNIQUE INDEX/);
 assert.doesNotMatch(sql,/DROP TABLE|TRUNCATE TABLE|DELETE FROM/i);
});
test('UI uses 3-stage confirmation and keeps DEMO and REAL insights separate',()=>{
 const importer=read('src/features/jobs/components/spes-import-workspace.tsx');
 const chart=read('src/features/jobs/components/spes-insights.tsx');
 assert.match(importer,/Preview & validate/);assert.match(importer,/Confirm & import/);
 assert.match(importer,/preview\.duplicate/);assert.match(importer,/Batch archived/);
 assert.match(chart,/insights\.DEMO\.total/);assert.match(chart,/Legacy \/ unclassified/);
});

test('fingerprints are stable even when rows are reordered, and catch identical legacy imports',async()=>{
 const {createHash}=await import('node:crypto');
 const backend=read('src/features/jobs/server/spes-import.ts');
 const transpiled=ts.transpileModule(backend,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;
 const initial=previewSpesCsv(head+valid+'YES,Demo B,SENIOR_HIGH,Microsoft Word,Technology,PART_TIME\n').records;
 const legacy={id:'oldBatch',sourceLabel:'Fictional 60',recordCount:initial.length,status:'ACTIVE',createdAt:new Date('2026-10-21'),records:initial.map(r=>({barangay:r.barangay,education:r.education,availability:r.availability,skillsJson:JSON.stringify(r.skills),interestsJson:JSON.stringify(r.interests)}))};
 const mock={spesImportBatch:{findUnique:async()=>null,findMany:async()=>[legacy]}};
 const mod={exports:{}};
 vm.runInNewContext(`(function(require,module,exports){${transpiled}\n})`,{File,FormData})((name)=>{
   if(name==='node:crypto')return {createHash};
   if(name==='@/lib/prisma')return {prisma:mock};
   if(name==='@/features/census/server/data')return {recordScope:()=>{throw Error('Fingerprint calculation must not read authority');},assertBarangay:()=>{throw Error('Fingerprint calculation must not require scope');}};
   if(name==='@/features/civic/validation')return {CivicError:TestCivicError};
   if(name==='server-only')return {};
   throw Error(name);
 },mod,mod.exports);
 const fp=mod.exports.spesFingerprint(initial);
 assert.equal(fp,mod.exports.spesFingerprint([...initial].reverse()));
 assert.notEqual(fp,mod.exports.spesFingerprint(initial.slice(0,1)));
 const same=await mod.exports.findDuplicateSpesBatch(fp);
 assert.equal(same.id,'oldBatch');
});
