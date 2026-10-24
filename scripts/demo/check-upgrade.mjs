import fs from 'node:fs';
import { randomUUID } from 'node:crypto';
import assert from 'node:assert/strict';
import mariadb from 'mariadb';
import { loadConfig, guardedTarget } from './config.mjs';
import { connect, saveMetadata, metadata, fingerprint, identifier } from './database.mjs';
import { upgradeDemo } from './upgrade.mjs';
const config = loadConfig(), url = new URL(config.primary.url);
url.pathname = `/e_lingkod_bayan_demo_restore_u${randomUUID().replaceAll('-', '')}`;
const target = guardedTarget(url.href, 'restore'), db = await connect(target, true);
const multi = await mariadb.createConnection({ host: target.host, port: target.port, user: target.user, password: target.password, database: target.database, multipleStatements: true });
try {
  await multi.query('CREATE TABLE _prisma_migrations (id VARCHAR(36) PRIMARY KEY,checksum VARCHAR(64) NOT NULL,finished_at DATETIME(3),migration_name VARCHAR(255),logs TEXT,rolled_back_at DATETIME(3),started_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),applied_steps_count INT UNSIGNED DEFAULT 0)');
  const { createHash } = await import('node:crypto');
  for (const migration of fs.readdirSync('prisma/migrations').filter(n => fs.existsSync(`prisma/migrations/${n}/migration.sql`) && n < '20261024080000_census_records_imports').sort()) {
    const sql = fs.readFileSync(`prisma/migrations/${migration}/migration.sql`, 'utf8'); await multi.query(sql);
    await db.query('INSERT INTO _prisma_migrations(id,checksum,migration_name,finished_at,applied_steps_count) VALUES(?,?,?,CURRENT_TIMESTAMP(3),1)', [randomUUID(), createHash('sha256').update(sql).digest('hex'), migration]);
  }
  await db.query("INSERT INTO user(id,name,email,role,updatedAt) VALUES('upgrade-test','Synthetic original','upgrade@example.test','CITIZEN',CURRENT_TIMESTAMP(3))");
  const state = { ready: true, completed: {}, pending: null, fingerprint: await fingerprint(db) }; await saveMetadata(db, state);
  await db.query("UPDATE user SET name='Manual synthetic edit preserved' WHERE id='upgrade-test'");
  await assert.rejects(upgradeDemo({ ...config, primary: target }, db, state), /preserved manual demo records/);
  const [user] = await db.query("SELECT name FROM user WHERE id='upgrade-test'"); assert.equal(user.name, 'Manual synthetic edit preserved');
  const [migration] = await db.query("SELECT COUNT(*) n FROM _prisma_migrations WHERE migration_name='20261024080000_census_records_imports' AND finished_at IS NOT NULL"); assert.equal(Number(migration.n), 1);
  assert.notEqual((await metadata(db)).fingerprint, await fingerprint(db), 'Manual edits were silently adopted');
  console.log('PASS: additive B3 migration preserves manual data and refuses fixture/export baseline adoption; no reset or password change.');
} finally {
  await multi.end();
  if (!/^e_lingkod_bayan_demo_restore_u[a-f0-9]{32}$/.test(target.database)) throw new Error('Unsafe disposable target');
  await db.query(`DROP DATABASE ${identifier(target.database)}`); await db.end();
}
