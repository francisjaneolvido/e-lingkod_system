import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { verifiedSqlText } from '../scripts/demo/transfer.mjs';
import { guardedTarget, readDemoConfig, commandTarget } from '../scripts/demo/config.mjs';
import { loadServerTypescript } from './helpers/load-typescript.mjs';
import { safeRow } from '../scripts/demo/database.mjs';
import { accounts, vacancyScenarios } from '../demo/fixtures/dataset.mjs';

test('SQL transport accepts only byte-equivalent approved LF/CRLF content and preserves escaped row newlines', () => {
  const sql="-- synthetic export\nINSERT INTO example VALUES ('line1\\r\\nline2');\n";
  const hash=createHash('sha256').update(sql).digest('hex');
  assert.equal(verifiedSqlText(sql,hash),sql);
  assert.equal(verifiedSqlText(sql.replace(/\n/g,'\r\n'),hash),sql);
  for(const tampered of [sql+'DROP TABLE example;\n',sql.replace('line1','changed')])assert.throws(()=>verifiedSqlText(tampered.replace(/\n/g,'\r\n'),hash),/checksum mismatch/);
  const mixed="-- synthetic\nINSERT INTO example VALUES ('literal\r\nvalue');\n";
  assert.equal(verifiedSqlText(mixed,createHash('sha256').update(mixed).digest('hex')),mixed);
});

test('demo target rejects application, remote and lookalike database names', () => {
  for (const name of ['e_lingkod_bayan', 'e_lingkod_bayan_demo_extra', 'mysql', 'e_lingkod_bayan_demo_restore_bad-name']) {
    assert.throws(() => guardedTarget(`mysql://demo:pass@localhost/${name}`, 'primary'));
  }
  assert.throws(() => guardedTarget('mysql://demo:pass@example.test/e_lingkod_bayan_demo', 'primary'));
  assert.throws(() => guardedTarget('mysql://demo:pass@localhost/e_lingkod_bayan_demo', 'restore'));
  assert.equal(guardedTarget('mysql://demo:pass@localhost/e_lingkod_bayan_demo', 'primary').database, 'e_lingkod_bayan_demo');
  assert.equal(guardedTarget('mysql://demo:pass@127.0.0.1/e_lingkod_bayan_demo_restore_team', 'restore').database, 'e_lingkod_bayan_demo_restore_team');
});

test('restored flag cannot redirect setup/export mutation services away from primary checkpoint', () => {
  const config = { primary: { database: 'primary' }, restore: { database: 'restore' } };
  for (const command of ['setup', 'export', 'restore']) assert.throws(() => commandTarget(config, command, true));
  assert.equal(commandTarget(config, 'verify', true).database, 'restore');
  assert.equal(commandTarget(config, 'setup').database, 'primary');
});

test('sanitized export preserves password hashes but removes bearer material', () => {
  assert.deepEqual(safeRow('account', { password: 'credential-hash', accessToken: 'secret', refreshToken: 'secret', idToken: 'secret', accessTokenExpiresAt: 'later' }), { password: 'credential-hash', accessToken: null, refreshToken: null, idToken: null, accessTokenExpiresAt: null });
  assert.equal(safeRow('_prisma_migrations', { logs: 'private SQL debug data' }).logs, null);
});

test('fixture credentials obey registration rules and remain reserved synthetic identities', async () => {
  const hook = loadServerTypescript();
  try {
    const { checkRegistration } = await import('../src/features/auth/registration-validation.ts');
    assert.equal(accounts.length, 108); assert.equal(new Set(accounts.map(a => a.email)).size, 108);
    for (const account of accounts) {
      assert.equal(checkRegistration(account).ok, true, account.key);
      assert.match(account.email, /@example\.test$/);
    }
    assert.equal(vacancyScenarios.length, 28);
    assert.ok(vacancyScenarios.every(v => v.futureB5.supportedNow === false));
  } finally { hook.deregister(); }
});

test('demo marker appears only for explicitly protected demo targets', async () => {
  const hook = loadServerTypescript();
  try {
    const { demoEnvironment } = await import('../src/lib/demo-environment.ts');
    assert.equal(demoEnvironment({}), null);
    assert.throws(() => demoEnvironment({ ELB_DEMO_MODE: 'elb-demo-2026-v1', DATABASE_URL: 'mysql://u:p@localhost/e_lingkod_bayan' }));
    assert.equal(demoEnvironment({ ELB_DEMO_MODE: 'elb-demo-2026-v1', DATABASE_URL: 'mysql://u:p@localhost/e_lingkod_bayan_demo' }).label, 'DEMO — synthetic data only');
  } finally { hook.deregister(); }
});

test('explicit demo configuration never falls back to DATABASE_URL', () => {
  assert.throws(() => readDemoConfig({ DATABASE_URL: 'mysql://user:pass@localhost/e_lingkod_bayan_demo' }), /DEMO_DATABASE_URL/);
  assert.throws(() => readDemoConfig({ DEMO_DATABASE_URL: 'mysql://u:p@localhost/e_lingkod_bayan_demo', DEMO_BASE_URL: 'http://localhost:3000' }), /3102|secret/i);
});
