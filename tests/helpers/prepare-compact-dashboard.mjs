// Opt-in persisted fixture; leaves ordinary/current regression populations unchanged.
import {randomUUID} from 'node:crypto';
import {loadServerTypescript} from './load-typescript.mjs';
if(!/^elb_b3_test_[a-f0-9]{32}$/.test(process.env.ELB_B3_TEST_DATABASE||''))throw Error('Disposable dashboard target required');
let target;try{target=new URL(process.env.DATABASE_URL);}catch{throw Error('Disposable dashboard connection must match its guarded target');}
if(target.protocol!=='mysql:'||!['localhost','127.0.0.1','[::1]'].includes(target.hostname)||decodeURIComponent(target.pathname.slice(1))!==process.env.ELB_B3_TEST_DATABASE)throw Error('Disposable dashboard connection must match its guarded target');
const hook=loadServerTypescript();
const {prisma}=await import('../../src/lib/prisma.ts');
try{
 const {auth}=await import('../../src/lib/auth.ts');
 const {EMPLOYMENT_STATUSES}=await import('../../src/features/community/domain.ts');
 const {saveCitizenSurvey}=await import('../../src/features/community/server/survey-lifecycle.ts');
 const {commitImport}=await import('../../src/features/census/server/imports.ts');
 const counts=[8,6,5,4,3,2,2,2,1,1,1,1,1,1,1];
 let total=0;
 for(const [index,employmentStatus]of EMPLOYMENT_STATUSES.entries())for(let n=0;n<counts[index];n++){
   const suffix=String.fromCharCode(65+Math.floor(total/26),65+total%26),lastName='Compact '+suffix,name='Synthetic '+lastName,email=`compact.${index}.${n}@example.test`;total++;
   await auth.api.signUpEmail({body:{firstName:'Synthetic',lastName,hasNoMiddleName:true,phoneNumber:'+639001234567',email,password:'Compact-browser-password-2026!',name}});
   const owner=await prisma.user.findUniqueOrThrow({where:{email}});
   await saveCitizenSurvey({surveyYear:2026,status:'SUBMITTED',barangay:'Maahas',ageGroup:index===11?'18-24':'35-44',educationLevel:index%3===0?'SENIOR_HIGH':index%3===1?'COLLEGE':'VOCATIONAL',employmentStatus,skills:['Data Entry'],consentAggregated:true,requestKey:randomUUID(),expectedVersion:0,expectedConsentVersion:0},owner);
 }
 const admin=await prisma.user.findUniqueOrThrow({where:{email:'b3.admin@example.test'}});
 const source='Compact synthetic high-category source';
 await commitImport(admin,{table:{headers:['Reference','Barangay','Age','Employment','Education'],rows:[...EMPLOYMENT_STATUSES.map((value,i)=>['compact-'+i,'Maahas','35-44',value,i%2?'COLLEGE':'SENIOR_HIGH']),['unknown-a','Maahas','35-44','',''],['unknown-b','Maahas','35-44','','']],fileType:'CSV',sourceFilename:'compact-synthetic.csv'},mapping:{0:'participantRef',1:'barangay',2:'ageGroup',3:'employmentStatus',4:'educationLevel'},meta:{source,surveyYear:2026,activityName:'Synthetic high-category UI regression',activityType:'TEST',implementingOffice:'PESO',intendedUse:'INTERNAL_STATISTICS'}});
 console.log(JSON.stringify({fixture:'compact-dashboard',registeredCitizens:total,employmentCategories:EMPLOYMENT_STATUSES.length,source,sourceObservations:17,unknownEmployment:2,ordinaryWrites:false}));
}finally{await prisma.$disconnect();hook.deregister();}
