import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { registerHooks } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import ts from 'typescript';

// These fixtures exercise pure aggregate arithmetic and must never generate a
// database client or read application/database configuration.
const hook = registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith('@/')) specifier = pathToFileURL(path.resolve('src', specifier.slice(2))).href;
    if (specifier.startsWith('file:') || specifier.startsWith('.')) {
      const url = new URL(specifier, context.parentURL);
      if (url.protocol === 'file:' && !path.extname(fileURLToPath(url)) && fs.existsSync(fileURLToPath(url) + '.ts')) return { url: url.href + '.ts', shortCircuit: true };
    }
    return nextResolve(specifier, context);
  },
  load(url, context, nextLoad) {
    if (url.endsWith('.ts')) return { format: 'module', source: ts.transpileModule(fs.readFileSync(fileURLToPath(url), 'utf8'), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } }).outputText, shortCircuit: true };
    return nextLoad(url, context);
  },
});
const { summarizeGeography } = await import('../src/features/analytics/geographic-domain.ts');
const { analyticsCsv } = await import('../src/features/analytics/domain.ts');
test.after(() => hook.deregister());

const context = (population = 'INDIVIDUAL', scope = null, filters = {}) => ({
  filters: { population, period: 'YEAR', year: 2026, ...filters },
  source: population === 'IMPORTS' ? 'Source A' : 'Synthetic annual source',
  unit: population === 'ESTABLISHMENT' ? 'establishments' : population === 'INDIVIDUAL' ? 'respondents' : 'source observations',
  scope,
});
const cell = (result, name = 'Bambang') => result.cells.find(item => item.barangay === name);

test('training geography uses joint eligible rows and preserves known, missing and source denominator', () => {
  const rows = [
    ...['YES', 'MAYBE', 'NO', 'NOT_NOW', null].map(trainingInterest => ({ barangay: 'Bambang', trainingInterest })),
    { barangay: 'Maahas', trainingInterest: 'YES' },
    { barangay: 'Unmapped legacy place', trainingInterest: 'YES' },
  ];
  for (const population of ['INDIVIDUAL', 'IMPORTS']) {
    const result = summarizeGeography(rows, context(population));
    assert.deepEqual(cell(result).values['eligible-records'], { value: 5, denominator: 7, known: 5, missing: 0 });
    assert.deepEqual(cell(result).values['training-interest-yes'], { value: 1, denominator: 5, known: 4, missing: 1 });
    assert.deepEqual(cell(result).trainingInterest, { YES: 1, MAYBE: 1, NO: 1, NOT_NOW: 1 });
    assert.equal(result.unmappedEligible, 1);
    assert.equal(result.filters.year, 2026);
    assert.equal(result.source, context(population).source);
    assert.equal(result.cells.length, 14);
    assert.equal(cell(result, 'Anos').values['eligible-records'].value, 0);
    assert.equal(cell(result, 'Anos').values['training-interest-yes'].value, null);
    const zero = summarizeGeography([{ barangay: 'Bambang', trainingInterest: 'NO' }, { barangay: 'Bambang', trainingInterest: 'MAYBE' }, { barangay: 'Bambang', trainingInterest: 'yes' }], context(population));
    assert.deepEqual(cell(zero).values['training-interest-yes'], { value: 0, denominator: 3, known: 2, missing: 1 });
  }
});

