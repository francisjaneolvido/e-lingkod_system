import mariadb from 'mariadb';
import { createHash } from 'node:crypto';
import { guardedTarget, VERSION } from './config.mjs';

export const excludedData = new Set(['session', 'verification', 'staff_invitation']);
export const identifier = name => {
  if (!/^[a-zA-Z0-9_]+$/.test(name)) throw new Error('Unsafe database identifier');
  return '`' + name + '`';
};
export async function connect(target, create = false) {
  guardedTarget(target.url.href, target.database === 'e_lingkod_bayan_demo' ? 'primary' : 'restore');
  const { host, port, user, password, database } = target;
  if (create) {
    const admin = await mariadb.createConnection({ host, port, user, password });
    try { await admin.query(`CREATE DATABASE IF NOT EXISTS ${identifier(database)} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`); }
    finally { await admin.end(); }
  }
  const connection = await mariadb.createConnection({ host, port, user, password, database, dateStrings: true, timezone: '+00:00', bigIntAsNumber: true });
  const [row] = await connection.query('SELECT DATABASE() AS db');
  if (row.db !== database) { await connection.end(); throw new Error('Demo target verification failed'); }
  return connection;
}
export async function tables(db) {
  const rows = await db.query('SHOW TABLES');
  return rows.map(row => Object.values(row)[0]).sort();
}
export async function metadata(db) {
  if (!(await tables(db)).includes('_elb_demo_meta')) return null;
  const rows = await db.query("SELECT value FROM _elb_demo_meta WHERE name='state'");
  return rows.length ? JSON.parse(rows[0].value) : null;
}
export async function saveMetadata(db, state) {
  await db.query('CREATE TABLE IF NOT EXISTS _elb_demo_meta (name VARCHAR(60) PRIMARY KEY, value LONGTEXT NOT NULL)');
  await db.query("INSERT INTO _elb_demo_meta(name,value) VALUES('state',?) ON DUPLICATE KEY UPDATE value=VALUES(value)", [JSON.stringify({ ...state, version: VERSION })]);
}
export function safeRow(table, row) {
  const clean = { ...row };
  if (table === 'account') for (const key of ['accessToken', 'refreshToken', 'idToken', 'accessTokenExpiresAt', 'refreshTokenExpiresAt']) if (key in clean) clean[key] = null;
  if (table === '_prisma_migrations' && 'logs' in clean) clean.logs = null;
  return clean;
}
export async function snapshot(db) {
  const result = {};
  for (const table of await tables(db)) {
    if (excludedData.has(table) || table === '_elb_demo_meta') continue;
    const rows = (await db.query(`SELECT * FROM ${identifier(table)}`)).map(row => JSON.stringify(safeRow(table, row)));
    result[table] = rows.sort();
  }
  return result;
}
export const digest = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
export async function fingerprint(db) { return digest(await snapshot(db)); }
export async function assertReady(db) {
  const state = await metadata(db);
  if (!state || state.version !== VERSION || !state.ready) throw new Error('Target is not a completed managed demo dataset. Run demo:setup.');
  if (state.fingerprint !== await fingerprint(db)) throw new Error('Demo data conflicts with checkpoint: manual edits preserved; setup/export will not overwrite them.');
  return state;
}
