import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';

const header = fs.readFileSync('src/components/layout/site-header.tsx','utf8');
const definitions = fs.readFileSync('src/features/landing/data/services.ts','utf8');

test('six navigation choices are sourced from the existing service definitions',()=>{
  assert.match(header, /import \{ services \} from "@\/features\/landing\/data\/services"/);
  for (const id of ['civic','services','emergency','directory','jobs','census']) {
    assert.match(definitions, new RegExp(`id: "${id}"`));
    assert.match(header, new RegExp(`\\b${id}: "\\/`));
  }
  assert.match(header,/serviceNavigation\.map\(/);
});

test('working modules link to working routes and previews link to service anchors',()=>{
  assert.match(header,/civic: "\/reports\/new"/);
  assert.match(header,/jobs: "\/opportunities"/);
  assert.match(header,/services: "\/#service-services"/);
  assert.match(header,/emergency: "\/#service-emergency"/);
  assert.match(header,/directory: "\/#service-directory"/);
  assert.match(header,/census: "\/#service-census"/);
  assert.match(header,/service\.live \? "Available" : "Preview"/);
});

test('desktop opens on hover or click and closes on escape, outside, or leaving',()=>{
  assert.match(header,/onMouseEnter=\{\(\) => setServicesOpen\(true\)\}/);
  assert.match(header,/onClick=\{\(\) => setServicesOpen\(true\)\}/);
  assert.match(header,/onMouseLeave=\{\(\) => setServicesOpen\(false\)\}/);
  assert.match(header,/aria-expanded=\{servicesOpen\}/);
  assert.match(header,/event\.key === "Escape"/);
  assert.match(header,/servicesDetails\.current\?\.contains/);
});

test('mobile accordion uses the same six service entries and accessible toggle',()=>{
  assert.match(header,/aria-expanded=\{mobileServicesOpen\}/);
  assert.match(header,/aria-controls="elb-mobile-services-menu"/);
  assert.match(header,/id="elb-mobile-services-menu"/);
  assert.match(header,/setMobileServicesOpen\(\(current\) => !current\)/);
  assert.match(header,/max-h-\[calc\(100dvh-82px\)\]/);
});

test('the top navigation no longer duplicates Job Opportunities',()=>{
  assert.doesNotMatch(header, /label: "Job opportunities"/);
  assert.doesNotMatch(header, /label: "Jobs"/);
  assert.match(header,/Track a report/);
  assert.match(header,/My reports/);
});

test('updated navigation is valid TSX syntax',()=>{
  const r=ts.transpileModule(header,{
    fileName: 'src/components/layout/site-header.tsx',reportDiagnostics:true,
    compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.ESNext}
  });
  assert.equal(r.diagnostics?.length??0,0,JSON.stringify(r.diagnostics?.map(d=>d.messageText)));
});
