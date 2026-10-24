import fs from 'node:fs';
import { spawnSync } from 'node:child_process';
import assert from 'node:assert/strict';
import { accounts, staffGrants, individualAnswers, establishmentAnswers, vacancyScenarios, datasetVersion, referenceYear } from '../../demo/fixtures/dataset.mjs';
import { connect, tables, metadata, saveMetadata, fingerprint, assertReady, digest } from './database.mjs';
import { applicationEnvironment } from './config.mjs';
import { journalStep } from './operation-journal.mjs';
import { upgradeDemo } from './upgrade.mjs';
import { populateB3 } from './b3-fixtures.mjs';

export async function setup(config) {
  const db = await connect(config.primary, true);
  const { prisma } = await import('../../src/lib/prisma.ts');
  const { auth } = await import('../../src/lib/auth.ts');
  try {
    const [lock] = await db.query("SELECT GET_LOCK('elb_demo_setup_v1',0) AS acquired");
    if (Number(lock.acquired) !== 1) throw new Error('Another demo setup is active; no records changed.');
    const fixtureDigest = digest(fs.readdirSync('demo/fixtures').sort().map(name => [name, fs.readFileSync(`demo/fixtures/${name}`, 'utf8')]));
    let state = await metadata(db);
    if (!state) {
      // An interrupted migration can be resumed only if no application data exists.
      for (const table of await tables(db)) {
        if (table === '_prisma_migrations') continue;
        const [row] = await db.query(`SELECT COUNT(*) AS n FROM \`${table}\``);
        if (Number(row.n)) throw new Error('Refusing unmanaged, nonempty demo database; preserve it and resolve ownership first.');
      }
      const migrated = spawnSync(process.execPath, ['node_modules/prisma/build/index.js', 'migrate', 'deploy'], { env: applicationEnvironment(config), encoding: 'utf8' });
      console.log(migrated.stdout);
      if (migrated.status !== 0) throw new Error('Demo migration failed; inspect Prisma output without publishing connection credentials.');
      state = { version: datasetVersion, fixtureDigest, year: referenceYear, ready: false, completed: {}, pending: null, fingerprint: await fingerprint(db) };
      await saveMetadata(db, state);
    }
    state = await upgradeDemo(config, db, state);
    if (process.argv.includes('--migrate-only')) { console.log('Demo migrations complete; fixtures/manual records preserved.'); return; }
    if (state.version !== datasetVersion) throw new Error('Demo fixture version conflicts; no records were replaced.');
    if (state.fixtureDigest && state.fixtureDigest !== fixtureDigest) throw new Error('Fixture definitions changed since setup. Existing records preserved; use an explicitly versioned dataset upgrade.');
    // Upgrade the initial DEMO-1 local checkpoint without touching application rows.
    if (!state.fixtureDigest) { if (state.fingerprint !== await fingerprint(db)) throw new Error('Checkpoint upgrade conflicts with manual edits.'); state.fixtureDigest = fixtureDigest; await saveMetadata(db, state); }
    if (state.ready) { await assertReady(db); if (state.b3FixtureVersion === 'elb-b3-fixtures-v1') { console.log('Demo dataset already complete: no data/passwords changed.'); return; } state.ready = false; await saveMetadata(db, state); }
    if (!state.pending && state.fingerprint !== await fingerprint(db)) throw new Error('Demo checkpoint conflicts with manual edits; refusing to overwrite.');
    async function step(name, action) {
      if (Object.hasOwn(state.completed, name)) return state.completed[name];
      if (state.pending && (typeof state.pending !== 'string' || state.pending !== name)) throw new Error(`Resume pending operation ${state.pending} first.`);
      if (state.fingerprint !== await fingerprint(db)) throw new Error(`Manual edit conflict before ${name}; data preserved.`);
      state.pending = name; await saveMetadata(db, state);
      const result = await action();
      state.completed[name] = result ?? true; state.pending = null; state.fingerprint = await fingerprint(db);
      await saveMetadata(db, state); console.log(`Demo checkpoint: ${name}`);
      return result;
    }
    const viewers = {};
    for (const account of accounts) {
      await step(`register:${account.key}`, async () => {
        let user = await prisma.user.findUnique({ where: { email: account.email } });
        if (!user) {
          const result = await auth.api.signUpEmail({ body: { ...account, name: `${account.firstName} ${account.lastName}` } });
          user = await prisma.user.findUniqueOrThrow({ where: { id: result.user.id } });
        } else {
          // Recover an interrupted registration only through valid credentials/profile.
          await auth.api.signInEmail({ body: { email: account.email, password: account.password } });
          assert.equal(user.firstName, account.firstName); assert.equal(user.lastName, account.lastName);
        }
        assert.equal(user.emailVerified, false);
        return { id: user.id };
      });
      viewers[account.key] = await prisma.user.findUniqueOrThrow({ where: { email: account.email } });
    }
    for (const account of accounts.filter(a => a.role === 'ADMIN')) {
      await step(`admin:${account.key}`, async () => {
        const user = await prisma.user.findUniqueOrThrow({ where: { email: account.email } });
        if (user.role !== 'ADMIN') {
          assert.equal(user.role, 'CITIZEN');
          const command = spawnSync(process.execPath, ['scripts/set-admin.mjs', account.email], { env: applicationEnvironment(config), encoding: 'utf8' });
          if (command.status !== 0) throw new Error('Existing privileged admin command failed.');
        }
        return true;
      });
    }
    const admin = accounts.find(a => a.group === 'admin');
    const signedIn = await auth.api.signInEmail({ body: { email: admin.email, password: admin.password }, returnHeaders: true });
    const cookie = signedIn.headers.getSetCookie().map(value => value.split(';')[0]).join('; ');
    async function route(module, method, body, id) {
      const handler = await import(`../../src/app/api/admin/${module}/route.ts`);
      const request = new Request(`${config.baseURL}/api/admin/${module.replace('/[id]', id ? `/${id}` : '')}`, { method, headers: { origin: config.baseURL, cookie, 'content-type': 'application/json' }, body: JSON.stringify(body) });
      const response = await handler[method](request, { params: Promise.resolve({ id }) });
      const result = await response.json();
      if (!response.ok) throw new Error(`Demo ${module} ${method}: ${response.status} ${JSON.stringify(result)}`);
      return result;
    }
    for (const account of accounts.filter(a => a.group === 'staff')) {
      await step(`staff:${account.key}`, async () => {
        const grant = staffGrants[account.index];
        const user = await prisma.user.findUniqueOrThrow({ where: { email: account.email }, include: { staffPermissions: true } });
        if (user.role === 'STAFF') {
          assert.equal(user.department, grant.department);
          assert.deepEqual(user.staffPermissions.map(p => p.module).sort(), [...grant.modules].sort());
          return true;
        }
        await route('staff', 'POST', { email: account.email, mode: 'SAVE', ...grant }); return true;
      });
    }
    const community = await import('../../src/features/community/server/survey-lifecycle.ts');
    const domain = await import('../../src/features/community/domain.ts');
    const { LOS_BANOS_BARANGAYS } = await import('../../src/features/emergency/domain.ts');
    const key = text => `demo_${datasetVersion}_${text}`.replace(/[^A-Za-z0-9_-]/g, '_');
    async function prepared(name, prepare) { return journalStep({ db, state, name, persist: value => saveMetadata(db, value), prepare }); }
    async function individualSave(account, label, answers) {
      return prepared(`${account.key}:${label}`, async () => {
        const viewer = viewers[account.key]; const current = await community.ownedSurveyState(viewer.id, answers.surveyYear);
        return { kind: 'individual-save', actorId: viewer.id, payload: { ...answers, expectedVersion: current.workspaceVersion, expectedConsentVersion: current.consentVersion, requestKey: key(`${account.key}_${label}`) } };
      });
    }
    for (const account of accounts.filter(a => a.group === 'individual')) {
      const i = account.index;
      const answers = individualAnswers(i, LOS_BANOS_BARANGAYS, domain.COMMUNITY_SKILLS);
      if (i % 10 === 0) await individualSave(account, 'historical', { ...answers, surveyYear: referenceYear - 1 });
      if (account.scenario === 'incomplete-draft') {
        await individualSave(account, 'draft-only', { surveyYear: referenceYear, status: 'DRAFT', barangay: answers.barangay, ageGroup: answers.ageGroup }); continue;
      }
      await individualSave(account, 'submit', answers);
      if (i < 68 && i % 8 === 0) await individualSave(account, 'revision', { ...answers, employmentHistory: 'Updated synthetic demonstration history; immutable earlier revision retained.' });
      if (account.scenario === 'later-draft') await individualSave(account, 'later-draft', { ...answers, status: 'DRAFT', occupation: 'Unsubmitted demo change' });
      if (account.scenario === 'withdrawn') await prepared(`${account.key}:withdraw`, async () => {
        const viewer = viewers[account.key]; const current = await community.ownedSurveyState(viewer.id, referenceYear);
        return { kind: 'individual-withdraw', actorId: viewer.id, payload: { surveyYear: referenceYear, expectedVersion: current.workspaceVersion, expectedConsentVersion: current.consentVersion, requestKey: key(`${account.key}_withdraw`) } };
      });
    }
    const establishments = await import('../../src/features/establishments/server/data.ts');
    const establishmentDomain = await import('../../src/features/establishments/domain.ts');
    for (const account of accounts.filter(a => a.group === 'establishment')) {
      const viewer = viewers[account.key], i = account.index;
      const answers = establishmentAnswers(i, LOS_BANOS_BARANGAYS, establishmentDomain.INDUSTRIES);
      const created = await prepared(`${account.key}:create`, async () => ({ kind: 'establishment-create', actorId: viewer.id, payload: { ...answers, requestKey: key(`${account.key}_create`) } }));
      const id = created.establishmentId;
      async function save(label, value, withdraw = false, correction = false) {
        return prepared(`${account.key}:${label}`, async () => {
          const current = await establishments.ownedEstablishmentState(viewer, id, value.surveyYear);
          const payload = { ...value, establishmentId: id, status: value.status ?? 'SUBMITTED', expectedRecordVersion: current.recordVersion, expectedVersion: current.workspaceVersion, requestKey: key(`${account.key}_${label}`), correctIdentity: correction };
          return { kind: withdraw ? 'establishment-withdraw' : 'establishment-save', actorId: viewer.id, payload };
        });
      }
      if (i % 4 === 0) await save('historical', { ...answers, surveyYear: referenceYear - 1 });
      if (account.scenario === 'draft-only') continue;
      await save('submit', answers);
      if (i % 4 === 0) await save('revision', { ...answers, workforceNotes: '[DEMO] Revised workforce notes; earlier snapshot retained.' });
      if (i === 2) await save('identity-correction', { ...answers, businessName: answers.businessName + ' Corrected' }, false, true);
      if (account.scenario === 'later-draft') await save('later-draft', { ...answers, status: 'DRAFT', productsServices: 'Unsubmitted synthetic product change.' });
      if (account.scenario === 'withdrawn') await save('withdraw', answers, true);
    }
    const jobs = await import('../../src/features/jobs/domain.ts');
    for (const fixture of vacancyScenarios) {
      const i = fixture.index;
      const job = { title: `[DEMO] ${['Office assistant', 'Farm worker', 'Food preparer', 'Technical assistant'][i % 4]} ${String(i + 1).padStart(2, '0')}`, employer: `[DEMO] Synthetic Employer ${i + 1}`, sector: jobs.SECTORS[i % jobs.SECTORS.length], workType: jobs.WORK_TYPES[i % jobs.WORK_TYPES.length], barangay: LOS_BANOS_BARANGAYS[i % LOS_BANOS_BARANGAYS.length], location: `Los Baños, Laguna — demo site ${i + 1}`, description: '[DEMO] Synthetic opportunity for team testing only. No real recruitment or external applications. Future salary/experience scenarios are fixture annotations only.', skills: [i === 15 ? 'Photography' : domain.COMMUNITY_SKILLS[i % domain.COMMUNITY_SKILLS.length]], interests: [jobs.INTERESTS[i % jobs.INTERESTS.length]], education: jobs.EDUCATION[i % jobs.EDUCATION.length], contactInfo: 'Demonstration only: do not contact or apply externally.', reviewSource: '[DEMO] Synthetic fixture, simulated review only. No actual employer or vacancy verification.', externalUrl: '', expiresAt: '' };
      const created = await step(`${fixture.key}:create`, async () => {
        const existing = await prisma.jobOpportunity.findMany({ where: { title: job.title } });
        if (existing.length > 1) throw new Error('Duplicate demo vacancy conflict');
        if (existing.length) { assert.equal(existing[0].employer, job.employer); return { id: existing[0].id }; }
        return route('jobs', 'POST', job);
      });
      if (fixture.status === 'DRAFT') continue;
      const actions = fixture.status === 'PENDING_REVIEW' ? ['SUBMIT_REVIEW'] : fixture.status === 'RETURNED' ? ['SUBMIT_REVIEW', 'RETURN'] : ['SUBMIT_REVIEW', 'APPROVE', ...(fixture.status === 'CLOSED' ? ['CLOSE'] : fixture.status === 'FILLED' ? ['FILL'] : [])];
      for (const action of actions) await step(`${fixture.key}:${action}`, async () => {
        const row = await prisma.jobOpportunity.findUniqueOrThrow({ where: { id: created.id } });
        const resulting = { SUBMIT_REVIEW: 'PENDING_REVIEW', APPROVE: 'PUBLISHED', RETURN: 'RETURNED', CLOSE: 'CLOSED', FILL: 'FILLED' }[action];
        if (row.status === resulting) return true;
        return route('jobs/[id]', 'PATCH', { action, expectedVersion: row.version, version: row.version, employerVerified: true, vacancyVerified: true, note: '[DEMO] Simulated fixture review; no genuine employer/vacancy verification was performed.' }, created.id);
      });
    }
    await step('import:accepted', async () => {
      const parser = await import('../../src/features/community/server/import-file.ts');
      const csv = fs.readFileSync('demo/fixtures/import-accepted.csv', 'utf8');
      const form = new FormData(); form.set('file', new File([csv], 'demo-import-accepted.csv', { type: 'text/csv' }));
      const mapping = Object.fromEntries(['participantRef', 'barangay', 'ageGroup', 'educationLevel', 'employmentStatus', 'skills', 'trainingInterest'].map((field, i) => [i, field]));
      const table = await parser.parseUploadedTable(form), checked = parser.mapRows(table, mapping);
      assert.equal(checked.records.length, 6); assert.equal(checked.issues.length, 0);
      const activityName = '[DEMO] Synthetic workforce orientation 2026';
      const { validateImport } = await import('../../src/features/census/server/imports.ts');
      const hash = validateImport({ table, mapping, meta: { source: 'DEMO-LEGACY-REGISTRATION', surveyYear: referenceYear, activityName, activityType: 'DEMO_ORIENTATION', implementingOffice: 'PESO', intendedUse: 'INTERNAL_STATISTICS' } }).fingerprint;
      const existing = await prisma.communityImportBatch.findUnique({ where: { fingerprint: hash } });
      if (existing) return { batchId: existing.id };
      for (const [field, value] of Object.entries({ mapping: JSON.stringify(mapping), source: 'DEMO-LEGACY-REGISTRATION', surveyYear: String(referenceYear), activityName, activityType: 'DEMO_ORIENTATION', implementingOffice: 'PESO', activityDate: '2026-10-01', coverage: 'Synthetic demo activity only', originalPurpose: 'Synthetic demonstration; not actual participants', originalDataSource: 'demo/fixtures/import-accepted.csv', intendedUse: 'INTERNAL_STATISTICS', notes: '[DEMO] Six activity records; overlap unknown. Never count as six additional unique citizens.', previewHash: hash })) form.set(field, value);
      const handler = await import('../../src/app/api/admin/community-import/commit/route.ts');
      const response = await handler.POST(new Request(`${config.baseURL}/api/admin/community-import/commit`, { method: 'POST', headers: { origin: config.baseURL, cookie }, body: form }));
      const result = await response.json(); if (!response.ok) throw new Error(`Demo import: ${response.status} ${JSON.stringify(result)}`); return result;
    });
    await populateB3(db, state);
    const { counts, writeAccounts } = await import('./verify.mjs');
    await writeAccounts(prisma);
    const actual = await counts(prisma);
    fs.writeFileSync('demo/expected-counts.json', JSON.stringify({ datasetVersion, referenceYear, counts: actual }, null, 2) + '\n');
    state.ready = true; state.fingerprint = await fingerprint(db); await saveMetadata(db, state);
    console.log('Demo dataset complete. Primary database retained.');
  } finally { await db.query("SELECT RELEASE_LOCK('elb_demo_setup_v1')"); await db.end(); }
}
