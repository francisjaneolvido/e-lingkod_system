import test from 'node:test';
import assert from 'node:assert/strict';
import {loadServerTypescript} from './helpers/load-typescript.mjs';
const hook=loadServerTypescript();
const {PAY_BASES,parsePay,parseOpportunityFilters,filterOpportunities,rankOpportunities,readiness,demandSkills}=await import('../src/features/jobs/opportunities-domain.ts');
test.after(()=>hook.deregister());
const now=new Date('2026-10-24T04:00:00Z');
const job={id:'a',title:'Welder',occupationCategory:'Skilled trades',skills:['Welding'],certifications:['TESDA NC II'],education:'HIGH_SCHOOL',experienceLevel:'NONE_REQUIRED',workType:'FULL_TIME',workArrangement:'ON_SITE',barangay:'Bambang',location:'Los Baños',sector:'PRIVATE',publishedAt:'2026-10-23T00:00:00Z',expiresAt:null,status:'PUBLISHED',isDemo:false,payMin:'500.00',payMax:'700.00',payCurrency:'PHP',payBasis:'DAY',negotiable:false};
test('B5 pay keeps missing values null and validates exact money/range/unit without fabricated compensation',()=>{
 assert.deepEqual(parsePay({}),{payMin:null,payMax:null,payCurrency:null,payBasis:null,negotiable:false});
 assert.equal(parsePay({payMin:'50.20',payMax:'70.00',payCurrency:'PHP',payBasis:'HOUR',negotiable:true}).payMin,'50.20');
 for(const p of [{payMin:-1},{payMin:'1e3'},{payMin:'1.005'},{payMin:'10',payMax:'9',payCurrency:'PHP',payBasis:'DAY'},{payMin:'1',payMax:'2'},{negotiable:'true'},{payMin:'1',payMax:'2',payCurrency:'XYZ',payBasis:'WEEK'}])assert.throws(()=>parsePay(p));
 assert.throws(()=>parsePay({},true),/pay/i);
 for(const basis of PAY_BASES)assert.equal(parsePay({payMin:'1.00',payMax:'2.00',payCurrency:'PHP',payBasis:basis}).payBasis,basis);
});
test('B5 all server filters are explicit, strict and compare compensation only in selected currency and pay basis',()=>{
 const all={q:'welder',location:'Los Baños',barangay:'Bambang',occupation:'Skilled trades',skill:'Welding',type:'FULL_TIME',arrangement:'ON_SITE',education:'HIGH_SCHOOL',experience:'NONE_REQUIRED',currency:'PHP',basis:'DAY',minPay:'550',maxPay:'800',negotiable:'false',sector:'PRIVATE',posted:'7',certification:'TESDA NC II'};
 const f=parseOpportunityFilters(all);assert.equal(filterOpportunities([job],f,now).length,1);
 for(const [key,value] of Object.entries({location:'Manila',barangay:'Maahas',occupation:'IT',skill:'Baking',type:'PART_TIME',arrangement:'REMOTE',education:'COLLEGE',experience:'EXPERIENCED',currency:'USD',basis:'MONTH',minPay:'701',maxPay:'499',negotiable:'true',sector:'GOVERNMENT',certification:'Professional License'})){
  const candidate={...all,[key]:value};if(key==='minPay')candidate.maxPay='1000';if(key==='maxPay')candidate.minPay='1';assert.equal(filterOpportunities([job],parseOpportunityFilters(candidate),now).length,0,key);
 }
 assert.equal(filterOpportunities([{...job,publishedAt:'2026-09-01T00:00:00Z'}],f,now).length,0);
 for(const x of [{minPay:'500'},{basis:'DAY'},{unknown:'x'},{negotiable:'yes'},{posted:'3'},{minPay:'x',currency:'PHP',basis:'HOUR'}])assert.throws(()=>parseOpportunityFilters(x));
 assert.throws(()=>parseOpportunityFilters(new URLSearchParams('skill=Welding&skill=Baking')));
 assert.throws(()=>parseOpportunityFilters(new URLSearchParams('skill=&skill=Welding')));
 assert.equal(filterOpportunities([{...job,publishedAt:null}],parseOpportunityFilters({}),now).length,1);
 const missing={...job,payMin:null,payMax:null,payCurrency:null,payBasis:null};assert.equal(filterOpportunities([missing],parseOpportunityFilters({}),now).length,1);assert.equal(filterOpportunities([missing],f,now).length,0);assert.equal(filterOpportunities([missing],parseOpportunityFilters({negotiable:'false'}),now).length,0);
 for(const basis of PAY_BASES)for(const selected of PAY_BASES)assert.equal(filterOpportunities([{...job,payBasis:basis}],parseOpportunityFilters({currency:'PHP',basis:selected,minPay:'600'}),now).length,basis===selected?1:0);
 for(const posted of ['1','7','30'])assert.equal(filterOpportunities([job],parseOpportunityFilters({posted}),now).length,posted==='1'?0:1);
});
const profile={skills:['Welding'],qualifications:['TESDA NC II'],education:'COLLEGE',preferredOccupations:['Welder'],occupation:'Welder',preferredArea:'Bambang',workType:'FULL_TIME',workArrangement:'ON_SITE',experienceLevel:'EXPERIENCED',trainingInterest:false,trainingPrograms:[],employmentBarriers:['Transport']};
test('B5 deterministic top-five uses positive evidence and known requirements, excluding unavailable and expired jobs',()=>{
 const jobs=Array.from({length:9},(_,i)=>({...job,id:String(i),publishedAt:'2026-10-23T00:00:00Z'}));
 assert.deepEqual(rankOpportunities(jobs,profile,now).map(r=>r.job.id),['0','1','2','3','4']);
 assert.equal(rankOpportunities([{...job,status:'CLOSED'},{...job,expiresAt:now.toISOString()}],profile,now).length,0);
 assert.equal(rankOpportunities([{...job,certifications:['Professional License']}],profile,now).length,0);
 assert.equal(rankOpportunities([{...job,experienceLevel:'EXPERIENCED'}],{...profile,experienceLevel:null},now).length,0);
 assert.equal(rankOpportunities([job],{...profile,education:null},now).length,0);
 assert.equal(rankOpportunities([{...job,skills:['Baking'],title:'Baker',occupationCategory:'Food',certifications:[]}],{...profile,preferredOccupations:[],occupation:''},now).length,0);
 assert.ok(rankOpportunities([job],profile,now)[0].reasons.some(r=>/Welding/.test(r)));
});
test('B5 readiness percentages and gaps are grounded in recorded data, not a guarantee or inferred credentials',()=>{
 const r=readiness(profile,[{...job,certifications:['Professional License'],skills:['Welding','Driving']}]);
 assert.equal(r.completion,100);assert.ok(r.gaps[0].missing.some(s=>/Professional License/.test(s)));assert.ok(r.gaps[0].missing.some(s=>/Driving/.test(s)));assert.deepEqual(r.barriers,['Transport']);
 const empty=readiness({skills:[],qualifications:[],preferredOccupations:[]},[]);assert.equal(empty.completion,0);assert.equal(empty.gaps.length,0);assert.ok(empty.suggestions.length>0);
});
test('B5 demand ranks genuine active vacancy requirements, not applicant skills, with stable ties and no duplicate skill counts',()=>{
 const r=demandSkills([job,{...job,id:'b',skills:['Welding','Welding','Driving']},{...job,id:'c',skills:['Demo-only'],isDemo:true},{...job,id:'d',status:'FILLED'}],now);
 assert.deepEqual(r,[{skill:'Welding',vacancies:2},{skill:'Driving',vacancies:1}]);
});
