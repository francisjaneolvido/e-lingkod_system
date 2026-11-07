import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import {runAnalyticsNavigation} from '../tests/analytics-navigation-browser.mjs';
const args=process.argv.slice(2),option=name=>{const i=args.indexOf(name);if(i<0||!args[i+1])throw Error(name+' required.');return args[i+1];};
const state=JSON.parse(fs.readFileSync(option('--state'),'utf8')),target=new URL(state.env.DATABASE_URL);
if(state.cleaned||target.protocol!=='mysql:'||!['localhost','127.0.0.1'].includes(target.hostname)||!/^elb_b3_test_[a-f0-9]{32}$/.test(state.name)||target.pathname!=='/'+state.name||state.env.ELB_B3_TEST_DATABASE!==state.name||state.env.BETTER_AUTH_URL!=='http://localhost:3117')throw Error('Guarded synthetic state required.');
const output=path.resolve(option('--output'));fs.mkdirSync(output,{recursive:true});
const require=createRequire(import.meta.url),{chromium}=require(path.resolve(option('--playwright'))),browser=await chromium.launch({channel:'chrome',headless:true});
try{const checks=await runAnalyticsNavigation({browser,origin:state.env.BETTER_AUTH_URL,adminState:path.resolve(option('--admin-state')),output});console.log(JSON.stringify({passed:checks.filter(c=>c.passed).length,failed:checks.filter(c=>!c.passed).length,failures:checks.filter(c=>!c.passed)}));if(checks.some(c=>!c.passed))process.exitCode=1;}catch{console.error('Navigation infrastructure failed; private diagnostics suppressed.');process.exitCode=1;}finally{await browser.close();}
