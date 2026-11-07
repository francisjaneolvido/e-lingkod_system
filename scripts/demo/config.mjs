import fs from 'node:fs';
import dotenv from 'dotenv';

export const VERSION = 'elb-demo-2026-v1';
export const YEAR = 2026;
export function guardedTarget(raw, kind = 'primary') {
  if (!raw) throw new Error('Explicit DEMO_DATABASE_URL/DEMO_RESTORE_DATABASE_URL is required. No DATABASE_URL fallback.');
  let url;
  try { url = new URL(raw); } catch { throw new Error('Invalid explicit demo connection URL (credentials withheld).'); }
  const database = decodeURIComponent(url.pathname.slice(1));
  const valid = kind === 'primary' ? database === 'e_lingkod_bayan_demo' : /^e_lingkod_bayan_demo_restore(?:_[a-z0-9]+)?$/.test(database);
  if (url.protocol !== 'mysql:' || !['localhost', '127.0.0.1', '[::1]', '::1'].includes(url.hostname) || !valid || url.search || url.hash) {
    throw new Error('Refusing non-local or incorrect dedicated demo database target.');
  }
  return { url, database, host: url.hostname, port: Number(url.port || 3306), user: decodeURIComponent(url.username), password: decodeURIComponent(url.password) };
}
export function readDemoConfig(values) {
  const primary = guardedTarget(values.DEMO_DATABASE_URL);
  const restore = values.DEMO_RESTORE_DATABASE_URL ? guardedTarget(values.DEMO_RESTORE_DATABASE_URL, 'restore') : null;
  const base = new URL(values.DEMO_BASE_URL || 'http://localhost:3102');
  if (!values.DEMO_AUTH_SECRET || values.DEMO_AUTH_SECRET.length < 32) throw new Error('A dedicated demo auth secret of at least 32 characters is required.');
  if (!['http://localhost:3000','http://localhost:3102'].includes(base.origin) || base.pathname !== '/' || base.search || base.hash) throw new Error('DEMO_BASE_URL must be http://localhost:3000 or http://localhost:3102; choose a free port.');
  return { primary, restore, baseURL: base.origin, secret: values.DEMO_AUTH_SECRET, accountsFile: values.DEMO_ACCOUNTS_FILE || process.env.DEMO_ACCOUNTS_FILE, rsaPath: values.MYSQL_RSA_PUBLIC_KEY_PATH || process.env.MYSQL_RSA_PUBLIC_KEY_PATH };
}
export function loadConfig() {
  if (!fs.existsSync('.env.demo.local')) throw new Error('Create ignored .env.demo.local from demo/demo.env.example.');
  return readDemoConfig(dotenv.parse(fs.readFileSync('.env.demo.local')));
}
export function applicationEnvironment(config, target = config.primary) {
  return { ...process.env, DEMO_ACCOUNTS_FILE: config.accountsFile || process.env.DEMO_ACCOUNTS_FILE, MYSQL_RSA_PUBLIC_KEY_PATH: config.rsaPath || process.env.MYSQL_RSA_PUBLIC_KEY_PATH, DATABASE_URL: target.url.href, BETTER_AUTH_SECRET: config.secret, BETTER_AUTH_URL: config.baseURL, NEXT_PUBLIC_APP_URL: config.baseURL, ELB_DEMO_MODE: VERSION, ELB_NEXT_DIST_DIR: '.next-demo', GIT_OPTIONAL_LOCKS: '0' };
}
export function commandTarget(config, command, restored = false) {
  if (restored && !['verify', 'dev'].includes(command)) throw new Error('--restored is supported only for verify/dev; setup/export always target the primary demo database.');
  const target = restored ? config.restore : config.primary;
  if (!target) throw new Error('Explicit DEMO_RESTORE_DATABASE_URL is required');
  return target;
}
