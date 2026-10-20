import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import vm from 'node:vm';
import ts from 'typescript';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
class CivicError extends Error { constructor(message, status = 400) { super(message); this.status = status; } }
function handler({ data, invitations, users, mode = 'DEMO' }) {
  const captured = [];
  const db = {
    user: { findUnique: async ({ where }) => users.get(where.email) || null },
    staffInvitation: {
      findUnique: async ({ where }) => invitations.get(where.email) || null,
      upsert: async args => { captured.push(args); return args.create; },
      updateMany: async () => ({ count: 1 }),
      update: async () => ({}),
    },
  };
  const prisma = { $transaction: fn => fn(db), staffInvitation: db.staffInvitation };
  const source = readFileSync(path.join(root, 'src/app/api/admin/staff/invitations/route.ts'), 'utf8');
  const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const module = { exports: {} };
  const helpers = {
    invitationToken: () => 'a'.repeat(43), hashInvitationToken: () => 'f'.repeat(64),
    invitationExpiry: () => new Date('2026-10-23T00:00:00Z'), invitationUrl: () => 'http://localhost:3000/staff/activate/demo',
    invitationDeliveryMode: () => mode, deliverStaffInvitation: async () => {}, parseInvitationInput: () => data,
    invitationDatabaseFields: input => ({ name: input.name, email: input.email, department: input.department, designation: input.designation, modulesJson: JSON.stringify(input.modules) }),
  };
  const stubs = {
    '@/lib/prisma': { prisma }, '@/lib/access': { requireApiViewer: async () => ({ id: 'chief' }) },
    '@/features/civic/validation': { CivicError },
    '@/features/civic/server/http': { assertSameOrigin: () => {}, readJson: async () => ({ action: 'INVITE' }), json: (body, status = 200) => ({ status, ...body }), apiFailure: error => { throw error; } },
    '@/lib/staff-invitations': helpers,
  };
  vm.runInNewContext(`(function(require,module,exports){${output}\n})`, {})(name => { if (!(name in stubs)) throw new Error(`Unexpected import ${name}`); return stubs[name]; }, module, module.exports);
  return { request: module.exports.POST, captured };
}

test('invite API never supplies unsupported `modules` column to Prisma upsert', async () => {
  const input = { name: 'Mia Santos', email: 'mia@example.gov.ph', department: 'MDRRMO', designation: 'Response Officer', modules: ['REPORTS', 'EMERGENCY'] };
  const flow = handler({ data: input, invitations: new Map(), users: new Map() });
  const response = await flow.request({});
  assert.equal(response.status, 200);
  assert.equal(response.delivery, 'DEMO');
  assert.equal(flow.captured.length, 1);
  const payload = flow.captured[0];
  assert.equal(payload.create.modules, undefined);
  assert.equal(payload.update.modules, undefined);
  assert.deepEqual(JSON.parse(payload.create.modulesJson), ['REPORTS', 'EMERGENCY']);
  assert.equal(payload.create.issuedById, 'chief');
});

test('invite API checks duplicate existing account before writing', async () => {
  const input = { name: 'Mia Santos', email: 'mia@example.gov.ph', department: 'MDRRMO', designation: 'Response Officer', modules: ['REPORTS'] };
  const flow = handler({ data: input, invitations: new Map(), users: new Map([[input.email, { id: 'existing' }]]) });
  await assert.rejects(() => flow.request({}), error => error.status === 409);
  assert.equal(flow.captured.length, 0);
});
