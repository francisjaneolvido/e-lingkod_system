import assert from 'node:assert/strict';
import { snapshot, digest } from './database.mjs';

const conflict = () => { throw new Error('Demo operation conflict: original preconditions or unrelated/newer records changed; manual edits preserved.'); };
export async function executeOperation(operation) {
  const { prisma } = await import('../../src/lib/prisma.ts');
  const viewer = await prisma.user.findUniqueOrThrow({ where: { id: operation.actorId } });
  if (['record-scope', 'assistance-roster'].includes(operation.kind)) {
    const data = await import('../../src/features/census/server/data.ts');
    return operation.kind === 'record-scope' ? data.setRecordScope(viewer, operation.payload) : data.saveAssistanceRoster(viewer, operation.payload);
  }
  if (operation.kind === 'review') return (await import('../../src/features/census/server/data.ts')).addReview(viewer, operation.payload);
  if (operation.kind === 'census-import') return (await import('../../src/features/census/server/imports.ts')).commitImport(viewer, operation.payload);
  if (operation.kind === 'staff-grant') {
    const { auth } = await import('../../src/lib/auth.ts');
    const { accounts } = await import('../../demo/fixtures/dataset.mjs');
    const account = accounts.find(a => a.email === viewer.email); if (!account) throw new Error('Unknown synthetic administrator');
    const session = await auth.api.signInEmail({ body: { email: account.email, password: account.password }, returnHeaders: true });
    const cookie = session.headers.getSetCookie().map(v => v.split(';')[0]).join('; ');
    const { POST } = await import('../../src/app/api/admin/staff/route.ts');
    const origin = process.env.BETTER_AUTH_URL;
    const response = await POST(new Request(origin + '/api/admin/staff', { method: 'POST', headers: { origin, cookie, 'content-type': 'application/json' }, body: JSON.stringify(operation.payload) }));
    const value = await response.json(); if (!response.ok) throw new Error('Demo grant failed: ' + value.error); return value;
  }
  const personal = await import('../../src/features/community/server/survey-lifecycle.ts');
  const org = await import('../../src/features/establishments/server/data.ts');
  const functions = { 'individual-save': personal.saveCitizenSurvey, 'individual-withdraw': personal.withdrawCitizenSurvey, 'establishment-create': org.createEstablishment, 'establishment-save': org.saveEstablishmentSurvey, 'establishment-withdraw': org.withdrawEstablishmentSurvey };
  if (!functions[operation.kind]) throw new Error('Unknown prepared demo operation');
  return functions[operation.kind](operation.payload, viewer);
}
async function receipt(operation) {
  const { prisma } = await import('../../src/lib/prisma.ts');
  const { payload: p, actorId, kind } = operation;
  if (kind === 'review') return prisma.censusReview.findUnique({ where: { actorId_requestKey: { actorId, requestKey: p.requestKey } } });
  if (kind === 'census-import') { const { validateImport } = await import('../../src/features/census/server/imports.ts'); return prisma.communityImportBatch.findUnique({ where: { fingerprint: validateImport(p).fingerprint } }); }
  if (kind === 'staff-grant') {
    const target = await prisma.user.findUnique({ where: { email: p.email } });
    if (!target) return null;
    const rows = await prisma.staffAccessAudit.findMany({ where: { actorId, targetUserId: target.id, action: 'SAVE' } });
    return rows.find(row => row.details === JSON.stringify({ department: p.department, designation: p.designation, modules: p.modules })) ?? null;
  }
  if (['record-scope', 'assistance-roster'].includes(kind)) {
    const rows = await prisma.censusAudit.findMany({ where: { actorId, action: kind === 'record-scope' ? 'RECORD_SCOPE' : 'ASSISTANCE_ROSTER', target: p.staffId ?? p.barangay } });
    return rows.find(row => row.detailsJson === JSON.stringify(kind === 'record-scope' ? { barangays: [...new Set(p.barangays)].sort(), previousVersion: p.expectedVersion } : { staffIds: [...new Set(p.staffIds)].sort(), previousVersion: p.expectedVersion })) ?? null;
  }
  if (kind.startsWith('establishment')) return prisma.establishmentOperation.findUnique({ where: { ownerId_requestKey: { ownerId: actorId, requestKey: p.requestKey } } });
  if (p.status === 'DRAFT') return null;
  return prisma.communitySurveyRevision.findUnique({ where: { userId_requestKey: { userId: actorId, requestKey: p.requestKey } } });
}
async function assertOwnResult(pending, result, after) {
  const { prisma } = await import('../../src/lib/prisma.ts');
  const { payload: p, kind, actorId } = pending.operation;
  let allowed;
  if (kind === 'census-import') {
    const proof = await receipt(pending.operation); if (!proof) conflict();
    const { validateImport } = await import('../../src/features/census/server/imports.ts'); const keys = validateImport(p).rows.map(r => r.identityKey);
    allowed = (table, row) => table === 'government_activity' ? row.id === proof.activityId : table === 'community_import_batch' ? row.id === proof.id : table === 'community_import_record' ? row.batchId === proof.id : table === 'census_source_record' ? keys.includes(row.identityKey) : table === 'census_import_lock' && row.id === 1;
  } else if (['record-scope', 'assistance-roster', 'review', 'staff-grant'].includes(kind)) {
    const proof = await receipt(pending.operation); if (!proof) conflict();
    if (kind === 'record-scope') {
      const current = await prisma.censusStaffScope.findUnique({ where: { userId: p.staffId } });
      if (current?.version !== p.expectedVersion + 1 || current.barangaysJson !== JSON.stringify([...new Set(p.barangays)].sort())) conflict();
      allowed = (table, row) => table === 'census_staff_scope' ? row.userId === p.staffId : table === 'census_audit' && row.id === proof.id;
    } else if (kind === 'assistance-roster') {
      const current = await prisma.censusAssistanceRoster.findUnique({ where: { barangay: p.barangay }, include: { members: true } });
      if (current?.version !== p.expectedVersion + 1 || JSON.stringify(current.members.map(m => m.staffId).sort()) !== JSON.stringify([...new Set(p.staffIds)].sort())) conflict();
      allowed = (table, row) => ['census_assistance_roster', 'census_assistance_member'].includes(table) ? row.barangay === p.barangay : table === 'census_audit' && row.id === proof.id;
    } else if (kind === 'review') allowed = (table, row) => table === 'census_review' && row.id === proof.id;
    else {
      const target = await prisma.user.findUniqueOrThrow({ where: { email: p.email }, include: { staffPermissions: true } });
      if (target.role !== 'STAFF' || target.department !== p.department || target.designation !== p.designation || JSON.stringify(target.staffPermissions.map(m => m.module).sort()) !== JSON.stringify([...p.modules].sort())) conflict();
      const original = pending.before.user.map(JSON.parse).find(row => row.id === target.id);
      const actual = after.user.map(JSON.parse).find(row => row.id === target.id);
      if (!original || !actual) conflict();
      for (const key of Object.keys(original)) if (!['role', 'department', 'designation', 'updatedAt'].includes(key) && JSON.stringify(original[key]) !== JSON.stringify(actual[key])) conflict();
      allowed = (table, row) => table === 'user' ? row.id === target.id : table === 'staff_permission' ? row.userId === target.id : table === 'staff_access_audit' && row.id === proof.id;
    }
  } else if (kind.startsWith('individual')) {
    const state = await (await import('../../src/features/community/server/survey-lifecycle.ts')).ownedSurveyState(actorId, p.surveyYear);
    if (state.workspaceVersion !== p.expectedVersion + 1) conflict();
    if (p.status !== 'DRAFT' && state.consentVersion !== p.expectedConsentVersion + 1) conflict();
    if (p.status === 'DRAFT' || p.status === 'SUBMITTED') {
      const parsed = (await import('../../src/features/community/domain.ts')).parseCommunitySurvey(p);
      // Owned state intentionally overlays independently current preferences.
      // A draft stores answers but must not overwrite that current consent.
      for (const key of Object.keys(parsed)) if (p.status !== 'DRAFT' || !['consentOpportunityRecommendations','consentProgramRecommendations'].includes(key)) assert.deepEqual(state[key], parsed[key], 'Prepared survey result differs');
      if (p.status === 'DRAFT') {
        const workspace = await prisma.communitySurveyWorkspace.findUniqueOrThrow({ where: { userId_surveyYear: { userId: actorId, surveyYear: p.surveyYear } } });
        assert.deepEqual(JSON.parse(workspace.draftJson), parsed, 'Prepared stored draft differs');
      }
    }
    const proof = p.status !== 'DRAFT' ? await receipt(pending.operation) : null;
    if (p.status !== 'DRAFT' && !proof) conflict();
    const withdrawing = kind === 'individual-withdraw';
    if (p.status !== 'DRAFT' && (state.consentOpportunityRecommendations !== (!withdrawing && p.consentOpportunityRecommendations === true) || state.consentProgramRecommendations !== (!withdrawing && p.consentProgramRecommendations === true))) conflict();
    // B1 synchronizes current preference flags across the actor's annual
    // compatibility rows. Permit only that exact side effect on other years;
    // answers, participation, ownership and history remain protected.
    const compatibilityConsentOnly = row => {
      if (p.status === 'DRAFT' || row.userId !== actorId) return false;
      const original = pending.before.community_survey?.map(JSON.parse).find(r => r.id === row.id);
      const current = after.community_survey?.map(JSON.parse).find(r => r.id === row.id);
      if (!original || !current) return false;
      if (Boolean(current.consentOpportunityRecommendations) !== (!withdrawing && p.consentOpportunityRecommendations === true) || Boolean(current.consentProgramRecommendations) !== (!withdrawing && p.consentProgramRecommendations === true)) return false;
      return Object.keys(original).every(key => ['consentOpportunityRecommendations','consentProgramRecommendations','updatedAt'].includes(key) || JSON.stringify(original[key]) === JSON.stringify(current[key]));
    };
    allowed = (table, row) => table === 'community_survey_revision' ? row.id === proof?.id : table === 'community_survey' ? row.userId === actorId && (row.surveyYear === p.surveyYear || compatibilityConsentOnly(row)) : table === 'community_survey_workspace' ? row.userId === actorId && row.surveyYear === p.surveyYear : table === 'citizen_profile_consent' && row.userId === actorId && p.status !== 'DRAFT';
  } else {
    const id = result.establishmentId;
    const record = await prisma.establishment.findUniqueOrThrow({ where: { id } });
    const annual = await prisma.establishmentSurvey.findUniqueOrThrow({ where: { establishmentId_surveyYear: { establishmentId: id, surveyYear: p.surveyYear } } });
    if (record.version !== result.recordVersion || annual.version !== result.workspaceVersion) conflict();
    const proof = await receipt(pending.operation); if (!proof) conflict();
    allowed = (table, row) => table === 'establishment' ? row.id === id && row.ownerId === actorId : table === 'establishment_survey' ? row.establishmentId === id && row.surveyYear === p.surveyYear : table === 'establishment_revision' ? row.surveyId === annual.id && row.id === proof.revisionId : table === 'establishment_operation' && row.ownerId === actorId && row.requestKey === p.requestKey;
  }
  for (const table of new Set([...Object.keys(pending.before), ...Object.keys(after)])) {
    const old = new Set(pending.before[table] ?? []), current = new Set(after[table] ?? []);
    for (const value of [...old].filter(r => !current.has(r)).concat([...current].filter(r => !old.has(r)))) if (!allowed(table, JSON.parse(value))) conflict();
  }
}

