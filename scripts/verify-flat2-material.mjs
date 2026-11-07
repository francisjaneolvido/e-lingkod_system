// Real UI operations on an already running, explicitly guarded disposable preview.
import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import {randomUUID} from 'node:crypto';
import {runMaterialBrowser} from '../tests/flat2-material-browser.mjs';
const args=process.argv.slice(2);
const option=(key,fallback)=>{const i=args.indexOf(key);return i<0?fallback:args[i+1];};
const statePath=path.resolve(option('--state',''));
if(!option('--state'))throw Error('Explicit private --state required.');
const state=JSON.parse(fs.readFileSync(statePath,'utf8'));
const env=state.env,target=new URL(env.DATABASE_URL),origin=env.BETTER_AUTH_URL;
if(state.cleaned||target.protocol!=='mysql:'||!['localhost','127.0.0.1'].includes(target.hostname)||!/^\/elb_b3_test_[a-f0-9]{32}$/.test(target.pathname)||target.pathname!=='/'+state.name||env.ELB_B3_TEST_DATABASE!==state.name||origin!=='http://localhost:3117')throw Error('Only existing guarded disposable Release 2 preview is permitted.');
if(env.RESEND_API_KEY||env.ELB_PASSWORD_RESET_TRANSPORT!=='capture'||!env.PASSWORD_RESET_CAPTURE_DIR)throw Error('External delivery must be disabled and local capture configured.');
const output=path.resolve(option('--output','.scratch/release-2/browser/final-material'));
fs.mkdirSync(output,{recursive:true});
const require=createRequire(import.meta.url);
const {chromium}=require(path.resolve(option('--playwright','node_modules/playwright')));
const sharp=require('sharp');
const image=await sharp({create:{width:600,height:400,channels:3,background:'#ccddee'}}).png().toBuffer();
const browser=await chromium.launch({channel:'chrome',headless:true});
const privateCache=path.join(path.dirname(statePath),'flat2-role-cookies.json');
let cached={};try{cached=JSON.parse(fs.readFileSync(privateCache,'utf8'));}catch{}
try{
 const result=await runMaterialBrowser({browser,origin,credentials:state.credentials,image,output,cached,mailCapture:env.PASSWORD_RESET_CAPTURE_DIR,runId:randomUUID().replaceAll('-',''),only:option('--only'),progress:result=>{fs.writeFileSync(path.join(output,'material-summary.json'),JSON.stringify({...result,completed:false},null,2));if(args.includes('--progress'))console.log(JSON.stringify({progress:result.checks.length,last:result.checks.at(-1)}));}});
 fs.writeFileSync(privateCache,JSON.stringify(result.privateCookies));delete result.privateCookies;
 fs.writeFileSync(path.join(output,'material-summary.json'),JSON.stringify({...result,completed:true},null,2));
 console.log(JSON.stringify({passed:result.checks.filter(x=>x.status==='passed').length,failed:result.checks.filter(x=>x.status==='failed').length,skipped:result.checks.filter(x=>x.status==='skipped').length,failures:result.checks.filter(x=>x.status==='failed')}));
 if(result.checks.some(x=>x.status==='failed'))process.exitCode=1;
}catch(error){
 // Playwright API errors can contain session cookies in their call log.
 fs.writeFileSync(path.join(output,'material-infrastructure-error.json'),JSON.stringify({completed:false,category:error?.name||'Error',message:'Material browser infrastructure failed; no private request details retained.'},null,2));
 console.error('Material browser infrastructure failed; private request details suppressed.');process.exitCode=1;
}finally{await browser.close();}
