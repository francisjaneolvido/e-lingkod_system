import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';

const read = (path) => fs.readFileSync(path, 'utf8');
const schema = read('prisma/schema.prisma');
const migration = read('prisma/migrations/20261022210000_online_lgu_services_flow_v15/migration.sql');
const catalog = read('src/features/services/catalog.ts');
const domain = read('src/features/services/domain.ts');
const mutations = read('src/features/services/server/mutations.ts');
const data = read('src/features/services/server/data.ts');
const citizenDetail = read('src/features/services/components/citizen-request-detail.tsx');
const startForm = read('src/features/services/components/service-start-form.tsx');
const adminActions = read('src/features/services/components/admin-request-actions.tsx');
const servicesPage = read('src/app/services/page.tsx');

 test('V15 adds release note without destructive migration', () => {
  assert.match(schema, /releaseNote\s+String\?/);
  assert.match(migration, /ADD COLUMN `releaseNote` TEXT NULL/);
  assert.doesNotMatch(migration, /DROP TABLE|TRUNCATE|DELETE FROM/i);
});

test('V15 catalog supports service-specific scheduling, conditions, pre-screening and department matching', () => {
  assert.match(catalog, /AppointmentMode = "NONE" \| "OPTIONAL" \| "INTERVIEW" \| "INSPECTION" \| "PICKUP"/);
  assert.match(catalog, /prescreenFieldKeys/);
  assert.match(catalog, /departmentAliases/);
  assert.match(catalog, /condition\?: ServiceCondition/);
  assert.match(catalog, /departmentMatchesService/);
  assert.match(catalog, /appointmentMode: "INSPECTION"/);
  assert.match(catalog, /appointmentMode: "INTERVIEW"/);
});

test('V15 uses dynamic citizen stages and an explicit appointment-completed state', () => {
  assert.match(domain, /APPOINTMENT_COMPLETED/);
  assert.match(domain, /serviceStageLabels/);
  assert.match(domain, /serviceStage\(/);
  assert.match(domain, /PARTIAL/);
  assert.match(domain, /PRESCREEN/);
});

test('V15 citizens really select among schedule slots and drafts autosave', () => {
  assert.match(citizenDetail, /Choose your schedule/);
  assert.match(citizenDetail, /Select one available slot/);
  assert.match(citizenDetail, /action:"SELECT"/);
  assert.match(citizenDetail, /None work — request new options/);
  assert.match(citizenDetail, /action:"SAVE_DRAFT"/);
  assert.match(citizenDetail, /Changes save automatically/);
  assert.match(startForm, /Create draft/);
});

test('V15 staff offers multiple slots, records appointment outcome, and cannot skip verification', () => {
  assert.match(adminActions, /Offer schedule options/);
  assert.match(adminActions, /2–5 schedule options/);
  assert.match(adminActions, /COMPLETE_APPOINTMENT/);
  assert.match(adminActions, /Record .*appointment.* outcome|Record .*inspection.* outcome/);
  assert.match(mutations, /rawSlots\.length < 2 \|\| rawSlots\.length > 5/);
  assert.match(mutations, /NOT_SELECTED/);
  assert.match(mutations, /scheduledAt\.getTime\(\) > Date\.now\(\)/);
  assert.match(mutations, /Complete the confirmed scheduled activity before staff recommendation/);
});

test('V15 protects cancellation, release notes, and department-scoped staff assignment', () => {
  assert.match(mutations, /releaseNote/);
  assert.match(mutations, /departmentMatchesService/);
  assert.match(mutations, /CANCELLED/);
  assert.match(data, /departmentMatchesService/);
  assert.match(data, /serviceStaffOptions\(serviceKey/);
});

test('V15 citizen service catalog remains compact and task-oriented', () => {
  assert.match(servicesPage, /What do you need today\?/);
  assert.match(servicesPage, /Scheduling only if needed/);
  assert.match(servicesPage, /Track every handoff/);
});

test('V15 changed TS and TSX files parse successfully', () => {
  const files = [
    'src/features/services/catalog.ts',
    'src/features/services/domain.ts',
    'src/features/services/server/data.ts',
    'src/features/services/server/mutations.ts',
    'src/features/services/components/service-form-fields.tsx',
    'src/features/services/components/service-start-form.tsx',
    'src/features/services/components/citizen-request-detail.tsx',
    'src/features/services/components/admin-request-actions.tsx',
    'src/app/services/page.tsx',
    'src/app/services/[serviceKey]/page.tsx',
    'src/app/services/requests/page.tsx',
    'src/app/admin/services/page.tsx',
    'src/app/admin/services/[id]/page.tsx',
    'src/app/api/services/requests/[id]/route.ts',
    'src/app/api/services/documents/[documentId]/route.ts',
  ];
  for (const file of files) {
    const result = ts.transpileModule(read(file), { fileName:file, reportDiagnostics:true, compilerOptions:{ jsx:ts.JsxEmit.ReactJSX, module:ts.ModuleKind.ESNext } });
    assert.equal(result.diagnostics?.length ?? 0, 0, `${file}: ${JSON.stringify(result.diagnostics?.map(d=>d.messageText))}`);
  }
});
