import { randomUUID } from 'node:crypto';
import { loadServerTypescript } from './load-typescript.mjs';
if(!/^elb_b3_test_[a-f0-9]{32}$/.test(process.env.ELB_B3_TEST_DATABASE||''))throw Error('Disposable analytics fixture target required');
const hook=loadServerTypescript();
const {prisma}=await import('../../src/lib/prisma.ts');
try {
  const personal=await import('../../src/features/community/server/survey-lifecycle.ts');
  const census=await import('../../src/features/census/server/data.ts');
  const org=await import('../../src/features/establishments/server/data.ts');
  const imports=await import('../../src/features/census/server/imports.ts');
  const owner=await prisma.user.findUniqueOrThrow({where:{email:'b3.citizen@example.test'}});
  const admin=await prisma.user.findUniqueOrThrow({where:{email:'b3.admin@example.test'}});
  const denied=await prisma.user.findUniqueOrThrow({where:{email:'b3.denied@example.test'}});
  const {auth}=await import('../../src/lib/auth.ts');
  const session=await auth.api.signInEmail({body:{email:admin.email,password:'B3-browser-password-2026!'},returnHeaders:true});
  const cookie=session.headers.getSetCookie().map(v=>v.split(';')[0]).join('; ');
  const grant=await (await import('../../src/app/api/admin/staff/route.ts')).POST(new Request(process.env.BETTER_AUTH_URL+'/api/admin/staff',{method:'POST',headers:{origin:process.env.BETTER_AUTH_URL,cookie,'content-type':'application/json'},body:JSON.stringify({mode:'SAVE',email:denied.email,department:'PESO',designation:'Synthetic JOBS-only analytics denial fixture',modules:['PROJECTS','JOBS']})}));
  if(!grant.ok)throw Error('B4 JOBS-only browser fixture grant failed');
  const answers={status:'SUBMITTED',barangay:'Bambang',ageGroup:'25-34',educationLevel:'COLLEGE',employmentStatus:'EMPLOYED_FULL_TIME',skills:['Data Entry'],consentAggregated:true};
  async function save(user,year,patch={}){const s=await personal.ownedSurveyState(user.id,year);return personal.saveCitizenSurvey({...answers,surveyYear:year,...patch,requestKey:randomUUID(),expectedVersion:s.workspaceVersion,expectedConsentVersion:s.consentVersion},user);}
  await save(owner,2026,{occupation:'Driver',preferredOccupations:['Cook'],sex:'FEMALE',householdSize:2,overseasExperience:'FORMER',qualifications:Array.from({length:15},(_,i)=>'Synthetic certificate '+String(i+1).padStart(2,'0')),completedTraining:['Food Safety'],trainingInterest:'YES',trainingPrograms:['Welding'],employmentBarriers:['Transportation cost'],interestedLivelihood:true});
  await save(owner,2026,{status:'DRAFT',barangay:'Maahas',occupation:'Unsubmitted browser secret'});
  await save(owner,2025,{occupation:'Historical driver'});
  for(const [name,patch] of [['student',{barangay:'Bambang',ageGroup:'18-24',employmentStatus:'STUDENT',educationLevel:'SENIOR_HIGH',skills:['Baking'],householdSize:4,overseasExperience:'NEVER'}],['maahas',{barangay:'Maahas',employmentStatus:'UNEMPLOYED_LOOKING',occupation:'Maahas-only mechanic',skills:['Repair'],overseasExperience:'CURRENT'}]]){
    const citizen=await prisma.user.create({data:{id:'b4-browser-'+name,name:'Synthetic '+name,email:'b4.'+name+'@example.test',role:'CITIZEN'}});
    await save(citizen,2026,patch);
  }
  const business={surveyYear:2026,businessName:'[DEMO] Unknown Workforce',officeType:'MAIN',street:'Synthetic Second Street',barangay:'Bambang',employerType:'PRIVATE',organizationType:'CORPORATION',industry:'INFORMATION',productsServices:'Synthetic services',operatingStatus:'OPERATING',regularWorkers:3,nonRegularWorkers:2,partTimeWorkers:2,contactName:'Synthetic Representative',contactPosition:'Manager',contactEmail:'b3.citizen@example.test'};
  const created=await org.createEstablishment({...business,requestKey:randomUUID()},owner);
  await org.saveEstablishmentSurvey({...business,status:'SUBMITTED',establishmentId:created.establishmentId,expectedRecordVersion:0,expectedVersion:0,requestKey:randomUUID()},owner);
  const input=(year,rows)=>({table:{headers:['Reference','Barangay','Age','Occupation'],rows,fileType:'CSV',sourceFilename:'b4-browser-source.csv'},mapping:{0:'participantRef',1:'barangay',2:'ageGroup',3:'occupation'},meta:{source:'B4 Browser Source',surveyYear:year,activityName:'Synthetic browser source',activityType:'TEST',implementingOffice:'PESO',intendedUse:'INTERNAL_STATISTICS',activityDate:'2026-06-01'}});
  await imports.commitImport(admin,input(2026,[['a','Bambang','25-34','Driver'],['a','Bambang','25-34','Driver'],['b','Bambang','25-34','Driver'],['c','Bambang','bad','Rejected'],['','Bambang','35-44','Held']]));
  await imports.commitImport(admin,input(2025,[['old','Bambang','55-64','Historical source observation']]));
  await census.saveAssistanceRoster(admin,{barangay:'Bambang',staffIds:[denied.id],expectedVersion:0});
  await census.saveAssistanceRoster(admin,{barangay:'Maahas',staffIds:[],expectedVersion:0});
  await prisma.spesImportBatch.create({data:{sourceLabel:'B4 synthetic anonymous observations',surveyYear:2026,datasetKind:'REAL',status:'ACTIVE',importedById:admin.id,recordCount:3,records:{create:['Bambang','Bambang','Maahas'].map((barangay,i)=>({originalRowNumber:i+2,barangay,education:'COLLEGE',skillsJson:'["Baking"]',interestsJson:'["Food Safety"]',availability:'ANY'}))}}});
  await prisma.spesImportBatch.create({data:{sourceLabel:'B4 clearly synthetic demonstration',surveyYear:2026,datasetKind:'DEMO',status:'ACTIVE',importedById:admin.id,recordCount:1,records:{create:{originalRowNumber:2,barangay:'Bambang',education:'COLLEGE',skillsJson:'["Baking"]',interestsJson:'[]',availability:'ANY'}}}});
  const staff=await prisma.user.findUniqueOrThrow({where:{email:'b3.staff@example.test'}});
  await prisma.spesImportBatch.create({data:{sourceLabel:'B4 scoped audit browser fixture',surveyYear:2025,datasetKind:'REAL',status:'ACTIVE',importedById:staff.id,recordCount:2,events:{create:{actorId:admin.id,action:'IMPORTED',note:'2 validated anonymous source rows'}},records:{create:['Bambang','Maahas'].map(barangay=>({barangay,education:'COLLEGE',skillsJson:'[]',interestsJson:'[]',availability:'ANY'}))}}});
  console.log('B4 browser fixture: current individuals Admin3/Staff2, historical1, organizations2/workforce-known4/unknown1, mapped observations2, Staff SPES REAL2/DEMO1, assistance1 without CENSUS grant.');
} finally {await prisma.$disconnect();hook.deregister();}
