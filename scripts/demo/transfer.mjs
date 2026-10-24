import fs from 'node:fs';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { connect, tables, excludedData, identifier, safeRow, assertReady, metadata, fingerprint } from './database.mjs';
import { VERSION } from './config.mjs';

const separator = '\n-- ELB-DEMO-STATEMENT\n';
const sqlHash = sql => createHash('sha256').update(sql).digest('hex');
function sqlValue(db, value) {
  if (value === null || value === undefined) return 'NULL';
  if (Buffer.isBuffer(value)) return `X'${value.toString('hex')}'`;
  return db.escape(value);
}
export async function exportDatabase(config) {
  const db = await connect(config.primary);
  try {
    await db.query('SET TRANSACTION ISOLATION LEVEL REPEATABLE READ');
    await db.query('START TRANSACTION WITH CONSISTENT SNAPSHOT, READ ONLY');
    const state = await assertReady(db);
    const users = await db.query('SELECT email,emailVerified FROM user');
    assert.equal(users.length, 108);
    assert.ok(users.every(u => /^[a-z]+\.\d{2}@example\.test$/.test(u.email) && !u.emailVerified));
    const commands = ["SET NAMES utf8mb4", "SET time_zone = '+00:00'", "SET sql_mode = 'NO_AUTO_VALUE_ON_ZERO'", 'SET FOREIGN_KEY_CHECKS = 0'];
    const inventory = [];
    for (const table of await tables(db)) {
      const [schema] = await db.query(`SHOW CREATE TABLE ${identifier(table)}`);
      commands.push(schema['Create Table']);
      if (excludedData.has(table)) { inventory.push({ table, rows: 0, excluded: true }); continue; }
      const rows = (await db.query(`SELECT * FROM ${identifier(table)}`)).map(row => safeRow(table, row)).sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
      for (const row of rows) {
        const columns = Object.keys(row);
        commands.push(`INSERT INTO ${identifier(table)} (${columns.map(identifier).join(',')}) VALUES (${columns.map(k => sqlValue(db, row[k])).join(',')})`);
      }
      inventory.push({ table, rows: rows.length });
    }
    commands.push('SET FOREIGN_KEY_CHECKS = 1');
    if (commands.some(c => c.includes(separator))) throw new Error('Unsafe SQL statement boundary in dataset');
    const sql = `-- ${VERSION}: SYNTHETIC DEMO ONLY. Restore using npm run demo:restore.\n-- No sessions, verification/reset/invitation tokens, external access tokens or database grants.\n` + separator + commands.join(';' + separator) + ';\n';
    for (const secret of [config.secret, config.primary.password, config.restore?.password].filter(s => s && s.length >= 6)) if (sql.includes(secret)) throw new Error('Connection/auth secret detected; refusing export');
    fs.writeFileSync('demo/e_lingkod_bayan_demo.sql', sql);
    fs.writeFileSync('demo/export-manifest.json', JSON.stringify({ datasetVersion: VERSION, sourceDatabase: config.primary.database, dataFingerprint: state.fingerprint, sqlSha256: sqlHash(sql), tables: inventory }, null, 2) + '\n');
    console.log(`Sanitized SQL exported exclusively from ${config.primary.database}: ${inventory.length} tables; auth session/token tables have zero exported rows.`);
  } finally { await db.rollback(); await db.end(); }
}
export { exportDatabase as export };
export async function restore(config) {
  if (!config.restore) throw new Error('Explicit restore database configuration required');
  const db = await connect(config.restore, true);
  try {
    const manifest = JSON.parse(fs.readFileSync('demo/export-manifest.json', 'utf8'));
    const sql = fs.readFileSync('demo/e_lingkod_bayan_demo.sql', 'utf8');
    assert.equal(manifest.datasetVersion, VERSION); assert.equal(sqlHash(sql), manifest.sqlSha256, 'Export checksum mismatch');
    const existing = await tables(db);
    if (existing.length) {
      const state = await metadata(db);
      if (state?.ready && state.fingerprint === manifest.dataFingerprint && await fingerprint(db) === manifest.dataFingerprint) { console.log('Restore target already matches export; no changes.'); return; }
      throw new Error('Restore requires a fresh dedicated database. Existing data preserved; choose another allowed restore suffix.');
    }
    const commands = sql.split(separator).slice(1).map(s => s.trim().replace(/;$/, ''));
    for (const command of commands) {
      if (!/^(SET (?:NAMES|time_zone|sql_mode|FOREIGN_KEY_CHECKS)|CREATE TABLE `|INSERT INTO `)/.test(command)) throw new Error('Unexpected export statement; restore refused');
    }
    for (const command of commands) await db.query(command);
    assert.equal(await fingerprint(db), manifest.dataFingerprint, 'Restored data differs from source export');
    await assertReady(db);
    for (const table of excludedData) {
      const [row] = await db.query(`SELECT COUNT(*) AS n FROM ${identifier(table)}`); assert.equal(Number(row.n), 0);
    }
    console.log(`Fresh restore verified: ${config.restore.database}. Now run demo:verify -- --restored for all real sign-ins/counts.`);
  } finally { await db.end(); }
}
