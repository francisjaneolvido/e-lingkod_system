import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';

const read = (path) => fs.readFileSync(path, 'utf8');
const schema = read('prisma/schema.prisma');
const migration = read('prisma/migrations/20261022183000_online_lgu_services_verification/migration.sql');
const catalog = read('src/features/services/catalog.ts');
const domain = read('src/features/services/domain.ts');
const mutations = read('src/features/services/server/mutations.ts');
const data = read('src/features/services/server/data.ts');
const citizenDetail = read('src/features/services/components/citizen-request-detail.tsx');
const documentReview = read('src/features/services/components/document-review-list.tsx');
const adminActions = read('src/features/services/components/admin-request-actions.tsx');
const adminPage = read('src/app/admin/services/page.tsx');
const adminDetail = read('src/app/admin/services/[id]/page.tsx');


test('V14 adds additive per-document verification and release approval metadata', () => {
  assert.match(schema, /verificationStatus String\s+@default\("PENDING"\)/);
  assert.match(schema, /verifiedById\s+String\?/);
  assert.match(schema, /releaseApprovedAt\s+DateTime\?/);
  assert.match(migration, /ADD COLUMN `verificationStatus`/);
  assert.match(migration, /ADD COLUMN `releaseApprovedAt`/);
  assert.doesNotMatch(migration, /DROP TABLE|TRUNCATE|DELETE FROM/i);
});

test('service catalog uses service-specific sections, realistic fields and completion modes', () => {
  for (const token of ['DTI / SEC / CDA registration number','Tax Identification Number','TCT / OCT / Tax Declaration reference','First-time jobseeker declaration','Existing PWD ID number','Senior citizen date of birth']) {
    assert.match(catalog, new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }
  assert.match(catalog, /completionMode: "RELEASE"/);
  assert.match(catalog, /completionMode: "SERVICE"/);
  assert.match(catalog, /reviewChecklist:/);
  assert.match(catalog, /serviceNotice:/);
});

test('server validation blocks invalid forms and validation until required documents are verified', () => {
  assert.match(domain, /SENIOR_BIRTHDATE/);
  assert.match(domain, /requiredDocumentsSubmittable/);
  assert.match(domain, /requiredDocumentsVerified/);
  assert.match(domain, /Enter a valid TIN format/);
  assert.match(mutations, /verifyServiceDocument/);
  assert.match(mutations, /Verify every currently required document before validating the request/);
  assert.match(mutations, /DOCUMENT_REJECTED/);
  assert.match(mutations, /releaseApprovedAt/);
});

test('admin and staff UX uses workflow views, search, document verification and guarded final verification', () => {
  assert.match(data, /workflowViews/);
  assert.match(adminPage, /New \/ intake/);
  assert.match(adminPage, /Tracking ID, citizen, email or service/);
  assert.match(adminDetail, /Requirements verification/);
  assert.match(adminDetail, /Service review checklist/);
  assert.match(documentReview, /Needs replacement/);
  assert.match(documentReview, /Verify/);
  assert.match(adminActions, /Validate remains locked/);
  assert.match(adminActions, /Super Admin verification/);
});

test('citizen UX exposes stage tracking, explicit next action and requirement verification states', () => {
  assert.match(citizenDetail, /serviceStageLabels/);
  assert.match(citizenDetail, /Next:/);
  assert.match(citizenDetail, /Needs replacement/);
  assert.match(citizenDetail, /Tracking history/);
  assert.match(citizenDetail, /Cancel request/);
});

test('V14 changed TS and TSX files parse successfully', () => {
  const files = [
    'src/features/services/catalog.ts',
    'src/features/services/domain.ts',
    'src/features/services/server/data.ts',
    'src/features/services/server/mutations.ts',
    'src/features/services/components/service-form-fields.tsx',
    'src/features/services/components/service-start-form.tsx',
    'src/features/services/components/citizen-request-detail.tsx',
    'src/features/services/components/document-review-list.tsx',
    'src/features/services/components/admin-request-actions.tsx',
    'src/app/services/page.tsx',
    'src/app/services/[serviceKey]/page.tsx',
    'src/app/services/requests/page.tsx',
    'src/app/admin/services/page.tsx',
    'src/app/admin/services/[id]/page.tsx',
    'src/app/api/admin/services/requests/[id]/documents/[documentId]/route.ts',
  ];
  for (const file of files) {
    const result = ts.transpileModule(read(file), {
      fileName: file,
      reportDiagnostics: true,
      compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.ESNext },
    });
    assert.equal(result.diagnostics?.length ?? 0, 0, `${file}: ${JSON.stringify(result.diagnostics?.map(d => d.messageText))}`);
  }
});