test('exact scope is checked before aliases and unauthorized values cannot affect cells or scale', () => {
  const result = summarizeGeography([
    { barangay: 'Tadlac', trainingInterest: 'YES' },
    ...Array.from({ length: 20 }, () => ({ barangay: 'Tadlak', trainingInterest: 'YES' })),
    ...Array.from({ length: 50 }, () => ({ barangay: 'Maahas', trainingInterest: 'YES' })),
  ], context('INDIVIDUAL', ['Tadlac']));
  assert.equal(result.scope, 'restricted');
  assert.equal(result.cells.length, 1);
  assert.equal(result.authorizedCodes.length, 1);
  assert.equal(result.cells[0].barangay, 'Tadlak');
  assert.equal(result.cells[0].filterKey, 'Tadlac');
  assert.equal(result.cells[0].eligible, 1);
  assert.equal(result.cells[0].values['eligible-records'].denominator, 1);
  assert.equal(result.metrics[0].legend.maximum, 1);
  assert.equal(result.unmappedEligible, 0);
  assert.equal(JSON.stringify(result).includes('Maahas'), false);
  const selected = summarizeGeography([{ barangay: 'Bambang' }, { barangay: 'Maahas' }], context('INDIVIDUAL', null, { barangay: 'Bambang' }));
  assert.equal(selected.cells.length, 1);
  assert.equal(selected.cells[0].eligible, 1);
  assert.match(selected.scopeRationale, /Bambang/);
  assert.equal(summarizeGeography([{ barangay: 'Bambang' }], context('INDIVIDUAL', [])).cells.length, 0);
});

test('workforce sums known totalWorkers, includes zero and never adds overlapping worker columns', () => {
  const result = summarizeGeography([
    { barangay: 'Bambang', totalWorkers: 0, regularWorkers: 4, nonRegularWorkers: 3, partTimeWorkers: 3 },
    { barangay: 'Bambang', totalWorkers: 10, partTimeWorkers: 7 },
    { barangay: 'Bambang', totalWorkers: null },
    { barangay: 'Maahas', totalWorkers: null },
  ], context('ESTABLISHMENT'));
  assert.deepEqual(cell(result).values['reported-total-workers'], { value: 10, denominator: 3, known: 2, missing: 1 });
  assert.equal(cell(result, 'Maahas').values['reported-total-workers'].value, null);
  const zero = summarizeGeography([{ barangay: 'Bambang', totalWorkers: 0 }], context('ESTABLISHMENT'));
  assert.equal(cell(zero).values['reported-total-workers'].value, 0);
  assert.equal(zero.metrics[1].legend.maximum, 0);
});

test('SPES counts normalized nonblank recorded interests once per source observation', () => {
  const result = summarizeGeography([
    { barangay: 'Bambang', trainingPrograms: ['  Welding ', 'welding', '\u3000'] },
    { barangay: 'Bambang', trainingPrograms: '["Cookery", ""]' },
    { barangay: 'Bambang', trainingPrograms: [' ', null] },
    { barangay: 'Bambang', trainingPrograms: null },
  ], context('SPES', ['Bambang'], { dataset: 'REAL' }));
  assert.deepEqual(cell(result).values['recorded-program-interests'], { value: 2, denominator: 4, known: 2, missing: 2 });
  assert.equal(result.metrics[1].unit, 'source observations');
});

test('integer legends have five nonoverlapping inclusive ranges and missing-only is unavailable', () => {
  const rows = Array.from({ length: 7 }, () => ({ barangay: 'Bambang', trainingInterest: null }));
  const result = summarizeGeography(rows, context());
  const legend = result.metrics[0].legend;
  assert.equal(legend.maximum, 7);
  assert.equal(legend.bins.length, 5);
  for (const value of [1, 2, 3, 4, 5, 6, 7]) assert.equal(legend.bins.filter(bin => value >= bin.min && value <= bin.max).length, 1);
  assert.equal(cell(result).values['training-interest-yes'].value, null);
  assert.equal(result.metrics[1].legend.maximum, null);
  assert.deepEqual(result.metrics[1].legend.bins, []);
});

test('CSV includes only authorized geography values with the same denominators and missing context', () => {
  const geography = summarizeGeography([{ barangay: 'Bambang', trainingInterest: 'YES' }, { barangay: 'Bambang' }], context('INDIVIDUAL', ['Bambang']));
  const output = analyticsCsv({ filters: geography.filters, groups: [{ source: geography.source, unit: geography.unit, count: 2, breakdowns: [], measures: [], considerations: [], geography }], methodology: [], excluded: {}, rosters: [] });
  assert.match(output, /"geography:training-interest-yes","Bambang \[/);
  assert.match(output, /,"1","2","1","1"/);
  assert.match(output, /geography:scope/);
  assert.equal(output.includes('Maahas'), false);
});
