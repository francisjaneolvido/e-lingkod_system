import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const ts = require('typescript');
function source(path) { return fs.readFileSync(path, 'utf8'); }
const compiled = ts.transpileModule(source('src/features/emergency/domain.ts'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
const mod = { exports: {} };
new Function('module','exports','require',compiled)(mod,mod.exports,require);
const d = mod.exports;

test('Los Baños has 14 official municipality barangays without duplicates',()=>{
  assert.equal(d.LOS_BANOS_BARANGAYS.length,14);
  assert.equal(new Set(d.LOS_BANOS_BARANGAYS).size,14);
  for(const barangay of ['Anos','Tadlac','Timugan (Poblacion)','Tuntungin-Putho']) assert.ok(d.LOS_BANOS_BARANGAYS.includes(barangay));
});
test('national emergency shortcuts are 911 and Red Cross 143 with source URLs',()=>{
  assert.deepEqual(d.OFFICIAL_NUMBERS.map(x=>x.phone),['911','143']);
  assert.ok(d.OFFICIAL_NUMBERS.every(x=>x.sourceUrl.startsWith('https://')));
});
test('phone dialer numbers cannot contain schemes, extensions or symbols',()=>{
  assert.equal(d.normalizedPhone('(049) 530-2981'),'0495302981');
  assert.equal(d.normalizedPhone('+63 917-123-4567'),'+639171234567');
  for(const input of ['javascript:alert(1)','tel:911','911;123','abc','','12345678901234567']) assert.throws(()=>d.normalizedPhone(input));
});
test('advisory must target valid barangays',()=>{
  assert.deepEqual(d.validBarangays(['Anos','Anos','Maahas']),['Anos','Maahas']);
  for(const data of [[], ['Invented'], 'Anos', ['Anos', 123]]) assert.throws(()=>d.validBarangays(data));
});
test('source URL must be public https and not credentials/javascript',()=>{
  assert.equal(d.acceptedSourceUrl('https://losbanos.gov.ph/sendmail'),'https://losbanos.gov.ph/sendmail');
  for(const input of ['http://losbanos.gov.ph','javascript:alert(1)','https://user:pass@losbanos.gov.ph','ftp://example.org']) assert.throws(()=>d.acceptedSourceUrl(input));
});
test('expired advisories and 30+ day windows are invalid',()=>{
  const now=new Date('2026-10-22T12:00:00.000Z');
  assert.deepEqual(Object.keys(d.parseFutureWindow('2026-10-23T12:00:00Z','2026-10-23T15:00:00Z',now)),['startsAt','expiresAt']);
  for(const pair of [['2026-10-22T10:00:00Z','2026-10-22T11:00:00Z'],['2026-10-23T12:00:00Z','2026-11-24T12:00:00Z'],['oops','2026-10-24T12:00:00Z']]) assert.throws(()=>d.parseFutureWindow(...pair,now));
});
test('only designated LGU office staff are eligible for emergency desk',()=>{
  assert.equal(d.belongsToEmergencyOffice('Municipal Disaster Risk Reduction and Management Office (MDRRMO)'),true);
  assert.equal(d.belongsToEmergencyOffice('Public Information Office'),true);
  assert.equal(d.belongsToEmergencyOffice('Business Permits and Licensing Office (BPLO)'),false);
});
test('public portal filters unpublished and expired alerts on server',()=>{
  const page=source('src/app/emergency/page.tsx');
  assert.match(page,/status:\s*"PUBLISHED"/);
  assert.match(page,/startsAt:\s*\{\s*lte:\s*now\s*\}/);
  assert.match(page,/expiresAt:\s*\{\s*gt:\s*now\s*\}/);
  assert.match(page,/isActive:\s*true/);
  assert.doesNotMatch(page,/requireCitizenPageViewer/);
});
test('Admin is required for publishing and approving contacts',()=>{
  const api=source('src/app/api/admin/emergency/route.ts');
  assert.match(api,/if \(action === "hotline.review"\)\s*\{\s*onlyAdmin\(viewer.role\)/);
  assert.match(api,/if \(action === "alert.review"\)\s*\{\s*onlyAdmin\(viewer.role\)/);
  assert.match(api,/assertSameOrigin\(request\)/);
  assert.match(api,/requireApiViewer\(request, "EMERGENCY"\)/);
});
test('home/service and staff navigation lead to implemented Emergency module',()=>{
  assert.match(source('src/features/landing/sections/services-section.tsx'),/"\/emergency"/);
  assert.match(source('src/components/admin/staff-workspace.tsx'),/Emergency desk|Local emergency contacts/);
  assert.match(source('src/components/layout/site-header.tsx'),/emergency: "\/emergency"/);
});
