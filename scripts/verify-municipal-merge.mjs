// Creates its own local database. Never migrates or writes the configured target.
import fs from 'node:fs';
import path from 'node:path';
import { randomUUID, createHash } from 'node:crypto';
import { spawn, spawnSync } from 'node:child_process';
import assert from 'node:assert/strict';
import mariadb from 'mariadb';
import { loadConfig, applicationEnvironment } from './demo/config.mjs';
import {mysqlRsaOptions} from './lib/mysql-connection.mjs';

const config = loadConfig(); // Existing local-only, explicit demo-URL guard.
const name = `elb_b3_test_${randomUUID().replaceAll('-', '')}`;
const target = new URL(config.primary.url); target.pathname = '/' + name;
const scratch = path.resolve('.scratch/municipal-merge');
fs.mkdirSync(scratch, { recursive: true });
const env = { ...applicationEnvironment(config), DATABASE_URL: target.href, ELB_B3_TEST_DATABASE: name,
  ELB_MUNICIPAL_TEST_DATABASE: name, BETTER_AUTH_SECRET: config.secret,
  BETTER_AUTH_URL: 'http://localhost:3113', NEXT_PUBLIC_APP_URL: 'http://localhost:3113',
  ELB_NEXT_DIST_DIR: '.scratch/municipal-merge/next', NEXT_TELEMETRY_DISABLED: '1',
  ELB_DEMO_MODE: '', PROJECTS_DEMO_MODE: '', RESEND_API_KEY: '', STAFF_INVITE_FROM: '' };
const db = await mariadb.createConnection({ ...mysqlRsaOptions(env), host: target.hostname, port: Number(target.port || 3306),
  user: decodeURIComponent(target.username), password: decodeURIComponent(target.password), multipleStatements: false });
const run = args => {
  const result = spawnSync(process.execPath, args, { env, stdio: 'inherit', windowsHide: true });
  if (result.status !== 0) throw Error(`Verification command failed (${result.status}): ${args.join(' ')}`);
};
const quote = value => '`' + value.replaceAll('`', '``') + '`';
const digest = rows => createHash('sha256').update(rows.map(row => JSON.stringify(row,
  (_, value) => typeof value === 'bigint' ? value.toString() : value)).sort().join('\n')).digest('hex');
