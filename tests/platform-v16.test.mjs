import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
const read=(p)=>fs.readFileSync(p,'utf8');

const schema=read('prisma/schema.prisma');
const migration=read('prisma/migrations/20261022230000_platform_workflow_v16/migration.sql');
const distribution=read('src/lib/work-distribution/server.ts');
const notifications=read('src/lib/notifications/server.ts');
const bell=read('src/components/notifications/notification-bell.tsx');
const center=read('src/components/notifications/notification-center.tsx');
const serviceBuilder=read('src/features/services/components/service-builder.tsx');
const builderServer=read('src/features/services/server/builder.ts');
const civicForm=read('src/features/civic/components/admin-update-form.tsx');
const serviceDesk=read('src/app/admin/services/page.tsx');
const serviceReports=read('src/app/admin/services/reports/page.tsx');
const pulse=read('src/app/admin/pulse/page.tsx');

test('V16 migration is additive and introduces notifications, fair work assignments and service definitions',()=>{
  for(const model of ['model Notification','model WorkAssignment','model ServiceDefinition','model ServiceDefinitionAudit']) assert.match(schema,new RegExp(model));
  for(const table of ['notification','work_assignment','service_definition','service_definition_audit']) assert.match(migration,new RegExp("CREATE TABLE `"+table+"`"));
  assert.doesNotMatch(migration,/DROP TABLE|TRUNCATE|DELETE FROM/i);
});

test('V16 workload distribution balances eligible staff, requires acceptance, expires offers and preserves admin fallback',()=>{
  assert.match(distribution,/balancedCandidate/);
  assert.match(distribution,/status: "OFFERED"/);
  assert.match(distribution,/status: "ACCEPTED"/);
  assert.match(distribution,/claimDeadline/);
  assert.match(distribution,/refreshExpiredWorkOffers/);
  assert.match(distribution,/previouslyOfferedStaff/);
  assert.match(distribution,/WORK_POOL_EXHAUSTED/);
  assert.match(distribution,/manualAssignWork/);
  assert.match(civicForm,/Auto-balance across eligible office staff/);
  assert.match(serviceDesk,/Awaiting staff acceptance/);
});

test('V16 Service Builder supports configurable workflow, forms, requirements, fees and publishing',()=>{
  for(const token of ['export function ServiceBuilder','Expected processing time','PUBLISHED','Form questions','Document requirements']) assert.match(serviceBuilder,new RegExp(token));
  assert.match(builderServer,/appointmentMode/);
  assert.match(builderServer,/assignmentStrategy/);
  assert.match(builderServer,/acceptTimeoutMinutes/);
  assert.match(builderServer,/departmentAliases/);
  assert.match(builderServer,/condition/);
  assert.match(builderServer,/serviceDefinitionAudit/);
});

test('V16 notification center is backed by persisted workflow notifications',()=>{
  assert.match(notifications,/notificationFeed/);
  assert.match(bell,/View all notifications/);
  assert.match(center,/Mark all read/);
  assert.match(center,/Workflow updates/);
  assert.match(distribution,/type: "WORK_OFFER"/);
});

test('V16 Online Services includes operations analytics and audit export',()=>{
  assert.match(serviceReports,/Average turnaround/);
  assert.match(serviceReports,/Requests by service/);
  assert.match(serviceReports,/Active workload/);
  assert.match(serviceReports,/Export request audit CSV/);
});

test('V16 Community Pulse remains aggregate-only',()=>{
  assert.match(pulse,/Community Pulse/);
  assert.match(pulse,/Census/);
  assert.match(pulse,/Protected census records and analytics/);
  assert.match(pulse,/Public census analytics is deferred/);
  assert.match(pulse,/requireSuperAdminPage/);
  assert.doesNotMatch(pulse,/select:\s*\{[^}]*\b(?:email|phone|birthDate)\s*:/);
  assert.match(pulse,/Assignments are operational tasks, not staff headcounts or census respondents/);
});

test('V16 new and heavily modified TypeScript sources parse successfully',()=>{
  const files=[
    'src/lib/work-distribution/server.ts','src/lib/notifications/server.ts','src/app/api/notifications/route.ts',
    'src/components/notifications/notification-bell.tsx','src/components/notifications/notification-center.tsx','src/app/notifications/page.tsx',
    'src/components/admin/work-offer-panel.tsx','src/features/services/server/catalog.ts','src/features/services/server/builder.ts',
    'src/features/services/components/service-builder.tsx','src/app/admin/services/catalog/page.tsx','src/app/admin/services/reports/page.tsx',
    'src/app/admin/pulse/page.tsx','src/features/landing/server/citizen-home.ts','src/features/landing/sections/personalized-welcome-section.tsx',
    'src/features/civic/server/mutations.ts','src/features/services/server/mutations.ts','src/features/services/server/data.ts',
  ];
  for(const file of files){const result=ts.transpileModule(read(file),{fileName:file,reportDiagnostics:true,compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.ESNext}});assert.equal(result.diagnostics?.length??0,0,`${file}: ${JSON.stringify(result.diagnostics?.map(d=>d.messageText))}`);}
});
