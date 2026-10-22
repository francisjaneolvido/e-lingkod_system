import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';

const read = (path) => fs.readFileSync(path, 'utf8');
const schema = read('prisma/schema.prisma');
const migration = read('prisma/migrations/20261022170000_online_lgu_services/migration.sql');
const catalog = read('src/features/services/catalog.ts');
const domain = read('src/features/services/domain.ts');
const mutations = read('src/features/services/server/mutations.ts');
const citizenDetail = read('src/features/services/components/citizen-request-detail.tsx');
const adminActions = read('src/features/services/components/admin-request-actions.tsx');
const adminPage = read('src/app/admin/services/page.tsx');
const staffWorkspace = read('src/components/admin/staff-workspace.tsx');
const header = read('src/components/layout/site-header.tsx');

test('Online LGU Services uses additive request, document, event and appointment persistence', () => {
  for (const model of ['ServiceRequest', 'ServiceRequestDocument', 'ServiceRequestEvent', 'ServiceAppointment']) {
    assert.match(schema, new RegExp(`model ${model} \\{`));
  }
  assert.match(migration, /CREATE TABLE `service_request`/);
  assert.match(migration, /CREATE TABLE `service_request_document`/);
  assert.match(migration, /CREATE TABLE `service_request_event`/);
  assert.match(migration, /CREATE TABLE `service_appointment`/);
  assert.doesNotMatch(migration, /DROP TABLE|TRUNCATE|DELETE FROM/i);
});

test('initial service catalog contains all agreed permits, clearances and assistance services', () => {
  for (const key of [
    'mayors-business-permit',
    'building-permit',
    'certificate-of-residency',
    'first-time-jobseeker',
    'business-clearance',
    'solo-parent-assistance',
    'pwd-assistance',
    'senior-citizen-assistance',
  ]) {
    assert.match(catalog, new RegExp(`key: "${key}"`));
  }
  assert.match(catalog, /intakeMode: "PRESCREEN"/);
  assert.match(catalog, /intakeMode: "DIRECT"/);
});

test('citizen request flow supports corrections, documents, appointment confirmation and timeline', () => {
  assert.match(domain, /ACTION_REQUIRED/);
  assert.match(domain, /APPOINTMENT_CONFIRMED/);
  assert.match(domain, /READY_FOR_RELEASE/);
  assert.match(citizenDetail, /Submit for LGU review/);
  assert.match(citizenDetail, /Choose your schedule/);
  assert.match(citizenDetail, /None work — request new options/);
  assert.match(citizenDetail, /Tracking history/i);
});

test('staff workflow supports validation, corrections, scheduling and recommendation while admin keeps final verification', () => {
  for (const action of ['OPEN_FORM','START_REVIEW','REQUEST_CORRECTION','VALIDATE','RECOMMEND_FINAL','MARK_RELEASED','DECLINE']) {
    assert.match(mutations, new RegExp(action));
  }
  assert.match(mutations, /export async function scheduleServiceAppointment/);
  assert.match(mutations, /export async function adminFinalAction/);
  assert.match(adminActions, /Request correction/);
  assert.match(adminActions, /Offer schedule options/);
  assert.match(adminActions, /Approve for release/);
  assert.match(adminActions, /Verify completed/);
});

test('SERVICES is a live staff/admin workspace and citizen navigation exposes requests', () => {
  assert.match(adminPage, /requireModulePage\("\/admin\/services","SERVICES"\)/);
  assert.match(staffWorkspace, /canManageServices/);
  assert.match(staffWorkspace, /ONLINE LGU SERVICES/);
  assert.match(header, /services: "\/services"/);
  assert.match(header, /My LGU Requests/);
});

test('new Online LGU Services TS and TSX files parse successfully', () => {
  const files = [
    'src/features/services/catalog.ts',
    'src/features/services/domain.ts',
    'src/features/services/server/data.ts',
    'src/features/services/server/mutations.ts',
    'src/features/services/components/service-start-form.tsx',
    'src/features/services/components/citizen-request-detail.tsx',
    'src/features/services/components/admin-request-actions.tsx',
    'src/app/services/page.tsx',
    'src/app/services/[serviceKey]/page.tsx',
    'src/app/services/requests/page.tsx',
    'src/app/services/requests/[id]/page.tsx',
    'src/app/admin/services/page.tsx',
    'src/app/admin/services/[id]/page.tsx',
  ];
  for (const file of files) {
    const result = ts.transpileModule(read(file), {
      fileName: file,
      reportDiagnostics: true,
      compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.ESNext },
    });
    assert.equal(result.diagnostics?.length ?? 0, 0, `${file}: ${JSON.stringify(result.diagnostics?.map((d) => d.messageText))}`);
  }
});
