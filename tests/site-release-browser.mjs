// Material automated acceptance on the guarded local --serve fixture only.
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.ELB_PLAYWRIGHT_MODULE||'playwright');
const scratch=path.resolve('.scratch/site-release');
const fixture=JSON.parse(await fs.readFile(path.join(scratch,'browser-context.json'),'utf8'));
if(fixture.origin!=='http://localhost:3115'||!/^elb_site_release_test_[a-f0-9]{32}$/.test(fixture.database))throw Error('Refusing unguarded browser target.');
// The disposable runner writes fixtures before Next finishes starting. Wait for
// the actual auth route, rather than turning that startup race into a UI failure.
const readyDeadline=Date.now()+120000;
while(true){
  try{if((await fetch(fixture.origin+'/api/auth/ok',{signal:AbortSignal.timeout(10000)})).ok)break;}
  catch{/* Startup is not ready yet; the bounded condition below owns retries. */}
  assert.ok(Date.now()<readyDeadline,'guarded browser server became ready');
  await new Promise(resolve=>setTimeout(resolve,50));
}
const browser=await chromium.launch({channel:'chrome',headless:true});
const results=[],errors=[],network=[],contexts=[];
const pendingLabel='pending'+'n'.repeat(20)+Date.now();
const pendingEmail='browser.'+pendingLabel+'@example.test';
const check=(name,value)=>{assert.ok(value,name);results.push(name);};
async function context(viewport={width:1440,height:1000}){
  // Each role context represents a separate client. Keep production rate limits
  // enabled without making unrelated synthetic actors share one loopback IP.
  const context=await browser.newContext({viewport,reducedMotion:'reduce',hasTouch:viewport.width<1024,
    extraHTTPHeaders:{'x-forwarded-for':'192.0.2.'+(contexts.length+10)}});contexts.push(context);
  context.on('page',page=>{
    page.on('pageerror',error=>errors.push({path:new URL(page.url()).pathname,message:error.message}));
    page.on('console',message=>{if(message.type()==='error')errors.push({path:new URL(page.url()).pathname,message:message.text()});});
    page.on('response',response=>{if(response.status()>=400)network.push({path:new URL(response.url()).pathname,status:response.status()});});
  });
  return context;
}
async function login(page,label,password='Site-browser-2026!'){
  await page.goto(fixture.origin+'/login');
  await page.locator('input[name=email]').fill('browser.'+label+'@example.test');
  await page.locator('input[name=password]').fill(password);
  await page.locator('button[type=submit]').click();
  await page.waitForURL(url=>url.pathname!=='/login');
}
async function appearance(page,theme,width){
  await page.setViewportSize({width,height:width<768?900:1000});
  await page.evaluate(theme=>localStorage.setItem('elb-appearance',theme),theme);await page.reload();
  await page.locator('h1').first().waitFor();
  check(`${theme}/${width}: persisted first-paint theme`,await page.evaluate(theme=>document.documentElement.dataset.theme===theme,theme));
  check(`${theme}/${width}: no horizontal page overflow`,await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
}
try{
  const guest=await context(),guestPage=await guest.newPage();
  await guestPage.goto(fixture.origin+'/verification');await guestPage.waitForURL(url=>url.pathname==='/login');check('anonymous verification redirects to login',true);
  await guestPage.goto(fixture.origin+'/forgot-password');
  for(const [theme,width]of[['light',1440],['dark',768],['oled',390]]){
    await appearance(guestPage,theme,width);
    check(`${theme}/${width}: recovery email visible`,await guestPage.locator('#recoveryEmail').isVisible());
    await guestPage.locator('#recoveryEmail').focus();await guestPage.keyboard.press('Tab');
    check(`${theme}/${width}: recovery submit receives keyboard focus`,await guestPage.getByRole('button',{name:'Send reset email'}).evaluate(el=>el===document.activeElement));
  }
  const citizen=await context({width:390,height:900}),citizenPage=await citizen.newPage();
  await citizenPage.goto(fixture.origin+'/register');
  for(const [name,value]of Object.entries({firstName:'Synthetic',lastName:'Browser',phoneNumber:'09171234567',email:pendingEmail,password:'Site-browser-2026!',confirmPassword:'Site-browser-2026!'}))await citizenPage.locator('input[name='+name+']').fill(value);
  await citizenPage.getByRole('checkbox').first().check();await citizenPage.getByRole('checkbox').last().check();await citizenPage.locator('button[type=submit]').click();await citizenPage.waitForURL(url=>url.pathname==='/verification');check('browser signup creates a limited account and opens ID status',true);
  check('limited Citizen can sign out',(await citizen.request.post(fixture.origin+'/api/auth/sign-out',{headers:{origin:fixture.origin,'content-type':'application/json'},data:{}})).status()===200);await login(citizenPage,pendingLabel);
  check('pending login directs to status',new URL(citizenPage.url()).pathname==='/verification');
  await citizenPage.getByRole('heading',{name:'ID submission required',exact:true}).waitFor();
  check('submission required and estimated window visible',await citizenPage.getByText(/24–72 hours after submission/).isVisible());
  for(const route of ['/account','/reports','/reports/new','/services/requests','/community-survey','/establishment-survey','/dashboard']){
    await citizenPage.goto(fixture.origin+route);await citizenPage.waitForURL(url=>url.pathname==='/verification');check('pending direct page denied: '+route,true);
  }
  for(const route of ['/api/reports','/api/notifications','/api/opportunities/me','/api/establishment-surveys']){
    const response=await citizen.request.get(fixture.origin+route);check('pending direct API denied: '+route,response.status()===403);
  }
  await citizenPage.goto(fixture.origin+'/services/certificate-of-residency');await citizenPage.getByRole('heading',{name:'ID review required',exact:true}).waitFor();check('pending Citizen sees verification guidance instead of service intake',true);
  await citizenPage.goto(fixture.origin+'/');
  await citizenPage.getByRole('link',{name:'View verification status'}).waitFor();
  check('pending homepage shows status entry, no personalized aggregates',await citizenPage.getByRole('link',{name:'View verification status'}).isVisible()&&!await citizenPage.getByRole('heading',{name:/Your latest concerns/}).count());
  await citizenPage.goto(fixture.origin+'/opportunities');await citizenPage.locator('h1').first().waitFor();check('pending can browse public opportunities',true);
  await citizenPage.goto(fixture.origin+'/verification');
  await citizenPage.locator('input[name=documentLabel]').fill('Synthetic browser test ID');
  await citizenPage.locator('input[type=file]').setInputFiles(path.join(scratch,'synthetic-browser-id.png'));
  await citizenPage.getByRole('button',{name:'Submit ID for review'}).tap();
  await citizenPage.getByRole('heading',{name:'Pending Admin review',exact:true}).waitFor();check('upload becomes pending',true);
  for(const [theme,width]of[['light',1440],['dark',768],['oled',390]])await appearance(citizenPage,theme,width);
  const documentLink=citizenPage.getByRole('link',{name:'Open protected ID image (new tab)'}).first();
  const documentPath=await documentLink.getAttribute('href');
  const image=await citizen.request.get(fixture.origin+documentPath);check('owner preview uses private safe JPEG',image.status()===200&&image.headers()['content-type']==='image/jpeg'&&image.headers()['x-content-type-options']==='nosniff');
  const previewPage=await citizen.newPage();await previewPage.goto(fixture.origin+documentPath);await previewPage.locator('img').waitFor();check('protected preview actually renders in browser',await previewPage.locator('img').evaluate(image=>image.complete&&image.naturalWidth===600));await previewPage.close();
  check('guest cannot retrieve ID', (await guest.request.get(fixture.origin+documentPath)).status()===401);
  const staff=await context(),staffPage=await staff.newPage();await login(staffPage,'staff');
  check('Staff login retains LGU access',new URL(staffPage.url()).pathname==='/admin');
  check('Staff cannot retrieve Citizen ID',(await staff.request.get(fixture.origin+documentPath)).status()===404);
  check('Staff cannot review Citizen ID',(await staff.request.get(fixture.origin+'/api/admin/identity')).status()===403);
  const admin=await context(),adminPage=await admin.newPage();await login(adminPage,'admin');
  await adminPage.goto(fixture.origin+'/admin/citizens/verification');
  await adminPage.locator('input[name=q]').fill(pendingEmail);await adminPage.getByRole('button',{name:'Apply filters'}).click();
  await adminPage.getByRole('link',{name:/Open review for Synthetic Browser/}).click();
  await adminPage.getByRole('link',{name:'Open protected ID image (new tab)'}).waitFor();
  check('Admin sees submitted snapshot and protected preview',await adminPage.getByRole('link',{name:'Open protected ID image (new tab)'}).isVisible());
  await adminPage.getByText('Details recorded with this document',{exact:true}).click();check('snapshot email visible',await adminPage.getByText(pendingEmail,{exact:true}).count()>0);
  const stale=await admin.newPage();await stale.goto(adminPage.url());
  await adminPage.locator('select[name=decision]').selectOption('CORRECTIONS_REQUIRED');await adminPage.locator('textarea[name=reason]').fill('Synthetic correction: please submit the updated test image.');await adminPage.getByRole('button',{name:'Save review decision'}).click();
  await adminPage.getByText('Corrections requested',{exact:true}).first().waitFor();
  await citizenPage.reload();await citizenPage.getByRole('button',{name:'Submit ID for review'}).waitFor();check('correction reason and resubmission available',await citizenPage.getByText('Synthetic correction: please submit the updated test image.',{exact:true}).isVisible());
  await citizenPage.locator('input[name=documentLabel]').fill('Corrected synthetic browser ID');await citizenPage.locator('input[type=file]').setInputFiles(path.join(scratch,'synthetic-browser-id.png'));await citizenPage.getByRole('button',{name:'Submit ID for review'}).click();await citizenPage.getByRole('heading',{name:'Pending Admin review',exact:true}).waitFor();
  await stale.locator('select[name=decision]').selectOption('APPROVED');await stale.locator('textarea[name=reason]').fill('This stale review must not approve a new document.');
  const conflict=stale.waitForResponse(response=>response.url().includes('/api/admin/identity/')&&response.request().method()==='POST');await stale.getByRole('button',{name:'Save review decision'}).click();check('stale review is a conflict',(await conflict).status()===409);
  await adminPage.reload();await adminPage.locator('select[name=decision]').selectOption('APPROVED');await adminPage.locator('textarea[name=reason]').fill('Reviewed exact corrected synthetic ID against submitted details.');await adminPage.getByRole('button',{name:'Save review decision'}).click();await adminPage.getByText('ID review approved',{exact:true}).first().waitFor();
  await citizenPage.reload();await citizenPage.getByRole('link',{name:'Open your Citizen account'}).waitFor();check('approved Citizen sees account entry',true);
  await citizenPage.goto(fixture.origin+'/account');check('same account now gains authorized features',new URL(citizenPage.url()).pathname==='/account');
  const legacy=await context(),legacyPage=await legacy.newPage();await login(legacyPage,'legacy');await legacyPage.goto(fixture.origin+'/verification');await legacyPage.getByRole('heading',{name:'Existing account — legacy access',exact:true}).waitFor();check('legacy classification does not claim ID verification',true);
  const oldSession=await citizen.cookies();
  await guestPage.goto(fixture.origin+'/forgot-password');await guestPage.locator('#recoveryEmail').fill(pendingEmail);await guestPage.getByRole('button',{name:'Send reset email'}).click();await guestPage.getByRole('status').filter({hasText:/If that address has an account/}).waitFor();
  // The public response deliberately precedes email delivery. Wait for the
  // private capture rather than assuming it exists when the status appears.
  let mail;
  const captureDeadline=Date.now()+15000;
  while(!mail&&Date.now()<captureDeadline){
    try{
      const messages=await Promise.all((await fs.readdir(fixture.capture)).filter(x=>x.endsWith('.json')).map(async name=>{
        try{return JSON.parse(await fs.readFile(path.join(fixture.capture,name),'utf8'));}
        catch(error){if(error instanceof SyntaxError)return null;throw error;}
      }));
      mail=messages.filter(item=>item&&(item.to||item.email)===pendingEmail).at(-1);
    }catch(error){if(error.code!=='ENOENT')throw error;}
    if(!mail)await new Promise(resolve=>setTimeout(resolve,25));
  }
  assert.ok(mail,'captured browser reset mail arrived after the public response');
  const link=mail.url||mail.text?.match(/https?:\/\/[^\s]+/)?.[0];assert.ok(link,'capture contains private reset link');
  await guestPage.goto(link);await guestPage.locator('#resetPassword').waitFor();await guestPage.locator('#resetPassword').fill('Changed-browser-2026!');await guestPage.locator('#resetConfirmPassword').fill('Changed-browser-2026!');await guestPage.getByRole('button',{name:'Reset password',exact:true}).click();await guestPage.getByRole('status').filter({hasText:/Your password has been reset/}).waitFor();
  check('reset secret removed from browser URL',!guestPage.url().includes('token'));
  const previous=await context();await previous.addCookies(oldSession);check('successful reset revokes old browser session',(await previous.request.get(fixture.origin+'/api/identity')).status()===401);
  await login(guestPage,pendingLabel,'Changed-browser-2026!');await guestPage.goto(fixture.origin+'/verification');await guestPage.getByRole('heading',{name:'ID review approved',exact:true}).waitFor();check('password recovery preserves exact approval classification',true);
  for(const [theme,width]of[['light',1440],['dark',768],['oled',390]]){
    await appearance(adminPage,theme,width);await adminPage.screenshot({path:path.join(scratch,`review-${theme}-${width}.png`),fullPage:true});
  }
  await guestPage.setViewportSize({width:390,height:900});await guestPage.goto(fixture.origin+'/verification');await guestPage.getByRole('heading',{name:'ID review approved',exact:true}).waitFor();await guestPage.screenshot({path:path.join(scratch,'verification-mobile.png'),fullPage:true});
  check('no unexpected server/network failures',!network.some(row=>row.status>=500));
  // Browser consoles report intentional denied API requests as resource errors.
  const expectedPreviewDiagnostics=errors.filter(row=>/^\/api\/identity\/documents\//.test(row.path)&&row.message.startsWith("Applying inline style violates the following Content Security Policy directive 'default-src 'none''"));
  const unexpected=errors.filter(row=>!expectedPreviewDiagnostics.includes(row)&&!/Failed to load resource: the server responded with a status of (401|403|404|409)/.test(row.message));
  check('no unexpected browser console/runtime errors',unexpected.length===0);
  await fs.writeFile(path.join(scratch,'browser-results.json'),JSON.stringify({results,checks:results.length,errors,network,expectedPreviewDiagnostics,unexpectedErrors:unexpected,manualUserAcceptance:'deferred'},null,2));
  console.log(JSON.stringify({checks:results.length,unexpectedConsoleErrors:unexpected.length,unexpectedServerErrors:network.filter(x=>x.status>=500).length}));
}catch(error){await fs.writeFile(path.join(scratch,'browser-failure.json'),JSON.stringify({failure:error.message,results,errors,network},null,2));throw error;}
finally{await Promise.all(contexts.map(context=>context.close()));await browser.close();}
