import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { runReferenceBrowser } from '../tests/visual-reference-browser.mjs';

const args = process.argv.slice(2);
const option = name => { const index = args.indexOf(name); if (index < 0 || !args[index + 1]) throw Error(name + ' is required.'); return args[index + 1]; };
const state = JSON.parse(fs.readFileSync(option('--state'), 'utf8'));
const target = new URL(state.env.DATABASE_URL);
if (state.cleaned || target.protocol !== 'mysql:' || !['localhost', '127.0.0.1'].includes(target.hostname) || !/^elb_b3_test_[a-f0-9]{32}$/.test(state.name) || target.pathname !== '/' + state.name || state.env.ELB_B3_TEST_DATABASE !== state.name || state.env.BETTER_AUTH_URL !== 'http://localhost:3117') throw Error('Guarded synthetic state required.');
const output = path.resolve(option('--output')); fs.mkdirSync(output, { recursive: true });
const require = createRequire(import.meta.url);
const { chromium } = require(path.resolve(option('--playwright')));
const browser = await chromium.launch({ channel: 'chrome', headless: true });
try {
  const checks = await runReferenceBrowser({ browser, origin: state.env.BETTER_AUTH_URL, adminState: path.resolve(option('--admin-state')), output });
  console.log(JSON.stringify({ passed: checks.filter(check => check.passed).length, failed: checks.filter(check => !check.passed).length, failures: checks.filter(check => !check.passed) }));
  if (checks.some(check => !check.passed)) process.exitCode = 1;
} catch (error) {
  fs.writeFileSync(path.join(path.dirname(path.resolve(option('--admin-state'))), 'reference-verification-error.log'), String(error.stack));
  console.error('Reference verification infrastructure failed; private diagnostics suppressed.'); process.exitCode = 1;
} finally { await browser.close(); }
