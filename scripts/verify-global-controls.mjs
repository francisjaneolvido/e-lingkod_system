import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import {runGlobalControls} from '../tests/global-controls-browser.mjs';
import {runDropdownLayout} from '../tests/dropdown-layout-browser.mjs';

const args=process.argv.slice(2),option=(name,required=true)=>{const index=args.indexOf(name);if(index<0||!args[index+1]){if(required)throw Error(name+' is required.');return undefined;}return args[index+1];};
const state=JSON.parse(fs.readFileSync(option('--state'),'utf8')),target=new URL(state.env.DATABASE_URL);
if(state.cleaned||target.protocol!=='mysql:'||!['localhost','127.0.0.1'].includes(target.hostname)||!/^elb_b3_test_[a-f0-9]{32}$/.test(state.name)||target.pathname!=='/'+state.name||state.env.ELB_B3_TEST_DATABASE!==state.name||state.env.BETTER_AUTH_URL!=='http://localhost:3117')throw Error('Only the existing guarded disposable preview is allowed.');
const selection=option('--case');if(!['opportunities','workflows'].includes(selection))throw Error('--case must be opportunities or workflows.');
const output=path.resolve(option('--output'));fs.mkdirSync(output,{recursive:true});
const require=createRequire(import.meta.url),{chromium}=require(path.resolve(option('--playwright'))),browser=await chromium.launch({channel:'chrome',headless:true});
try{
 const config={browser,origin:state.env.BETTER_AUTH_URL,output,only:option('--only',false)};
 const checks=selection==='opportunities'?await runDropdownLayout(config):await runGlobalControls({...config,adminState:path.resolve(option('--admin-state'))});
 console.log(JSON.stringify({case:selection,passed:checks.filter(check=>check.passed).length,failed:checks.filter(check=>!check.passed)}));
 if(checks.some(check=>!check.passed))process.exitCode=1;
}catch(error){fs.writeFileSync(path.join(output,'infrastructure.json'),JSON.stringify({completed:false,category:error.name,message:'Control verification could not complete; no private request diagnostics retained.'},null,2));console.error('Control verification infrastructure failed.');process.exitCode=1;}
finally{await browser.close();}
