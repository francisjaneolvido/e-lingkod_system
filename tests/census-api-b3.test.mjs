import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { loadServerTypescript } from './helpers/load-typescript.mjs';
const enabled = /^elb_b3_test_[a-f0-9]{32}$/.test(process.env.ELB_B3_TEST_DATABASE || '');
test('B3 authenticated API scope, review, import and retry boundaries', { skip: !enabled }, async () => {
  const hook = loadServerTypescript(); const { prisma } = await import('../src/lib/prisma.ts');
  const { auth } = await import('../src/lib/auth.ts'); const records = await import('../src/app/api/admin/census/records/route.ts'); const imports = await import('../src/app/api/admin/census/imports/route.ts');
  const origin = process.env.BETTER_AUTH_URL, password = 'B3-api-password-2026!';
  async function register(lastName) {
    const email = 'api.' + lastName.toLowerCase() + '@example.test';
    const response = await auth.api.signUpEmail({ body: { firstName: 'Synthetic', lastName, name: 'Ignored client name', email, password, phoneNumber: '+639001234567', hasNoMiddleName: true }, returnHeaders: true });
    return { cookie: response.headers.getSetCookie().map(v => v.split(';')[0]).join('; '), user: await prisma.user.findUniqueOrThrow({ where: { email } }) };
  }
  const request = (path, cookie, body, expectedOrigin = origin) => new Request(origin + path, { method: body ? 'POST' : 'GET', headers: { ...(cookie ? { cookie } : {}), origin: expectedOrigin, 'content-type': 'application/json' }, ...(body ? { body: JSON.stringify(body) } : {}) });
  try {
    const admin = await register('Administrator'), citizen = await register('Participant'), staff = await register('Officer');
    assert.equal(spawnSync(process.execPath, ['scripts/set-admin.mjs', admin.user.email], { env: process.env, stdio: 'ignore', windowsHide: true }).status, 0);
    const { POST: grant } = await import('../src/app/api/admin/staff/route.ts');
    assert.equal((await grant(request('/api/admin/staff', admin.cookie, { mode: 'SAVE', email: staff.user.email, department: 'PESO', designation: 'Synthetic census officer', modules: ['CENSUS'] }))).status, 200);
    assert.equal((await records.GET(request('/api/admin/census/records', ''))).status, 401);
    assert.equal((await records.GET(request('/api/admin/census/records', citizen.cookie))).status, 403);
    assert.equal((await records.POST(request('/api/admin/census/records', admin.cookie, { operation: 'RECORD_SCOPE', staffId: staff.user.id, barangays: ['Bambang'], expectedVersion: 0 }, 'https://untrusted.example.test'))).status, 403);
    assert.equal((await records.POST(request('/api/admin/census/records', admin.cookie, { operation: 'RECORD_SCOPE', staffId: staff.user.id, barangays: ['Bambang'], expectedVersion: 0 }))).status, 200);
    const personal = await import('../src/features/community/server/survey-lifecycle.ts');
    await personal.saveCitizenSurvey({ surveyYear: 2026, status: 'SUBMITTED', barangay: 'Maahas', ageGroup: '25-34', educationLevel: 'COLLEGE', employmentStatus: 'UNEMPLOYED_LOOKING', skills: ['Data Entry'], consentAggregated: true, expectedVersion: 0, expectedConsentVersion: 0, requestKey: 'b3_api_initial_revision' }, citizen.user);
    const record = await prisma.communitySurveyWorkspace.findFirstOrThrow({ where: { userId: citizen.user.id } }), revision = await prisma.communitySurveyRevision.findFirstOrThrow({ where: { userId: citizen.user.id } });
    assert.equal((await records.GET(request(`/api/admin/census/records?kind=INDIVIDUAL&id=${record.id}`, staff.cookie))).status, 403);
    assert.equal((await records.POST(request('/api/admin/census/records', staff.cookie, { kind: 'INDIVIDUAL', revisionId: revision.id, action: 'VERIFIED', requestKey: 'b3_api_out_of_scope' }))).status, 403);
    const input = { kind: 'INDIVIDUAL', revisionId: revision.id, action: 'APPROVED', requestKey: 'b3_api_approval_retry', actorId: citizen.user.id, createdAt: '1900-01-01' };
    const [first, repeat] = await Promise.all([records.POST(request('/api/admin/census/records', admin.cookie, input)), records.POST(request('/api/admin/census/records', admin.cookie, input))]);
    assert.equal(first.status, 200); assert.equal(repeat.status, 200); const saved = await first.json(); assert.equal(saved.actorId, admin.user.id); assert.notEqual(saved.createdAt, input.createdAt);
    assert.equal(await prisma.censusReview.count({ where: { requestKey: input.requestKey } }), 1);
    const form = () => { const f = new FormData(); f.set('file', new File(['Reference,Barangay,Age\nAPI-1,Bambang,25-34\n'], 'api-source.csv')); for (const [k, v] of Object.entries({ action: 'PREVIEW', source: 'B3-API', surveyYear: '2026', activityName: 'Synthetic API source', activityType: 'TEST', implementingOffice: 'PESO', intendedUse: 'INTERNAL_STATISTICS', mapping: JSON.stringify({ 0: 'participantRef', 1: 'barangay', 2: 'ageGroup' }) })) f.set(k, v); return f; };
    const postForm = (f, cookie = staff.cookie) => imports.POST(new Request(origin + '/api/admin/census/imports', { method: 'POST', headers: { cookie, origin }, body: f }));
    assert.equal((await postForm(form(), citizen.cookie)).status, 403);
    const preview = await postForm(form()); assert.equal(preview.status, 200); const checked = await preview.json();
    const commit = form(); commit.set('action', 'COMMIT'); commit.set('previewHash', checked.fingerprint);
    const imported = await postForm(commit); assert.equal(imported.status, 200); const value = await imported.json();
    const second = form(); second.set('action', 'COMMIT'); second.set('previewHash', checked.fingerprint);
    assert.equal((await (await postForm(second)).json()).batchId, value.batchId);
    const batch = await imports.GET(request(`/api/admin/census/imports?id=${value.batchId}`, staff.cookie)); assert.equal(batch.status, 200); assert.equal((await batch.json()).rows[0].participantRef, 'API-1');
    // Compatibility endpoints share the same stable-record service and authority.
    const legacyPreview = await import('../src/app/api/admin/community-import/preview/route.ts');
    const legacyCommit = await import('../src/app/api/admin/community-import/commit/route.ts');
    const legacyManual = await import('../src/app/api/admin/community-import/manual/route.ts');
    const legacyForm = form(); legacyForm.set('source', 'B3-LEGACY-API');
    const legacyChecked = await legacyPreview.POST(new Request(origin + '/api/admin/community-import/preview', { method: 'POST', headers: { cookie: staff.cookie, origin }, body: legacyForm }));
    assert.equal(legacyChecked.status, 200); const legacyHash = (await legacyChecked.json()).previewHash;
    const commitLegacy = () => { const f = form(); f.set('source', 'B3-LEGACY-API'); f.set('previewHash', legacyHash); return legacyCommit.POST(new Request(origin + '/api/admin/community-import/commit', { method: 'POST', headers: { cookie: staff.cookie, origin }, body: f })); };
    assert.equal((await (await commitLegacy()).json()).batchId, (await (await commitLegacy()).json()).batchId);
    const manual = { source: 'B3-MANUAL', surveyYear: 2025, participantRef: 'PAPER-A', activityName: 'Synthetic paper source', activityType: 'TEST', implementingOffice: 'PESO', barangay: 'Bambang', ageGroup: '25-34', educationLevel: 'COLLEGE', employmentStatus: 'EMPLOYED_FULL_TIME' };
    const m1 = await legacyManual.POST(request('/api/admin/community-import/manual', staff.cookie, manual)); assert.equal(m1.status, 200);
    const m2 = await legacyManual.POST(request('/api/admin/community-import/manual', staff.cookie, manual)); assert.equal((await m1.json()).batchId, (await m2.json()).batchId);
    // Anonymous historical SPES keeps row multiplicity, source/year boundaries and
    // exact-batch replay without guessing identity from matching answers.
    const spesPreview = await import('../src/app/api/admin/jobs/import/preview/route.ts'), spesCommit = await import('../src/app/api/admin/jobs/import/route.ts');
    async function importSpes(label, year) {
      const f = () => { const form = new FormData(); form.set('file', new File(['consent,barangay,education,skills,interests,availability\nyes,Bambang,COLLEGE,Data Entry,Office & admin,ANY\nyes,Bambang,COLLEGE,Data Entry,Office & admin,ANY\n'], 'anonymous-spes.csv')); form.set('sourceLabel', label); form.set('surveyYear', String(year)); form.set('datasetKind', 'DEMO'); return form; };
      const requestForm = form => new Request(origin + '/api/admin/jobs/import', { method: 'POST', headers: { cookie: admin.cookie, origin }, body: form });
      const response = await spesPreview.POST(requestForm(f())); assert.equal(response.status, 200); const checked = await response.json(); assert.equal(checked.invalidRows, 0);
      const input = f(); input.set('previewHash', checked.previewHash); const result = await spesCommit.POST(requestForm(input)); assert.ok(result.ok); return result.json();
    }
    const s1 = await importSpes('B3 anonymous source A', 2025), s2 = await importSpes('B3 anonymous source A', 2025);
    assert.equal(s1.batchId, s2.batchId); assert.equal(s2.replayed, true); assert.equal(await prisma.spesSurveyRecord.count({ where: { batchId: s1.batchId } }), 2);
    const s3 = await importSpes('B3 anonymous source B', 2025); assert.notEqual(s1.batchId, s3.batchId);
    const s4 = await importSpes('B3 anonymous source A', 2026); assert.notEqual(s1.batchId, s4.batchId);
    assert.equal((await prisma.spesSurveyRecord.findFirstOrThrow({ where: { batchId: s1.batchId } })).originalRowNumber, 2);
    await prisma.staffPermission.deleteMany({ where: { userId: staff.user.id, module: 'CENSUS' } });
    assert.equal((await records.GET(request('/api/admin/census/records', staff.cookie))).status, 403);
    assert.equal((await imports.GET(request('/api/admin/census/imports', staff.cookie))).status, 403);
  } finally { await prisma.$disconnect(); hook.deregister(); }
});
