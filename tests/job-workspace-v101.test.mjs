import {test} from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import ts from "typescript";

const read=(f)=>fs.readFileSync(f,"utf8");
const editor=read("src/features/jobs/components/opportunity-editor.tsx");
const list=read("src/features/jobs/components/job-console.tsx");
const create=read("src/app/admin/jobs/new/page.tsx");
const edit=read("src/app/admin/jobs/[id]/edit/page.tsx");
const css=read("src/features/jobs/components/jobs-workspace.css");
const types=read("src/features/jobs/components/job-types.ts");
const legacySpes=read("src/app/admin/jobs/legacy-spes/page.tsx");

test("new and edit routes enforce server-side JOBS permission",()=>{
 assert.match(create,/requireModulePage\("\/admin\/jobs\/new","JOBS"\)/);
 assert.match(edit,/requireModulePage\("\/admin\/jobs","JOBS"\)/);
 assert.match(edit,/prisma\.jobOpportunity\.findFirst/);
 assert.match(edit,/if\(!row\)notFound\(\)/);
});
test("creation and editing use existing verified server APIs",()=>{
 assert.match(editor,/path:['"]\/api\/admin\/jobs['"]/);
 assert.match(editor,/`\/api\/admin\/jobs\/\$\{record\.current\.id\}`/);
 assert.match(editor,/sendPreparedVacancy\(prepared\)/);
 assert.match(editor,/action:["\']EDIT["\']/);
 assert.match(editor,/router\.push\("\/admin\/jobs\?updated=1"\)/);
});
test("list no longer renders lengthy inline editor or duplicate save buttons",()=>{
 assert.doesNotMatch(list,/setOpen\(|Save draft/);
 assert.match(list,/jobs-review-card/);
 assert.match(list,/href="\/admin\/jobs\/new"/);
 assert.match(list,/\/admin\/jobs\/\$\{encodeURIComponent\(job\.id\)\}\/edit/);
 assert.match(list,/Filter by status/);
 assert.match(list,/Filter by sector/);
 assert.match(list,/Filter by work type/);
});
test("single sticky editor save bar; navigation guard protects unsaved forms",()=>{
 assert.equal((editor.match(/type="submit"/g)||[]).length,1);
 assert.match(css,/\.jobs-editor-actions\{position:sticky;top:77px/);
 assert.match(editor,/beforeunload/);
 assert.match(editor,/document\.addEventListener\("click",blockNavigation,true\)/);
 assert.match(editor,/disabled=\{busy\|\|form\.skills\.length===0\}/);
});
test("desktop tables and mobile cards share the same list and statuses",()=>{
 assert.match(list,/jobs-desktop-table/);
 assert.match(list,/jobs-mobile-list/);
 assert.match(css,/@media\(max-width:800px\)/);
 assert.match(types,/"EXPIRED"/);
 assert.match(list,/asOf:string/);
});
test("SPES and insight modules retain private aggregate workflow",()=>{
 const importer=fs.readFileSync("src/features/jobs/components/spes-import-workspace.tsx","utf8");
 const insights=fs.readFileSync("src/features/jobs/components/spes-insights.tsx","utf8");
 assert.match(importer,/\/api\/admin\/jobs\/import/);
 assert.doesNotMatch(list,/SPES survey import/);
 assert.match(legacySpes,/SpesImportWorkspace/);
 assert.match(legacySpes,/legacySpesImportData/);
 assert.match(legacySpes,/CENSUS/);
 assert.doesNotMatch(legacySpes,/SpesInsights/);
 const jobsData=fs.readFileSync("src/features/jobs/server/data.ts","utf8");
 const consoleData=jobsData.slice(jobsData.indexOf("export async function adminJobData"),jobsData.indexOf("export async function profileForCitizen"));
 assert.doesNotMatch(consoleData,/spesSurveyRecord|totalSurveys|insights/);
 assert.match(insights,/opportunitySignals/);
 assert.match(insights,/topSkills/);
 assert.match(importer,/Never upload names, emails, phone numbers/);
 assert.ok(fs.existsSync("public/demo-data/spes-demo-consented.csv"));
});
test("all V10.1 TypeScript/TSX files parse without syntax errors",()=>{
 const files=["src/features/jobs/components/job-console.tsx","src/features/jobs/components/opportunity-editor.tsx","src/features/jobs/components/job-types.ts","src/app/admin/jobs/page.tsx","src/app/admin/jobs/new/page.tsx","src/app/admin/jobs/[id]/edit/page.tsx"];
 for(const file of files){const input=read(file);const output=ts.transpileModule(input,{fileName:file,reportDiagnostics:true,compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.ESNext}});assert.equal(output.diagnostics?.length||0,0,`${file}: ${output.diagnostics?.map(d=>d.messageText).join("; ")}`);}
});
