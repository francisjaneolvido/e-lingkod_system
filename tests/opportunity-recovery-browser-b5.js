// Run against the guarded opportunities browser server, then run
// tests/helpers/assert-opportunity-recovery.mjs against the same disposable DB.
// eslint-disable-next-line @typescript-eslint/no-unused-expressions
async page=>{
 const context=await page.context().browser().newContext();page=await context.newPage();
 const base='http://localhost:3103',results=[],unexpected=[];
 const check=(v,m)=>{if(!v)throw Error(m);};
 page.on('dialog',d=>d.accept());page.on('pageerror',e=>unexpected.push(e.message));
 try{
  await page.goto(base+'/login?next=/admin/jobs/new');await page.locator('#loginEmail').fill('b5.staff@example.test');await page.locator('#loginPassword').fill('B5-browser-password-2026!');
  await page.getByRole('button',{name:/^log in/i}).click();await page.waitForURL(u=>u.pathname==='/admin/jobs/new');
  async function fill(name){
   await page.goto(base+'/admin/jobs/new');await page.getByLabel(/^Job title/).fill('[DEMO] Recovery '+name);
   await page.getByLabel(/^Employer \/ local business/).fill('[DEMO] Synthetic recovery');await page.getByLabel(/^Barangay/).fill('Bambang');await page.getByLabel(/^Work location/).fill('Los Baños');
   await page.getByLabel(/^Description and responsibilities/).fill('[DEMO] Original prepared description for browser response-loss recovery.');
   await page.getByRole('checkbox',{name:'Welding',exact:true}).check();await page.getByLabel(/^Approved inquiry \/ contact instructions/).fill('Demonstration only; no external messages.');
   await page.getByLabel(/Where did.*vacancy information come from/).fill('[DEMO] Synthetic test source; no genuine verification.');await page.getByRole('checkbox',{name:/Clearly labelled demonstration/}).check();
  }
  async function save(expectError=false){await page.getByRole('button',{name:/^(Save draft|Save changes)$/}).click();if(expectError)await page.locator('.jobs-error-banner').waitFor();else await page.waitForURL(u=>u.pathname==='/admin/jobs');}
  for(const scenario of ['unchanged','edited','unresolved']){
   await fill(scenario);const posts=[],patches=[];let discard=scenario==='unresolved'?2:1;
   const intercept=async route=>{const request=route.request();if(request.method()!=='POST')return route.continue();const body=request.postDataJSON();const response=await route.fetch();const result=await response.json();check(response.ok(),'Actual CREATE must commit before discarding its response');posts.push({body,result});if(discard-->0)return route.abort('failed');return route.fulfill({response});};
   const edits=async route=>{patches.push(route.request().postDataJSON());return route.continue();};
   await page.route('**/api/admin/jobs',intercept);await page.route('**/api/admin/jobs/*',edits);
   await save(true);
   if(scenario!=='unchanged')await page.getByLabel(/^Description and responsibilities/).fill('[DEMO] Amended description must update the original recovered vacancy only.');
   if(scenario==='unresolved'){await save(true);check(patches.length===0,'No amendment before ambiguous creation is resolved');}
   await save();
   results.push({scenario,postKeys:posts.map(p=>p.body.requestKey),ids:posts.map(p=>p.result.id),patches:patches.length,exactReplay:posts.every(p=>JSON.stringify(p.body)===JSON.stringify(posts[0].body))});
   await page.unroute('**/api/admin/jobs',intercept);await page.unroute('**/api/admin/jobs/*',edits);
  }
  // A definitive server validation rejection permits a corrected, new operation.
  await fill('validation');await page.getByLabel('Minimum pay',{exact:true}).fill('900');await page.getByLabel('Maximum pay',{exact:true}).fill('100');await page.getByRole('combobox',{name:/^Currency/}).selectOption('PHP');await page.getByRole('combobox',{name:/^Pay basis/}).selectOption('DAY');
  const validationKeys=[];const observe=request=>{if(request.url().endsWith('/api/admin/jobs')&&request.method()==='POST')validationKeys.push(request.postDataJSON().requestKey);};page.on('request',observe);
  await save(true);await page.getByLabel('Maximum pay',{exact:true}).fill('1000');await save();page.off('request',observe);check(validationKeys.length===2&&validationKeys[0]!==validationKeys[1],'Definitive validation rejection must allow corrected preparation');
  // Later edits also replay the unresolved mutation before a changed amendment.
  const editedId=results.find(r=>r.scenario==='edited').ids[0];await page.goto(base+'/admin/jobs/'+editedId+'/edit');
  await page.getByLabel(/^Description and responsibilities/).fill('[DEMO] Later versioned edit whose committed response will be discarded.');let lost=false;const later=[];
  const editLoss=async route=>{const body=route.request().postDataJSON(),response=await route.fetch();later.push(body);if(!lost){check(response.ok(),'EDIT must commit before response loss');lost=true;return route.abort('failed');}return route.fulfill({response});};
  await page.route('**/api/admin/jobs/'+editedId,editLoss);await save(true);await page.getByLabel(/^Description and responsibilities/).fill('[DEMO] Final later amendment after recovering the original edit receipt.');
  // Before the fix this remains a stale-version rejection; record it without a timing sleep.
  await page.getByRole('button',{name:'Save changes',exact:true}).click();
  await page.waitForFunction(()=>location.pathname==='/admin/jobs'||!!document.querySelector('.jobs-error-banner'));
  const laterCompleted=new URL(page.url()).pathname==='/admin/jobs';await page.unroute('**/api/admin/jobs/'+editedId,editLoss);
  check(results.every(r=>new Set(r.postKeys).size===1&&new Set(r.ids).size===1&&r.exactReplay),'Ambiguous CREATE identity/payload was replaced: '+JSON.stringify(results));
  check(results.every(r=>r.patches===(r.scenario==='unchanged'?0:1)),'Changed drafts must amend recovered ID with exactly one EDIT');
  check(laterCompleted&&later.length===3&&later[0].requestKey===later[1].requestKey&&later[2].expectedVersion===later[1].expectedVersion+1,'Later edits must resolve before amendment: '+JSON.stringify(later));
  check(unexpected.length===0,'Unexpected browser errors '+JSON.stringify(unexpected));
  return {passed:true,results,validationReprepared:true,laterEditReplay:true,unexpected};
 }finally{await context.close();}
}
