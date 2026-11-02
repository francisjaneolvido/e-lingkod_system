// Deterministic external-failure fixture: no database connection or configuration.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {cleanupMysqlVerification} from '../../scripts/lib/mysql-rsa-cleanup.mjs';
const owned=fs.mkdtempSync(path.join(os.tmpdir(),'elb-mysql-rsa-')),log=fs.openSync(path.join(owned,'test.log'),'w');
const child=spawn(process.execPath,['-e',"process.send('ready');setInterval(()=>{},1000)"],{stdio:['ignore','ignore','ignore','ipc'],windowsHide:true});await once(child,'message');
const rejected=process.argv[2],originalFailure=process.argv.includes('--original')?Error('Original probe failure'):null;
const root={query:async()=>{if(rejected==='SHUTDOWN')throw Error('Injected SHUTDOWN rejection');},end:async()=>{if(rejected==='end')throw Error('Injected end rejection');},destroy:()=>{}};
const result=await cleanupMysqlVerification({root,verified:true,child,log,owned,originalFailure,graceMs:10,killMs:1000});
console.log(JSON.stringify({cleaned:result.cleaned,childStopped:result.childStopped,logClosed:result.logClosed,dataExists:fs.existsSync(owned)}));
if(result.error)throw result.error;
