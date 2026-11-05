// Explicit legacy classification for pre-existing-feature regression fixtures.
// Never imported by application source or enabled on an ordinary/demo database.
export function assertLegacyCitizenFixtureTarget(env = process.env) {
  let target;
  try { target = new URL(env.DATABASE_URL); } catch { throw Error('Explicit local disposable database required for legacy fixtures.'); }
  const database = decodeURIComponent(target.pathname.slice(1));
  const guards = ['ELB_B1_TEST_DATABASE', 'ELB_B2_TEST_DATABASE', 'ELB_B3_TEST_DATABASE', 'ELB_MUNICIPAL_TEST_DATABASE'].map(key => env[key]).filter(Boolean);
  if (target.protocol !== 'mysql:' || !['localhost', '127.0.0.1', '[::1]', '::1'].includes(target.hostname) || target.search || target.hash)
    throw Error('Legacy fixtures require a local disposable MySQL connection.');
  if (!/^elb_b[13]_test_[a-f0-9]{32}$/.test(database) || !guards.length || guards.some(value => value !== database))
    throw Error('Legacy fixture disposable database must match every explicit test guard.');
  return database;
}

async function assertLegacyFixtureClient(prisma, env) {
  const expected = assertLegacyCitizenFixtureTarget(env);
  const [actual] = await prisma.$queryRawUnsafe('SELECT DATABASE() AS databaseName');
  if (actual?.databaseName !== expected) throw Error('Legacy fixture client must match the guarded disposable database.');
}

export async function markLegacyCitizenFixture(prisma, userId, env = process.env) {
  await assertLegacyFixtureClient(prisma, env);
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  if (!user.email.endsWith('@example.test') || user.role !== 'CITIZEN' || user.identityVersion !== 0 || !['SUBMISSION_REQUIRED', 'LEGACY'].includes(user.identityStatus))
    throw Error('Only a new synthetic Citizen without ID-review history may be seeded as a legacy fixture.');
  if (await prisma.citizenIdentitySubmission.count({ where: { userId } })) throw Error('Legacy fixture cannot overwrite ID submissions.');
  const changed = await prisma.user.updateMany({ where: { id: userId, role: 'CITIZEN', identityVersion: 0, identityStatus: user.identityStatus }, data: { identityStatus: 'LEGACY' } });
  if (changed.count !== 1) throw Error('Synthetic legacy fixture changed concurrently.');
  return prisma.user.findUniqueOrThrow({ where: { id: userId } });
}

export async function createLegacyCitizenFixture(prisma, data, env = process.env) {
  await assertLegacyFixtureClient(prisma, env);
  if (!data.email?.endsWith('@example.test')) throw Error('Only synthetic reserved email addresses may be seeded by this fixture.');
  const created = await prisma.user.create({ data });
  return data.role === 'CITIZEN' || data.role === undefined ? markLegacyCitizenFixture(prisma, created.id, env) : created;
}

export async function registerLegacyCitizenFixture(auth, prisma, options, env = process.env) {
  await assertLegacyFixtureClient(prisma, env);
  if (!options.body?.email?.endsWith('@example.test')) throw Error('Legacy signup fixtures require reserved synthetic email addresses.');
  const result = await auth.api.signUpEmail(options);
  if (result instanceof Response && !result.ok) return result;
  const user = await prisma.user.findUniqueOrThrow({ where: { email: options.body.email } });
  if (user.role !== 'CITIZEN' || user.identityStatus !== 'SUBMISSION_REQUIRED') throw Error('Production signup must create an unapproved Citizen before test-only legacy classification.');
  await markLegacyCitizenFixture(prisma, user.id, env);
  return result; // Preserve the actual Better Auth response/session unchanged.
}
