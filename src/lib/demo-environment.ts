import 'server-only';

export function demoEnvironment(env: { ELB_DEMO_MODE?: string; DATABASE_URL?: string }) {
  if (!env.ELB_DEMO_MODE) return null;
  const target = new URL(env.DATABASE_URL || 'invalid:');
  if (env.ELB_DEMO_MODE !== 'elb-demo-2026-v1' || target.protocol !== 'mysql:' || !['localhost', '127.0.0.1', '[::1]'].includes(target.hostname) || !/^\/e_lingkod_bayan_demo(?:_restore(?:_[a-z0-9]+)?)?$/.test(target.pathname)) {
    throw new Error('Demo mode requires an explicit dedicated local demo database.');
  }
  return { label: 'DEMO — synthetic data only', version: env.ELB_DEMO_MODE, database: target.pathname.slice(1) };
}
