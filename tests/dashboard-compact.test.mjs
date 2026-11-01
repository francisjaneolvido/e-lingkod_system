import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
for(const [label,url]of [['malformed URL','not-a-database-url'],['different database','mysql://root:synthetic@127.0.0.1:1/ordinary_db'],['remote host','mysql://root:synthetic@example.test/elb_b3_test_'+'a'.repeat(32)],['different protocol','https://127.0.0.1/elb_b3_test_'+'a'.repeat(32)]])test('high-category fixture rejects '+label+' before loading application services',()=>{
 const result=spawnSync(process.execPath,['tests/helpers/prepare-compact-dashboard.mjs'],{env:{...process.env,ELB_B3_TEST_DATABASE:'elb_b3_test_'+'a'.repeat(32),DATABASE_URL:url},encoding:'utf8',windowsHide:true});
 assert.notEqual(result.status,0);assert.match(result.stderr,/Disposable dashboard connection must match its guarded target/);
 assert.doesNotMatch(result.stderr,/PrismaClient|AdapterError|signUpEmail/);
});
