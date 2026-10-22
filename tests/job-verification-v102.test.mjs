import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

function compiledModule(path) {
  const src=fs.readFileSync(path,'utf8');
  const js=ts.transpileModule(src,{fileName:path,compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;
  const out={exports:{}};
  class CivicError extends Error {constructor(msg,status=400){super(msg);this.status=status;}}
  vm.runInNewContext(`(function(require,module,exports){${js}\n})`,{URL}) ((id)=>{
    if(id==='@/features/civic/validation')return {CivicError};
    throw Error(`Unexpected module ${id}`);
  },out,out.exports);
  return out.exports;
}
const workflow=compiledModule('src/features/jobs/review-workflow.ts');
const {validateJobTransition,parseReviewDetails}=workflow;
const read=(p)=>fs.readFileSync(p,'utf8');
test('staff cannot approve/return pending employer vacancy',()=>{
  assert.throws(()=>validateJobTransition('APPROVE','PENDING_REVIEW',false),/Only the Super Admin/);
  assert.throws(()=>validateJobTransition('RETURN','PENDING_REVIEW',false),/Only the Super Admin/);
  assert.doesNotThrow(()=>validateJobTransition('APPROVE','PENDING_REVIEW',true));
});
test('draft -> pending -> published workflow; no publishing from draft',()=>{
  assert.doesNotThrow(()=>validateJobTransition('SUBMIT_REVIEW','DRAFT',false));
  assert.throws(()=>validateJobTransition('APPROVE','DRAFT',true));
  assert.throws(()=>validateJobTransition('SUBMIT_REVIEW','PUBLISHED',false));
  assert.doesNotThrow(()=>validateJobTransition('RETURN','PENDING_REVIEW',true));
  assert.doesNotThrow(()=>validateJobTransition('SUBMIT_REVIEW','RETURNED',false));
});
test('review requires both employer and vacancy verified',()=>{
  assert.throws(()=>parseReviewDetails({employerVerified:true,vacancyVerified:false},'APPROVE'),/Confirm both/);
  assert.throws(()=>parseReviewDetails({employerVerified:'true',vacancyVerified:true},'APPROVE'),/Confirm both/);
  assert.equal(parseReviewDetails({employerVerified:true,vacancyVerified:true},'APPROVE').employerVerified,true);
});
test('return requires meaningful reviewer remarks',()=>{
  assert.throws(()=>parseReviewDetails({note:'No'},'RETURN'),/20/);
  assert.equal(parseReviewDetails({note:'Please confirm vacancy details with HR.'},'RETURN').note,'Please confirm vacancy details with HR.');
});
test('closed or filled vacancies cannot be republished directly',()=>{
  assert.doesNotThrow(()=>validateJobTransition('CLOSE','PUBLISHED',false));
  assert.doesNotThrow(()=>validateJobTransition('FILL','PUBLISHED',false));
  assert.throws(()=>validateJobTransition('SUBMIT_REVIEW','FILLED',false));
  assert.throws(()=>validateJobTransition('APPROVE','CLOSED',true));
});
test('legacy direct PUBLISH mutation removed, identity and CAS checks remain server-side',()=>{
  const src=read('src/app/api/admin/jobs/[id]/route.ts');
  assert.match(src,/requireApiViewer\(request,"JOBS"\)/);
  assert.match(src,/validateJobTransition\(jobAction,job.status as JobStatus,viewer.role==="ADMIN"\)/);
  assert.match(src,/version:job.version,status:job.status/);
  assert.doesNotMatch(src,/"PUBLISH"/);
});
test('employer verification source private to PESO; citizen only sees published jobs',()=>{
  const data=read('src/features/jobs/server/data.ts');
  assert.match(data,/where:\{status:"PUBLISHED"/);
  assert.doesNotMatch(data.slice(0,data.indexOf('export async function adminJobData')),/reviewSource/);
  const api=read('src/app/api/admin/jobs/route.ts');
  assert.match(api,/reviewSource:value.reviewSource/);
});
test('additive schema and migration preserve civic reports and legacy published listings',()=>{
  const schema=read('prisma/schema.prisma');
  const sql=read('prisma/migrations/20261021030000_job_vacancy_verification/migration.sql');
  for(const stat of ['PENDING_REVIEW','RETURNED','CLOSED','FILLED']) assert.match(schema,new RegExp(stat));
  assert.match(schema,/employerVerified Boolean/);
  assert.match(sql,/ADD COLUMN `reviewSource`/);
  assert.doesNotMatch(sql,/DROP TABLE|TRUNCATE|DELETE FROM/i);
});
test('two exact reported TypeScript errors corrected in civic code',()=>{
  const one=read('src/features/civic/citizen-feedback-validation.ts');
  const two=read('src/features/civic/server/mutations.ts');
  assert.match(one,/validatedDecision: CitizenFeedbackDecision = decision/);
  assert.match(two,/const claimOffice = viewer.department\?\.trim\(\)/);
  assert.match(two,/assignedOffice: claimOffice, assignedStaffId: null/);
});
test('review UI exists for Super Admin only with public/private action distinction',()=>{
  const list=read('src/features/jobs/components/job-console.tsx');
  assert.match(list,/isSuperAdmin&&<VacancyReview/);
  assert.match(list,/Approve & publish/);
  assert.match(list,/Return for correction/);
  assert.match(list,/Submit for verification/);
});
