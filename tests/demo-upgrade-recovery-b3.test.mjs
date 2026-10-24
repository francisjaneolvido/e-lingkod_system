import fs from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID, createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import mariadb from 'mariadb';
import { loadConfig, guardedTarget, applicationEnvironment } from '../scripts/demo/config.mjs';
import { connect, snapshot, digest, saveMetadata, metadata, identifier } from '../scripts/demo/database.mjs';
import { upgradeDemo } from '../scripts/demo/upgrade.mjs';
const enabled = /^elb_b3_test_[a-f0-9]{32}$/.test(process.env.ELB_B3_TEST_DATABASE || '');
test('R4-A migration interruption postconditions preserve manual rows and new-column values', { skip: !enabled }, async t => {
  const config = loadConfig();
  async function fixture(run) {
    const url = new URL(config.primary.url); url.pathname = '/e_lingkod_bayan_demo_restore_u' + randomUUID().replaceAll('-', '');
    const target = guardedTarget(url.href, 'restore'), db = await connect(target, true);
    const multi = await mariadb.createConnection({ host: target.host, port: target.port, user: target.user, password: target.password, database: target.database, multipleStatements: true });
    try {
      await multi.query('CREATE TABLE _prisma_migrations (id VARCHAR(36) PRIMARY KEY,checksum VARCHAR(64) NOT NULL,finished_at DATETIME(3),migration_name VARCHAR(255),logs TEXT,rolled_back_at DATETIME(3),started_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),applied_steps_count INT UNSIGNED DEFAULT 0)');
      for (const name of fs.readdirSync('prisma/migrations').filter(n => n < '20261024080000_census_records_imports' && fs.existsSync('prisma/migrations/' + n + '/migration.sql')).sort()) {
        const sql = fs.readFileSync('prisma/migrations/' + name + '/migration.sql', 'utf8'); await multi.query(sql);
        await db.query('INSERT INTO _prisma_migrations(id,checksum,migration_name,finished_at,applied_steps_count) VALUES(?,?,?,CURRENT_TIMESTAMP(3),1)', [randomUUID(), createHash('sha256').update(sql).digest('hex'), name]);
      }
      for (const [id, role] of [['upgrade-admin', 'ADMIN'], ['upgrade-staff', 'STAFF']]) await db.query('INSERT INTO user(id,name,email,role,updatedAt) VALUES(?,?,?,?,CURRENT_TIMESTAMP(3))', [id, 'Synthetic Upgrade Fixture', id + '@example.test', role]);
      await db.query("INSERT INTO government_activity(id,activityName,activityType,implementingOffice,updatedAt) VALUES('before-activity','Synthetic old source','TEST','PESO',CURRENT_TIMESTAMP(3))");
      await db.query("INSERT INTO community_import_batch(id,activityId,importedById,sourceFilename,fileType) VALUES('before-batch','before-activity','upgrade-admin','before.csv','CSV')");
      const state = { ready: true, completed: {}, pending: null, fingerprint: digest(await snapshot(db)) };
      await saveMetadata(db, state);
      await run({ db, target, state, config: { ...config, primary: target } });
    } finally {
      await multi.end();
      if (!/^e_lingkod_bayan_demo_restore_u[a-f0-9]{32}$/.test(target.database)) throw Error('Unsafe disposable cleanup');
      await db.query('DROP DATABASE ' + identifier(target.database)); await db.end();
    }
  }
  await t.test('reviewed legacy checkpoint after DDL cannot adopt a manually created roster', () => fixture(async ({ db, state, target, config }) => {
    state.schemaUpgrade = { before: await snapshot(db), originalFingerprint: state.fingerprint, managedUnchanged: true }; await saveMetadata(db, state);
    const migrated = spawnSync(process.execPath, ['node_modules/prisma/build/index.js', 'migrate', 'deploy'], { env: applicationEnvironment(config, target), stdio: 'ignore', windowsHide: true }); assert.equal(migrated.status, 0);
    const changed = spawnSync(process.execPath, ['tests/helpers/write-upgrade-roster.mjs'], { env: { ...applicationEnvironment(config, target), ELB_B3_UPGRADE_TEST_DATABASE: target.database }, stdio: 'ignore', windowsHide: true }); assert.equal(changed.status, 0);
    const manual = digest(await snapshot(db));
    await assert.rejects(upgradeDemo(config, db, await metadata(db)), /conflict/i);
    assert.equal(digest(await snapshot(db)), manual);
    assert.equal(Number((await db.query("SELECT COUNT(*) n FROM census_assistance_member WHERE barangay='Maahas'"))[0].n), 1);
    assert.equal(Number((await db.query("SELECT COUNT(*) n FROM census_audit WHERE action='ASSISTANCE_ROSTER'"))[0].n), 1);
  }));
  for (const kind of ['new-table', 'new-column', 'unchanged']) await t.test('prepared migration checkpoint: ' + kind, () => fixture(async ({ db, state, target, config }) => {
    await assert.rejects(upgradeDemo(config, db, state, { afterMigration: async () => { throw Error('Controlled interruption after DDL'); } }), /interruption/);
    if (kind === 'new-table') {
      const changed = spawnSync(process.execPath, ['tests/helpers/write-upgrade-roster.mjs'], { env: { ...applicationEnvironment(config, target), ELB_B3_UPGRADE_TEST_DATABASE: target.database }, stdio: 'ignore', windowsHide: true }); assert.equal(changed.status, 0);
    }
    if (kind === 'new-column') await db.query("UPDATE community_import_batch SET sourceKey='MANUAL-SOURCE' WHERE id='before-batch'");
    const before = digest(await snapshot(db)), pending = await metadata(db);
    if (kind === 'unchanged') {
      const resumed = await upgradeDemo(config, db, pending);
      assert.equal(resumed.schemaUpgrade, undefined); assert.equal(resumed.fingerprint, before);
    } else {
      await assert.rejects(upgradeDemo(config, db, pending), /conflict/i);
      assert.equal(digest(await snapshot(db)), before);
      assert.notEqual((await metadata(db)).fingerprint, before);
      if (kind === 'new-column') assert.equal((await db.query("SELECT sourceKey FROM community_import_batch WHERE id='before-batch'"))[0].sourceKey, 'MANUAL-SOURCE');
    }
  }));
});
