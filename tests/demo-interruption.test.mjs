import test from 'node:test';
import assert from 'node:assert/strict';
import { loadServerTypescript } from './helpers/load-typescript.mjs';
const enabled = /^elb_b3_test_[a-f0-9]{32}$/.test(process.env.ELB_B3_TEST_DATABASE || '');
test('DEMO-R1/R2 persistent prepared operation crash/recovery', { skip: !enabled }, async t => {
  const hook = loadServerTypescript();
  const { prisma } = await import('../src/lib/prisma.ts');
  const lifecycle = await import('../src/features/community/server/survey-lifecycle.ts');
  const establishment = await import('../src/features/establishments/server/data.ts');
  const { journalStep } = await import('../scripts/demo/operation-journal.mjs');
  const { snapshot, digest } = await import('../scripts/demo/database.mjs');
  const mariadb = (await import('mariadb')).default;
  const u = new URL(process.env.DATABASE_URL);
  const db = await mariadb.createConnection({ host: u.hostname, user: decodeURIComponent(u.username), password: decodeURIComponent(u.password), port: Number(u.port || 3306), database: u.pathname.slice(1), dateStrings: true, bigIntAsNumber: true });
  const user = await prisma.user.create({ data: { id: 'b3-demo-owner', name: 'Demo Recovery', email: 'recovery@example.test', role: 'CITIZEN' } });
  let state;
  const reset = async () => { state = { completed: {}, pending: null, fingerprint: digest(await snapshot(db)) }; };
  const persist = async value => { await db.query('CREATE TABLE IF NOT EXISTS _elb_demo_meta(name VARCHAR(60) PRIMARY KEY,value LONGTEXT)'); await db.query("REPLACE INTO _elb_demo_meta VALUES('journal-test',?)", [JSON.stringify(value)]); };
  const reload = async () => { const [r] = await db.query("SELECT value FROM _elb_demo_meta WHERE name='journal-test'"); state = JSON.parse(r.value); };
  const answers = { surveyYear: 2026, status: 'SUBMITTED', barangay: 'Bambang', ageGroup: '25-34', educationLevel: 'COLLEGE', employmentStatus: 'EMPLOYED_FULL_TIME', skills: ['Data Entry'], consentAggregated: true, consentOpportunityRecommendations: true, consentProgramRecommendations: false };
  const prepareIndividual = async () => ({ kind: 'individual-save', actorId: user.id, payload: { ...answers, requestKey: 'b3_demo_recovery_individual', expectedVersion: 0, expectedConsentVersion: 0 } });
  try {
    await reset();
    await t.test('crash before mutation followed by manual draft/consent: conflict preserves both', async () => {
      await assert.rejects(journalStep({ db, state, name: 'submit', persist, prepare: prepareIndividual, fault: 'before' }), /interruption/);
      await lifecycle.saveCitizenSurvey({ surveyYear: 2026, status: 'DRAFT', occupation: 'Manual draft', expectedVersion: 0 }, user);
      await lifecycle.changeCitizenConsent({ expectedConsentVersion: 0, matching: false, programs: true }, user);
      await reload(); const before = digest(await snapshot(db));
      await assert.rejects(journalStep({ db, state, name: 'submit', persist, prepare: prepareIndividual }), /conflict/i);
      assert.equal(digest(await snapshot(db)), before);
      assert.equal((await lifecycle.ownedSurveyState(user.id, 2026)).occupation, 'Manual draft');
      assert.equal((await lifecycle.currentProfileConsent(user.id)).matching, false);
    });
    await t.test('individual commit without completion checkpoint replays once without replacing another year draft', async () => {
      await reset();
      const payload = { ...answers, surveyYear: 2025, expectedVersion: 0, expectedConsentVersion: 1, requestKey: 'b3_demo_recovery_committed_personal' };
      await assert.rejects(journalStep({ db, state, name: 'historical-submit', persist, prepare: async () => ({ kind: 'individual-save', actorId: user.id, payload }), fault: 'after' }), /interruption/);
      await reload(); const result = await journalStep({ db, state, name: 'historical-submit', persist, prepare: () => { throw Error('Must not rebuild original personal payload'); } });
      assert.equal(result.replayed, true);
      assert.equal(await prisma.communitySurveyRevision.count({ where: { userId: user.id, surveyYear: 2025 } }), 1);
      assert.equal((await lifecycle.ownedSurveyState(user.id, 2026)).occupation, 'Manual draft');
    });
    const org = { surveyYear: 2026, businessName: '[DEMO] Recovery', officeType: 'MAIN', street: 'Demo Street', barangay: 'Bambang', employerType: 'PRIVATE', organizationType: 'CORPORATION', industry: 'INFORMATION', productsServices: 'Synthetic services', operatingStatus: 'OPERATING', contactName: 'Demo Person', contactPosition: 'Manager', contactEmail: 'org@example.test' };
    const created = await establishment.createEstablishment({ ...org, requestKey: 'b3_demo_create_recovery' }, user);
    let original;
    const prepare = async () => { const current = await establishment.ownedEstablishmentState(user, created.establishmentId, 2026); original = { ...org, establishmentId: created.establishmentId, status: 'SUBMITTED', expectedVersion: current.workspaceVersion, expectedRecordVersion: current.recordVersion, requestKey: 'b3_demo_recovery_save' }; return { kind: 'establishment-save', actorId: user.id, payload: original }; };
    await t.test('crash after establishment commit resumes exact payload with one revision', async () => {
      await reset(); await assert.rejects(journalStep({ db, state, name: 'org-save', persist, prepare, fault: 'after' }), /interruption/);
      await reload(); const savedPayload = structuredClone(state.pending.operation.payload);
      const result = await journalStep({ db, state, name: 'org-save', persist, prepare: () => { throw Error('Must not rebuild payload'); } });
      assert.equal(result.replayed, true); assert.deepEqual(savedPayload, original);
      assert.equal(await prisma.establishmentRevision.count({ where: { survey: { establishmentId: created.establishmentId } } }), 1);
    });
    await t.test('later edit survives original committed-operation replay; journal refuses adopting it', async () => {
      const current = await establishment.ownedEstablishmentState(user, created.establishmentId, 2026);
      await reset(); const nextPayload = { ...org, establishmentId: created.establishmentId, status: 'SUBMITTED', productsServices: 'Second revision', expectedVersion: current.workspaceVersion, expectedRecordVersion: current.recordVersion, requestKey: 'b3_demo_recovery_second' };
      await assert.rejects(journalStep({ db, state, name: 'second', persist, prepare: async () => ({ kind: 'establishment-save', actorId: user.id, payload: nextPayload }), fault: 'after' }), /interruption/);
      const newer = await establishment.ownedEstablishmentState(user, created.establishmentId, 2026);
      await establishment.saveEstablishmentSurvey({ ...nextPayload, status: 'DRAFT', productsServices: 'Later manual edit', requestKey: 'b3_demo_manual_newer', expectedVersion: newer.workspaceVersion, expectedRecordVersion: newer.recordVersion }, user);
      await reload(); const before = digest(await snapshot(db));
      await assert.rejects(journalStep({ db, state, name: 'second', persist, prepare }), /conflict/i);
      assert.equal(digest(await snapshot(db)), before);
      assert.equal((await establishment.saveEstablishmentSurvey(nextPayload, user)).replayed, true);
      assert.equal((await establishment.ownedEstablishmentState(user, created.establishmentId, 2026)).answers.productsServices, 'Later manual edit');
    });
  } finally { await db.end(); await prisma.$disconnect(); hook.deregister(); }
});
