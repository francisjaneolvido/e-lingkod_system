import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { loadServerTypescript } from "./helpers/load-typescript.mjs";
import { establishmentFixture as answers } from "./helpers/establishment-fixtures.mjs";

test("B2 persistent ownership, organizational lifecycle, concurrency and separation", { skip: !process.env.ELB_B2_TEST_DATABASE, timeout: 30000 }, async t => {
  const database = new URL(process.env.DATABASE_URL).pathname.slice(1);
  assert.match(database, /^elb_b1_test_[a-f0-9]{32}$/);
  assert.equal(database, process.env.ELB_B2_TEST_DATABASE);
  const hooks = loadServerTypescript();
  const { prisma } = await import("../src/lib/prisma.ts");
  const api = await import("../src/features/establishments/server/data.ts");
  const year = new Date().getFullYear();
  const user = async role => { const id=randomUUID(); await prisma.user.create({ data:{id,name:"Establishment Tester",email:id+"@example.test",role} }); return {id,role,name:"Establishment Tester",email:id+"@example.test"}; };
  const owner=await user("CITIZEN"), other=await user("CITIZEN"), admin=await user("ADMIN"), staff=await user("LGU_STAFF");
  const beforeIndividuals=await prisma.communitySurvey.count();
  const create=(value=answers,viewer=owner,key=randomUUID())=>api.createEstablishment({...value,requestKey:key},viewer);
  const read=(id,yr=year,viewer=owner)=>api.ownedEstablishmentState(viewer,id,yr);
  const denied=(fn,status)=>assert.rejects(fn,error=>error.status===status);
  let created,state;
  const body=(s,status="SUBMITTED",more={})=>({...s.answers,...answers,establishmentId:s.establishment.id,surveyYear:s.surveyYear,status,expectedRecordVersion:s.recordVersion,expectedVersion:s.workspaceVersion,requestKey:randomUUID(),...more});
  try {
    await t.test("creation is idempotent and creator-scoped, not name-only",async()=>{
      const key=randomUUID(); created=await create(answers,owner,key);
      assert.equal((await create(answers,owner,key)).establishmentId,created.establishmentId);
      await denied(()=>create({...answers,street:"Other address"},owner,key),409);
      await denied(()=>create({...answers,businessName:"  LAKE food cooperative ",street:"10 MAIN STREET"}),409);
      const branch=await create({...answers,street:"11 Main Street",officeType:"BRANCH"});assert.notEqual(branch.establishmentId,created.establishmentId);
      const foreign=await create(answers,other);assert.notEqual(foreign.establishmentId,created.establishmentId);
      assert.equal((await api.listOwnedEstablishments(other)).length,1);
      state=await read(created.establishmentId);assert.equal(state.history.length,0);assert.equal(state.submitted,null);assert.equal(state.hasDraft,true);
    });
    await t.test("every server read/write denies foreign owners and staff/admin",async()=>{
      await denied(()=>read(created.establishmentId,year,other),404);
      await denied(()=>read("missing",year,other),404);
      await denied(()=>api.saveEstablishmentSurvey(body(state),other),404);
      await denied(()=>api.withdrawEstablishmentSurvey(body(state),other),404);
      for(const viewer of [admin,staff]){
        await denied(()=>create(answers,viewer),403);await denied(()=>read(created.establishmentId,year,viewer),403);
        await denied(()=>api.listOwnedEstablishments(viewer),403);await denied(()=>api.saveEstablishmentSurvey(body(state),viewer),403);await denied(()=>api.withdrawEstablishmentSurvey(body(state),viewer),403);
      }
    });
    await t.test("partial drafts reopen; submission is server validated",async()=>{
      const incomplete=body(state,"DRAFT",{employerType:"",contactName:"",totalWorkers:"",regularWorkers:"",nonRegularWorkers:"",partTimeWorkers:""});
      await api.saveEstablishmentSurvey(incomplete,owner);state=await read(created.establishmentId);
      assert.equal(state.answers.totalWorkers,null);assert.equal(state.answers.contactName,"");assert.equal(state.submitted,null);
      await denied(()=>api.saveEstablishmentSurvey({...incomplete,status:"SUBMITTED",expectedRecordVersion:state.recordVersion,expectedVersion:state.workspaceVersion,requestKey:randomUUID()},owner),400);
    });
    let firstSubmission;
    await t.test("submission/revision derives actor/time; later draft preserves current response",async()=>{
      const submitted=body(state,"SUBMITTED",{actorId:other.id,createdAt:"2000-01-01"});firstSubmission={request:submitted,result:await api.saveEstablishmentSurvey(submitted,owner)};
      state=await read(created.establishmentId);assert.equal(state.hasDraft,false);assert.equal(state.history.length,1);assert.equal(state.history[0].actorId,owner.id);assert.notEqual(state.history[0].createdAt,"2000-01-01");
      await api.saveEstablishmentSurvey(body(state,"DRAFT",{productsServices:"Working edit"}),owner);state=await read(created.establishmentId);
      assert.equal(state.answers.productsServices,"Working edit");assert.equal(state.submitted.productsServices,answers.productsServices);assert.equal(state.history[0].answers.productsServices,answers.productsServices);
      const replay=await api.saveEstablishmentSurvey(firstSubmission.request,owner);assert.equal(replay.revisionId,firstSubmission.result.revisionId);assert.equal((await read(created.establishmentId)).hasDraft,true);
      await denied(()=>api.saveEstablishmentSurvey({...firstSubmission.request,productsServices:"Altered replay"},owner),409);
    });
    await t.test("concurrent annual edits have one winner and no unseen overwrite",async()=>{
      const value=body(state,"DRAFT");const results=await Promise.allSettled([api.saveEstablishmentSurvey({...value,productsServices:"A"},owner),api.saveEstablishmentSurvey({...value,requestKey:randomUUID(),productsServices:"B"},owner)]);
      assert.equal(results.filter(x=>x.status==="fulfilled").length,1);assert.equal(results.find(x=>x.status==="rejected").reason.status,409);state=await read(created.establishmentId);
    });
    await t.test("years retain independent answers and global identity tokens reject cross-year races",async()=>{
      const old=await read(created.establishmentId,year-1);assert.equal(old.workspaceVersion,0);assert.equal(old.submitted,null);
      await api.saveEstablishmentSurvey(body(old,"SUBMITTED",{startYear:2020,productsServices:"Earlier year"}),owner);
      await denied(()=>api.saveEstablishmentSurvey(body(state,"DRAFT"),owner),409);
      assert.equal((await read(created.establishmentId,year-1)).submitted.productsServices,"Earlier year");state=await read(created.establishmentId);
    });
    await t.test("identity edits preserve prior history and reject owned duplicate corrections",async()=>{
      await api.saveEstablishmentSurvey(body(state,"SUBMITTED",{businessName:"Lake Foods Updated",correctIdentity:true}),owner);state=await read(created.establishmentId);
      assert.equal(state.establishment.businessName,"Lake Foods Updated");assert.equal(state.history.at(-1).answers.businessName,answers.businessName);
      await denied(()=>api.saveEstablishmentSurvey(body(state,"DRAFT",{street:"11 Main Street",officeType:"BRANCH",correctIdentity:true}),owner),409);
      const unchanged=await read(created.establishmentId);assert.equal(unchanged.workspaceVersion,state.workspaceVersion);assert.equal(unchanged.establishment.businessName,"Lake Foods Updated");
    });
    await t.test("withdrawal retains history, replays once and cannot erase later submission",async()=>{
      const request=body(state,"WITHDRAWN"),first=await api.withdrawEstablishmentSurvey(request,owner);state=await read(created.establishmentId);
      assert.equal(state.status,"WITHDRAWN");assert.equal(state.submitted,null);assert.equal(state.hasDraft,false);assert.equal(state.history[0].action,"WITHDRAWN");
      assert.equal((await api.withdrawEstablishmentSurvey(request,owner)).revisionId,first.revisionId);
      await api.saveEstablishmentSurvey(body(state,"SUBMITTED"),owner);state=await read(created.establishmentId);
      await api.withdrawEstablishmentSurvey(request,owner);const later=await read(created.establishmentId);assert.equal(later.status,"SUBMITTED");assert.equal(later.history.filter(x=>x.action==="WITHDRAWN").length,1);
    });
    await t.test("workspace-only withdrawal never fabricates completed answers",async()=>{
      const fresh=await create({...answers,businessName:"Draft only"});const value=await read(fresh.establishmentId);
      await api.withdrawEstablishmentSurvey(body(value,"WITHDRAWN"),owner);const withdrawn=await read(fresh.establishmentId);
      assert.equal(withdrawn.status,"WITHDRAWN");assert.equal(withdrawn.submitted,null);assert.equal(withdrawn.history.length,1);
      const row=await prisma.establishmentSurvey.findUnique({where:{establishmentId_surveyYear:{establishmentId:fresh.establishmentId,surveyYear:year}}});assert.equal(row.submittedJson,null);
    });
    await t.test("concurrent creation with one request replays, different requests deduplicate",async()=>{
      const key=randomUUID(),value={...answers,businessName:"Same-key race"};const pair=await Promise.all([create(value,owner,key),create(value,owner,key)]);assert.equal(pair[0].establishmentId,pair[1].establishmentId);
      const races=await Promise.allSettled([create({...answers,businessName:"Duplicate race"}),create({...answers,businessName:"Duplicate race"})]);assert.equal(races.filter(x=>x.status==="fulfilled").length,1);assert.equal(races.find(x=>x.status==="rejected").reason.status,409);
      assert.equal(await prisma.establishment.count({where:{ownerId:owner.id,businessName:"Duplicate race"}}),1);
    });
    await t.test("organizational records never enter individual respondent population",async()=>{
      assert.equal(await prisma.communitySurvey.count(),beforeIndividuals);assert.equal(await prisma.communitySurveyWorkspace.count({where:{userId:owner.id}}),0);
      assert.equal(await prisma.communitySurveyRevision.count({where:{userId:owner.id}}),0);assert.equal(await prisma.citizenProfileConsent.count({where:{userId:owner.id}}),0);
    });
    await t.test("real authenticated routes enforce session, current role and same origin",async()=>{
      const {auth}=await import("../src/lib/auth.ts"),route=await import("../src/app/api/establishment-surveys/route.ts");
      const origin=process.env.BETTER_AUTH_URL||"http://localhost:3000";
      const signup=await auth.api.signUpEmail({body:{name:"Establishment Route Tester",firstName:"Establishment",lastName:"Tester",hasNoMiddleName:true,phoneNumber:"+639171234567",email:randomUUID()+"@example.test",password:"B2-test-only-password-2468"},headers:new Headers({origin}),asResponse:true});assert.equal(signup.status,200);
      const cookie=signup.headers.getSetCookie().map(x=>x.split(";")[0]).join("; ");const account=await signup.json();
      const req=(method,input,url="",source=origin)=>new Request(origin+"/api/establishment-surveys"+url,{method,headers:{cookie,origin:source,"content-type":"application/json"},...(input?{body:JSON.stringify(input)}:{})});
      assert.equal((await route.GET(new Request(origin+"/api/establishment-surveys"))).status,401);
      assert.equal((await route.POST(req("POST",{...answers,requestKey:randomUUID()},"","https://foreign.example"))).status,403);
      assert.equal((await route.GET(req("GET",null,"?id="+created.establishmentId))).status,404);
      const made=await route.POST(req("POST",{...answers,requestKey:randomUUID()}));assert.equal(made.status,200);
      const madeId=(await made.json()).establishmentId;
      assert.equal((await route.GET(req("GET",null,"?id="+madeId+"&year="+year))).status,200);
      await prisma.user.update({where:{id:account.user.id},data:{role:"LGU_STAFF"}});
      assert.equal((await route.GET(req("GET"))).status,403);assert.equal((await route.DELETE(req("DELETE",{establishmentId:madeId}))).status,403);
    });
  } finally { await prisma.$disconnect(); hooks.deregister(); }
});

