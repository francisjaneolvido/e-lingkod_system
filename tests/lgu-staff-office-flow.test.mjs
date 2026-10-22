import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import ts from "typescript";
import vm from "node:vm";

const read = path => fs.readFileSync(path, "utf8");
const changed = [
  "src/lib/lgu-offices.ts",
  "src/components/admin/lgu-office-select.tsx",
  "src/components/admin/staff-manager.tsx",
  "src/components/admin/staff-invite-manager.tsx",
  "src/components/admin/staff-management-workspace.tsx",
  "src/features/services/components/admin-request-actions.tsx",
  "src/features/civic/components/admin-update-form.tsx",
  "src/app/api/admin/staff/route.ts",
];

test("LGU staff office patch TypeScript and TSX sources parse", () => {
  for (const filename of changed) {
    const result = ts.transpileModule(read(filename), {
      fileName: filename,
      compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
      reportDiagnostics: true,
    });
    assert.equal(result.diagnostics?.length ?? 0, 0, `${filename}: ${JSON.stringify(result.diagnostics)}`);
  }
});

function officeFunctions() {
  const source = ts.transpileModule(read("src/lib/lgu-offices.ts"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const module = { exports: {} };
  vm.runInNewContext(`(function(exports,require,module){${source}\n})`, {})(module.exports, () => ({}), module);
  return module.exports;
}

test("BPLO is a specific staff office that recommends online services access", () => {
  const { LGU_OFFICES, suggestedModulesForOffice } = officeFunctions();
  assert.ok(LGU_OFFICES.length >= 20);
  assert.ok(LGU_OFFICES.some(office => office.name === "Business Permits and Licensing Office (BPLO)"));
  assert.deepEqual([...suggestedModulesForOffice("Business Permits and Licensing Office (BPLO)")], ["SERVICES"]);
  assert.deepEqual([...suggestedModulesForOffice("Municipal Office")], []);
});

test("civic categories recommend offices but do not automatically assign staff", () => {
  const { CIVIC_OFFICE_SUGGESTIONS } = officeFunctions();
  assert.ok(CIVIC_OFFICE_SUGGESTIONS.ROADS_DRAINAGE.includes("Municipal Engineering Office (MEO)"));
  assert.ok(CIVIC_OFFICE_SUGGESTIONS.WASTE_SANITATION.includes("Municipal Environment and Natural Resources Office (MENRO)"));
  assert.ok(CIVIC_OFFICE_SUGGESTIONS.ENVIRONMENT.length > 0);
  const form = read("src/features/civic/components/admin-update-form.tsx");
  assert.match(form, /officers\.filter\(o => o\.department === office\)/);
  assert.match(form, /Super Admin|Admin must confirm/);
});

test("no eligible service staff shows actionable guidance, not an empty unexplained dropdown", () => {
  const panel = read("src/features/services/components/admin-request-actions.tsx");
  assert.match(panel, /No eligible staff for this request yet/);
  assert.match(panel, /staff\.length === 0/);
  assert.match(panel, /href="\/admin\/staff"/);
});

test("permission update prevents stranding live service requests on an ineligible officer", () => {
  const route = read("src/app/api/admin/staff/route.ts");
  assert.match(route, /servicesAccessLost/);
  assert.match(route, /serviceRequest\.count/);
  assert.match(route, /Reassign .*active Online LGU Services request/);
});

test("Admin directory, assignment and staff invitation all use the office picker", () => {
  const manager = read("src/components/admin/staff-manager.tsx");
  const invites = read("src/components/admin/staff-invite-manager.tsx");
  assert.ok(manager.match(/<LGUOfficeSelect/g)?.length === 2);
  assert.ok(manager.match(/<LGUOfficeRecommendation/g)?.length === 2);
  assert.match(invites, /<LGUOfficeSelect/);
  assert.match(invites, /<LGUOfficeRecommendation/);
  assert.match(read("src/components/admin/staff-management-workspace.tsx"), /Recommended Admin → Staff workflow/);
});
