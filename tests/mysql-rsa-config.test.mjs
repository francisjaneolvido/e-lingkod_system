import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
test('explicit unreadable RSA public key fails with an actionable configuration error before connecting',()=>{
 const r=spawnSync(process.execPath,['tests/helpers/mysql-rsa-probe.mjs'],{env:{...process.env,DATABASE_URL:'mysql://synthetic:synthetic@127.0.0.1:1/unused',MYSQL_RSA_PUBLIC_KEY_PATH:path.join(os.tmpdir(),randomUUID()+'.pem')},encoding:'utf8',windowsHide:true});
 assert.equal(r.status,1);const result=JSON.parse(r.stdout.trim());assert.equal(result.ok,false);assert.match(result.message,/MYSQL_RSA_PUBLIC_KEY_PATH.*public PEM.*read/);assert.ok(result.codes.includes('ENOENT'));assert.ok(!result.codes.includes('P2010'));
});
test('directly enabling the cold-cache test without invocation ownership refuses before connecting',()=>{
 const env={...process.env,ELB_MYSQL_RSA_TEST:'1',ELB_MYSQL_RSA_OWNED_DIR:'',ELB_MYSQL_RSA_SERVER_UUID:'',DATABASE_URL:'mysql://rsa_fixture:synthetic@127.0.0.1:1/elb_rsa_test_'+'a'.repeat(32)};
 delete env.NODE_TEST_CONTEXT;
 const result=spawnSync(process.execPath,['--test','tests/mysql-rsa-authentication.test.mjs'],{env,encoding:'utf8',windowsHide:true});
 assert.equal(result.status,1);assert.match(result.stdout,/Invocation-owned MySQL directory required/);assert.doesNotMatch(result.stdout,/ECONNREFUSED/);
});