test("B2-R1 reopened annual answers do not implicitly replace current establishment identity",{skip:!process.env.ELB_B2_TEST_DATABASE,timeout:20000},async t=>{
  assert.match(new URL(process.env.DATABASE_URL).pathname.slice(1),/^elb_b1_test_[a-f0-9]{32}$/);
  const hooks=loadServerTypescript(),{prisma}=await import("../src/lib/prisma.ts"),api=await import("../src/features/establishments/server/data.ts");
  const year=new Date().getFullYear(),oldYear=year-1;
  const send=(s,status,changes={})=>({...s.answers,establishmentId:s.establishment.id,surveyYear:s.surveyYear,status,expectedRecordVersion:s.recordVersion,expectedVersion:s.workspaceVersion,requestKey:randomUUID(),...changes});
  async function fixture(){
    const id=randomUUID();await prisma.user.create({data:{id,name:"Historical Owner",email:id+"@example.test",role:"CITIZEN"}});const viewer={id,role:"CITIZEN"};
    const created=await api.createEstablishment({...answers,surveyYear:oldYear,requestKey:randomUUID()},viewer),read=yr=>api.ownedEstablishmentState(viewer,created.establishmentId,yr);
    await api.saveEstablishmentSurvey(send(await read(oldYear),"SUBMITTED"),viewer);
    await api.saveEstablishmentSurvey(send(await read(year),"SUBMITTED",{...answers,businessName:"Current identity",correctIdentity:true}),viewer);
    return{viewer,read,id:created.establishmentId};
  }
  try{
    await t.test("ordinary older-year draft/submission/replay retains current identity and immutable snapshots",async()=>{
      const {viewer,read}=await fixture(),before=await read(oldYear);
      const draft=send(before,"DRAFT",{productsServices:"Older-year activity correction"});await api.saveEstablishmentSurvey(draft,viewer);
      let state=await read(oldYear);assert.equal(state.establishment.businessName,"Current identity","Unrelated historical edits must not revert canonical identity");assert.equal(state.answers.businessName,answers.businessName);assert.equal(state.history[0].answers.businessName,answers.businessName);
      await api.saveEstablishmentSurvey(send(state,"SUBMITTED"),viewer);state=await read(oldYear);
      assert.equal(state.submitted.businessName,answers.businessName);assert.equal(state.establishment.businessName,"Current identity");assert.equal(state.history.at(-1).answers.productsServices,answers.productsServices);
      const replay=await api.saveEstablishmentSurvey(draft,viewer);assert.equal(replay.replayed,true);assert.equal((await read(oldYear)).hasDraft,false);assert.equal((await read(year)).submitted.businessName,"Current identity");
    });
    await t.test("another owned record may occupy historical identity; explicit corrections retain collision/concurrency/retry protection",async()=>{
      const {viewer,read}=await fixture();await api.createEstablishment({...answers,requestKey:randomUUID()},viewer);
      let state=await read(oldYear);await api.saveEstablishmentSurvey(send(state,"DRAFT",{contactPosition:"Updated historical position"}),viewer);
      state=await read(oldYear);assert.equal(state.establishment.businessName,"Current identity");
      await assert.rejects(api.saveEstablishmentSurvey(send(state,"SUBMITTED",{correctIdentity:true}),viewer),e=>e.status===409);
      assert.equal((await read(oldYear)).workspaceVersion,state.workspaceVersion);
      const correction=send(state,"SUBMITTED",{businessName:"Explicit corrected identity",correctIdentity:true}),saved=await api.saveEstablishmentSurvey(correction,viewer);
      state=await read(oldYear);assert.equal(state.establishment.businessName,"Explicit corrected identity");assert.equal(state.history.at(-1).answers.businessName,answers.businessName);assert.equal((await read(year)).submitted.businessName,"Current identity");
      const race=await Promise.allSettled([api.saveEstablishmentSurvey(send(state,"DRAFT",{businessName:"Correction A",correctIdentity:true}),viewer),api.saveEstablishmentSurvey(send(state,"DRAFT",{businessName:"Correction B",correctIdentity:true}),viewer)]);
      assert.equal(race.filter(x=>x.status==="fulfilled").length,1);assert.equal(race.find(x=>x.status==="rejected").reason.status,409);
      const winner=(await read(oldYear)).establishment.businessName;
      assert.equal((await api.saveEstablishmentSurvey(correction,viewer)).revisionId,saved.revisionId);
      assert.equal((await read(oldYear)).establishment.businessName,winner,"Replaying an older correction cannot revert a later identity edit");
      await assert.rejects(api.saveEstablishmentSurvey({...correction,correctIdentity:false},viewer),e=>e.status===409);
      const latest=await read(oldYear);await assert.rejects(api.saveEstablishmentSurvey(send(latest,"DRAFT",{correctIdentity:"false"}),viewer),e=>e.status===400);
    });
  }finally{await prisma.$disconnect();hooks.deregister();}
});

