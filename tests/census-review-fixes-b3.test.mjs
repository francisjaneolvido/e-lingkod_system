import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { loadServerTypescript } from './helpers/load-typescript.mjs';
import { zip } from './helpers/xlsx-fixture.mjs';

const enabled = /^elb_b3_test_[a-f0-9]{32}$/.test(process.env.ELB_B3_TEST_DATABASE || '');
test('B3 independent-review persistent regressions', { skip: !enabled }, async t => {
  const hook = loadServerTypescript();
  const { prisma } = await import('../src/lib/prisma.ts');
  const { auth } = await import('../src/lib/auth.ts');
  const census = await import('../src/features/census/server/data.ts');
  const imports = await import('../src/features/census/server/imports.ts');
  const api = await import('../src/app/api/admin/census/imports/route.ts');
  const origin = process.env.BETTER_AUTH_URL;
  const account = await auth.api.signUpEmail({ body: { name: 'Ignored client name', firstName: 'Review', lastName: 'Administrator', hasNoMiddleName: true, phoneNumber: '+639001234567', email: 'review.admin@example.test', password: 'B3-review-fixture-2026!' }, returnHeaders: true });
  const cookie = account.headers.getSetCookie().map(v => v.split(';')[0]).join('; ');
  assert.equal(spawnSync(process.execPath, ['scripts/set-admin.mjs', 'review.admin@example.test'], { env: process.env, stdio: 'ignore', windowsHide: true }).status, 0);
  const admin = await prisma.user.findUniqueOrThrow({ where: { email: 'review.admin@example.test' } });
  try {
    await t.test('R1 ignored identifiers never enter valid/rejected row storage or API responses', async () => {
      const ignored = ['Private Original Name', 'ignored.person@example.test', '+639991112222', 'Rejected Private Name', 'rejected.person@example.test', '+639993334444'];
      const table = { headers: ['Reference', 'Barangay', 'Age', 'Name', 'Email', 'Phone'], rows: [
        ['REVIEW-R1-A', 'Bambang', '25-34', ...ignored.slice(0, 3)],
        ['REVIEW-R1-B', 'Bambang', 'bad-age', ...ignored.slice(3)],
      ], fileType: 'CSV', sourceFilename: 'ignored-identifiers.csv' };
      const mapping = { 0: 'participantRef', 1: 'barangay', 2: 'ageGroup', 3: 'IGNORE', 4: 'IGNORE', 5: 'IGNORE' };
      const meta = { source: 'REVIEW-R1', surveyYear: 2026, activityName: 'Synthetic ignored-column regression', activityType: 'TEST', implementingOffice: 'PESO', intendedUse: 'INTERNAL_STATISTICS' };
      const saved = await imports.commitImport(admin, { table, mapping, meta });
      assert.equal(saved.imported, 1); assert.equal(saved.rejected, 1);
      const rows = await prisma.communityImportRecord.findMany({ where: { batchId: saved.batchId }, orderBy: { originalRowNumber: 'asc' } });
      assert.equal(rows.length, 2);
      for (const row of rows) {
        const raw = JSON.parse(row.rawJson);
        assert.equal(raw.IGNORE, undefined, 'Ignored identifiers persisted in rawJson');
        for (const value of ignored) assert.equal(JSON.stringify(row).includes(value), false);
        assert.equal(raw.barangay, 'Bambang');
        assert.ok(raw.participantRef.startsWith('REVIEW-R1-'));
      }
      const response = await api.GET(new Request(origin + '/api/admin/census/imports?id=' + saved.batchId, { headers: { cookie } }));
      assert.equal(response.status, 200);
      const payload = await response.json();
      for (const value of ignored) assert.equal(JSON.stringify(payload).includes(value), false);
      assert.equal(JSON.parse(payload.rows[0].rawJson).ageGroup, '25-34');
    });
    await t.test('R2 individual and annual establishment payloads use the same scope as review', async () => {
      const registered = await auth.api.signUpEmail({ body: { name: 'Ignored client name', firstName: 'Scoped', lastName: 'Reviewer', hasNoMiddleName: true, phoneNumber: '+639001234568', email: 'review.staff@example.test', password: 'B3-review-fixture-2026!' }, returnHeaders: true });
      const staffCookie = registered.headers.getSetCookie().map(v => v.split(';')[0]).join('; ');
      const { POST } = await import('../src/app/api/admin/staff/route.ts');
      const grant = await POST(new Request(origin + '/api/admin/staff', { method: 'POST', headers: { origin, cookie, 'content-type': 'application/json' }, body: JSON.stringify({ mode: 'SAVE', email: 'review.staff@example.test', department: 'PESO', designation: 'Scoped reviewer', modules: ['CENSUS'] }) }));
      assert.equal(grant.status, 200);
      const staff = await prisma.user.findUniqueOrThrow({ where: { email: 'review.staff@example.test' } });
      await census.setRecordScope(admin, { staffId: staff.id, barangays: ['Bambang'], expectedVersion: 0 });
      const citizen = await prisma.user.create({ data: { id: 'review_R2_owner', name: 'Synthetic Record Owner', email: 'review.owner@example.test', role: 'CITIZEN' } });
      const personal = await import('../src/features/community/server/survey-lifecycle.ts');
      const org = await import('../src/features/establishments/server/data.ts');
      const records = await import('../src/app/api/admin/census/records/route.ts');
      const answers = { surveyYear: 2026, status: 'SUBMITTED', barangay: 'Maahas', ageGroup: '25-34', educationLevel: 'COLLEGE', employmentStatus: 'EMPLOYED_FULL_TIME', skills: ['Data Entry'], consentAggregated: true, occupation: 'Maahas retained secret', requestKey: 'review_R2_person_first', expectedVersion: 0, expectedConsentVersion: 0 };
      await personal.saveCitizenSurvey(answers, citizen);
      await personal.saveCitizenSurvey({ ...answers, status: 'DRAFT', barangay: 'Bambang', occupation: 'Bambang working draft', expectedVersion: 1 }, citizen);
      const workspace = await prisma.communitySurveyWorkspace.findFirstOrThrow({ where: { userId: citizen.id, surveyYear: 2026 } });
      const draftDetail = await census.recordDetail(staff, 'INDIVIDUAL', workspace.id, {});
      assert.equal(draftDetail.record, null, 'A permitted draft exposed an out-of-scope retained response');
      assert.equal(draftDetail.draft.occupation, 'Bambang working draft');
      assert.equal(draftDetail.history.total, 0);
      assert.equal(JSON.stringify(draftDetail).includes('Maahas'), false);
      assert.equal((await census.listRecords(staff, { search: 'review.owner@example.test', kind: 'INDIVIDUAL', status: 'SUBMITTED' })).total, 0);
      await personal.saveCitizenSurvey({ ...answers, barangay: 'Bambang', occupation: 'Bambang submitted response', expectedVersion: 2, expectedConsentVersion: 1, requestKey: 'review_R2_person_bambang' }, citizen);
      await personal.saveCitizenSurvey({ ...answers, status: 'DRAFT', occupation: 'Maahas later draft', expectedVersion: 3 }, citizen);
      const retainedDetail = await census.recordDetail(staff, 'INDIVIDUAL', workspace.id, { pageSize: '1' });
      assert.equal(retainedDetail.record.occupation, 'Bambang submitted response');
      assert.equal(retainedDetail.draft, null);
      assert.equal(retainedDetail.history.total, 1);
      assert.equal(JSON.stringify(retainedDetail).includes('Maahas'), false);
      await personal.saveCitizenSurvey({ ...answers, expectedVersion: 4, expectedConsentVersion: 2, requestKey: 'review_R2_person_maahas_later' }, citizen);
      const historyOnly = await census.recordDetail(staff, 'INDIVIDUAL', workspace.id, { page: '2', pageSize: '1' });
      assert.equal(historyOnly.record, null); assert.equal(historyOnly.draft, null);
      assert.equal(historyOnly.history.total, 1); assert.equal(historyOnly.history.items.length, 0);
      const list = await census.listRecords(staff, { search: 'review.owner@example.test', kind: 'INDIVIDUAL', pageSize: '1' });
      assert.equal(list.total, 1); assert.equal(list.items[0].barangay, 'Bambang');
      const response = await records.GET(new Request(origin + '/api/admin/census/records?kind=INDIVIDUAL&id=' + workspace.id, { headers: { cookie: staffCookie } }));
      assert.equal(response.status, 200); const body = await response.json();
      assert.equal(body.history.total, 1); assert.equal(JSON.stringify(body).includes('Maahas'), false);
      const all = await census.recordDetail(admin, 'INDIVIDUAL', workspace.id, {});
      assert.equal(all.history.total, 3); assert.equal(all.record.barangay, 'Maahas');
      assert.equal((await personal.ownedSurveyState(citizen.id, 2026)).history.length, 3);
      const allowedRevision = body.history.items[0];
      await census.addReview(staff, { kind: 'INDIVIDUAL', revisionId: allowedRevision.id, action: 'VERIFIED', requestKey: 'review_R2_visible_revision' });
      await assert.rejects(census.addReview(staff, { kind: 'INDIVIDUAL', revisionId: all.history.items[0].id, action: 'VERIFIED', requestKey: 'review_R2_forbidden_revision' }));
      const business = { surveyYear: 2025, businessName: 'Canonical Maahas secret', officeType: 'MAIN', street: 'Maahas canonical street', barangay: 'Maahas', employerType: 'PRIVATE', organizationType: 'CORPORATION', industry: 'INFORMATION', productsServices: 'Synthetic services', operatingStatus: 'OPERATING', contactName: 'Synthetic Representative', contactPosition: 'Manager', contactEmail: 'review.owner@example.test' };
      const created = await org.createEstablishment({ ...business, requestKey: 'review_R2_org_create' }, citizen);
      async function save(value, key) { const current = await org.ownedEstablishmentState(citizen, created.establishmentId, value.surveyYear); return org.saveEstablishmentSurvey({ ...value, establishmentId: created.establishmentId, expectedRecordVersion: current.recordVersion, expectedVersion: current.workspaceVersion, requestKey: key, correctIdentity: false }, citizen); }
      await save({ ...business, status: 'SUBMITTED' }, 'review_R2_org_old_year');
      await save({ ...business, surveyYear: 2026, status: 'SUBMITTED', barangay: 'Bambang', street: 'Bambang annual street', businessName: 'Bambang annual name' }, 'review_R2_org_annual_only');
      const annual = await prisma.establishmentSurvey.findFirstOrThrow({ where: { establishmentId: created.establishmentId, surveyYear: 2026 } });
      const visible = await census.listRecords(staff, { search: 'review.owner@example.test', kind: 'ESTABLISHMENT', year: '2026' });
      assert.equal(visible.total, 1); assert.equal(visible.items[0].name, 'Bambang annual name'); assert.equal(visible.items[0].barangay, 'Bambang');
      assert.equal((await census.listRecords(staff, { search: 'review.owner@example.test', kind: 'ESTABLISHMENT', year: '2025' })).total, 0);
      await save({ ...business, surveyYear: 2026, status: 'DRAFT' }, 'review_R2_org_later_draft');
      const annualDetail = await census.recordDetail(staff, 'ESTABLISHMENT', annual.id, {});
      assert.equal(annualDetail.draft, null); assert.equal(annualDetail.history.total, 1);
      assert.equal(JSON.stringify(annualDetail).includes('Maahas'), false);
      const orgAll = await census.recordDetail(admin, 'ESTABLISHMENT', annual.id, {});
      assert.equal(orgAll.record.establishment.barangay, 'Maahas');
      assert.equal(orgAll.draft.barangay, 'Maahas');
      assert.equal((await org.ownedEstablishmentState(citizen, created.establishmentId, 2026)).answers.barangay, 'Maahas');
    });
    await t.test('R5 compatibility imports preserve supplied activity provenance and retry context', async () => {
      const metadata = { source: 'REVIEW-R5', surveyYear: '2025', activityName: 'Historical source evidence', activityType: 'CENSUS', implementingOffice: 'PESO', intendedUse: 'INTERNAL_STATISTICS', activityDate: '2026-02-17', coverage: 'Bambang households', originalPurpose: 'Original livelihood assessment', notes: 'Synthetic archived field notes' };
      const form = new FormData();
      for (const [key, value] of Object.entries(metadata)) form.set(key, value);
      form.set('file', new File(['Reference,Barangay,Age\nR5-MAPPED,Bambang,25-34'], 'r5.csv', { type: 'text/csv' }));
      form.set('mapping', JSON.stringify({ 0: 'participantRef', 1: 'barangay', 2: 'ageGroup' }));
      const { mappedImportRequest } = await import('../src/features/census/server/import-request.ts');
      const { input } = await mappedImportRequest(form, admin);
      const saved = await imports.commitImport(admin, input);
      const batch = await prisma.communityImportBatch.findUniqueOrThrow({ where: { id: saved.batchId }, include: { activity: true } });
      assert.equal(batch.surveyYear, 2025);
      assert.equal(batch.activity.activityDate?.toISOString(), '2026-02-17T00:00:00.000Z');
      for (const field of ['coverage', 'originalPurpose', 'notes']) assert.equal(batch.activity[field], metadata[field]);
      assert.equal((await imports.commitImport(admin, input)).batchId, saved.batchId);
      const changed = await imports.commitImport(admin, { ...input, meta: { ...input.meta, notes: 'Different source note' } });
      assert.notEqual(changed.batchId, saved.batchId);
      assert.equal(changed.skipped, 1);
      const manual = await import('../src/app/api/admin/community-import/manual/route.ts');
      const response = await manual.POST(new Request(origin + '/api/admin/community-import/manual', { method: 'POST', headers: { origin, cookie, 'content-type': 'application/json' }, body: JSON.stringify({ ...metadata, participantRef: 'R5-MANUAL', barangay: 'Bambang', ageGroup: '35-44' }) }));
      assert.equal(response.status, 200);
      const value = await response.json();
      const manualBatch = await prisma.communityImportBatch.findUniqueOrThrow({ where: { id: value.batchId }, include: { activity: true } });
      for (const field of ['coverage', 'originalPurpose', 'notes']) assert.equal(manualBatch.activity[field], metadata[field]);
      assert.equal(manualBatch.activity.activityDate?.toISOString(), '2026-02-17T00:00:00.000Z');
      for (const invalid of [{ activityDate: '2026-02-30' }, { coverage: 'x'.repeat(181) }, { notes: 7 }]) assert.throws(() => imports.validateImport({ ...input, meta: { ...input.meta, ...invalid } }), /date|metadata|limit/i);
    });
    await t.test('R6 worksheet coordinates survive blank rows, elevated headers, rejection and API display', async () => {
      const { parseUploadedTable } = await import('../src/features/community/server/import-file.ts');
      const row = (number, values) => '<row r="' + number + '">' + values.map((value, i) => '<c r="' + String.fromCharCode(65 + i) + number + '" t="inlineStr"><is><t>' + value + '</t></is></c>').join('') + '</row>';
      const xml = '<worksheet><sheetData><row r="1"></row>' + row(3, ['Reference', 'Barangay', 'Age']) + row(4, ['R6-A', 'Bambang', '25-34']) + '<row r="5"></row>' + row(7, ['R6-B', 'Bambang', '35-44']) + row(9, ['R6-C', 'Bambang', 'invalid']) + '</sheetData></worksheet>';
      const form = new FormData(); form.set('file', new File([zip([['xl/worksheets/sheet1.xml', xml]])], 'source-rows.xlsx'));
      const table = await parseUploadedTable(form);
      const input = { table, mapping: { 0: 'participantRef', 1: 'barangay', 2: 'ageGroup' }, meta: { source: 'REVIEW-R6', surveyYear: 2025, activityName: 'Coordinate evidence', activityType: 'TEST', implementingOffice: 'PESO', intendedUse: 'RESEARCH' } };
      assert.deepEqual(imports.validateImport(input).rows.map(r => r.originalRowNumber), [4, 7, 9]);
      assert.equal(table.headerRowNumber, 3);
      const saved = await imports.commitImport(admin, input);
      assert.equal(saved.rejected, 1);
      const records = await prisma.communityImportRecord.findMany({ where: { batchId: saved.batchId }, orderBy: { originalRowNumber: 'asc' } });
      assert.deepEqual(records.map(r => r.originalRowNumber), [4, 7, 9]);
      assert.equal(JSON.parse(records[1].rawJson).participantRef, 'R6-B');
      const response = await api.GET(new Request(origin + '/api/admin/census/imports?id=' + saved.batchId, { headers: { cookie } }));
      assert.deepEqual((await response.json()).rows.map(r => r.originalRowNumber), [4, 7, 9]);
      const shifted = { ...input, table: { ...table, sourceRowNumbers: [5, 8, 10] } };
      assert.notEqual(imports.validateImport(shifted).fingerprint, imports.validateImport(input).fingerprint);
      const csv = new FormData(); csv.set('file', new File(['Reference,Barangay\n\n"multi\nline",Bambang\nR6-CSV,Maahas'], 'records.csv'));
      const parsedCsv = await parseUploadedTable(csv);
      assert.equal(parsedCsv.fileType, 'CSV');
      assert.deepEqual(imports.validateImport({ ...input, table: parsedCsv, mapping: { 0: 'participantRef', 1: 'barangay' } }).rows.map(r => r.originalRowNumber), [2, 3]);
    });
    await t.test('R4-B committed staff grants cannot adopt later unrelated profile or designation edits', async t => {
      const { accounts } = await import('../demo/fixtures/dataset.mjs');
      const identity = accounts.find(a => a.email === 'admin.01@example.test');
      await auth.api.signUpEmail({ body: { ...identity, name: identity.firstName + ' ' + identity.lastName } });
      assert.equal(spawnSync(process.execPath, ['scripts/set-admin.mjs', identity.email], { env: process.env, stdio: 'ignore', windowsHide: true }).status, 0);
      const actor = await prisma.user.findUniqueOrThrow({ where: { email: identity.email } });
      const { journalStep } = await import('../scripts/demo/operation-journal.mjs');
      const { snapshot, digest } = await import('../scripts/demo/database.mjs');
      const mariadb = (await import('mariadb')).default, url = new URL(process.env.DATABASE_URL);
      const db = await mariadb.createConnection({ host: url.hostname, port: Number(url.port || 3306), user: decodeURIComponent(url.username), password: decodeURIComponent(url.password), database: url.pathname.slice(1), dateStrings: true, bigIntAsNumber: true });
      try {
        for (const kind of ['profile', 'designation', 'unchanged']) await t.test(kind, async () => {
          const email = 'grant.' + kind + '@example.test';
          await auth.api.signUpEmail({ body: { name: 'Ignored', firstName: 'Grant', lastName: 'Recovery', hasNoMiddleName: true, phoneNumber: '+639001234569', email, password: 'B3-review-fixture-2026!' } });
          let state = { completed: {}, pending: null, fingerprint: digest(await snapshot(db)) };
          const persist = async value => { await db.query('CREATE TABLE IF NOT EXISTS _elb_demo_meta(name VARCHAR(60) PRIMARY KEY,value LONGTEXT)'); await db.query("REPLACE INTO _elb_demo_meta VALUES('grant-review',?)", [JSON.stringify(value)]); };
          const prepare = async () => ({ kind: 'staff-grant', actorId: actor.id, payload: { email, mode: 'SAVE', department: 'PESO', designation: 'Original demo officer', modules: ['CENSUS'] } });
          await assert.rejects(journalStep({ db, state, name: 'grant', persist, prepare, fault: 'after' }), /interruption/);
          if (kind === 'profile') await prisma.user.update({ where: { email }, data: { name: 'Manual Profile Preserved', firstName: 'Manual', lastName: 'Preserved' } });
          if (kind === 'designation') await prisma.user.update({ where: { email }, data: { designation: 'Later legitimate reassignment' } });
          const [stored] = await db.query("SELECT value FROM _elb_demo_meta WHERE name='grant-review'"); state = JSON.parse(stored.value);
          const before = digest(await snapshot(db));
          if (kind === 'unchanged') assert.equal((await journalStep({ db, state, name: 'grant', persist, prepare })).replayed, true);
          else {
            await assert.rejects(journalStep({ db, state, name: 'grant', persist, prepare }), /conflict/i);
            assert.equal(digest(await snapshot(db)), before);
          }
          const user = await prisma.user.findUniqueOrThrow({ where: { email } });
          assert.equal(user.designation, kind === 'designation' ? 'Later legitimate reassignment' : 'Original demo officer');
          if (kind === 'profile') assert.equal(user.name, 'Manual Profile Preserved');
          assert.equal(await prisma.staffAccessAudit.count({ where: { actorId: actor.id, targetUserId: user.id } }), 1);
        });
      } finally { await db.end(); }
    });
  } finally { await prisma.$disconnect(); hook.deregister(); }
});
