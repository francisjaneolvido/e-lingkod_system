import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import mariadb from 'mariadb';
const enabled=process.env.ELB_MYSQL_RSA_TEST==='1';
test('cold caching_sha2_password authentication requires the configured key through the real Prisma adapter',{skip:!enabled},async()=>{
 const url=new URL(process.env.DATABASE_URL);
 assert.match(url.pathname,/^\/elb_rsa_test_[a-f0-9]{32}$/);assert.equal(url.hostname,'127.0.0.1');assert.notEqual(url.port,'3306');
 const owned=process.env.ELB_MYSQL_RSA_OWNED_DIR;
 assert.ok(owned,'Invocation-owned MySQL directory required');
 assert.equal(path.dirname(path.resolve(owned)),path.resolve(os.tmpdir()));assert.match(path.basename(owned),/^elb-mysql-rsa-/);
 const expectedUUID=process.env.ELB_MYSQL_RSA_SERVER_UUID;assert.match(expectedUUID||'',/^[a-f0-9-]{36}$/);
 assert.ok(fs.readFileSync(path.join(owned,'data','auto.cnf'),'utf8').includes(expectedUUID));
 const root=await mariadb.createConnection({host:url.hostname,port:Number(url.port),user:'root',password:'',ssl:false});
 const probe=key=>{const r=spawnSync(process.execPath,['tests/helpers/mysql-rsa-probe.mjs'],{env:{...process.env,MYSQL_RSA_PUBLIC_KEY_PATH:key},encoding:'utf8',windowsHide:true});return {exit:r.status,...JSON.parse(r.stdout.trim())};};
 try{
   const [server]=await root.query('SELECT @@server_uuid AS uuid');assert.equal(server.uuid,expectedUUID,'Connected server is not the invocation-owned MySQL');
   const rows=await root.query("SELECT plugin FROM mysql.user WHERE User = 'rsa_fixture'");assert.equal(rows[0].plugin,'caching_sha2_password');
   await root.query('FLUSH PRIVILEGES');
   await assert.rejects(mariadb.createConnection({host:url.hostname,port:Number(url.port),user:decodeURIComponent(url.username),password:decodeURIComponent(url.password),database:url.pathname.slice(1),ssl:false}),e=>e.errno===45044&&e.code==='ER_CANNOT_RETRIEVE_RSA_KEY');
   await root.query('FLUSH PRIVILEGES');const without=probe('');assert.equal(without.exit,1);assert.equal(without.ok,false);console.log('Adapter without key: '+JSON.stringify(without));
   // Clear the entire test-server cache again; the positive probe cannot use fast auth.
   await root.query('FLUSH PRIVILEGES');const withKey=probe(process.env.ELB_MYSQL_RSA_PUBLIC_KEY_PATH);assert.equal(withKey.exit,0,JSON.stringify(withKey));assert.equal(withKey.value,'1');assert.equal(withKey.tlsCipher,'','Success must exercise RSA, not TLS');
   if(process.env.ELB_MYSQL_RSA_EVIDENCE)fs.writeFileSync(process.env.ELB_MYSQL_RSA_EVIDENCE,JSON.stringify({directWithoutKey:{code:'ER_CANNOT_RETRIEVE_RSA_KEY',errno:45044},adapterWithoutKey:without,adapterWithKey:withKey,coldCache:'FLUSH PRIVILEGES before each attempt on owned test server',plugin:rows[0].plugin},null,2));
 }finally{await root.end();}
});
