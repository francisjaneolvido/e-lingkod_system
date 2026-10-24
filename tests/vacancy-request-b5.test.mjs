import test from 'node:test';
import assert from 'node:assert/strict';
import {loadServerTypescript} from './helpers/load-typescript.mjs';
test('Vacancy transport distinguishes definite validation rejection from ambiguous outcomes',async()=>{
 const hook=loadServerTypescript(),original=globalThis.fetch;
 try{
  const {sendPreparedVacancy,VacancyRequestError}=await import('../src/features/jobs/components/vacancy-request.ts');
  const request={signature:'original',path:'/api/admin/jobs',method:'POST',body:{requestKey:'original-operation'},resultVersion:1};
  for(const [status,body,definitive]of [[400,{error:'Invalid pay range.'},true],[422,{error:'Invalid category.'},true],[409,{error:'Conflict.'},false],[403,{error:'Authority changed.'},false],[500,{error:'Unknown outcome.'},false],[200,null,false],[200,{},false]]){
   globalThis.fetch=async()=>new Response(JSON.stringify(body),{status});
   await assert.rejects(sendPreparedVacancy(request),e=>e instanceof VacancyRequestError&&e.definitiveRejection===definitive);
  }
  globalThis.fetch=async()=>new Response('not JSON',{status:400});await assert.rejects(sendPreparedVacancy(request),e=>e.definitiveRejection===false);
  globalThis.fetch=async()=>{throw Error('Response connection lost');};await assert.rejects(sendPreparedVacancy(request),/connection lost/);
  globalThis.fetch=async(path,options)=>{assert.equal(path,request.path);assert.deepEqual(JSON.parse(options.body),request.body);return new Response(JSON.stringify({id:'owned-vacancy',status:'DRAFT'}));};
  assert.deepEqual(await sendPreparedVacancy(request),{id:'owned-vacancy',status:'DRAFT',version:1});
 }finally{globalThis.fetch=original;hook.deregister();}
});
