import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const stopped=child=>!child?.pid||child.exitCode!==null||child.signalCode!==null;

function waitForStop(child,ms) {
  if(stopped(child))return Promise.resolve(true);
  return new Promise(resolve=>{
    const finish=()=>{clearTimeout(timer);child.off('exit',finish);resolve(stopped(child));};
    const timer=setTimeout(finish,ms);
    child.once('exit',finish);
    if(stopped(child))finish();
  });
}

export async function cleanupMysqlVerification({root,verified,child,log,owned,originalFailure,operationMs=5000,graceMs=3000,killMs=5000}) {
  const errors=[];
  async function attempt(label,action) {
    let timer;
    try{
      await Promise.race([Promise.resolve().then(action),new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('Timed out after '+operationMs+'ms')),operationMs);})]);
      return true;
    }catch(cause){errors.push(new Error(label+' failed',{cause}));return false;}
    finally{clearTimeout(timer);}
  }
  // A failed or timed-out SQL shutdown must not skip connection/process cleanup.
  if(root){
    if(verified)await attempt('Owned MySQL SHUTDOWN',()=>root.query('SHUTDOWN'));
    const ended=await attempt('Root connection end',()=>root.end());
    if(!ended)await attempt('Root connection destroy',()=>root.destroy());
  }
  let childStopped=await waitForStop(child,graceMs);
  if(!childStopped){
    await attempt('Owned child termination',()=>{if(!child.kill('SIGKILL')&&!stopped(child))throw Error('Termination signal was not sent');});
    childStopped=await waitForStop(child,killMs);
    if(!childStopped)errors.push(Error('Owned MySQL child did not stop within the bounded termination wait; temporary data retained.'));
  }
  const logClosed=await attempt('MySQL log closure',()=>fs.closeSync(log));
  let cleaned=false;
  // Never remove data while the exact ChildProcess created by this invocation is live.
  if(childStopped)cleaned=await attempt('Owned temporary data removal',()=>{
    const resolved=path.resolve(owned);
    if(path.dirname(resolved)!==path.resolve(os.tmpdir())||!path.basename(resolved).startsWith('elb-mysql-rsa-'))throw Error('Unsafe disposable cleanup');
    fs.rmSync(resolved,{recursive:true,force:true});
  });
  const failures=[...(originalFailure?[originalFailure]:[]),...errors];
  return {cleaned,childStopped,logClosed,errors,error:failures.length?new AggregateError(failures,'MySQL verification or cleanup failed'):null};
}
