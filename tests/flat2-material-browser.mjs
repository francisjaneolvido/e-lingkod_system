import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';

export async function runMaterialBrowser(config){
 const {browser,origin,credentials,image,output,runId}=config;
 const checks=[],screenshots=[],diagnostics={runtime:[],console:[],responses:[],requests:[]},contexts=[],cookies={...config.cached};
 let phase='setup',expectedFault=false;
 const selection=config.only?new RegExp(config.only,'i'):null;
 const assert=(value,message)=>{if(!value)throw Error(message);};
 const progress=()=>config.progress?.({syntheticOnly:true,checks,screenshots,diagnostics});
 async function run(name,fn,dependency=true){
  if(selection&&!selection.test(name))return;
  phase=name;
  if(!dependency){checks.push({name,status:'skipped',reason:'Required preceding material state was not established.'});progress();return;}
try{await fn();checks.push({name,status:'passed'});}catch(error){checks.push({name,status:'failed',message:String(error.message).split('\n')[0],locatorContext:String(error.message).split('Call log:')[0].slice(0,1800)});}finally{expectedFault=false;progress();}
 }
 async function context(width=1440){
  const context=await browser.newContext({viewport:{width,height:width<768?900:1000},hasTouch:width<1024,extraHTTPHeaders:{'x-forwarded-for':'192.0.2.'+(80+contexts.length)}});contexts.push(context);
  context.on('page',page=>{
   page.setDefaultTimeout(18000);page.setDefaultNavigationTimeout(180000);
   page.on('pageerror',error=>diagnostics.runtime.push({phase,path:new URL(page.url()).pathname,message:error.message}));
   page.on('console',message=>{if(message.type()==='error')diagnostics.console.push({phase,path:new URL(page.url()).pathname,message:message.text(),expectedFault});});
   page.on('response',response=>{if(response.status()>=400)diagnostics.responses.push({phase,path:new URL(response.url()).pathname,status:response.status(),expectedFault});});
   page.on('requestfailed',request=>{if(!request.failure()?.errorText.includes('ERR_ABORTED'))diagnostics.requests.push({phase,path:new URL(request.url()).pathname,error:request.failure()?.errorText,expectedFault});});
  });return context;
 }
 async function login(role){
  const ctx=await context();if(cookies[role])await ctx.addCookies(cookies[role]);
const session=await ctx.request.get(origin+'/api/auth/get-session',{timeout:120000});
  const current=await session.json();
if(!current?.user){const r=await ctx.request.post(origin+'/api/auth/sign-in/email',{headers:{origin},data:credentials[role],timeout:120000});assert(r.status()===200,'Synthetic role authentication failed ('+r.status()+').');cookies[role]=await ctx.cookies(origin);}
  return {ctx,page:await ctx.newPage()};
 }
 async function theme(page,value,width){await page.setViewportSize({width,height:width<768?900:1000});await page.evaluate(theme=>localStorage.setItem('elb-appearance',theme),value);await page.reload({waitUntil:'networkidle'});await page.locator('h1').first().waitFor();assert(await page.locator('html').getAttribute('data-theme')===value,'Theme did not persist.');assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2),'Horizontal overflow in material state.');}
 async function shot(page,name){await page.waitForLoadState('networkidle');const file=name+'.png';await page.screenshot({path:path.join(output,file),fullPage:true,caret:'initial'});screenshots.push(file);}
 async function readyAnalytics(page){await page.goto(origin+'/admin/census/analytics',{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>document.querySelector('[aria-label="Analytics overview"]')?.getAttribute('aria-busy')==='false');}
 const admin=await login('admin'),staff=await login('staff'),citizen=await login('citizen'),guest=await context();
 try{
  for(const [mode,width]of[['light',1440],['dark',768],['oled',390]]){
   const ctx=await context(width),page=await ctx.newPage(),email='flat2-'+mode+'-'+runId+'@example.test';let registered=false,pending=false,reviewed=false,approved=false,documentPath;
   await run(mode+' registration validation, keyboard entry and restricted Citizen state',async()=>{
    await page.goto(origin+'/register');await theme(page,mode,width);
    // Consent intentionally disables submission; enable it before exercising field validation.
    await page.getByRole('checkbox').last().check();await page.locator('button[type=submit]').click();await page.getByRole('alert').first().waitFor();
    for(const [name,value]of Object.entries({firstName:'Synthetic',lastName:'Material',phoneNumber:'09171234567',email,password:'Material-browser-2026!',confirmPassword:'Material-browser-2026!'}))await page.locator('input[name='+name+']').fill(value);
    await page.getByRole('checkbox').first().check();await page.getByRole('checkbox').last().check();
    await page.locator('input[name=email]').focus();await page.keyboard.press('Tab');assert(await page.evaluate(()=>document.activeElement?.tagName==='INPUT'),'Keyboard focus must remain in the registration form.');
    await page.locator('button[type=submit]').click();await page.waitForURL(url=>url.pathname==='/verification');await page.getByRole('heading',{name:'ID submission required',exact:true}).waitFor();registered=true;
    await page.goto(origin+'/account');await page.waitForURL(url=>url.pathname==='/verification');
    const denied=await ctx.request.get(origin+'/api/reports');assert(denied.status()===403,'Restricted citizen must be denied protected APIs.');await shot(page,'restricted-'+mode+'-'+width);
   });
   await run(mode+' synthetic ID upload preview and pending state',async()=>{
    await page.goto(origin+'/verification');await page.locator('input[name=documentLabel]').fill('Synthetic material test ID');
    await page.locator('input[type=file]').setInputFiles({name:'synthetic-id.png',mimeType:'image/png',buffer:image});
    assert(await page.locator('img').count()>0,'Selected synthetic image must have a preview.');
    const submit=page.getByRole('button',{name:'Submit ID for review',exact:true});if(width<1024)await submit.tap();else await submit.click();
    await page.getByRole('heading',{name:'Pending Admin review',exact:true}).waitFor();pending=true;
    documentPath=await page.getByRole('link',{name:'Open protected ID image (new tab)'}).first().getAttribute('href');
    const response=await ctx.request.get(origin+documentPath);assert(response.status()===200&&response.headers()['content-type']==='image/jpeg','Owner must receive safe private image.');assert(/private|no-store/.test(response.headers()['cache-control']||''),'ID response must remain private.');
    const preview=await ctx.newPage();await preview.goto(origin+documentPath,{waitUntil:'domcontentloaded'});await preview.waitForFunction(()=>{const image=document.querySelector('img');return image?.complete&&image.naturalWidth===600;});await preview.close();
    assert((await guest.request.get(origin+documentPath)).status()===401,'Guest must not retrieve private ID.');assert((await staff.ctx.request.get(origin+documentPath)).status()===404,'Scoped staff must not retrieve private ID.');await shot(page,'pending-'+mode+'-'+width);
   },registered);
   await run(mode+' Admin review, correction and replacement upload',async()=>{
    await admin.page.goto(origin+'/admin/citizens/verification');await theme(admin.page,mode,width);
    await admin.page.locator('input[name=q]').fill(email);await admin.page.getByRole('button',{name:'Apply filters',exact:true}).click();
    await admin.page.getByRole('link',{name:/Open review for Synthetic Material/}).click();await admin.page.getByRole('link',{name:'Open protected ID image (new tab)'}).first().waitFor();
    assert((await admin.ctx.request.get(origin+documentPath)).status()===200,'Admin must retrieve authorized review document.');await shot(admin.page,'admin-review-'+mode+'-'+width);
    await admin.page.locator('select[name=decision]').selectOption('CORRECTIONS_REQUIRED');await admin.page.locator('textarea[name=reason]').fill('Synthetic correction: replace the test image.');await admin.page.getByRole('button',{name:'Save review decision'}).click();await admin.page.getByText('Corrections requested',{exact:true}).first().waitFor();
    await page.reload();await page.getByRole('button',{name:'Submit ID for review',exact:true}).waitFor();assert(await page.getByText('Synthetic correction: replace the test image.',{exact:true}).isVisible(),'Citizen must receive correction reason.');await shot(page,'correction-'+mode+'-'+width);
    await page.locator('input[name=documentLabel]').fill('Corrected synthetic material ID');await page.locator('input[type=file]').setInputFiles({name:'corrected-synthetic-id.png',mimeType:'image/png',buffer:image});await page.getByRole('button',{name:'Submit ID for review',exact:true}).click();await page.getByRole('heading',{name:'Pending Admin review',exact:true}).waitFor();reviewed=true;
   },pending);
   await run(mode+' Admin approval grants the same Citizen account access',async()=>{
    await admin.page.reload();await admin.page.locator('select[name=decision]').selectOption('APPROVED');await admin.page.locator('textarea[name=reason]').fill('Synthetic test approval only.');await admin.page.getByRole('button',{name:'Save review decision'}).click();await admin.page.getByText('ID review approved',{exact:true}).first().waitFor();
    await page.reload();await page.getByRole('link',{name:'Open your Citizen account'}).waitFor();await page.goto(origin+'/account');assert(new URL(page.url()).pathname==='/account','Approved account must retain identity and gain access.');approved=true;await shot(page,'approved-'+mode+'-'+width);
   },reviewed);
   await run(mode+' profile draft survives save, reload, step navigation and theme changes',async()=>{
await page.goto(origin+'/community-survey',{waitUntil:'networkidle'});await page.getByRole('heading',{name:'Personal Employment and Livelihood Survey',exact:true}).waitFor();
    await page.getByLabel('Barangay',{exact:true}).fill('Bambang');await page.getByLabel('Age group',{exact:true}).selectOption('25-34');await page.getByLabel('Highest educational attainment',{exact:true}).selectOption('COLLEGE');await page.getByLabel('Current employment / livelihood status',{exact:true}).selectOption('EMPLOYED_FULL_TIME');
    await page.getByRole('button',{name:'Save draft',exact:true}).click();await page.getByRole('status').filter({hasText:'Draft saved.'}).first().waitFor();await page.reload();await page.getByLabel('Barangay',{exact:true}).waitFor();assert(await page.getByLabel('Barangay',{exact:true}).inputValue()==='Bambang','Saved answer disappeared after reload.');
    await page.getByRole('button',{name:'Next',exact:true}).click();await page.getByRole('button',{name:'Previous',exact:true}).click();assert(await page.getByLabel('Barangay',{exact:true}).inputValue()==='Bambang','Step navigation discarded saved answer.');await shot(page,'profile-saved-'+mode+'-'+width);
   },approved);
   await run(mode+' civic report photo preview, submission and saved receipt',async()=>{
    await page.goto(origin+'/reports/new');await page.getByRole('heading',{name:'Report a concern',exact:true}).waitFor();await page.getByRole('radio').first().check();
    await page.locator('#report-title').fill('[TEST] Synthetic material road concern');await page.locator('#report-description').fill('Synthetic browser verification only. No real civic incident or service request.');
    await page.locator('input[type=file]').first().setInputFiles({name:'synthetic-concern.png',mimeType:'image/png',buffer:image});await page.getByRole('img',{name:'Photo evidence 1',exact:true}).waitFor();
    await page.locator('#report-barangay').fill('Bambang');await page.locator('#report-address').fill('Synthetic test location only');await page.locator('input[name=confirmed]').check();await page.getByRole('button',{name:'Submit report',exact:true}).click();await page.getByRole('heading',{name:'Salamat sa pakikilahok.',exact:true}).waitFor();
    await page.getByRole('link',{name:'View my report',exact:true}).click();await page.getByRole('heading',{name:'[TEST] Synthetic material road concern',exact:true}).waitFor();await shot(page,'report-saved-'+mode+'-'+width);
   },approved);
   await run(mode+' establishment draft retains annual answers and unknown workforce',async()=>{
    await page.goto(origin+'/establishment-survey');await page.getByRole('button',{name:'Add establishment',exact:true}).click();await page.getByLabel('Business name',{exact:true}).fill('Synthetic material '+mode);await page.getByLabel('Street / building / village',{exact:true}).fill('Synthetic test location');await page.getByLabel('Office type',{exact:true}).selectOption('MAIN');await page.getByLabel('Barangay',{exact:true}).selectOption('Bambang');await page.getByRole('button',{name:'Create establishment draft',exact:true}).click();await page.getByRole('status').filter({hasText:'Establishment draft created'}).waitFor();
    await page.getByRole('button',{name:'Next',exact:true}).click();await page.getByLabel('Principal products / services',{exact:true}).fill('Synthetic annual draft activity');await page.getByRole('button',{name:'Save draft',exact:true}).click();await page.getByRole('status').filter({hasText:'Draft saved'}).waitFor();await page.reload();await page.getByRole('button',{name:new RegExp('Synthetic material '+mode+' — Synthetic test location')}).click();await page.getByRole('button',{name:'Next',exact:true}).click();assert(await page.getByLabel('Principal products / services',{exact:true}).inputValue()==='Synthetic annual draft activity','Establishment annual draft disappeared.');await page.getByRole('button',{name:'Next',exact:true}).click();assert(await page.getByLabel('Total workers',{exact:true}).inputValue()==='','Unknown workforce must remain blank rather than fabricated zero.');await shot(page,'establishment-saved-'+mode+'-'+width);
   },approved);
   await run(mode+' census record detail keyboard focus and mapped import preview',async()=>{
    const page=admin.page;await page.goto(origin+'/admin/census');await theme(page,mode,width);await page.getByRole('button',{name:'View details and history'}).first().click();
    const dialog=page.getByRole('dialog');await dialog.waitFor();assert(await dialog.evaluate(el=>el.contains(document.activeElement)),'Census detail must receive focus.');await page.keyboard.press('Escape');await dialog.waitFor({state:'hidden'});
    await page.goto(origin+'/admin/census/imports');await page.getByRole('heading',{name:'Census imports and provenance',exact:true}).waitFor();
    await page.getByLabel(/Source file/).setInputFiles({name:'synthetic-material.csv',mimeType:'text/csv',buffer:Buffer.from('Reference,Barangay,Age,Education\nM1,Bambang,25-34,college\n')});await page.getByRole('button',{name:'Inspect source columns',exact:true}).click();
    await page.getByLabel('Map Age',{exact:true}).selectOption('ageGroup');await page.getByLabel('Map Education',{exact:true}).selectOption('educationLevel');await page.getByLabel('Stable dataset source name/code').fill('MATERIAL-SYNTHETIC-'+mode);await page.getByLabel('Source survey year',{exact:true}).fill('2025');await page.getByLabel('Activity name',{exact:true}).fill('Synthetic material preview');await page.getByLabel('Implementing office',{exact:true}).fill('PESO');
    await page.getByRole('button',{name:'Validate mapped import',exact:true}).click();await page.getByRole('heading',{name:'Validated preview',exact:true}).waitFor();await shot(page,'census-import-preview-'+mode+'-'+width);
   });
   await run(mode+' local captured password recovery preserves approval and revokes the old session',async()=>{
    const oldCookies=await ctx.cookies(origin),recovery=await context(width),recoveryPage=await recovery.newPage();await recoveryPage.goto(origin+'/forgot-password');await theme(recoveryPage,mode,width);await recoveryPage.locator('#recoveryEmail').fill(email);await recoveryPage.getByRole('button',{name:'Send reset email',exact:true}).click();await recoveryPage.getByRole('status').filter({hasText:/If that address has an account/}).waitFor();
    let mail;const deadline=Date.now()+20000;while(!mail&&Date.now()<deadline){if(fs.existsSync(config.mailCapture)){for(const file of fs.readdirSync(config.mailCapture).filter(name=>name.endsWith('.json'))){try{const item=JSON.parse(fs.readFileSync(path.join(config.mailCapture,file),'utf8'));if((item.to||item.email)===email)mail=item;}catch(error){if(!(error instanceof SyntaxError))throw error;}}}if(!mail)await recoveryPage.waitForTimeout(50);}assert(mail,'Local synthetic recovery capture did not arrive.');
    const resetUrl=mail.url||mail.text?.match(/https?:\/\/[^\s]+/)?.[0];assert(resetUrl&&new URL(resetUrl).origin===origin,'Recovery must stay on the guarded local preview.');await recoveryPage.goto(resetUrl);await recoveryPage.locator('#resetPassword').fill('Recovered-material-2026!');await recoveryPage.locator('#resetConfirmation').fill('Recovered-material-2026!');await recoveryPage.getByRole('button',{name:'Reset password',exact:true}).click();await recoveryPage.getByRole('status').filter({hasText:/Your password has been reset/}).waitFor();assert(!recoveryPage.url().includes('token'),'Reset secret must be removed from the browser URL.');
    const old=await context();await old.addCookies(oldCookies);assert((await old.request.get(origin+'/api/identity')).status()===401,'Password recovery must revoke the old session.');await recoveryPage.goto(origin+'/login');await recoveryPage.locator('#loginEmail').fill(email);await recoveryPage.locator('#loginPassword').fill('Recovered-material-2026!');await recoveryPage.getByRole('button',{name:/^log in$/i}).click();await recoveryPage.waitForURL(url=>url.pathname!=='/login');await recoveryPage.goto(origin+'/verification');await recoveryPage.getByRole('heading',{name:'ID review approved',exact:true}).waitFor();await shot(recoveryPage,'recovered-approved-'+mode+'-'+width);
   },approved);
  }
  await run('analytics stale-filter race, previous-view state and authorized CSV download',async()=>{
   const page=admin.page;await page.setViewportSize({width:1024,height:1000});await readyAnalytics(page);
   let firstStarted;const started=new Promise(resolve=>firstStarted=resolve);let releaseFirst;const gate=new Promise(resolve=>releaseFirst=resolve);let delayed=false;
   await page.route('**/api/admin/census/analytics?*',async route=>{if(!delayed&&new URL(route.request().url()).searchParams.get('barangay')==='Bambang'){delayed=true;const response=await route.fetch();firstStarted();await gate;try{await route.fulfill({response});}catch{/* Superseded request is correctly aborted. */}}else await route.continue();});
   const filter=page.getByRole('form',{name:'Analytics filters'}).getByLabel(/^Barangay/),apply=page.getByRole('button',{name:'Apply analytics filters',exact:true});
   await filter.selectOption('Bambang');await apply.click();await started;
   assert(await page.locator('[aria-label="Analytics overview"]').getAttribute('aria-busy')==='true','Previous applied view must be labelled while loading.');assert(!await page.getByRole('link',{name:'Export applied aggregates (CSV)',exact:true}).count(),'Export must be unavailable while stale or pending.');
   await filter.selectOption('Maahas');await apply.click();await page.waitForFunction(()=>document.querySelector('.elb-applied-summary')?.textContent.includes('Maahas'));releaseFirst();await page.waitForTimeout(250);await page.unroute('**/api/admin/census/analytics?*');
   assert((await page.locator('.elb-applied-summary').innerText()).includes('Maahas')&&new URL(page.url()).searchParams.get('barangay')==='Maahas','Late earlier response replaced newest applied filters.');
   const downloadEvent=page.waitForEvent('download');await page.getByRole('link',{name:'Export applied aggregates (CSV)',exact:true}).click();const download=await downloadEvent;const file=path.join(output,'synthetic-applied-aggregates.csv');await download.saveAs(file);assert(!(await download.failure()),'CSV download failed.');assert(fs.readFileSync(file,'utf8').includes('Maahas'),'CSV must describe applied authorized geography.');
   await page.getByRole('button',{name:'Reset all filters',exact:true}).first().click();await page.waitForFunction(()=>document.querySelector('[aria-label="Analytics overview"]')?.getAttribute('aria-busy')==='false'&&!new URLSearchParams(location.search).get('barangay'));await shot(page,'analytics-race-reset');
  });
  await run('touch map detail, 200 percent visual zoom and reflow remain operable',async()=>{
   const touch=await context(390),page=await touch.newPage();await touch.addCookies(cookies.admin);await readyAnalytics(page);
   const region=page.locator('[data-barangay-map][data-map-slot="3"] .elb-map-region[role=button]').first();await region.scrollIntoViewIfNeeded();
   // Concave geographic paths can have a bounding-box centre outside their
   // actual fill. Tap a genuine visible interior point instead of forcing an
   // event or letting an adjacent barangay receive the tap.
   const point=await region.evaluate(node=>{const box=node.getBBox(),matrix=node.getScreenCTM();for(const fractionY of [.5,.4,.6,.3,.7,.2,.8])for(const fractionX of [.5,.4,.6,.3,.7,.2,.8]){const local=new DOMPoint(box.x+box.width*fractionX,box.y+box.height*fractionY);if(!node.isPointInFill(local))continue;const screen=local.matrixTransform(matrix);if(document.elementFromPoint(screen.x,screen.y)===node)return{x:screen.x,y:screen.y};}return null;});assert(point,'A visible geographic interior point is required for the touch check.');await page.touchscreen.tap(point.x,point.y);
   const dialog=page.getByRole('dialog',{name:/Barangay details/i});await dialog.waitFor();assert(await dialog.evaluate(el=>el.contains(document.activeElement)),'Touch detail must receive focus.');await shot(page,'map-touch-detail');await page.keyboard.press('Escape');await dialog.waitFor({state:'hidden'});
   await page.setViewportSize({width:1440,height:1000});const cdp=await touch.newCDPSession(page);await cdp.send('Emulation.setPageScaleFactor',{pageScaleFactor:2});assert(await page.evaluate(()=>visualViewport.scale)>=1.99,'Visual zoom emulation was not applied.');await shot(page,'analytics-200-percent-visual-zoom');await cdp.send('Emulation.setPageScaleFactor',{pageScaleFactor:1});
   // A 1440px screen at 200% browser zoom has a 720 CSS-pixel layout viewport.
   // Check that reflow separately from the visual viewport pinch-zoom check.
   await page.setViewportSize({width:720,height:500});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2),'200 percent equivalent CSS viewport must reflow.');await page.getByRole('button',{name:'Reset all filters',exact:true}).first().click();await shot(page,'analytics-200-percent-equivalent-reflow');
  });
  await run('analytics Retry makes a new request and recovers a controlled server failure',async()=>{
   const page=admin.page;await readyAnalytics(page);let injected=false,reads=0;expectedFault=true;
   await page.route('**/api/admin/census/analytics?*',async route=>{reads++;if(!injected){injected=true;await route.fulfill({status:500,contentType:'application/json',body:JSON.stringify({error:'Synthetic recoverable analytics failure'})});}else await route.continue();});
   await page.getByRole('button',{name:'Reset all filters',exact:true}).first().click();await page.getByRole('alert').filter({hasText:'Synthetic recoverable analytics failure'}).waitFor();
   const before=reads;await page.getByRole('button',{name:'Retry analytics',exact:true}).click();await page.waitForFunction(()=>document.querySelector('[aria-label="Analytics overview"]')?.getAttribute('aria-busy')==='false'&&!document.querySelector('[role="alert"]'));
   assert(reads>before,'Retry did not issue a new analytics request.');assert(await page.getByRole('link',{name:'Export applied aggregates (CSV)',exact:true}).isVisible(),'Recovered applied data must restore export.');await page.unroute('**/api/admin/census/analytics?*');
  });
  await run('reduced motion retains visible state and controls across public and protected material pages',async()=>{
   const page=admin.page;await page.emulateMedia({reducedMotion:'reduce'});
   for(const route of ['/','/login','/admin','/admin/services/ui-service-1','/admin/census/analytics']){
    await page.goto(origin+route,{waitUntil:'networkidle'});await page.locator('main').first().waitFor();if(route.endsWith('/analytics'))await page.waitForFunction(()=>document.querySelector('[aria-label="Analytics overview"]')?.getAttribute('aria-busy')==='false');
    const moving=await page.locator('main, main *').evaluateAll(nodes=>nodes.filter(node=>{const style=getComputedStyle(node);return style.animationName!=='none'&&style.animationDuration.split(',').some(value=>parseFloat(value)>0.01)||style.transitionDuration.split(',').some(value=>parseFloat(value)>0.01);}).length);assert(moving===0,'Nonessential movement remains on '+route);assert(await page.locator('h1').first().isVisible(),'Reduced motion must retain page state.');
   }await page.emulateMedia({reducedMotion:'no-preference'});
  });
  await run('delayed obsolete forbidden response cannot erase newer authorized analytics',async()=>{
   const page=admin.page;await readyAnalytics(page);
   // Hold the old response JSON after fetch resolves. Aborting a request alone
   // cannot stop a response parser which already resolved, so this exercises
   // the generation guard at the state mutation boundary.
   await page.evaluate(()=>{const original=window.fetch;window.__flat2OriginalFetch=original;let release;window.__flat2OldJsonGate=new Promise(resolve=>release=resolve);window.__flat2ReleaseOldJson=release;window.__flat2OldJsonStarted=false;let intercepted=false;
    window.fetch=async(input,init)=>{const url=new URL(typeof input==='string'?input:input.url,location.origin);if(!intercepted&&url.pathname==='/api/admin/census/analytics'&&url.searchParams.get('barangay')==='Bambang'){intercepted=true;return {ok:false,status:403,json:async()=>{window.__flat2OldJsonStarted=true;await window.__flat2OldJsonGate;return {error:'Synthetic delayed obsolete forbidden response'};}};}return original(input,init);};
   });
   const filter=page.getByRole('form',{name:'Analytics filters'}).getByLabel(/^Barangay/),apply=page.getByRole('button',{name:'Apply analytics filters',exact:true});await filter.selectOption('Bambang');await apply.click();await page.waitForFunction(()=>window.__flat2OldJsonStarted);
   await filter.selectOption('Maahas');await apply.click();await page.waitForFunction(()=>document.querySelector('.elb-applied-summary')?.textContent.includes('Maahas')&&document.querySelector('[aria-label="Analytics overview"]')?.getAttribute('aria-busy')==='false');
   await page.evaluate(()=>window.__flat2ReleaseOldJson());await page.waitForTimeout(200);
   assert((await page.locator('.elb-applied-summary').innerText()).includes('Maahas'),'Obsolete forbidden response erased new authorized data.');assert(await page.getByRole('link',{name:'Export applied aggregates (CSV)',exact:true}).isVisible(),'Obsolete response removed current export.');
   assert(new URL(await page.getByRole('link',{name:'Export applied aggregates (CSV)',exact:true}).getAttribute('href'),origin).searchParams.get('barangay')==='Maahas','Export lost newest filter generation.');
   await page.evaluate(()=>{window.fetch=window.__flat2OriginalFetch;delete window.__flat2OriginalFetch;delete window.__flat2OldJsonGate;delete window.__flat2ReleaseOldJson;delete window.__flat2OldJsonStarted;});await shot(page,'analytics-delayed-obsolete-forbidden');
  });
  await run('service draft autosave, synthetic PDF upload and protected document preview',async()=>{
   const page=citizen.page;await page.goto(origin+'/services/requests/ui-state-FORM_OPEN',{waitUntil:'commit'});await page.locator('main').first().waitFor();await page.locator('textarea').first().waitFor();await page.waitForFunction(()=>{const input=document.querySelector('textarea');return input&&Object.keys(input).some(key=>key.startsWith('__reactProps$'));},{},{timeout:120000});
   const draft='Synthetic material draft retained after reload '+runId+'.',textarea=page.locator('textarea').first(),draftResponse=page.waitForResponse(response=>response.request().method()==='PATCH'&&new URL(response.url()).pathname==='/api/services/requests/ui-state-FORM_OPEN'&&response.request().postDataJSON()?.action==='SAVE_DRAFT'&&response.request().postDataJSON()?.purpose===draft,{timeout:30000});await textarea.fill(draft);assert((await draftResponse).ok(),'Service autosave request failed.');await page.getByText('Saved',{exact:true}).first().waitFor();await page.reload({waitUntil:'domcontentloaded'});await textarea.waitFor();await page.waitForFunction(expected=>document.querySelector('textarea')?.value===expected,draft);assert(await textarea.inputValue()===draft,'Service autosave discarded typed draft.');
   const stream='BT /F1 16 Tf 40 740 Td (SYNTHETIC BROWSER TEST DOCUMENT) Tj ET';
   const objects=['<</Type/Catalog/Pages 2 0 R>>','<</Type/Pages/Count 1/Kids[3 0 R]>>','<</Type/Page/Parent 2 0 R/MediaBox[0 0 612 792]/Resources<</Font<</F1 4 0 R>>>>/Contents 5 0 R>>','<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>','<</Length '+stream.length+'>>\nstream\n'+stream+'\nendstream'];
   let body='%PDF-1.4\n';const offsets=[0];for(const [index,object]of objects.entries()){offsets.push(Buffer.byteLength(body));body+=(index+1)+' 0 obj\n'+object+'\nendobj\n';}const xref=Buffer.byteLength(body);body+='xref\n0 6\n0000000000 65535 f \n'+offsets.slice(1).map(offset=>String(offset).padStart(10,'0')+' 00000 n \n').join('')+'trailer\n<</Size 6/Root 1 0 R>>\nstartxref\n'+xref+'\n%%EOF';const pdf=Buffer.from(body);
   const fileName='synthetic-material-'+runId+'.pdf',response=page.waitForResponse(r=>r.request().method()==='POST'&&r.url().endsWith('/documents'));await page.locator('input[type=file]').first().setInputFiles({name:fileName,mimeType:'application/pdf',buffer:pdf});assert((await response).status()===201,'Synthetic service PDF upload failed.');
   const link=page.getByRole('link',{name:fileName,exact:true}).first();await link.waitFor();const href=await link.getAttribute('href');const document=await citizen.ctx.request.get(origin+href);assert(document.status()===200&&document.headers()['content-type']==='application/pdf','Owner PDF response failed.');const storedPDF=await document.body();assert(storedPDF.subarray(0,5).toString()==='%PDF-','Protected document must contain the uploaded PDF.');assert(createHash('sha256').update(storedPDF).digest('hex')===createHash('sha256').update(pdf).digest('hex'),'Protected PDF must preserve the exact uploaded bytes.');assert((await guest.request.get(origin+href)).status()===401,'Guest must be denied private service PDF.');
   const opened=page.waitForEvent('popup'),viewedResponse=citizen.ctx.waitForEvent('response',{predicate:response=>response.url()===origin+href&&response.request().isNavigationRequest(),timeout:30000});await page.getByRole('link',{name:'Open PDF / download '+fileName,exact:true}).first().click();const viewer=await opened,viewed=await viewedResponse;assert(viewed.status()===200&&viewed.headers()['content-type']==='application/pdf','PDF viewer must receive the authorized PDF.');assert(/private|no-store/.test(viewed.headers()['cache-control']||'')&&viewed.headers()['x-content-type-options']==='nosniff','PDF viewer response must retain private storage headers.');await viewer.waitForURL(url=>url.href===origin+href||url.protocol==='chrome-extension:',{waitUntil:'commit',timeout:30000});await viewer.close();const screenshot='service-document-upload.png';await page.screenshot({path:path.join(output,screenshot),fullPage:true});screenshots.push(screenshot);
  });
  await run('map alias drawer labels and applies the exact historical source filter',async()=>{
   const page=admin.page;
   for(const [mode,width]of[['light',1440],['dark',768],['oled',390]]){
    await readyAnalytics(page);await theme(page,mode,width);await page.waitForFunction(()=>document.querySelector('[aria-label="Analytics overview"]')?.getAttribute('aria-busy')==='false');
    const response=await admin.ctx.request.get(origin+'/api/admin/census/analytics');assert(response.ok(),'Authorized alias context request failed.');const body=await response.json(),cell=body.groups.flatMap(group=>group.geography?.cells||[]).find(cell=>cell.filterKey&&cell.filterKey!==cell.barangay);assert(cell,'Synthetic source must exercise a historical geography name.');
    const region=page.locator('[data-barangay-map][data-map-slot="3"] [data-region-code="'+cell.code+'"]');await region.focus();await page.keyboard.press('Enter');const dialog=page.getByRole('dialog',{name:'Barangay details',exact:true});await dialog.waitFor();assert(await dialog.evaluate(el=>el.contains(document.activeElement)),'Alias detail must receive keyboard focus.');
    await page.keyboard.press('Escape');await dialog.waitFor({state:'hidden'});assert(await region.evaluate(el=>el===document.activeElement),'Alias detail must return focus.');await page.keyboard.press('Enter');await dialog.waitFor();assert(await dialog.getByText(/This filter uses the source name/).isVisible(),'Historical source alias needs explicit exact-filter context.');
    await shot(page,'map-alias-detail-'+mode+'-'+width);await dialog.getByRole('button',{name:'Apply '+cell.filterKey+' filter',exact:true}).click();await page.waitForFunction(expected=>new URLSearchParams(location.search).get('barangay')===expected,cell.filterKey);assert((await page.locator('.elb-applied-summary').innerText()).includes(cell.filterKey),'Applied filter label must preserve historical source key.');assert(new URL(await page.getByRole('link',{name:'Export applied aggregates (CSV)',exact:true}).getAttribute('href'),origin).searchParams.get('barangay')===cell.filterKey,'Alias export must retain exact source filter.');
    await page.getByRole('button',{name:'Reset all filters',exact:true}).first().click();await page.waitForFunction(()=>document.querySelector('[aria-label="Analytics overview"]')?.getAttribute('aria-busy')==='false'&&!new URLSearchParams(location.search).get('barangay'));
   }
  });
  await run('no unexpected material browser runtime, console or network failures',async()=>{
   assert(diagnostics.runtime.length===0,'Unexpected runtime error: '+diagnostics.runtime.map(x=>x.message).join('; '));
   assert(!diagnostics.responses.some(x=>x.status>=500&&!x.expectedFault),'Unexpected server error.');assert(!diagnostics.requests.some(x=>!x.expectedFault),'Unexpected failed request.');
   const baseline=diagnostics.console.filter(x=>/^\/api\/identity\/documents\//.test(x.path)&&/^Applying inline style violates the following Content Security Policy directive 'default-src 'none''/.test(x.message));
   const unexpected=diagnostics.console.filter(x=>!x.expectedFault&&!/^Failed to load resource: the server responded with a status of (401|403|404|409)/.test(x.message)&&!baseline.includes(x));assert(!unexpected.length,'Unexpected console errors: '+unexpected.map(x=>x.message).join('; '));
  });
 }finally{await Promise.all(contexts.map(ctx=>ctx.close()));}
 return {syntheticOnly:true,checks,screenshots,diagnostics,baselinePreviewDiagnostics:diagnostics.console.filter(x=>/^\/api\/identity\/documents\//.test(x.path)&&/^Applying inline style violates the following Content Security Policy directive 'default-src 'none''/.test(x.message)),privateCookies:cookies};
}
