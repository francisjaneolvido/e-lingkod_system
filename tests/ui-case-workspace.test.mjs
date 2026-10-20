import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const read = (p) => readFileSync(new URL('../'+p,import.meta.url),'utf8');

test('case actions use mutually exclusive accessible sections instead of stacked long forms',()=>{
 const source=read('src/features/civic/components/case-action-workspace.tsx');
 assert.match(source,/role="tablist"/);
 assert.match(source,/role="tabpanel"/);
 assert.match(source,/hidden=\{selected !== "update"\}/);
 assert.match(source,/hidden=\{selected !== "proof"\}/);
});
test('pending verification opens proof approval by default',()=>{
 const source=read('src/features/civic/components/case-action-workspace.tsx');
 assert.match(source,/needsReview \|\| \(isAssignedOfficer && report.status === "IN_PROGRESS"\)/);
});
test('case form and proof form contain persistent visible action bars',()=>{
 const css=read('src/features/civic/civic.module.css');
 const update=read('src/features/civic/components/admin-update-form.tsx');
 const approval=read('src/features/civic/components/resolution-workflow.tsx');
 assert.match(css,/\.caseSaveBar\s*\{\s*position:fixed;/);
 assert.match(css,/\.caseDecisionBar\{position:fixed;/);
 assert.match(update,/s\.caseSaveBar/);
 assert.match(approval,/s\.caseSaveBar/);
 assert.match(approval,/s\.caseDecisionBar/);
});
test('proof upload rejects oversized and unsupported images before submit',()=>{
 const source=read('src/features/civic/components/resolution-workflow.tsx');
 assert.match(source,/selected.length > 3/);
 assert.match(source,/3 \* 1024 \* 1024/);
 assert.match(source,/image\/webp/);
});
test('report trail belongs in main detail panel; LGU actions share a workspace',()=>{
 const source=read('src/features/civic/components/report-detail.tsx');
 assert.match(source,/<CaseActionWorkspace report=\{report\}/);
 assert.match(source,/<ReportTimeline updates=\{report.updates\} admin=\{admin\} embedded/);
});
