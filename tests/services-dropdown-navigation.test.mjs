import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';

const header = fs.readFileSync('src/components/layout/site-header.tsx','utf8');
const definitions = fs.readFileSync('src/features/landing/data/services.ts','utf8');
const staffModules = fs.readFileSync('src/lib/staff-modules.ts','utf8');
const staffManager = fs.readFileSync('src/components/admin/staff-manager.tsx','utf8');
const inviteManager = fs.readFileSync('src/components/admin/staff-invite-manager.tsx','utf8');
const adminShell = fs.readFileSync('src/components/admin/admin-shell.tsx','utf8');

test('all six service definitions remain available while Job Matching owns employment survey insights',()=>{
  assert.match(header, /import \{ services \} from "@\/features\/landing\/data\/services"/);
  for (const id of ['civic','services','emergency','directory','jobs','census']) {
    assert.match(definitions, new RegExp(`id: "${id}"`));
    assert.match(header, new RegExp(`\\b${id}: "\\/`));
  }
  assert.match(header,/live: service\.id === "civic" \|\| service\.id === "services" \|\| service\.id === "jobs"/);
  assert.match(definitions,/title: "Community Census", shortTitle: "Census · coming soon"/);
});

test('community menu provides both private profiling surveys without promising deferred public statistics',()=>{
  assert.match(header,/label: "Citizen Profiling overview", href: "\/community-employment"/);
  assert.match(header,/label: "Citizen Profiling survey", href: "\/community-survey"/);
  assert.match(header,/label: "Establishment Profiling", href: "\/establishment-survey"/);
  assert.match(header,/label: "Opportunities", href: "\/opportunities"/);
  assert.doesNotMatch(header,/label: "Community census · coming soon"/);
  assert.match(header,/Community <ChevronDown/);
  assert.match(header,/>About<\/Link>/);
});

test('report shortcuts are removed from the desktop top-level navigation but remain in the signed-in account menu',()=>{
  const desktop = header.slice(header.indexOf('<nav aria-label="Primary"'), header.indexOf('{viewer ? ('));
  assert.doesNotMatch(desktop,/>My reports<\/Link>/i);
  assert.doesNotMatch(desktop,/>Track a report<\/Link>/i);
  assert.match(header,/> My Reports<\/Link>/);
});

test('desktop service and community dropdowns are accessible and closable',()=>{
  assert.match(header,/onMouseEnter=\{\(\) => setServicesOpen\(true\)\}/);
  assert.match(header,/aria-expanded=\{servicesOpen\}/);
  assert.match(header,/aria-controls="elb-services-menu"/);
  assert.match(header,/aria-expanded=\{communityOpen\}/);
  assert.match(header,/aria-controls="elb-community-menu"/);
  assert.match(header,/communityDetails\.current\?\.contains/);
  assert.match(header,/event\.key === "Escape"/);
});

test('mobile navigation uses grouped Services and Community accordions',()=>{
  assert.match(header,/aria-expanded=\{mobileServicesOpen\}/);
  assert.match(header,/aria-controls="elb-mobile-services-menu"/);
  assert.match(header,/aria-expanded=\{mobileCommunityOpen\}/);
  assert.match(header,/aria-controls="elb-mobile-community-menu"/);
  assert.match(header,/max-h-\[calc\(100dvh-82px\)\]/);
});

test('opportunity maintenance remains separate from census-scoped analytics and imports',()=>{
  assert.match(staffModules,/JOBS: "Employment Opportunities"/);
  assert.match(staffModules,/CENSUS: "Protected Census Records"/);
  assert.match(staffModules,/COMMUNITY_DATA: "Legacy Data Management"/);
  assert.match(staffManager,/module !== "REPORTS" && module !== "JOBS" && module !== "COMMUNITY_DATA"/);
  assert.match(inviteManager,/\["REPORTS", "JOBS", "COMMUNITY_DATA"\]/);
  assert.match(adminShell,/"\/admin\/jobs\/insights": "CENSUS"/);
  assert.match(adminShell,/"\/admin\/jobs\/data": "CENSUS"/);
  assert.match(adminShell,/"\/admin\/census\/analytics": "CENSUS"/);
  assert.match(adminShell,/"\/admin\/census\/imports": "CENSUS"/);
  assert.match(adminShell,/"\/admin\/census": "CENSUS"/);
});

test('updated navigation is valid TSX syntax',()=>{
  const r=ts.transpileModule(header,{
    fileName: 'src/components/layout/site-header.tsx',reportDiagnostics:true,
    compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.ESNext}
  });
  assert.equal(r.diagnostics?.length??0,0,JSON.stringify(r.diagnostics?.map(d=>d.messageText)));
});
