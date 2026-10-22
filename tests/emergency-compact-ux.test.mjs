import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const ts = require('typescript');
const publicPage = fs.readFileSync('src/features/emergency/components/public-emergency.tsx', 'utf8');
const consolePage = fs.readFileSync('src/features/emergency/components/emergency-console.tsx', 'utf8');

test('compact citizen UI retains immediately accessible tap-to-call national numbers', () => {
  assert.match(publicPage, /href="tel:911"/);
  assert.match(publicPage, /href="tel:143"/);
  assert.match(publicPage, /Call 911/);
  assert.match(publicPage, /Call 143/);
});
test('national shortcuts never appear twice in the local directory', () => {
  assert.match(publicPage, /row\.id !== "national-911" && row\.id !== "red-cross-143"/);
  assert.match(publicPage, /localHotlines\.filter\(/);
});
test('citizen UI can search local contacts and filter alerts by barangay', () => {
  assert.match(publicPage, /type="search"/);
  assert.match(publicPage, /LOS_BANOS_BARANGAYS\.map/);
  assert.match(publicPage, /row\.barangays\.includes\(barangay\)/);
});
test('hazard details can be expanded while critical alerts initially show instructions', () => {
  assert.match(publicPage, /<details key=\{alert\.id\} open=\{alert\.severity === "CRITICAL" \|\| alert\.severity === "WARNING"\}/);
  assert.match(publicPage, /Safety instructions/);
  assert.match(publicPage, /alert\.sourceUrl/);
});
test('browser dialer is user-triggered and local calling uses phone-only destinations', () => {
  assert.match(publicPage, /<a href=\{`tel:\$\{numberForDialer\(contact\.phone\)\}`\}/);
  assert.doesNotMatch(publicPage, /window\.location\s*=\s*[`'"]tel:/);
});
test('the console hides long composition forms until requested', () => {
  assert.match(consolePage, /\{showAlertEditor && <section/);
  assert.match(consolePage, /\{showHotlineEditor && <section/);
  assert.match(consolePage, /New advisory/);
  assert.match(consolePage, /Propose number/);
});
test('the console keeps status filtering, editing and affected barangay selections', () => {
  assert.match(consolePage, /alertFilter === "ALL"/);
  assert.match(consolePage, /hotlineFilter === "ALL"/);
  assert.match(consolePage, /function editExisting\(/);
  assert.match(consolePage, /Select all 14/);
});
test('the console keeps official source verification before Admin publication', () => {
  assert.match(consolePage, /Verify source/);
  assert.match(consolePage, /decision: "PUBLISH"/);
  assert.match(consolePage, /decision: "APPROVE"/);
  assert.match(consolePage, /window\.confirm/);
});
test('compact components transpile as TSX without syntax diagnostics', () => {
  for (const [file, code] of [
    ['public-emergency.tsx', publicPage],
    ['emergency-console.tsx', consolePage],
  ]) {
    const compiled = ts.transpileModule(code, { fileName: file, reportDiagnostics: true,
      compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } });
    assert.deepEqual((compiled.diagnostics || []).filter(item => item.category === ts.DiagnosticCategory.Error), [], `${file} must compile`);
  }
});