test("B2 owned state stays coherent during controlled read/write overlap", { skip: !process.env.ELB_B2_TEST_DATABASE, timeout:15000 }, async()=>{
  assert.match(new URL(process.env.DATABASE_URL).pathname.slice(1),/^elb_b1_test_[a-f0-9]{32}$/);
  const hooks=loadServerTypescript();const {prisma}=await import("../src/lib/prisma.ts"),api=await import("../src/features/establishments/server/data.ts");
  const readStarted=Promise.withResolvers(),continueRead=Promise.withResolvers();const transactionMethod=prisma.$transaction,transaction=transactionMethod.bind(prisma);let reading,intercept=false;
  try{
    const id=randomUUID();await prisma.user.create({data:{id,name:"Snapshot Reader",email:id+"@example.test",role:"CITIZEN"}});const viewer={id,role:"CITIZEN"};
    const created=await api.createEstablishment({...answers,requestKey:randomUUID()},viewer);const initial=await api.ownedEstablishmentState(viewer,created.establishmentId);
    const request={...answers,establishmentId:created.establishmentId,status:"SUBMITTED",expectedRecordVersion:initial.recordVersion,expectedVersion:initial.workspaceVersion,requestKey:randomUUID()};
    await api.saveEstablishmentSurvey(request,viewer);const first=await api.ownedEstablishmentState(viewer,created.establishmentId);
    const engines=await prisma.$queryRawUnsafe("SELECT ENGINE AS engine FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME IN ('establishment','establishment_survey','establishment_revision')");assert.equal(engines.length,3);assert(engines.every(x=>x.engine==="InnoDB"));
    prisma.$transaction=(callback,options)=>!intercept?transaction(callback,options):transaction(tx=>callback(new Proxy(tx,{get(target,model){
      if(model!=="establishment"&&model!=="establishmentSurvey")return Reflect.get(target,model);const delegate=target[model],operation=model==="establishment"?"findFirst":"findUnique";
      return new Proxy(delegate,{get(object,member){const original=Reflect.get(object,member);if(member!==operation)return original;return async args=>{if(model==="establishment"){const result=await original.call(object,args);readStarted.resolve();return result;}await continueRead.promise;return original.call(object,args);};}});
    }})),options);
    intercept=true;reading=api.ownedEstablishmentState(viewer,created.establishmentId);intercept=false;await readStarted.promise;
    await api.saveEstablishmentSurvey({...request,expectedRecordVersion:first.recordVersion,expectedVersion:first.workspaceVersion,productsServices:"Unseen concurrent submission",requestKey:randomUUID()},viewer);
    continueRead.resolve();const observed=await reading;prisma.$transaction=transactionMethod;
    assert.equal(observed.answers.productsServices,answers.productsServices);assert.equal(observed.recordVersion,first.recordVersion);assert.equal(observed.workspaceVersion,first.workspaceVersion);assert.equal(observed.history.length,1);
    await assert.rejects(api.saveEstablishmentSurvey({...request,expectedRecordVersion:observed.recordVersion,expectedVersion:observed.workspaceVersion,requestKey:randomUUID()},viewer),e=>e.status===409);
  }finally{continueRead.resolve();if(reading)await reading.catch(()=>{});prisma.$transaction=transactionMethod;await prisma.$disconnect();hooks.deregister();}
});


