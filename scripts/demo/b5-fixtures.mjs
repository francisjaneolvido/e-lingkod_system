import {vacancyScenarios} from '../../demo/fixtures/dataset.mjs';
import {b5FixtureVersion,vacancyDetails} from '../../demo/b5-fixtures.mjs';
import {journalStep} from './operation-journal.mjs';
import {saveMetadata,snapshot,digest} from './database.mjs';
export async function populateB5(db,state){
 const {prisma}=await import('../../src/lib/prisma.ts');
 const {decodeTags}=await import('../../src/features/jobs/domain.ts');
 const admin=await prisma.user.findUniqueOrThrow({where:{email:'admin.01@example.test'}});
 const step=(name,prepare)=>journalStep({db,state,name:b5FixtureVersion+':'+name,persist:value=>saveMetadata(db,value),prepare});
 for(const fixture of vacancyScenarios){
  const original=state.completed[fixture.key+':create'];if(!original?.id)throw Error('Missing managed vacancy mapping; no title-based adoption');
  const id=original.id;
  const detailName=b5FixtureVersion+':'+fixture.key+':details';
  // An earlier upgrade attempt prepared EDIT while the source was still under
  // review. It never committed. Abort only with an absent receipt AND exact
  // original database preconditions; never rebase a possibly committed payload.
  if(state.pending?.name===detailName&&state.pending.operation?.payload.action==='EDIT'){
   const pending=state.pending,operation=pending.operation;
   const row=await prisma.jobOpportunity.findUniqueOrThrow({where:{id}});
   const receipt=await prisma.jobMutation.findUnique({where:{actorId_requestKey:{actorId:operation.actorId,requestKey:operation.payload.requestKey}}});
   if(row.status==='PENDING_REVIEW'&&!receipt&&digest(await snapshot(db))===digest(pending.before)){
    state.abortedOperations??=[];state.abortedOperations.push({name:pending.name,operation:pending.operation,reason:'EDIT is invalid during review; exact uncommitted preconditions verified. Use RETURN then a new EDIT identity.'});state.pending=null;await saveMetadata(db,state);
   }
  }
  if(!state.completed[detailName]&&(await prisma.jobOpportunity.findUniqueOrThrow({where:{id}})).status==='PENDING_REVIEW')await step(fixture.key+':return-to-edit',async()=>({kind:'vacancy-mutation',actorId:admin.id,payload:{id,action:'RETURN',expectedVersion:(await prisma.jobOpportunity.findUniqueOrThrow({where:{id}})).version,requestKey:'demo_b5_'+fixture.key+'_return_to_edit',note:'[DEMO] Return synthetic fixture for the additive B5 compensation upgrade; no genuine review.'}}));
  // Every exact payload/version is prepared once before execution, then replayed
  // from its durable server receipt; a later manual edit is a preservation conflict.
  await step(fixture.key+':details',async()=>{
   const row=await prisma.jobOpportunity.findUniqueOrThrow({where:{id}});
   if(!row.isDemo&&!row.title.startsWith('[DEMO]'))throw Error('Managed fixture lost explicit demo identity');
   const job={title:row.title,employer:row.employer,sector:row.sector,workType:row.workType,barangay:row.barangay,location:row.location,description:row.description,skills:decodeTags(row.skillsJson),interests:decodeTags(row.interestsJson),education:row.education,contactInfo:row.contactInfo,externalUrl:row.externalUrl||'',expiresAt:row.expiresAt?.toISOString().slice(0,10)||'',reviewSource:row.reviewSource||'[DEMO] Synthetic fixture source; no genuine employer verification.',...vacancyDetails(fixture.index)};
   return {kind:'vacancy-mutation',actorId:admin.id,payload:{id,action:'EDIT',job,expectedVersion:row.version,requestKey:'demo_b5_'+fixture.key+'_details_v2'}};
  });
  const actions=fixture.status==='DRAFT'?[]:fixture.status==='PENDING_REVIEW'?['SUBMIT_REVIEW']:fixture.status==='RETURNED'?['SUBMIT_REVIEW','RETURN']:['SUBMIT_REVIEW','APPROVE',...(fixture.status==='CLOSED'?['CLOSE']:fixture.status==='FILLED'?['FILL']:[])];
  for(const action of actions)await step(fixture.key+':'+action,async()=>({kind:'vacancy-mutation',actorId:admin.id,payload:{id,action,expectedVersion:(await prisma.jobOpportunity.findUniqueOrThrow({where:{id}})).version,requestKey:'demo_b5_'+fixture.key+'_'+action,employerVerified:true,vacancyVerified:true,note:'[DEMO] Synthetic B5 scenario; simulated review, not genuine employer or vacancy verification.'}}));
 }
 state.b5FixtureVersion=b5FixtureVersion;await saveMetadata(db,state);
}
