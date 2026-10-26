import { loadServerTypescript } from './load-typescript.mjs';
const target = new URL(process.env.DATABASE_URL).pathname.slice(1);
if (target !== process.env.ELB_B3_UPGRADE_TEST_DATABASE || !/^e_lingkod_bayan_demo_restore_u[a-f0-9]{32}$/.test(target)) throw Error('Protected disposable upgrade fixture required');
const hook = loadServerTypescript();
const { prisma } = await import('../../src/lib/prisma.ts');
try {
  const actor = await prisma.user.findUniqueOrThrow({ where: { id: 'upgrade-admin' } });
  const { saveAssistanceRoster } = await import('../../src/features/census/server/data.ts');
  await saveAssistanceRoster(actor, { barangay: 'Maahas', staffIds: ['upgrade-staff'], expectedVersion: 0 });
  console.log('Manual synthetic roster and audit persisted through the real roster service.');
} finally { await prisma.$disconnect(); hook.deregister(); }
