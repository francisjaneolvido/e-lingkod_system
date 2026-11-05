import test from 'node:test';
import assert from 'node:assert/strict';
import { assertLegacyCitizenFixtureTarget, createLegacyCitizenFixture } from './helpers/legacy-citizen-fixture.mjs';

const database = 'elb_b3_test_' + 'a'.repeat(32);
const valid = { DATABASE_URL: `mysql://synthetic:unused@127.0.0.1:3306/${database}`, ELB_B3_TEST_DATABASE: database };
test('legacy fixture requires exact random disposable target and loopback connection', () => {
  assert.equal(assertLegacyCitizenFixtureTarget(valid), database);
  for (const patch of [
    { DATABASE_URL: 'mysql://synthetic:unused@127.0.0.1:3306/e_lingkod_bayan' },
    { DATABASE_URL: `mysql://synthetic:unused@remote.example.test/${database}` },
    { DATABASE_URL: `mysql://synthetic:unused@127.0.0.1/${database}?database=e_lingkod_bayan` },
    { ELB_B3_TEST_DATABASE: 'elb_b3_test_' + 'b'.repeat(32) },
    { ELB_B3_TEST_DATABASE: undefined },
    { ELB_B1_TEST_DATABASE: 'elb_b1_test_' + 'c'.repeat(32) },
  ]) assert.throws(() => assertLegacyCitizenFixtureTarget({ ...valid, ...patch }), /disposable|local|match|guard/i);
});
test('legacy fixture accepts existing B1 and B2 guard names only when all match', () => {
  const name = 'elb_b1_test_' + 'd'.repeat(32);
  assert.equal(assertLegacyCitizenFixtureTarget({ DATABASE_URL:`mysql://localhost/${name}`, ELB_B1_TEST_DATABASE:name, ELB_B2_TEST_DATABASE:name }), name);
  assert.throws(() => assertLegacyCitizenFixtureTarget({ DATABASE_URL:'mysql://localhost/e_lingkod_bayan_demo', ELB_B3_TEST_DATABASE:'e_lingkod_bayan_demo' }), /disposable/i);
});
test('legacy fixture refuses a client connected to any other database before creating a user', async () => {
  let writes = 0;
  const client = { $queryRawUnsafe: async () => [{ databaseName:'e_lingkod_bayan' }], user:{ create:async () => { writes++; } } };
  await assert.rejects(() => createLegacyCitizenFixture(client, { email:'synthetic@example.test' }, valid), /client must match/);
  assert.equal(writes, 0);
});
