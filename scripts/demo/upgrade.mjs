import fs from 'node:fs';
import { spawnSync } from 'node:child_process';
import { snapshot, digest, saveMetadata } from './database.mjs';
import { applicationEnvironment } from './config.mjs';
import { preparePostconditions, validateUpgradeJournal, assertPostconditions } from './migration-postconditions.mjs';

// Additive migrations are distinct from fixture replacement. Store the original
// rows before DDL so crash recovery can prove that existing values survived.
export async function upgradeDemo(config, db, state, { afterMigration } = {}) {
  const local = fs.readdirSync('prisma/migrations').filter(name => fs.existsSync(`prisma/migrations/${name}/migration.sql`)).sort();
  const applied = (await db.query('SELECT migration_name FROM _prisma_migrations WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL')).map(r => r.migration_name);
  const pending = local.filter(name => !applied.includes(name));
  if (local.every(name => applied.includes(name)) && !state.schemaUpgrade) return state;
  if (state.pending) throw new Error('Resolve the interrupted fixture operation before applying demo schema upgrades.');
  if (!state.schemaUpgrade) {
    const before = await snapshot(db);
    state.schemaUpgrade = { before, originalFingerprint: state.fingerprint, managedUnchanged: digest(before) === state.fingerprint, postconditions: await preparePostconditions(db, pending, before) };
    await saveMetadata(db, state);
  }
  validateUpgradeJournal(state.schemaUpgrade, pending);
  const result = spawnSync(process.execPath, ['node_modules/prisma/build/index.js', 'migrate', 'deploy'], { env: applicationEnvironment(config), encoding: 'utf8' });
  console.log(result.stdout); if (result.status !== 0) throw new Error('Additive demo migration failed; existing data retained. Inspect private Prisma evidence.');
  if (afterMigration) await afterMigration();
  const after = await assertPostconditions(db, state.schemaUpgrade);
  const managed = state.schemaUpgrade.managedUnchanged;
  delete state.schemaUpgrade;
  if (managed) state.fingerprint = digest(after);
  await saveMetadata(db, state);
  if (!managed) throw new Error('Additive migrations preserved manual demo records. Fixture setup/export still conflicts with manual edits; no records/passwords reset or baseline silently adopted.');
  return state;
}
