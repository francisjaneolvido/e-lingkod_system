// Repeatable destructive checks are confined to a newly created disposable demo clone.
import { randomUUID } from 'node:crypto';
import assert from 'node:assert/strict';
import { loadConfig, guardedTarget } from './config.mjs';
import { connect, fingerprint, assertReady, identifier } from './database.mjs';
import { restore } from './transfer.mjs';
const config = loadConfig();
const url = new URL(config.primary.url);
url.pathname = `/e_lingkod_bayan_demo_restore_t${randomUUID().replaceAll('-', '')}`;
const target = guardedTarget(url.href, 'restore');
const db = await connect(target, true);
try {
  await restore({ ...config, restore: target });
  const before = await fingerprint(db);
  await restore({ ...config, restore: target }); // identical-target no-op
  assert.equal(await fingerprint(db), before);
  await db.query("UPDATE user SET name='Manual synthetic edit preserved' WHERE email='individual.01@example.test'");
  await assert.rejects(assertReady(db), /manual edits preserved/);
  await assert.rejects(restore({ ...config, restore: target }), /Existing data preserved/);
  const [user] = await db.query("SELECT name FROM user WHERE email='individual.01@example.test'");
  assert.equal(user.name, 'Manual synthetic edit preserved');
  console.log('Transfer regression: fresh restore, identical no-op, manual-edit rejection/preservation passed (4 assertions).');
} finally {
  if (!/^e_lingkod_bayan_demo_restore_t[a-f0-9]{32}$/.test(target.database)) throw new Error('Unsafe disposable cleanup target');
  await db.query(`DROP DATABASE ${identifier(target.database)}`);
  await db.end();
  console.log('Disposable transfer database removed; persistent primary/restore demos retained.');
}
