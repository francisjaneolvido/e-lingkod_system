// Run with test:analytics:browser, against its disposable localhost:3103 DB only.
// eslint-disable-next-line @typescript-eslint/no-unused-expressions -- Playwright CLI evaluates this function.
async page=>{
  const base='http://localhost:3103',errors=[],serverErrors=[],failed=[],expectedConsoleErrors=[];
  const check=(value,message)=>{if(!value)throw Error(message);};
  let expectingInvalidFilter=false;
  page.on('pageerror',e=>errors.push(e.message));
  page.on('console',m=>{if(m.type()==='error'){if(expectingInvalidFilter&&/400/.test(m.text()))expectedConsoleErrors.push(m.text());else errors.push(m.text());}});
  page.on('response',r=>{if(r.status()>=500)serverErrors.push(r.url());});
  page.on('requestfailed',r=>{if(!r.failure()?.errorText.includes('ERR_ABORTED'))failed.push(r.url());});
  async function login(name,next='/admin/census/analytics'){
    await page.goto('about:blank');await page.context().clearCookies();
    await new Promise(r=>setTimeout(r,11000)); // Respect existing shared sign-in bucket.
    await page.goto(base+'/login?next='+encodeURIComponent(next));
    await page.locator('#loginEmail').fill('b3.'+name+'@example.test');
    await page.locator('#loginPassword').fill('B3-browser-password-2026!');
    const response=page.waitForResponse(r=>r.url().endsWith('/api/auth/sign-in/email')&&r.request().method()==='POST');
    await page.getByRole('button',{name:/^log in$/i}).click();check((await response).ok(),'UI sign-in failed');
    await page.waitForURL(url=>url.pathname!=='/login');
  }
  const loaded=()=>page.getByText(/Analytics loaded\./).waitFor();
  async function apply(){
    const response=page.waitForResponse(r=>r.url().includes('/api/admin/census/analytics?')&&r.request().method()==='GET');
    await page.getByRole('button',{name:'Apply analytics filters',exact:true}).click();
    const result=await (await response).json();await loaded();return result;
  }
  const group=name=>page.locator('section').filter({has:page.getByRole('heading',{name,exact:true})});
  await login('staff');await loaded();
  await group('Citizen survey').getByText('2 respondents',{exact:true}).waitFor();
  const initial=await (await page.request.get(base+'/api/admin/census/analytics')).json();
  check(initial.groups[0].count===2,'Scoped respondent count wrong');
  check(!JSON.stringify(initial).includes('Maahas-only mechanic'),'Out-of-scope answers leaked');
  check(!JSON.stringify(initial).includes('Unsubmitted browser secret'),'Draft counted');
  check(initial.rosters.length===1&&initial.rosters[0].count===1,'Roster mixed into respondents or scope');
  for(const width of [1440,820,390]){
    await page.setViewportSize({width,height:1000});
    check(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1),'Horizontal body overflow at '+width);
    await page.getByRole('heading',{name:'Workforce & social analytics',exact:true}).waitFor();
  }
  await page.getByRole('button',{name:'Skills & training',exact:true}).focus();await page.keyboard.press('Enter');
  const qualifications=page.locator('details').filter({has:page.getByText('Acquired qualifications / certifications',{exact:true})});
  await qualifications.locator('summary').focus();await page.keyboard.press('Enter');
  check(await qualifications.getAttribute('open')!==null,'Keyboard could not open breakdown');
  await qualifications.getByText('Categories 1–10 of 16',{exact:true}).waitFor(); // 15 certificates + one unknown respondent.
  await qualifications.getByRole('button',{name:'Next categories',exact:true}).focus();await page.keyboard.press('Enter');
  await qualifications.getByText('Categories 11–16 of 16',{exact:true}).waitFor();
  const downloadPromise=page.waitForEvent('download');await page.getByRole('link',{name:'Export applied aggregates (CSV)',exact:true}).click();
  const download=await downloadPromise,stream=await download.createReadStream(),chunks=[];
  for await(const chunk of stream)chunks.push(chunk);
  const csv=Buffer.concat(chunks).toString('utf8');
  check(download.suggestedFilename()==='workforce-individual-2026.csv','Export filename wrong');
  check(csv.includes('Synthetic certificate 15')&&csv.includes('"selected_total","","2","2"'),'Export omitted categories or denominator');
  check(!csv.includes('b3.citizen@example.test')&&!csv.includes('Unsubmitted browser secret'),'Private identifier/draft exported');
  await page.getByRole('combobox',{name:'Employment status',exact:true}).selectOption('UNEMPLOYED_LOOKING');
  check(!(await page.getByRole('link',{name:'Export applied aggregates (CSV)',exact:true}).getAttribute('href')).includes('UNEMPLOYED_LOOKING'),'Unapplied changes altered export');
  let data=await apply();check(data.groups[0].count===0,'Empty filter inherited another population');
  await page.getByRole('group',{name:'Applied filters',exact:true}).getByText('Unemployed — Looking for work',{exact:false}).waitFor();
  await page.getByText(/No eligible respondents for the applied filters/).waitFor();
  await page.getByRole('combobox',{name:'Employment status',exact:true}).selectOption('');
  check((await page.getByRole('group',{name:'Applied filters',exact:true}).innerText()).includes('Unemployed'),'Editing a draft filter hid the actual applied filter');
  await page.getByRole('combobox',{name:'Period',exact:true}).selectOption('YEAR');
  await page.getByLabel('Survey year',{exact:true}).fill('2025');
  data=await apply();check(data.groups[0].count===1,'Historical year incorrect');
  await page.getByLabel('Survey year',{exact:true}).fill('2026');
  await page.getByRole('combobox',{name:'Population',exact:true}).selectOption('ESTABLISHMENT');
  data=await apply();check(data.groups[0].count===2,'Organization count wrong');
  check(data.groups[0].measures.find(m=>m.key==='totalWorkers').sum===4,'Unknown workforce inferred');
  const workers=page.getByRole('heading',{name:'Reported total workforce',exact:true}).locator('..');
  check((await workers.innerText()).includes('unknown 1'),'Workforce unknown denominator missing');
  await page.getByRole('combobox',{name:'Population',exact:true}).selectOption('IMPORTS');
  data=await apply();check(data.groups.length===1&&data.groups[0].count===2,'Source outcomes mixed');
  await group('B4 BROWSER SOURCE').getByText('2 source observations',{exact:true}).waitFor();
  await page.getByRole('combobox',{name:'Population',exact:true}).selectOption('SPES');
  data=await apply();check(data.groups[0].count===2&&data.groups.length===1,'SPES default source population wrong');
  await page.getByRole('combobox',{name:'SPES dataset kind',exact:true}).selectOption('ALL');
  data=await apply();check(data.groups.length===2,'Demo/real SPES sources not separate');
  // Canonical source selection in a direct/legacy-linked URL must be respected.
  await page.goto(base+'/admin/census/analytics?population=SPES');await loaded();
  check(await page.getByRole('combobox',{name:'Population',exact:true}).inputValue()==='SPES','Direct URL population was discarded');
  expectingInvalidFilter=true;
  await page.goto(base+'/admin/census/analytics?period=YEAR&year=invalid');
  await page.getByRole('alert').filter({hasText:/Choose a valid survey year/}).waitFor();
  await page.getByRole('button',{name:'Reset filters',exact:true}).click();await loaded();
  expectingInvalidFilter=false;
  await login('admin');await loaded();
  await group('Citizen survey').getByText('3 respondents',{exact:true}).waitFor();
  const adminResult=await (await page.request.get(base+'/api/admin/census/analytics')).json();
  check(adminResult.groups[0].count===3,'Admin incomplete');
  check(adminResult.rosters.find(r=>r.barangay==='Maahas').count===0,'Confirmed zero lost');
  check(adminResult.rosters.find(r=>r.barangay==='Anos').count===null,'Unconfigured fabricated zero');
  await page.goto(base+'/admin/jobs/insights');await page.waitForURL(base+'/admin/census/analytics');await loaded();
  await login('citizen','/community-employment/insights');
  await page.getByText(/Public and citizen statistics are not currently released/).waitFor();
  check((await page.request.get(base+'/api/admin/census/analytics')).status()===403,'Citizen got protected data');
  check((await page.request.get(base+'/api/admin/community-census/export')).status()===403,'Compatibility export bypass');
  await page.context().clearCookies();
  for(const path of ['/community-employment','/community-employment/insights','/community-census']){
    await page.goto(base+path);check(!(await page.locator('body').innerText()).includes('Maahas-only mechanic'),'Public private payload');
  }
  check((await page.request.get(base+'/api/admin/census/analytics/export?year=2026')).status()===401,'Anonymous export allowed');
  await login('denied','/admin');
  check((await page.request.get(base+'/api/admin/census/analytics')).status()===403,'Roster membership granted CENSUS');
  const jobsPage=await page.goto(base+'/admin/jobs');
  await page.getByRole('heading',{name:'Opportunity Management',exact:true}).waitFor();
  check(await page.getByRole('link',{name:/Workforce.*social analytics/}).count()===0,'JOBS-only user offered inaccessible census analytics');
  check(!(await jobsPage.text()).includes('B4 synthetic anonymous observations'),'JOBS page serialized census source data');
  check((await page.request.get(base+'/api/admin/jobs/insights/export')).status()===403,'Legacy JOBS export bypass');
  check(errors.length===0,JSON.stringify(errors));check(serverErrors.length===0,JSON.stringify(serverErrors));check(failed.length===0,JSON.stringify(failed));
  return {result:'PASS',uiLogins:4,viewports:[1440,820,390],staffRespondents:2,adminRespondents:3,historicalRespondents:1,organizations:2,knownWorkforce:4,unknownWorkforceEstablishments:1,mappedObservations:2,spesRealObservations:2,separateSpesKinds:2,allCategoriesExported:true,keyboardAndPagination:true,expectedInvalidFilterConsole:expectedConsoleErrors,errors,serverErrors,failed};
}
