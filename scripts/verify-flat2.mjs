import fs from 'node:fs';
import path from 'node:path';
import { randomUUID, randomBytes } from 'node:crypto';
import { createRequire } from 'node:module';
import vm from 'node:vm';
import os from 'node:os';
import net from 'node:net';
import { spawn, spawnSync } from 'node:child_process';
import dotenv from 'dotenv';
import mariadb from 'mariadb';

const args = process.argv.slice(2);
const option = (key, fallback) => { const i = args.indexOf(key); if (i < 0) return fallback; if (!args[i + 1] || args[i + 1].startsWith('--')) throw Error(key + ' requires a value.'); return args[i + 1]; };
const root = process.cwd();
const phase = option('--phase', 'after');
if (!['before', 'after'].includes(phase)) throw Error('--phase must be before or after.');
const output = path.resolve(option('--output', '.scratch/release-2/browser/' + phase + '-interactions'));
fs.mkdirSync(output, { recursive: true });
const privateLog = path.resolve(option('--private-log', path.join(os.tmpdir(), 'e-lingkod-flat2-' + randomUUID() + '.log')));
const log = fs.openSync(privateLog, 'a');
const statePath = option('--state');
const envPath = option('--env');
if (!statePath && !envPath) throw Error('Provide an explicit private --env file or guarded synthetic --state file.');
let env, credentials, name, origin, database, child, created = false, browser;
const checkTarget = (raw, expected) => {
  const target = new URL(raw);
  if (target.protocol !== 'mysql:' || !['localhost', '127.0.0.1'].includes(target.hostname) || !/^elb_b3_test_[a-f0-9]{32}$/.test(target.pathname.slice(1)) || target.pathname !== '/' + expected) throw Error('Only a guarded local disposable schema is allowed.');
  return target;
};
const run = command => { const result = spawnSync(process.execPath, command, { cwd: root, env, windowsHide: true, stdio: ['ignore', log, log] }); if (result.status !== 0) throw Error('Disposable setup failed. Inspect the private runner log.'); };
try {
  if (statePath) {
    const state = JSON.parse(fs.readFileSync(path.resolve(statePath), 'utf8'));
    if (state.cleaned) throw Error('Disposable state was already cleaned.');
    ({ env, credentials, name } = state);
    checkTarget(env.DATABASE_URL, name);
    if (env.ELB_B3_TEST_DATABASE !== name) throw Error('Disposable schema guard does not match.');
    origin = env.BETTER_AUTH_URL;
  } else {
    const config = dotenv.parse(fs.readFileSync(path.resolve(envPath), 'utf8'));
    const configured = new URL(config.DATABASE_URL || 'mysql://localhost/missing');
    if (configured.protocol !== 'mysql:' || !['localhost', '127.0.0.1'].includes(configured.hostname) || !configured.username) throw Error('Private configuration must point to local MySQL.');
    credentials = JSON.parse(config.ELB_FLAT2_TEST_AUTH_JSON || '{}');
    if (!credentials.admin || !credentials.staff) throw Error('Private ELB_FLAT2_TEST_AUTH_JSON must supply the existing synthetic Admin and scoped Staff fixture credentials.');
    name = 'elb_b3_test_' + randomUUID().replaceAll('-', '');
    const target = new URL(configured); target.hostname = '127.0.0.1'; target.pathname = '/' + name;
    checkTarget(target.href, name);
    const port = Number(option('--port', '3117'));
    if (![3103, 3117].includes(port)) throw Error('Use an isolated test port: 3103 or 3117.');
    await new Promise((resolve, reject) => {
      const socket = net.connect({ host: 'localhost', port });
      socket.once('connect', () => { socket.destroy(); reject(Error('Isolated preview port is already in use. Refuse to test another server.')); });
      socket.once('error', error => { socket.destroy(); if (error.code === 'ECONNREFUSED') resolve(); else reject(error); });
    });
    origin = 'http://localhost:' + port;
    env = { ...process.env, ...config, DATABASE_URL: target.href, ELB_B3_TEST_DATABASE: name, ELB_MUNICIPAL_TEST_DATABASE: name,
      BETTER_AUTH_SECRET: randomBytes(32).toString('hex'), BETTER_AUTH_URL: origin, NEXT_PUBLIC_APP_URL: origin,
      ELB_NEXT_DIST_DIR: '.scratch/release-2/dev-next', NEXT_TELEMETRY_DISABLED: '1', ELB_DEMO_MODE: '',
      RESEND_API_KEY: '', STAFF_INVITE_FROM: '', PASSWORD_RESET_FROM: '', ELB_PASSWORD_RESET_TRANSPORT: 'capture',
      PASSWORD_RESET_CAPTURE_DIR: path.join(output, 'synthetic-mail') };
    database = await mariadb.createConnection({ host: configured.hostname, port: Number(configured.port || 3306), user: decodeURIComponent(configured.username), password: decodeURIComponent(configured.password),
      ...(config.MYSQL_RSA_PUBLIC_KEY_PATH ? { cachingRsaPublicKey: fs.readFileSync(config.MYSQL_RSA_PUBLIC_KEY_PATH, 'utf8') } : {}) });
    await database.query('CREATE DATABASE `' + name + '` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci'); created = true;
    run(['node_modules/prisma/build/index.js', 'migrate', 'deploy']);
    for (const fixture of ['prepare-census-browser', 'prepare-analytics-browser', 'prepare-ui-browser', 'prepare-theme-browser', 'prepare-theme-authority']) run(['tests/helpers/' + fixture + '.mjs']);
    child = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'dev', '--hostname', 'localhost', '--port', String(port)], { cwd: root, env, windowsHide: true, stdio: ['ignore', log, log] });
  }
  if (!/^http:\/\/localhost:(3103|3117)$/.test(origin)) throw Error('Only an isolated localhost test origin is allowed.');
  const deadline = Date.now() + 180000;
  for (;;) {
    try { const response = await fetch(origin + '/login', { signal: AbortSignal.timeout(10000) }); if (response.ok) break; } catch { /* Wait for isolated server startup. */ }
    if (Date.now() > deadline) throw Error('Isolated preview did not become ready.');
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  const require = createRequire(import.meta.url);
  const playwrightPath = option('--playwright');
  const playwright = playwrightPath ? require(path.resolve(playwrightPath)) : (() => { try { return require('playwright'); } catch { try { return require('playwright-core'); } catch { throw Error('Install Playwright or supply its explicit local module path with --playwright.'); } } })();
  browser = await playwright.chromium.launch({ channel: option('--channel', 'chrome'), headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await context.newPage(); page.setDefaultTimeout(12000); page.setDefaultNavigationTimeout(180000);
  const code = fs.readFileSync(path.join(root, 'tests/flat2-interactions-browser.js'), 'utf8');
  const runBrowser = new vm.Script('(' + code + ')', { filename: 'flat2-interactions-browser.js' }).runInThisContext();
let lastReported = 0;
const onProgress = result => {
fs.writeFileSync(path.join(output, 'interaction-summary.json'), JSON.stringify({ ...result, completed: false }, null, 2));
if (args.includes('--progress') && result.checks.length >= lastReported + 20) { lastReported = result.checks.length; console.log(JSON.stringify({ progress: result.checks.length, failed: result.failures.length, last: result.checks.at(-1)?.name })); }
};
const privateCookiePath = statePath ? path.join(path.dirname(path.resolve(statePath)), 'flat2-role-cookies.json') : null;
let cachedRoleCookies = {};
if (privateCookiePath) { try { cachedRoleCookies = JSON.parse(fs.readFileSync(privateCookiePath, 'utf8')); } catch { /* First guarded run has no private session cache. */ } }
const resumePath = option('--resume-checkpoint');
const resume = resumePath ? JSON.parse(fs.readFileSync(path.resolve(resumePath), 'utf8')) : {};
if (resumePath && (!resume.syntheticOnly || !Array.isArray(resume.checks) || resume.checks.some(check => !check.passed))) throw Error('Only an explicitly prepared passing synthetic checkpoint is accepted.');
const result = await runBrowser(page, { origin, credentials, output, phase, matrix: args.includes('--matrix'), matrixWorkers: Number(option('--matrix-workers', '1')), cachedRoleCookies, only: option('--only'), onProgress, resumeChecks: resume.checks, resumeScreenshots: resume.screenshots });
if (resumePath) result.checkpointProvenance = resume.provenance;
if (privateCookiePath) fs.writeFileSync(privateCookiePath, JSON.stringify(result.privateRoleCookies));
delete result.privateRoleCookies;
  fs.writeFileSync(path.join(output, 'interaction-summary.json'), JSON.stringify({ ...result, completed: true }, null, 2));
  console.log(JSON.stringify({ phase, passed: result.checks.filter(check => check.passed).length, failed: result.failures.length, failures: result.failures }));
  if (result.failures.length) process.exitCode = 1;
} catch (error) {
  // Never emit connection URLs, environment, credentials, or browser auth payloads.
  fs.writeSync(log, '\n' + String(error.stack).replace(/mysql:\/\/\S+/g, '[private connection]') + '\n');
  console.error('Flat UI browser verification failed. Private log: ' + privateLog); process.exitCode = 1;
} finally {
  if (browser) await browser.close();
  if (child?.pid) spawnSync('taskkill', ['/PID', String(child.pid), '/T', '/F'], { windowsHide: true, stdio: 'ignore' });
  if (created) { checkTarget(env.DATABASE_URL, name); await database.query('DROP DATABASE `' + name + '`'); }
  if (database) await database.end();
  fs.closeSync(log);
}
