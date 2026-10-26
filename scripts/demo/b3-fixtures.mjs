import { assistanceAssignments, censusImportFixture, b3FixtureVersion } from '../../demo/b3-fixtures.mjs';
import { journalStep } from './operation-journal.mjs';
import { saveMetadata } from './database.mjs';

export async function populateB3(db, state) {
  const { prisma } = await import('../../src/lib/prisma.ts');
  const admin = await prisma.user.findUniqueOrThrow({ where: { email: 'admin.01@example.test' } });
  const prepareStep = (name, prepare) => journalStep({ db, state, name: b3FixtureVersion + ':' + name, persist: value => saveMetadata(db, value), prepare });
  const { LOS_BANOS_BARANGAYS } = await import('../../src/features/emergency/domain.ts');
  for (const email of ['staff.01@example.test', 'staff.02@example.test']) {
    await prepareStep('grant:' + email, async () => {
      const target = await prisma.user.findUniqueOrThrow({ where: { email }, include: { staffPermissions: true } });
      return { kind: 'staff-grant', actorId: admin.id, payload: { email, mode: 'SAVE', department: target.department, designation: target.designation, modules: [...new Set([...target.staffPermissions.map(m => m.module), 'CENSUS'])] } };
    });
    const target = await prisma.user.findUniqueOrThrow({ where: { email } });
    await prepareStep('scope:' + email, async () => ({ kind: 'record-scope', actorId: admin.id, payload: { staffId: target.id, barangays: email.startsWith('staff.01') ? [...LOS_BANOS_BARANGAYS] : ['Bambang'], expectedVersion: (await prisma.censusStaffScope.findUnique({ where: { userId: target.id } }))?.version ?? 0 } }));
  }
  for (const assignment of assistanceAssignments) {
    await prepareStep('roster:' + assignment.barangay, async () => ({ kind: 'assistance-roster', actorId: admin.id, payload: { barangay: assignment.barangay, staffIds: (await prisma.user.findMany({ where: { email: { in: assignment.staffEmails }, role: 'STAFF' } })).map(u => u.id), expectedVersion: (await prisma.censusAssistanceRoster.findUnique({ where: { barangay: assignment.barangay } }))?.version ?? 0 } }));
  }
  const first = await prisma.user.findUniqueOrThrow({ where: { email: 'individual.02@example.test' } });
  const revisions = await prisma.communitySurveyRevision.findMany({ where: { userId: first.id, surveyYear: 2026, action: 'SUBMITTED' }, orderBy: { revision: 'asc' } });
  if (revisions[0]) for (const action of ['ASSESSED', 'VERIFIED', 'APPROVED']) {
    await prepareStep('review:' + action, async () => ({ kind: 'review', actorId: admin.id, payload: { kind: 'INDIVIDUAL', revisionId: revisions[0].id, action, requestKey: 'demo_b3_revision_' + action, note: '[DEMO] Synthetic census review only; not municipal verification.' } }));
  }
  await prepareStep('source-import', async () => ({ kind: 'census-import', actorId: admin.id, payload: censusImportFixture }));
  state.b3FixtureVersion = b3FixtureVersion;
  await saveMetadata(db, state);
}
