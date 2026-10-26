import { loadConfig, applicationEnvironment, commandTarget } from './config.mjs';
import { spawn } from 'node:child_process';
const config = loadConfig();
const command = process.argv[2];
if (!['setup', 'verify', 'export', 'restore', 'dev'].includes(command)) throw new Error('Use setup|verify|export|restore|dev');
const useRestore = process.argv.includes('--restored');
const target = commandTarget(config, command, useRestore);
Object.assign(process.env, applicationEnvironment(config, target));
if (command === 'dev') {
  const { connect, metadata } = await import('./database.mjs');
  const db = await connect(target);
  try { if (!(await metadata(db))?.ready) throw new Error('Run demo:setup or demo:restore first'); } finally { await db.end(); }
  console.log(`DEMONSTRATION ONLY — ${target.database} — ${config.baseURL}`);
  const child = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'dev', '--hostname', 'localhost', '--port', '3102'], { stdio: 'inherit', env: process.env });
  child.on('exit', code => { process.exitCode = code ?? 1; });
} else {
  const { loadServerTypescript } = await import('../../tests/helpers/load-typescript.mjs');
  const hook = loadServerTypescript();
  try {
    if (command === 'setup') await (await import('./setup.mjs')).setup(config);
    if (command === 'verify') await (await import('./verify.mjs')).verify(config, target, { login: !process.argv.includes('--counts-only') });
    if (command === 'export' || command === 'restore') await (await import('./transfer.mjs'))[command](config);
  } finally {
    const { prisma } = await import('../../src/lib/prisma.ts');
    await prisma.$disconnect(); hook.deregister();
  }
}
