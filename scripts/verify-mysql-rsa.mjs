// Starts only an invocation-owned disposable MySQL; never reads application .env.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import net from 'node:net';
import {randomUUID} from 'node:crypto';
import {spawn,spawnSync} from 'node:child_process';
import mariadb from 'mariadb';
import {cleanupMysqlVerification} from './lib/mysql-rsa-cleanup.mjs';
const binary=process.env.MYSQLD_BINARY;
if(!binary||!fs.existsSync(binary))throw Error('Set MYSQLD_BINARY to your installed MySQL 8.4 mysqld executable.');
const owned=fs.mkdtempSync(path.join(os.tmpdir(),'elb-mysql-rsa-')),data=path.join(owned,'data'),base=path.dirname(path.dirname(path.resolve(binary))),name='elb_rsa_test_'+randomUUID().replaceAll('-','');
const log=fs.openSync(path.join(owned,'mysql.log'),'a');let child,root,verified=false,originalFailure,spawnFailure;
const report={startedAt:new Date().toISOString(),database:name,ordinaryDatabaseAccess:false,privateDataDirectory:owned};
try{
 const port=await new Promise((resolve,reject)=>{const server=net.createServer();server.on('error',reject);server.listen(0,'127.0.0.1',()=>{const p=server.address().port;server.close(()=>resolve(p));});});report.port=port;
 const init=spawnSync(binary,['--no-defaults','--initialize-insecure','--basedir='+base,'--datadir='+data,'--console'],{stdio:['ignore',log,log],windowsHide:true});if(init.status!==0)throw Error('Disposable MySQL initialization failed; inspect '+owned);
 child=spawn(binary,['--no-defaults','--basedir='+base,'--datadir='+data,'--bind-address=127.0.0.1','--port='+port,'--mysqlx=0','--console'],{stdio:['ignore',log,log],windowsHide:true});child.on('error',error=>{spawnFailure=error;});
 const deadline=Date.now()+30000;while(!root){try{if(spawnFailure)throw spawnFailure;root=await mariadb.createConnection({host:'127.0.0.1',port,user:'root',password:'',connectTimeout:1000,ssl:false});}catch{if(spawnFailure||child.exitCode!==null||Date.now()>deadline)throw Error('Owned MySQL did not become ready; inspect '+owned,{cause:spawnFailure});await new Promise(r=>setTimeout(r,200));}}
 // The empty directory was initialized by this invocation and the process owns it.
 const [uuid]=await root.query('SELECT @@server_uuid AS uuid');const auto=fs.readFileSync(path.join(data,'auto.cnf'),'utf8');if(!auto.includes(uuid.uuid))throw Error('Connected server does not match owned data directory');
 verified=true;
 report.version=(await root.query('SELECT VERSION() AS version'))[0].version;
 await root.query('CREATE DATABASE `'+name+'`');const password=randomUUID()+randomUUID();
 await root.query("CREATE USER 'rsa_fixture'@'127.0.0.1' IDENTIFIED WITH caching_sha2_password BY ?",[password]);await root.query('GRANT SELECT ON `'+name+"`.* TO 'rsa_fixture'@'127.0.0.1'");
 const url=new URL('mysql://127.0.0.1:'+port+'/'+name);url.username='rsa_fixture';url.password=password;
 const result=spawnSync(process.execPath,['--test','tests/mysql-rsa-authentication.test.mjs'],{env:{...process.env,DATABASE_URL:url.href,MYSQL_RSA_PUBLIC_KEY_PATH:'',ELB_MYSQL_RSA_TEST:'1',ELB_MYSQL_RSA_OWNED_DIR:owned,ELB_MYSQL_RSA_SERVER_UUID:uuid.uuid,ELB_MYSQL_RSA_PUBLIC_KEY_PATH:path.join(data,'public_key.pem')},stdio:'inherit',windowsHide:true});report.testExit=result.status;if(result.status!==0)throw Error('Disposable authentication test failed',{cause:result.error});
}catch(error){originalFailure=error;
}finally{
 const cleanup=await cleanupMysqlVerification({root,verified,child,log,owned,originalFailure});
 Object.assign(report,{finishedAt:new Date().toISOString(),cleaned:cleanup.cleaned,childStopped:cleanup.childStopped,logClosed:cleanup.logClosed,cleanupFailures:cleanup.errors.map(error=>error.message)});console.log(JSON.stringify(report));
 if(cleanup.error)throw cleanup.error;
}
