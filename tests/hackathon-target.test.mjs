import test from 'node:test';
import assert from 'node:assert/strict';
import { connectTarget } from '../scripts/hackathon/storage.mjs';
test('ordinary fixture importer refuses demo, unrelated, remote and unguarded test targets before connecting',async()=>{
  for(const url of ['mysql://placeholder@127.0.0.1/e_lingkod_bayan_demo','mysql://placeholder@127.0.0.1/other','mysql://placeholder@remote.example.test/e_lingkod_bayan','mysql://placeholder@127.0.0.1/elb_b3_test_00000000000000000000000000000000','https://localhost/e_lingkod_bayan'])await assert.rejects(connectTarget(url),/guard refused/);
  await assert.rejects(connectTarget('mysql://placeholder@127.0.0.1/e_lingkod_bayan',{test:true}),/guard refused/);
});
