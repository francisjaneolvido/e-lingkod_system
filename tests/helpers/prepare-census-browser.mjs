import { loadServerTypescript } from './load-typescript.mjs';
if (!/^elb_b3_test_[a-f0-9]{32}$/.test(process.env.ELB_B3_TEST_DATABASE || '')) throw new Error('Disposable B3 browser target required');
const hook = loadServerTypescript();
const { prisma } = await import('../../src/lib/prisma.ts');
const { auth } = await import('../../src/lib/auth.ts');
const { spawnSync } = await import('node:child_process');
try {
  for (const name of ['Citizen', 'Staff', 'Denied', 'Admin', 'Administrator']) await auth.api.signUpEmail({ body: { firstName: 'Browser', lastName: name, hasNoMiddleName: true, phoneNumber: '+639001234567', email: `b3.${name.toLowerCase()}@example.test`, password: 'B3-browser-password-2026!', name: 'Browser ' + name } });
  const promote = spawnSync(process.execPath, ['scripts/set-admin.mjs', 'b3.admin@example.test'], { env: process.env, stdio: 'inherit', windowsHide: true });
  if (promote.status !== 0) throw new Error('Test Admin provision failed');
  const promoteSecond = spawnSync(process.execPath, ['scripts/set-admin.mjs', 'b3.administrator@example.test'], { env: process.env, stdio: 'inherit', windowsHide: true });
  if (promoteSecond.status !== 0) throw new Error('Second test Admin provision failed');
  const session = await auth.api.signInEmail({ body: { email: 'b3.admin@example.test', password: 'B3-browser-password-2026!' }, returnHeaders: true });
  const cookie = session.headers.getSetCookie().map(v => v.split(';')[0]).join('; '), origin = process.env.BETTER_AUTH_URL;
  const { POST } = await import('../../src/app/api/admin/staff/route.ts');
  for (const [email, modules] of [['b3.staff@example.test', ['CENSUS']], ['b3.denied@example.test', ['PROJECTS']]]) {
    const response = await POST(new Request(origin + '/api/admin/staff', { method: 'POST', headers: { origin, cookie, 'content-type': 'application/json' }, body: JSON.stringify({ email, modules, mode: 'SAVE', department: 'PESO', designation: 'Synthetic browser fixture' }) }));
    if (!response.ok) throw new Error('Browser Staff provisioning failed');
  }
  const census = await import('../../src/features/census/server/data.ts');
  const admin = await prisma.user.findUniqueOrThrow({ where: { email: 'b3.admin@example.test' } });
  const staff = await prisma.user.findUniqueOrThrow({ where: { email: 'b3.staff@example.test' } });
  await census.setRecordScope(admin, { staffId: staff.id, barangays: ['Bambang'], expectedVersion: 0 });
  const citizen = await prisma.user.findUniqueOrThrow({ where: { email: 'b3.citizen@example.test' } });
  const personal = await import('../../src/features/community/server/survey-lifecycle.ts');
  for (let i = 0; i < 22; i++) await personal.saveCitizenSurvey({ surveyYear: 2026, status: 'SUBMITTED', barangay: 'Bambang', ageGroup: '25-34', educationLevel: 'COLLEGE', employmentStatus: 'EMPLOYED_FULL_TIME', skills: ['Data Entry'], consentAggregated: true, occupation: `Synthetic revision ${i + 1}`, expectedVersion: i, expectedConsentVersion: i, requestKey: 'b3_browser_revision_' + String(i).padStart(3, '0') }, citizen);
  const org = await import('../../src/features/establishments/server/data.ts');
  const answers = { surveyYear: 2026, businessName: '[DEMO] Browser Organization', officeType: 'MAIN', street: 'Synthetic Street', barangay: 'Bambang', employerType: 'PRIVATE', organizationType: 'CORPORATION', industry: 'INFORMATION', productsServices: 'Synthetic services only', operatingStatus: 'OPERATING', totalWorkers: 4, regularWorkers: 3, nonRegularWorkers: 1, contactName: 'Browser Citizen', contactPosition: 'Representative', contactEmail: 'b3.citizen@example.test' };
  const created = await org.createEstablishment({ ...answers, requestKey: 'b3_browser_org_create' }, citizen);
  await org.saveEstablishmentSurvey({ ...answers, status: 'SUBMITTED', establishmentId: created.establishmentId, expectedVersion: 0, expectedRecordVersion: 0, requestKey: 'b3_browser_org_submit' }, citizen);
  console.log('B3 disposable browser fixture ready: 22 immutable individual revisions, one organization, scoped/denied Staff and Admin.');
} finally { await prisma.$disconnect(); hook.deregister(); }
