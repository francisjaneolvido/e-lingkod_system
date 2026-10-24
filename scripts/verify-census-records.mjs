import { spawnSync, spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import mariadb from 'mariadb';
import { loadConfig, applicationEnvironment } from './demo/config.mjs';
const config = loadConfig();
const name = `elb_b3_test_${randomUUID().replaceAll('-', '')}`;
const url = new URL(config.primary.url); url.pathname = '/' + name;
const db = await mariadb.createConnection({ host: url.hostname, port: Number(url.port || 3306), user: decodeURIComponent(url.username), password: decodeURIComponent(url.password) });
const env = { ...applicationEnvironment(config), DATABASE_URL: url.href, ELB_B3_TEST_DATABASE: name, ELB_DEMO_MODE: '' };
try {
  await db.query(`CREATE DATABASE \`${name}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
  console.log(`Disposable B3 database: ${name}`);
  const migration = spawnSync(process.execPath, ['node_modules/prisma/build/index.js', 'migrate', 'deploy'], { env, stdio: 'inherit', windowsHide: true });
  if (migration.status !== 0) throw new Error('Disposable migration failed');
  if (process.argv.includes('--serve')) {
    const browserEnv = { ...env, BETTER_AUTH_URL: 'http://localhost:3103', NEXT_PUBLIC_APP_URL: 'http://localhost:3103', ELB_NEXT_DIST_DIR: '.next-b3-test' };
    const seed = spawnSync(process.execPath, ['tests/helpers/prepare-census-browser.mjs'], { env: browserEnv, stdio: 'inherit', windowsHide: true });
    if (seed.status !== 0) throw new Error('B3 browser fixture failed');
    if (process.argv.includes('--analytics')) {
      const analyticsSeed = spawnSync(process.execPath, ['tests/helpers/prepare-analytics-browser.mjs'], { env: browserEnv, stdio: 'inherit', windowsHide: true });
      if (analyticsSeed.status !== 0) throw new Error('B4 browser fixture failed');
    }
    const child = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'dev', '--hostname', 'localhost', '--port', '3103'], { env: browserEnv, stdio: 'inherit', windowsHide: true });
    const stop = () => { if (child.pid) spawnSync('taskkill', ['/PID', String(child.pid), '/T', '/F'], { stdio: 'ignore', windowsHide: true }); };
    process.stdin.resume(); process.stdin.once('data', stop); process.once('SIGINT', stop); process.once('SIGTERM', stop);
    await new Promise(resolve => child.once('exit', resolve)); process.stdin.pause();
  } else {
  const files = process.argv.slice(2).filter(x => !x.startsWith('--'));
  const result = spawnSync(process.execPath, ['--test', '--test-concurrency=1', ...(files.length ? files : ['tests/demo-interruption.test.mjs', 'tests/census-records-b3.test.mjs', 'tests/census-api-b3.test.mjs', 'tests/census-review-fixes-b3.test.mjs', 'tests/demo-upgrade-recovery-b3.test.mjs'])], { env, stdio: 'inherit', windowsHide: true });
  process.exitCode = result.status ?? 1;
  }
} finally {
  if (!/^elb_b3_test_[a-f0-9]{32}$/.test(name)) throw new Error('Unsafe cleanup');
  await db.query(`DROP DATABASE \`${name}\``); await db.end();
}
