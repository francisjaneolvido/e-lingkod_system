import test from 'node:test';
import assert from 'node:assert/strict';
import { deflateRawSync } from 'node:zlib';
import { loadServerTypescript } from './helpers/load-typescript.mjs';
process.env.DATABASE_URL ||= 'mysql://test:test@127.0.0.1/elb_validation_no_connection';
const hook = loadServerTypescript();
const { parseUploadedTable } = await import('../src/features/community/server/import-file.ts');
const { validateImport } = await import('../src/features/census/server/imports.ts');
const fixture = { table: { headers: ['Reference', 'Barangay', 'Age', 'Education'], rows: [['A', 'Bambang', '25-34', 'college']], sourceFilename: 'source.csv', fileType: 'CSV' }, mapping: { 0: 'participantRef', 1: 'barangay', 2: 'ageGroup', 3: 'educationLevel' }, meta: { source: 'SPES-TEST', surveyYear: 2025, activityName: 'Historical SPES source', activityType: 'SPES', implementingOffice: 'PESO', intendedUse: 'INTERNAL_STATISTICS' } };
function upload(name, bytes) { const form = new FormData(); form.set('file', new File([bytes], name)); return parseUploadedTable(form); }
function zip(entries) {
  const locals = [], central = []; let offset = 0;
  for (const [name, raw, inflatedSize] of entries) {
    const body = Buffer.from(raw), compressed = deflateRawSync(body), file = Buffer.from(name), local = Buffer.alloc(30), head = Buffer.alloc(46);
    local.writeUInt32LE(0x04034b50); local.writeUInt16LE(8, 8); local.writeUInt32LE(compressed.length, 18); local.writeUInt32LE(inflatedSize ?? body.length, 22); local.writeUInt16LE(file.length, 26);
    head.writeUInt32LE(0x02014b50); head.writeUInt16LE(8, 10); head.writeUInt32LE(compressed.length, 20); head.writeUInt32LE(inflatedSize ?? body.length, 24); head.writeUInt16LE(file.length, 28); head.writeUInt32LE(offset, 42);
    locals.push(local, file, compressed); central.push(head, file); offset += local.length + file.length + compressed.length;
  }
  const end = Buffer.alloc(22); end.writeUInt32LE(0x06054b50); end.writeUInt16LE(entries.length, 8); end.writeUInt16LE(entries.length, 10); end.writeUInt32LE(Buffer.concat(central).length, 12); end.writeUInt32LE(offset, 16);
  return Buffer.concat([...locals, ...central, end]);
}
test.after(() => hook.deregister());
test('legacy anonymous SPES retry identity includes actual source/year/type, retaining row multiplicity', async () => {
  const { spesFingerprint } = await import('../src/features/jobs/server/spes-import.ts');
  const rows = [{ barangay: 'Bambang', education: 'COLLEGE', skills: ['Data Entry'], interests: [], availability: 'ANY' }];
  const context = { sourceLabel: 'Source A', surveyYear: 2025, datasetKind: 'REAL' };
  assert.notEqual(spesFingerprint(rows, context), spesFingerprint(rows, { ...context, sourceLabel: 'Source B' }));
  assert.notEqual(spesFingerprint(rows, context), spesFingerprint(rows, { ...context, surveyYear: 2026 }));
  assert.notEqual(spesFingerprint(rows, context), spesFingerprint([...rows, ...rows], context));
});
test('CSV and real XLSX structures normalize source categories without filling unknowns', async () => {
  const csv = await upload('historical.csv', 'Reference,Barangay,Age,Education\nA,Bambang,25-34,college\nB,Maahas,,\n');
  const normalized = validateImport({ ...fixture, table: csv });
  assert.equal(normalized.rows[0].record.educationLevel, 'COLLEGE'); assert.equal(normalized.rows[1].record.ageGroup, null); assert.equal(normalized.rows[1].record.educationLevel, null);
  const xml = '<worksheet><sheetData><row><c r="A1" t="inlineStr"><is><t>Reference</t></is></c><c r="B1" t="inlineStr"><is><t>Barangay</t></is></c></row><row><c r="A2" t="inlineStr"><is><t>HIST-1</t></is></c><c r="B2" t="inlineStr"><is><t>Bambang</t></is></c></row></sheetData></worksheet>';
  const parsed = await upload('source.xlsx', zip([['xl/worksheets/sheet1.xml', xml]])); assert.deepEqual(parsed.rows, [['HIST-1', 'Bambang']]);
});
test('reject malformed, traversal, duplicate, oversized, encrypted/unsupported archives and entity XML', async () => {
  for (const bytes of [Buffer.from('bad'), zip([['../sheet.xml', 'bad']]), zip([['a', 'x'], ['a', 'x']]), zip([['xl/worksheets/sheet1.xml', 'small', 9_000_000]]), zip([['xl/worksheets/sheet1.xml', '<!DOCTYPE x [<!ENTITY y SYSTEM "file:///x">]>']])]) await assert.rejects(upload('invalid.xlsx', bytes));
  await assert.rejects(upload('file.exe', 'bad')); await assert.rejects(upload('empty.csv', 'Reference,Age'));
  await assert.rejects(upload('large.csv', Buffer.alloc(2_500_001)));
});
test('reject invalid mappings, excessive cells, duplicate headers and fabricated youth age categories', () => {
  assert.throws(() => validateImport({ ...fixture, mapping: { 0: 'barangay' } }));
  assert.throws(() => validateImport({ ...fixture, table: { ...fixture.table, headers: ['Reference', 'Reference'] } }));
  assert.throws(() => validateImport({ ...fixture, table: { ...fixture.table, rows: [['A', 'Bambang', '25-34', 'x'.repeat(501)]] } }));
  const bad = validateImport({ ...fixture, table: { ...fixture.table, rows: [['A', 'Bambang', '2', 'college']] } });
  assert.match(bad.rows[0].error, /age/i);
});
