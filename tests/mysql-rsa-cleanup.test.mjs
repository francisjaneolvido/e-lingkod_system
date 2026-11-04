import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawn,spawnSync} from 'node:child_process';
import {EventEmitter,once} from 'node:events';
import {cleanupMysqlVerification} from '../scripts/lib/mysql-rsa-cleanup.mjs';

for(const rejected of ['SHUTDOWN','end'])test('rejected '+rejected+' does not prevent owned child, log and directory cleanup',async()=>{
  const owned=fs.mkdtempSync(path.join(os.tmpdir(),'elb-mysql-rsa-')),log=fs.openSync(path.join(owned,'test.log'),'w');
  const child=spawn(process.execPath,['-e',"process.send('ready');setInterval(()=>{},1000)"],{stdio:['ignore','ignore','ignore','ipc'],windowsHide:true});
  const exited=once(child,'exit');await once(child,'message');
  const calls=[],originalFailure=new Error('Original verification failure'),cleanupFailure=new Error('Injected '+rejected+' rejection');
  const root={query:async sql=>{calls.push(sql);if(rejected==='SHUTDOWN')throw cleanupFailure;},end:async()=>{calls.push('end');if(rejected==='end')throw cleanupFailure;},destroy:()=>{calls.push('destroy');}};
  try{
    const result=await cleanupMysqlVerification({root,verified:true,child,log,owned,originalFailure,graceMs:10,killMs:1000});
    assert.equal(result.cleaned,true);assert.equal(result.childStopped,true);assert.equal(result.logClosed,true);
    assert.ok(child.exitCode!==null||child.signalCode!==null);assert.equal(fs.existsSync(owned),false);assert.throws(()=>fs.fstatSync(log),{code:'EBADF'});
    assert.deepEqual(calls.slice(0,2),['SHUTDOWN','end']);
    assert.ok(result.error instanceof AggregateError);assert.equal(result.error.errors[0],originalFailure);
    assert.ok(result.error.errors.some(error=>error.cause===cleanupFailure));
  }finally{
    if(child.exitCode===null&&child.signalCode===null){child.kill('SIGKILL');await exited;}
    try{fs.closeSync(log);}catch{/* May already be closed by the code under test. */}
    fs.rmSync(owned,{recursive:true,force:true});
  }
});

for(const rejected of ['SHUTDOWN','end'])test('command-line '+rejected+' cleanup failure exits nonzero and retains original diagnostics',()=>{
  const env={...process.env};delete env.NODE_TEST_CONTEXT;
  const result=spawnSync(process.execPath,['tests/helpers/mysql-rsa-cleanup-probe.mjs',rejected,'--original'],{env,encoding:'utf8',windowsHide:true,timeout:5000});
  assert.equal(result.status,1);assert.deepEqual(JSON.parse(result.stdout.trim()),{cleaned:true,childStopped:true,logClosed:true,dataExists:false});
  assert.match(result.stderr,/Original probe failure/);assert.match(result.stderr,new RegExp('Injected '+rejected+' rejection'));
});

test('unconfirmed child termination is bounded, closes the log and retains temporary data',async()=>{
  const owned=fs.mkdtempSync(path.join(os.tmpdir(),'elb-mysql-rsa-')),log=fs.openSync(path.join(owned,'test.log'),'w');
  const child=Object.assign(new EventEmitter(),{pid:123,exitCode:null,signalCode:null,kill:()=>false});
  try{
    const result=await cleanupMysqlVerification({child,log,owned,graceMs:1,killMs:1,operationMs:100});
    assert.equal(result.childStopped,false);assert.equal(result.cleaned,false);assert.equal(result.logClosed,true);assert.equal(fs.existsSync(owned),true);
    assert.ok(result.error instanceof AggregateError);assert.match(result.errors.map(e=>e.message).join(' '),/termination.*bounded termination wait/i);
    assert.equal(child.listenerCount('exit'),0);
  }finally{fs.rmSync(owned,{recursive:true,force:true});}
});

test('unverified SQL authority never receives SHUTDOWN and an original failure survives successful cleanup',async()=>{
  const owned=fs.mkdtempSync(path.join(os.tmpdir(),'elb-mysql-rsa-')),log=fs.openSync(path.join(owned,'test.log'),'w'),calls=[];
  const root={query:async()=>{calls.push('query');},end:async()=>{calls.push('end');}},originalFailure=Error('Initial identity check failed');
  const result=await cleanupMysqlVerification({root,verified:false,log,owned,originalFailure});
  assert.deepEqual(calls,['end']);assert.equal(result.cleaned,true);assert.deepEqual(result.error.errors,[originalFailure]);
});

test('hung root operations time out independently and destruction failure does not prevent later cleanup',async()=>{
  const owned=fs.mkdtempSync(path.join(os.tmpdir(),'elb-mysql-rsa-')),log=fs.openSync(path.join(owned,'test.log'),'w'),calls=[];
  const root={query:()=>{calls.push('query');return new Promise(()=>{});},end:()=>{calls.push('end');return new Promise(()=>{});},destroy:()=>{calls.push('destroy');throw Error('Injected destroy failure');}};
  const result=await cleanupMysqlVerification({root,verified:true,log,owned,operationMs:5});
  assert.deepEqual(calls,['query','end','destroy']);assert.equal(result.cleaned,true);assert.equal(result.logClosed,true);assert.equal(result.errors.length,3);
  assert.match(result.errors[0].cause.message,/Timed out/);assert.match(result.errors[1].cause.message,/Timed out/);assert.match(result.errors[2].cause.message,/destroy failure/);
});
