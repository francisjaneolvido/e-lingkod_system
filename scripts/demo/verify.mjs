import fs from 'node:fs';
import assert from 'node:assert/strict';
import { setTimeout as delay } from 'node:timers/promises';
import { accounts, staffGrants, datasetVersion, referenceYear } from '../../demo/fixtures/dataset.mjs';
import { connect, assertReady } from './database.mjs';

const groups = (rows, key) => Object.fromEntries(Object.entries(Object.groupBy(rows, key)).map(([k, v]) => [k, v.length]).sort(([a], [b]) => a.localeCompare(b)));
export async function counts(prisma) {
  const [users, surveys, workspaces, consent, revisions, establishments, annual, establishmentRevisions, jobs, imports] = await Promise.all([
    prisma.user.findMany(), prisma.communitySurvey.findMany(), prisma.communitySurveyWorkspace.findMany(), prisma.citizenProfileConsent.findMany(), prisma.communitySurveyRevision.findMany(),
    prisma.establishment.findMany(), prisma.establishmentSurvey.findMany(), prisma.establishmentRevision.findMany(), prisma.jobOpportunity.findMany(), prisma.communityImportRecord.findMany(),
  ]);
  const current = surveys.filter(s => s.surveyYear === referenceYear && s.status === 'SUBMITTED');
  const permitted = new Map(consent.map(c => [c.userId, c]));
  const activeEstablishments = annual.filter(s => s.surveyYear === referenceYear && s.status === 'SUBMITTED').map(s => JSON.parse(s.submittedJson));
  return { accounts: { total: users.length, roles: groups(users, u => u.role), groups: groups(accounts, a => a.group), emailVerified: users.filter(u => u.emailVerified).length },
    individual: { annualByYearAndStatus: groups(surveys, s => `${s.surveyYear}:${s.status}`), currentSubmittedRespondents: current.length, currentMatchingEligible: current.filter(s => permitted.get(s.userId)?.matching).length, matchingEligibleAcrossSubmittedYears: new Set(surveys.filter(s => s.status === 'SUBMITTED' && permitted.get(s.userId)?.matching).map(s => s.userId)).size, currentProgramsEligible: current.filter(s => permitted.get(s.userId)?.programs).length, activeWorkingDrafts: workspaces.filter(w => w.draftJson).length, revisionsByAction: groups(revisions, r => r.action), currentEmployment: groups(current, s => s.employmentStatus), currentBarangay: groups(current, s => s.barangay), currentEducation: groups(current, s => s.educationLevel) },
    establishment: { records: establishments.length, annualByYearAndStatus: groups(annual, s => `${s.surveyYear}:${s.status}`), activeWorkingDrafts: annual.filter(s => s.draftJson).length, revisionsByAction: groups(establishmentRevisions, r => r.action), currentIndustries: groups(activeEstablishments, s => s.industry), knownWorkerTotal: activeEstablishments.reduce((n, a) => n + (a.totalWorkers ?? 0), 0), unknownWorkerTotals: activeEstablishments.filter(a => a.totalWorkers === null).length },
    opportunities: { total: jobs.length, byStatus: groups(jobs, j => j.status), published: jobs.filter(j => j.status === 'PUBLISHED').length },
    assistance: { configuredBarangays: await prisma.censusAssistanceRoster.count(), assignments: await prisma.censusAssistanceMember.count(), scopedStaff: await prisma.censusStaffScope.count(), reviewEvents: await prisma.censusReview.count() },
    imports: { records: imports.length, bySourceYearOutcome: groups(imports, r => `${r.sourceKey ?? 'LEGACY_UNKNOWN'}:${r.surveyYear ?? 'UNKNOWN'}:${r.outcome}`), outcomes: groups(imports, r => r.outcome), batches: await prisma.communityImportBatch.count(), uniquePeople: null, reason: 'Activity source rows can overlap citizens and each other; never add to individual respondent totals.' },
  };
}
function csv(value) { return '"' + String(value ?? '').replaceAll('"', '""') + '"'; }
export async function writeAccounts(prisma) {
  const lines = [['displayName', 'email', 'password', 'role', 'scenario', 'userId', 'establishmentId'].join(',')];
  for (const a of accounts) {
    const user = await prisma.user.findUniqueOrThrow({ where: { email: a.email } });
    const establishment = a.group === 'establishment' ? await prisma.establishment.findFirst({ where: { ownerId: user.id } }) : null;
    lines.push([user.name, a.email, a.password, user.role, `${a.group}:${a.scenario}`, user.id, establishment?.id].map(csv).join(','));
  }
  fs.writeFileSync('demo/accounts.csv', lines.join('\n') + '\n');
}
export async function verify(config, target, { login = true } = {}) {
  const db = await connect(target);
  const { prisma } = await import('../../src/lib/prisma.ts');
  try {
    const readyState=await assertReady(db);
    const expected = JSON.parse(fs.readFileSync('demo/expected-counts.json', 'utf8'));
    assert.equal(expected.datasetVersion, datasetVersion);
    assert.deepEqual(await counts(prisma), expected.counts);
    assert.equal(expected.counts.accounts.total, 108); assert.equal(expected.counts.accounts.emailVerified, 0);
    assert.deepEqual(expected.counts.accounts.roles, { ADMIN: 4, CITIZEN: 100, STAFF: 4 });
    assert.equal(expected.counts.individual.currentSubmittedRespondents, 68);
    assert.equal(expected.counts.establishment.records, 20);
    assert.equal(expected.counts.opportunities.total, 28);
    const { hasModuleAccess } = await import('../../src/lib/staff-access.ts');
    const community = await import('../../src/features/community/server/survey-lifecycle.ts');
    const establishments = await import('../../src/features/establishments/server/data.ts');
    const { profileForCitizen, publishedJobs, rankJobs } = await import('../../src/features/jobs/server/data.ts');
    const { communityMatchProfile, publicEmploymentInsights } = await import('../../src/features/community/server/data.ts');
    await assert.rejects(publicEmploymentInsights(), /Public analytics release is unavailable/);
    const { workforceAnalytics } = await import('../../src/features/analytics/server/data.ts');
    const { parseAnalyticsFilters } = await import('../../src/features/analytics/domain.ts');
    const analyticsAdmin = await prisma.user.findUniqueOrThrow({ where: { email: 'admin.01@example.test' } });
    const analytics = (viewer, population, year = referenceYear, extra = {}) => workforceAnalytics(viewer, parseAnalyticsFilters({ population, period: 'YEAR', year: String(year), ...extra }, referenceYear));
    const individual = await analytics(analyticsAdmin, 'INDIVIDUAL');
    assert.equal(individual.groups[0].count, expected.analytics.individual.current);
    assert.equal((await analytics(analyticsAdmin, 'INDIVIDUAL', referenceYear - 1)).groups[0].count, expected.analytics.individual.historical2025);
    for (const [metric, value] of [['qualifications', expected.analytics.individual.qualificationsRecorded], ['completedTraining', expected.analytics.individual.completedTrainingRecorded]]) assert.equal(individual.groups[0].breakdowns.find(d => d.key === metric).known, value);
    const overseas = individual.groups[0].breakdowns.find(d => d.key === 'overseasExperience');
    for (const [key, count] of Object.entries(expected.analytics.individual.overseasExperience)) assert.equal(overseas.items.find(i => i.key === key.toLowerCase()).count, count);
    const organizations = await analytics(analyticsAdmin, 'ESTABLISHMENT');
    assert.equal(organizations.groups[0].count, expected.analytics.establishment.current);
    assert.equal((await analytics(analyticsAdmin, 'ESTABLISHMENT', referenceYear - 1)).groups[0].count, expected.analytics.establishment.historical2025);
    const workforce = organizations.groups[0].measures.find(m => m.key === 'totalWorkers');
    assert.equal(workforce.sum, expected.analytics.establishment.knownWorkerSum); assert.equal(workforce.known, expected.analytics.establishment.knownTotals); assert.equal(workforce.unknown, expected.analytics.establishment.unknownTotals);
    const observations = await analytics(analyticsAdmin, 'IMPORTS');
    assert.deepEqual(Object.fromEntries(observations.groups.map(g => [g.source, g.count])), expected.analytics.imports.currentBySource);
    assert.equal(observations.excluded.unknownSurveyYear, expected.analytics.imports.unknownSurveyYearExcluded);
    assert.equal(observations.excluded.notAccepted, expected.analytics.imports.notAccepted);
    assert.equal((await analytics(analyticsAdmin, 'SPES')).groups.reduce((n, g) => n + g.count, 0), expected.analytics.spes.currentRealObservations);
    assert.equal((await analytics(analyticsAdmin, 'SPES', referenceYear, { dataset: 'ALL' })).groups.length, expected.analytics.spes.currentAllKinds);
    for (const [email, count] of Object.entries(expected.analytics.staffRespondents)) assert.equal((await analytics(await prisma.user.findUniqueOrThrow({ where: { email } }), 'INDIVIDUAL')).groups[0].count, count);
    assert.equal(JSON.stringify(individual).includes('@example.test'), false);
    console.log('B4 protected analytics verified against declared fixture expectations; public release denied.');
    const publicJobs = await publishedJobs();
    assert.equal(publicJobs.length, 16);
    let eligibleMatching = 0, alignedProfiles = 0, noSkillOverlapCases = 0;
    for (const account of accounts) {
      const viewer = await prisma.user.findUniqueOrThrow({ where: { email: account.email } });
      assert.ok(viewer.firstName && viewer.lastName && viewer.phoneNumber);
      const credential = await prisma.account.findFirst({ where: { userId: viewer.id, providerId: 'credential' } });
      assert.ok(credential?.password && credential.password !== account.password);
      if (account.group === 'staff') for (const moduleName of ['COMMUNITY_DATA', 'JOBS', 'PROJECTS', 'SERVICES', 'REPORTS', 'CENSUS']) assert.equal(await hasModuleAccess(viewer, moduleName), staffGrants[account.index].modules.includes(moduleName) || (moduleName === 'CENSUS' && account.index < 2));
      if (account.group === 'individual') {
        const state = await community.ownedSurveyState(viewer.id, referenceYear);
        if (account.scenario === 'withdrawn') { assert.equal(state.submittedStatus, 'WITHDRAWN'); assert.equal(state.consentOpportunityRecommendations, false); assert.ok(state.history.some(h => h.action === 'WITHDRAWN')); }
        if (account.scenario === 'later-draft') { assert.equal(state.hasDraft, true); assert.equal(state.submittedStatus, 'SUBMITTED'); assert.notEqual(state.occupation, state.submitted.occupation); }
        const profile = await communityMatchProfile(viewer.id) ?? await profileForCitizen(viewer.id);
        if (profile) { eligibleMatching++; const matches = rankJobs(publicJobs, profile); assert.ok(matches.length); if (matches.some(j => j.match.matchedSkills.length)) alignedProfiles++; if (matches.some(j => j.match.matchedSkills.length === 0)) noSkillOverlapCases++; }
        if (!state.consentOpportunityRecommendations) assert.equal(profile, null);
      }
    }
    assert.equal(eligibleMatching, expected.counts.individual.matchingEligibleAcrossSubmittedYears);
    assert.ok(alignedProfiles > 10, 'Fixtures need useful persisted skills-to-vacancy alignment');
    assert.equal(noSkillOverlapCases, eligibleMatching, 'Fixtures need deliberate vacancies with no skill overlap');
    const owner = await prisma.user.findUniqueOrThrow({ where: { email: 'establishment.01@example.test' } });
    const stranger = await prisma.user.findUniqueOrThrow({ where: { email: 'individual.01@example.test' } });
    const first = await prisma.establishment.findFirstOrThrow({ where: { ownerId: owner.id } });
    await assert.rejects(establishments.ownedEstablishmentState(stranger, first.id, referenceYear));
    assert.equal(await prisma.communitySurvey.count({ where: { userId: owner.id } }), 0);
    console.log(`Counts/ownership/scopes/consent/history/matching verified on ${target.database}; ${eligibleMatching} eligible matching profiles.`);
    const census = await import('../../src/features/census/server/data.ts');
    const administrator = await prisma.user.findUniqueOrThrow({ where: { email: 'admin.01@example.test' } });
    const roster = await census.assistanceRoster(administrator);
    assert.equal(roster.find(r => r.barangay === 'Bambang').count, 2);
    assert.equal(roster.find(r => r.barangay === 'Batong Malake').count, 0);
    assert.equal(roster.find(r => r.barangay === 'Maahas').count, 1);
    assert.equal(roster.find(r => r.barangay === 'Mayondon').count, null);
    assert.equal(await prisma.staffPermission.count({ where: { user: { email: 'staff.04@example.test' }, module: 'CENSUS' } }), 0);
    const historicalSource = await prisma.communityImportRecord.groupBy({ by: ['outcome'], _count: { _all: true } });
    assert.ok(historicalSource.some(r => r.outcome === 'REVIEW_NEEDED'));
    if(expected.b5)await(await import('./verify-b5.mjs')).verifyB5(prisma,readyState);
    if (login) await verifyLogins(config, prisma);
  } finally { await db.end(); }
}
export async function verifyLogins(config, prisma) {
  const { auth } = await import('../../src/lib/auth.ts');
  let successful = 0, rateLimits = 0;
  for (const account of accounts) {
    let response;
    for (let attempt = 0; attempt < 4; attempt++) {
      response = await auth.handler(new Request(`${config.baseURL}/api/auth/sign-in/email`, { method: 'POST', headers: { origin: config.baseURL, 'content-type': 'application/json' }, body: JSON.stringify({ email: account.email, password: account.password }) }));
      if (response.status !== 429) break;
      rateLimits++; await delay(Math.min(65_000, Math.max(11_000, Number(response.headers.get('retry-after') || 11) * 1000)));
    }
    assert.equal(response.status, 200, `Actual auth sign-in failed: ${account.email}`);
    const body = await response.json(); assert.equal(body.user.email, account.email);
    const cookie = response.headers.getSetCookie().map(v => v.split(';')[0]).join('; ');
    const session = await auth.api.getSession({ headers: new Headers({ cookie }) });
    assert.equal(session.user.id, body.user.id);
    const viewer = await prisma.user.findUniqueOrThrow({ where: { id: body.user.id } }); assert.equal(viewer.role, account.role);
    await auth.handler(new Request(`${config.baseURL}/api/auth/sign-out`, { method: 'POST', headers: { origin: config.baseURL, cookie, 'content-type': 'application/json' }, body: '{}' }));
    successful++; if (successful % 12 === 0) console.log(`Real sign-in verified ${successful}/${accounts.length}`);
    // Installed limiter resets after 10 seconds of inactivity since the last
    // accepted request, rather than a fixed-window start. Pause after each trio.
    await delay(successful % 3 === 0 ? 11000 : 250);
  }
  console.log(`Real sign-in: ${successful} passed, 0 skipped; ${rateLimits} bounded rate-limit waits.`);
}
