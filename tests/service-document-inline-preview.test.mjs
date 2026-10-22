import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

const read = (path) => readFileSync(path, 'utf8');
const routePath = 'src/app/api/services/documents/[documentId]/route.ts';
const previewPath = 'src/features/services/components/document-inline-preview.tsx';
const citizenPath = 'src/features/services/components/citizen-request-detail.tsx';
const reviewerPath = 'src/features/services/components/document-review-list.tsx';

function loadDocumentRoute(viewer, { accessibleDepartment = false, permission = true, doc = undefined } = {}) {
  const requestDocument = doc === undefined ? {
    id: 'doc-a', data: Buffer.from('fake file payload'), fileName: 'identity.jpg', mimeType: 'image/jpeg',
    request: { requesterId: 'citizen-a', assignedStaffId: 'staff-b', serviceKey: 'business-clearance-certification' },
  } : doc;
  const stubs = {
    '@/lib/access': { viewerFromHeaders: async () => viewer },
    '@/lib/staff-access': { hasModuleAccess: async () => permission },
    '@/lib/prisma': { prisma: { serviceRequestDocument: { findUnique: async () => requestDocument } } },
    '@/features/services/catalog': { departmentMatchesService: () => accessibleDepartment },
    '@/features/services/server/catalog': { resolveServiceDefinition: async () => ({ departmentCode: 'BPLO' }) },
  };
  const source = ts.transpileModule(read(routePath), { fileName: routePath, compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const exports = {};
  vm.runInNewContext(source, { exports, require: (name) => {
    assert.ok(name in stubs, `Unexpected import: ${name}`);
    return stubs[name];
  }, Response, Uint8Array, Buffer });
  return exports.GET;
}

async function responseFor(get) {
  return get({ headers: new Headers() }, { params: Promise.resolve({ documentId: 'doc-a' }) });
}

test('staff with SERVICES permission and matching department may view an image without runtime ReferenceError', async () => {
  const get = loadDocumentRoute({ role: 'STAFF', id: 'staff-a' }, { accessibleDepartment: true });
  const response = await responseFor(get);
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('Content-Type'), 'image/jpeg');
  assert.match(response.headers.get('Content-Disposition'), /^inline/);
  assert.equal(response.headers.get('Cache-Control'), 'private, no-store');
  assert.equal(await response.text(), 'fake file payload');
});

test('staff already assigned to the request can view it even outside a matched office', async () => {
  const response = await responseFor(loadDocumentRoute({ role: 'STAFF', id: 'staff-b' }));
  assert.equal(response.status, 200);
});

test('wrong-office staff and staff without SERVICES permission cannot read citizen identity uploads', async () => {
  assert.equal((await responseFor(loadDocumentRoute({ role: 'STAFF', id: 'staff-a' }))).status, 403);
  assert.equal((await responseFor(loadDocumentRoute({ role: 'STAFF', id: 'staff-b' }, { permission: false }))).status, 403);
});

test('citizen can view only their own documents; unauthenticated requests cannot view any', async () => {
  assert.equal((await responseFor(loadDocumentRoute({ role: 'CITIZEN', id: 'citizen-a' }))).status, 200);
  assert.equal((await responseFor(loadDocumentRoute({ role: 'CITIZEN', id: 'citizen-other' }))).status, 403);
  assert.equal((await responseFor(loadDocumentRoute(null))).status, 401);
});

test('PDF stays inline; unexpected MIME is not rendered as arbitrary active content', async () => {
  const base = { data: Buffer.from('demo'), fileName: 'demo.pdf', request: { requesterId: 'citizen-a', assignedStaffId: null, serviceKey: 'demo' } };
  const pdf = await responseFor(loadDocumentRoute({ role: 'ADMIN', id: 'admin' }, { doc: { ...base, mimeType: 'application/pdf' } }));
  assert.equal(pdf.headers.get('Content-Type'), 'application/pdf');
  assert.match(pdf.headers.get('Content-Disposition'), /^inline/);
  const html = await responseFor(loadDocumentRoute({ role: 'ADMIN', id: 'admin' }, { doc: { ...base, mimeType: 'text/html' } }));
  assert.equal(html.headers.get('Content-Type'), 'application/octet-stream');
  assert.match(html.headers.get('Content-Disposition'), /^attachment/);
});

test('inline image/PDF preview is connected in citizen and Admin/Staff request screens', () => {
  const preview = read(previewPath);
  assert.match(preview, /image\/jpeg/);
  assert.match(preview, /application\/pdf/);
  assert.match(preview, /<img/);
  assert.match(preview, /<iframe/);
  assert.match(preview, /Open original/);
  assert.match(read(citizenPath), /<DocumentInlinePreview/);
  assert.match(read(reviewerPath), /<DocumentInlinePreview/);
  for (const file of [routePath, previewPath, citizenPath, reviewerPath, 'src/app/layout.tsx', 'src/components/shared/brand-logo.tsx']) {
    const result = ts.transpileModule(read(file), { fileName: file, reportDiagnostics: true, compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.ESNext } });
    assert.equal(result.diagnostics?.length ?? 0, 0, `${file} has TypeScript parse diagnostics`);
  }
});