// Persist plain actor references and immutable mutation payloads, never auth headers.
// A real service receipt proves commit; versions plus unrelated-row comparison
// prevent advancing the checkpoint over a later edit. Legacy pending strings fail closed.
export async function journalStep({ db, state, name, persist, prepare, fault }) {
  if (Object.hasOwn(state.completed, name)) return state.completed[name];
  if (state.pending && (typeof state.pending !== 'object' || state.pending.name !== name)) conflict();
  if (!state.pending) {
    const before = await snapshot(db);
    if (digest(before) !== state.fingerprint) conflict();
    const operation = await prepare();
    if (digest(await snapshot(db)) !== digest(before)) conflict();
    state.pending = { name, operation: structuredClone(operation), before };
    await persist(state);
  }
  if (fault === 'before') throw new Error('Simulated interruption before mutation');
  const pending = state.pending, unchanged = digest(await snapshot(db)) === digest(pending.before);
  if (!unchanged && !(await receipt(pending.operation))) {
    // B1 drafts lack a mutation receipt. Equal content is not proof of who wrote
    // it: fail closed rather than silently adopt an unrelated matching draft.
    conflict();
  }
  const proof = !unchanged ? await receipt(pending.operation) : null;
  const replayWithoutMutation = proof && ['record-scope', 'assistance-roster', 'staff-grant'].includes(pending.operation.kind);
  const result = replayWithoutMutation ? { success: true, replayed: true } : await executeOperation(pending.operation);
  if (fault === 'after') throw new Error('Simulated interruption after commit');
  const after = await snapshot(db); await assertOwnResult(pending, result, after);
  state.completed[name] = result; state.pending = null; state.fingerprint = digest(after); await persist(state);
  return result;
}
