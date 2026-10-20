import {test} from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import ts from "typescript";
const source=fs.readFileSync("src/features/jobs/domain.ts","utf8");
const compiled=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;
const output={exports:{}};
class TestCivicError extends Error {constructor(message,status=400){super(message);this.status=status;}}
vm.runInNewContext(`(function(require,module,exports){${compiled}\n})`,{URL}) ((name)=>{
  if(name==="@/features/civic/validation") return {CivicError:TestCivicError};
  throw new Error(`Unexpected import: ${name}`);
},output,output.exports);
const {SKILLS,INTERESTS,parseJob,parseProfile,parseSpesCsv,scoreMatch}=output.exports;
const job={title:"Office Assistant",employer:"Example Employer",sector:"Office & admin",workType:"FULL_TIME",barangay:"Poblacion",location:"Town Center",description:"Support data entry and office documentation tasks for the local team.",skills:["Data entry","Microsoft Excel"],interests:["Office & admin"],education:"SENIOR_HIGH",contactInfo:"Apply through the verified employer's public recruitment desk.",externalUrl:"https://example.org/jobs",expiresAt:""};
test("job listing validation protects outgoing URLs and structured skills",()=>{
 const parsed=parseJob(job);
 assert.equal(parsed.title,"Office Assistant");
 assert.equal(parsed.skills.length,2);
 assert.throws(()=>parseJob({...job,externalUrl:"javascript:alert(1)"}),TestCivicError);
 assert.throws(()=>parseJob({...job,skills:["Secret qualification"]}),TestCivicError);
 assert.throws(()=>parseJob({...job,title:"x"}),TestCivicError);
});
test("jobseeker profile is optional and whitelists skill taxonomy",()=>{
 const profile=parseProfile({skills:["Data entry"],interests:["Office & admin"],education:"COLLEGE",preferredArea:"Poblacion",availability:"ANY"});
 assert.equal(profile.skills[0],"Data entry");
 assert.throws(()=>parseProfile({skills:[],interests:[],education:"COLLEGE",preferredArea:"",availability:"ANY"}),TestCivicError);
});
test("matching score is deterministic and explains overlaps instead of eligibility",()=>{
 const p=parseProfile({skills:["Data entry","Microsoft Excel"],interests:["Office & admin"],education:"COLLEGE",preferredArea:"Poblacion",availability:"ANY"});
 const r=scoreMatch(p,{skills:["Data entry","Customer service"],interests:["Office & admin"],workType:"FULL_TIME",barangay:"Poblacion",education:"ANY"});
 assert.equal(r.score,70);
 assert.equal(r.matchedSkills[0],"Data entry");
 assert.equal(r.missingSkills[0],"Customer service");
 assert.equal(r.locationFit,true);
});
test("SPES parser accepts RFC-style quoted CSV and pipe lists",()=>{
 const csv='consent,barangay,education,skills,interests,availability\nYES,"Barangay, North",SENIOR_HIGH,"Data entry|Microsoft Excel",Office & admin,PART_TIME\n';
 const result=parseSpesCsv(csv);assert.equal(result.length,1);
 assert.equal(result[0].barangay,"Barangay, North");
 assert.equal(result[0].skills.length,2);
});
test("SPES import rejects missing consent, PII columns, malformed rows",()=>{
 const header='consent,barangay,education,skills,interests,availability\n';
 assert.throws(()=>parseSpesCsv(header+'NO,Poblacion,COLLEGE,Data entry,Office & admin,FULL_TIME'),TestCivicError);
 assert.throws(()=>parseSpesCsv('name,'+header+'YES,Poblacion,COLLEGE,Data entry,Office & admin,FULL_TIME'),TestCivicError);
 assert.throws(()=>parseSpesCsv(header+'YES,Poblacion,COLLEGE,Unknown skill,Office & admin,FULL_TIME'),TestCivicError);
 assert.throws(()=>parseSpesCsv(header+'YES,Poblacion,COLLEGE,"unclosed'),TestCivicError);
});
test("V10 APIs keep roles and privacy on the server",()=>{
 const api=fs.readFileSync("src/app/api/admin/jobs/route.ts","utf8");
 const imp=fs.readFileSync("src/app/api/admin/jobs/import/route.ts","utf8");
 const prof=fs.readFileSync("src/app/api/jobs/profile/route.ts","utf8");
 const source=fs.readFileSync("src/features/jobs/server/data.ts","utf8");
 assert.match(api,/requireApiViewer\(request,"JOBS"\)/);
 assert.match(imp,/parseSpesCsv/);
 assert.match(prof,/viewer\.role!=="CITIZEN"/);
 assert.match(prof,/userId:viewer\.id/);
 assert.match(source,/status:"PUBLISHED"/);
 assert.match(source,/expiresAt/);
});
test("V10 schema and migration preserve other modules and create independent tables",()=>{
 const schema=fs.readFileSync("prisma/schema.prisma","utf8");
 const sql=fs.readFileSync("prisma/migrations/20261021020000_job_matching/migration.sql","utf8");
 for(const name of ["JobOpportunity","JobseekerProfile","SpesImportBatch","SpesSurveyRecord","JobActivity"])assert.match(schema,new RegExp(`model ${name}`));
 assert.match(schema,/model CivicReport/);
 assert.doesNotMatch(sql,/DROP TABLE|TRUNCATE TABLE|DELETE FROM/i);
});