test("B2-R2 persistent partial staffing rejects contradictions and retains unknown values", {skip:!process.env.ELB_B2_TEST_DATABASE,timeout:15000},async t=>{
  assert.match(new URL(process.env.DATABASE_URL).pathname.slice(1),/^elb_b1_test_[a-f0-9]{32}$/);
  const hooks=loadServerTypescript(),{prisma}=await import("../src/lib/prisma.ts"),api=await import("../src/features/establishments/server/data.ts");
  try{
    const id=randomUUID();await prisma.user.create({data:{id,name:"Partial Workforce",email:id+"@example.test",role:"CITIZEN"}});const viewer={id,role:"CITIZEN"};
    const record=await api.createEstablishment({...answers,requestKey:randomUUID()},viewer),read=()=>api.ownedEstablishmentState(viewer,record.establishmentId);
    const send=(state,counts)=>({...answers,...counts,totalWorkers:null,establishmentId:record.establishmentId,surveyYear:state.surveyYear,status:"SUBMITTED",expectedRecordVersion:state.recordVersion,expectedVersion:state.workspaceVersion,requestKey:randomUUID()});
    await t.test("contradictory known subtotal fails before writing versions, receipts or history",async()=>{
      const state=await read(),receipts=await prisma.establishmentOperation.count({where:{ownerId:id}});
      for(const counts of [{regularWorkers:2,nonRegularWorkers:3,partTimeWorkers:6},{regularWorkers:0,nonRegularWorkers:0,partTimeWorkers:1}])await assert.rejects(api.saveEstablishmentSurvey(send(state,counts),viewer),e=>e.status===400);
      const after=await read();assert.equal(after.recordVersion,state.recordVersion);assert.equal(after.workspaceVersion,state.workspaceVersion);assert.equal(after.history.length,0);assert.equal(await prisma.establishmentOperation.count({where:{ownerId:id}}),receipts);
    });
    await t.test("valid partial counts remain null in draft/current and immutable revision JSON",async()=>{
      for(const counts of [{regularWorkers:2,nonRegularWorkers:3,partTimeWorkers:5},{regularWorkers:2,nonRegularWorkers:null,partTimeWorkers:6},{regularWorkers:null,nonRegularWorkers:3,partTimeWorkers:6},{regularWorkers:0,nonRegularWorkers:0,partTimeWorkers:0}]){
        await api.saveEstablishmentSurvey(send(await read(),counts),viewer);const state=await read();assert.equal(state.answers.totalWorkers,null);assert.equal(state.submitted.totalWorkers,null);assert.equal(state.history[0].answers.totalWorkers,null);for(const [key,value]of Object.entries(counts))assert.equal(state.submitted[key],value);
      }
    });
  }finally{await prisma.$disconnect();hooks.deregister();}
});