let created = false;
try {
  await db.query(`CREATE DATABASE ${quote(name)} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
  created = true; await db.query(`USE ${quote(name)}`);
  const baselineDir = path.join(scratch, name, 'migrations'); fs.mkdirSync(baselineDir, { recursive: true });
  const migrations = fs.readdirSync('prisma/migrations').filter(x => fs.existsSync(`prisma/migrations/${x}/migration.sql`)).sort();
  const municipal = migrations.filter(x => x.includes('municipal_projects'));
  assert.equal(municipal.length, 3);
  for (const migration of migrations.filter(x => !municipal.includes(x)))
    fs.cpSync(`prisma/migrations/${migration}`, path.join(baselineDir, migration), { recursive: true });
  fs.copyFileSync('prisma/migrations/migration_lock.toml', path.join(baselineDir, 'migration_lock.toml'));
  const baselineConfig = path.join(scratch, name, 'baseline.config.ts');
  const mainSchema = spawnSync('git', ['show', '95f7c8a30597b2e434e1398145bd9d46b24c1652:prisma/schema.prisma'], { encoding: 'utf8', windowsHide: true });
  if (mainSchema.status !== 0) throw Error('Read-only reviewed main schema lookup failed');
  const baselineSchema = path.join(scratch, name, 'main.prisma');
  fs.writeFileSync(baselineSchema, mainSchema.stdout);
  const baselineSettings = JSON.stringify({ schema: baselineSchema, migrations: { path: baselineDir } });
  fs.writeFileSync(baselineConfig, `import { defineConfig } from 'prisma/config';\nexport default defineConfig({...${baselineSettings},datasource:{url:process.env.DATABASE_URL}});\n`);
  console.log(`Disposable municipal rehearsal: ${name}; baseline ${migrations.length - municipal.length}, municipal ${municipal.length}.`);
  run(['node_modules/prisma/build/index.js', 'migrate', 'deploy', '--config', baselineConfig]);
  const diff = (schema, configFile) => {
    const result = spawnSync(process.execPath, ['node_modules/prisma/build/index.js', 'migrate', 'diff', '--from-config-datasource', '--to-schema', schema, '--script', '--exit-code', ...(configFile ? ['--config', configFile] : [])], { env, encoding: 'utf8', windowsHide: true });
    if (![0, 2].includes(result.status)) throw Error(`Schema comparison failed: ${result.stderr}`);
    return { status: result.status, sql: result.stdout };
  };
  const baselineDrift = diff(baselineSchema, baselineConfig);
  await db.query("INSERT INTO user (id,name,email,role,updatedAt) VALUES ('merge_preserved_user','Synthetic preserved citizen','merge.preserved@example.test','CITIZEN',NOW(3))");
  await db.query("INSERT INTO verification (id,identifier,value,expiresAt) VALUES ('merge_preserved_verification','synthetic-preservation','synthetic-only',DATE_ADD(NOW(3),INTERVAL 1 DAY))");
  const tables = (await db.query('SHOW TABLES')).map(x => Object.values(x)[0]);
  const before = {};
  for (const table of tables) before[table] = { count: (await db.query(`SELECT * FROM ${quote(table)}`)).length, sha256: digest(await db.query(`SELECT * FROM ${quote(table)}`)) };
  run(['node_modules/prisma/build/index.js', 'migrate', 'deploy']);
  for (const table of tables) {
    let rows = await db.query(`SELECT * FROM ${quote(table)}`);
    if (table === '_prisma_migrations') rows = rows.filter(row => !municipal.includes(row.migration_name));
    assert.equal(rows.length, before[table].count, `${table} count preservation`);
    assert.equal(digest(rows), before[table].sha256, `${table} byte-value preservation`);
  }
  fs.writeFileSync(path.join(scratch, 'migration-preservation.json'), JSON.stringify({ database: name, baselineMigrations: migrations.filter(x => !municipal.includes(x)), additiveMigrations: municipal, before, allExistingRowsPreserved: true }, null, 2));
  console.log(`PASS: all ${tables.length} pre-existing table snapshots and migration-history rows preserved.`);
  run(['node_modules/prisma/build/index.js', 'migrate', 'status']);
  const mergedDrift = diff('prisma/schema.prisma');
  fs.writeFileSync(path.join(scratch, 'schema-drift.json'), JSON.stringify({ baseline: baselineDrift, merged: mergedDrift }, null, 2));
  assert.deepEqual(mergedDrift, baselineDrift, 'Merge must introduce no schema drift beyond the main baseline');
  console.log(baselineDrift.status === 0 ? 'PASS: zero schema drift.' : 'PASS: no new schema drift; baseline MySQL expression defaults retained (see schema-drift.json).');
  run(['--test', '--test-concurrency=1', 'tests/municipal-merge-integration.test.mjs']);
  if (process.argv.includes('--build')) run(['node_modules/next/dist/bin/next', 'build']);
  if (process.argv.includes('--serve')) {
    const server = spawn(process.execPath, ['node_modules/next/dist/bin/next', process.argv.includes('--build') ? 'start' : 'dev', '--hostname', 'localhost', '--port', '3113'], { env, stdio: 'inherit', windowsHide: true });
    const stop = () => { if (server.pid) spawnSync('taskkill', ['/PID', String(server.pid), '/T', '/F'], { windowsHide: true, stdio: 'ignore' }); };
    process.stdin.resume(); process.stdin.once('data', stop); process.once('SIGINT', stop); process.once('SIGTERM', stop);
    console.log('Synthetic municipal users: merge.admin / merge.staff / merge.denied / merge.citizen @example.test; password: Municipal-browser-2026!');
    await new Promise(resolve => server.once('exit', resolve)); process.stdin.pause();
  }
} finally {
  if (created) {
    if (!/^elb_b3_test_[a-f0-9]{32}$/.test(name) || target.pathname !== '/' + name) throw Error('Unsafe cleanup refused');
    await db.query(`DROP DATABASE ${quote(name)}`);
    console.log(`Dropped disposable database ${name}.`);
  }
  await db.end();
}
