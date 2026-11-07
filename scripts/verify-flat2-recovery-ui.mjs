// UI-only recovery verification against an explicitly guarded disposable capture preview.
import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import {randomUUID} from 'node:crypto';
const args=process.argv.slice(2),option=(key,fallback)=>{const i=args.indexOf(key);return i<0?fallback:args[i+1];};
if(!option('--state'))throw Error('An explicit private state is required.');
const state=JSON.parse(fs.readFileSync(path.resolve(option('--state')),'utf8')),env=state.env,target=new URL(env.DATABASE_URL),origin=env.BETTER_AUTH_URL;
const capture=path.resolve(env.PASSWORD_RESET_CAPTURE_DIR||''),captureRoot=path.resolve('.scratch/site-release/mail');
if(state.cleaned||state.migrationExit!==0||target.protocol!=='mysql:'||!['localhost','127.0.0.1'].includes(target.hostname)||!/^elb_site_release_test_[a-z0-9_]+$/.test(state.name)||target.pathname!=='/'+state.name||env.ELB_SITE_RELEASE_TEST_DATABASE!=='true'||origin!=='http://localhost:3118'||env.RESEND_API_KEY||env.ELB_PASSWORD_RESET_TRANSPORT!=='capture'||!capture.startsWith(captureRoot+path.sep))throw Error('Guarded local recovery capture preview required.');
const output=path.resolve(option('--output','.scratch/release-2/browser/final-recovery-ui'));fs.mkdirSync(output,{recursive:true});
const require=createRequire(import.meta.url),{chromium}=require(path.resolve(option('--playwright','node_modules/playwright')));
const checks=[],screenshots=[],diagnostics={runtime:[],console:[],responses:[]};
let phase='setup',activePage;const save=completed=>fs.writeFileSync(path.join(output,'recovery-summary.json'),JSON.stringify({syntheticOnly:true,delivery:'local-capture-only',realMailSent:false,completed,checks,screenshots,diagnostics},null,2));
const assert=(condition,message)=>{if(!condition)throw Error(message);};
async function check(name,fn){phase=name;try{await fn();checks.push({name,status:'passed'});return true;}catch(e){const locator=String(e.message).match(/waiting for ([^\n]+)/)?.[1];checks.push({name,status:'failed',message:String(e.message).split('\n')[0],...(locator?{locator}: {})});if(activePage)await activePage.screenshot({path:path.join(output,'failure-'+checks.length+'.png'),fullPage:true}).catch(()=>{});return false;}finally{save(false);console.log(JSON.stringify({progress:checks.length,last:checks.at(-1)}));}}
const browser=await chromium.launch({channel:'chrome',headless:true});
try{
for(const [mode,width]of[['light',1440],['dark',768],['oled',390]]){
 if(option('--only-mode')&&option('--only-mode')!==mode)continue;
 const contexts=[];let identity,oldCookies,resetUrl;const id=randomUUID().replaceAll('-',''),email='recovery-ui-'+mode+'-'+id+'@example.test',password='Synthetic-old-password-2026!',newPassword='Synthetic-recovered-2026!';
 const context=async()=>{const ctx=await browser.newContext({viewport:{width,height:1000},hasTouch:width<1024,extraHTTPHeaders:{'x-forwarded-for':'192.0.2.'+(150+checks.length)}});contexts.push(ctx);await ctx.addInitScript(({value,expectedOrigin})=>{if(location.origin===expectedOrigin)localStorage.setItem('elb-appearance',value);},{value:mode,expectedOrigin:origin});ctx.on('page',p=>{p.setDefaultTimeout(30000);p.setDefaultNavigationTimeout(180000);p.on('pageerror',e=>diagnostics.runtime.push({phase,message:e.message}));p.on('console',m=>{if(m.type()==='error')diagnostics.console.push({phase,message:m.text()});});p.on('response',r=>{if(r.status()>=500)diagnostics.responses.push({phase,status:r.status(),path:new URL(r.url()).pathname});});});return ctx;};
 const shot=async(p,name)=>{assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2),'Recovery content overflows viewport.');const file=mode+'-'+name+'.png';await p.screenshot({path:path.join(output,file),fullPage:true});screenshots.push(file);};
 try{
 const original=await context(),page=await original.newPage();activePage=page;
 const registered=await check(mode+' registration establishes restricted Citizen',async()=>{
  await page.goto(origin+'/register',{waitUntil:'networkidle'});
  for(const [name,value]of Object.entries({firstName:'Synthetic',lastName:'Recovery',phoneNumber:'09171234567',email,password,confirmPassword:password}))await page.locator('input[name='+name+']').fill(value);
  await page.getByRole('checkbox').first().check();await page.getByRole('checkbox').last().check();await page.locator('button[type=submit]').click();await page.waitForURL(u=>u.pathname==='/verification');await page.waitForLoadState('networkidle');
  await page.getByRole('heading',{name:'ID submission required',exact:true}).waitFor();const response=await original.request.get(origin+'/api/identity');assert(response.ok(),'Restricted identity must be readable by its owner.');identity=await response.json();assert(identity.role==='CITIZEN'&&identity.identityStatus==='SUBMISSION_REQUIRED','Synthetic account must be restricted Citizen.');oldCookies=await original.cookies(origin);await shot(page,'restricted');
 });
 if(!registered)continue;
 const recovered=await context(),recoveryPage=await recovered.newPage();activePage=recoveryPage;
 const captured=await check(mode+' recovery request returns generic confirmation and captures mail locally',async()=>{
  await recoveryPage.goto(origin+'/forgot-password',{waitUntil:'networkidle'});await recoveryPage.locator('#recoveryEmail').fill(email);await recoveryPage.getByRole('button',{name:'Send reset email',exact:true}).click();await recoveryPage.getByRole('status').filter({hasText:/If that address has an account/}).waitFor();
  let mail;const deadline=Date.now()+30000;while(!mail&&Date.now()<deadline){if(fs.existsSync(capture))for(const file of fs.readdirSync(capture).filter(n=>n.endsWith('.json'))){const item=JSON.parse(fs.readFileSync(path.join(capture,file),'utf8'));if(item.to===email)mail=item;}if(!mail)await recoveryPage.waitForTimeout(100);}
  assert(mail,'Local capture did not arrive.');resetUrl=mail.url;assert(resetUrl&&new URL(resetUrl).origin===origin,'Capture must point to guarded preview.');await shot(recoveryPage,'generic-request');
 });
 if(!captured)continue;
 const reset=await check(mode+' captured link resets password and removes URL token',async()=>{
  await recoveryPage.goto(resetUrl,{waitUntil:'networkidle'});await recoveryPage.locator('#resetPassword').fill(newPassword);await recoveryPage.locator('#resetConfirmPassword').fill(newPassword);await recoveryPage.getByRole('button',{name:'Reset password',exact:true}).click();await recoveryPage.getByRole('status').filter({hasText:/Your password has been reset/}).waitFor({timeout:120000});assert(!new URL(recoveryPage.url()).searchParams.has('token'),'Reset token must be removed from URL.');await shot(recoveryPage,'reset-complete');
 });
 if(!reset)continue;
 await check(mode+' recovery revokes old sessions and preserves role and restricted ID state',async()=>{
  const old=await context();await old.addCookies(oldCookies);assert((await old.request.get(origin+'/api/identity')).status()===401,'Old session must be revoked.');
  await recoveryPage.goto(origin+'/login',{waitUntil:'networkidle'});await recoveryPage.locator('#loginEmail').fill(email);await recoveryPage.locator('#loginPassword').fill(newPassword);await recoveryPage.getByRole('button',{name:'Sign in',exact:true}).click();await recoveryPage.waitForURL(u=>u.pathname!=='/login');
  const response=await recovered.request.get(origin+'/api/identity');assert(response.ok(),'Recovered session must be authorized.');const after=await response.json();assert(after.id===identity.id&&after.role===identity.role&&after.identityStatus===identity.identityStatus,'Recovery must retain account identity, Citizen role and restricted ID state.');await recoveryPage.goto(origin+'/verification',{waitUntil:'networkidle'});await recoveryPage.getByRole('heading',{name:'ID submission required',exact:true}).waitFor();await shot(recoveryPage,'restricted-preserved');
 });
 await check(mode+' consumed token is rejected by reset UI',async()=>{
  await recoveryPage.goto(resetUrl,{waitUntil:'networkidle'});await recoveryPage.locator('#resetPassword').fill('Synthetic-token-reuse-2026!');await recoveryPage.locator('#resetConfirmPassword').fill('Synthetic-token-reuse-2026!');await recoveryPage.getByRole('button',{name:'Reset password',exact:true}).click();await recoveryPage.getByRole('alert').filter({hasText:/invalid, expired or already used/}).waitFor();await shot(recoveryPage,'token-reuse-rejected');
 });
 }finally{await Promise.all(contexts.map(ctx=>ctx.close()));}
}
await check('no unexpected recovery runtime or server failures',async()=>{assert(!diagnostics.runtime.length,'Unexpected recovery runtime failure.');assert(!diagnostics.responses.length,'Unexpected recovery server failure.');const unexpected=diagnostics.console.filter(x=>!/^Failed to load resource: the server responded with a status of (400|401|403|404|422)/.test(x.message));assert(!unexpected.length,'Unexpected recovery console failure.');});
save(true);console.log(JSON.stringify({passed:checks.filter(x=>x.status==='passed').length,failed:checks.filter(x=>x.status==='failed').length}));if(checks.some(x=>x.status==='failed'))process.exitCode=1;
}finally{await browser.close();}
