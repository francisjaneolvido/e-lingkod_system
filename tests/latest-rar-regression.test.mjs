import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = path => readFileSync(path,'utf8');

test('Next.js cacheComponents pages do not use force-dynamic', () => {
  const publicPage=read('src/app/emergency/page.tsx');
  const desk=read('src/app/admin/emergency/page.tsx');
  for(const source of [publicPage,desk]) assert.doesNotMatch(source,/export const dynamic\s*=\s*['"]force-dynamic['"]/);
  assert.match(publicPage,/await connection\(\)/);
});

test('uploaded documents are previewed in both workflows without serving HTML inline', () => {
  assert.match(read('src/features/services/components/citizen-request-detail.tsx'),/<DocumentInlinePreview/);
  assert.match(read('src/features/services/components/document-review-list.tsx'),/<DocumentInlinePreview/);
  const route=read('src/app/api/services/documents/[documentId]/route.ts');
  assert.match(route,/canPreview/);
  assert.match(route,/application\/octet-stream/);
  assert.match(route,/"attachment"/);
});

test('physical document release requires actual pickup and identity checks', () => {
  const mutations=read('src/features/services/server/mutations.ts');
  assert.match(mutations,/if \(service\.completionMode === "RELEASE"\) return recordServicePickupRelease\(id, input, viewer\)/);
  const pickup=read('src/features/services/server/pickup.ts');
  assert.match(pickup,/input\?\.idVerified !== true/);
  assert.match(pickup,/status: "CONFIRMED"/);
  assert.match(read('src/features/services/server/data.ts'),/pickupSlots: row\.pickupSlots\.map/);
  assert.match(read('src/features/services/components/citizen-request-detail.tsx'),/<CitizenPickupPanel/);
  assert.match(read('src/app/admin/services/[id]/page.tsx'),/<StaffPickupPanel/);
});

test('office reassignment protects active requests and uses structured office selection', () => {
  assert.match(read('src/app/api/admin/staff/route.ts'),/servicesAccessLost/);
  assert.match(read('src/app/api/admin/staff/route.ts'),/activeServiceRequests/);
  assert.match(read('src/components/admin/staff-manager.tsx'),/<LGUOfficeSelect/);
  assert.match(read('src/components/admin/staff-invite-manager.tsx'),/<LGUOfficeSelect/);
});
