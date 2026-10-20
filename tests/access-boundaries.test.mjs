import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import vm from "node:vm";
import ts from "typescript";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
function evaluateTypescript(file, stub = {}) {
  const content = readFileSync(path.join(root, file), "utf8");
  const compiled = ts.transpileModule(content, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText;
  const module = { exports: {} };
  vm.runInNewContext(`(function(require, module, exports){ ${compiled}\n})`, {})(name => {
    if (name === "server-only") return {};
    if (name in stub) return stub[name];
    throw new Error(`Unexpected import ${name}`);
  }, module, module.exports);
  return module.exports;
}
const { reportAdminScope, sameOffice } = evaluateTypescript("src/lib/report-scope.ts");
function normalize(value) { return JSON.parse(JSON.stringify(value)); }

test("super admin can review all municipal reports", () => {
  assert.deepEqual(normalize(reportAdminScope({ role: "ADMIN", id: "chief" })), {});
});
test("staff can access only personal or unclaimed reports in their assigned office", () => {
  const scope = normalize(reportAdminScope({ id: "officer-23", role: "STAFF", department: "MDRRMO" }));
  assert.deepEqual(scope, { assignedOffice: "MDRRMO", OR: [{ assignedStaffId: "officer-23" }, { assignedStaffId: null }] });
});
test("citizens and staff without a department cannot access municipal queues", () => {
  for (const viewer of [
    { role: "CITIZEN", id: "citizen" }, { role: "STAFF", id: "staff", department: " " }, { role: "STAFF", id: "staff", department: null },
  ]) assert.deepEqual(normalize(reportAdminScope(viewer)), { id: "__unavailable__" });
});
test("office label matching ignores surrounding whitespace and capitalization", () => {
  assert.equal(sameOffice(" MDRRMO ", "mdrrmo"), true);
  assert.equal(sameOffice("Engineering", "MDRRMO"), false);
  assert.equal(sameOffice(null, "MDRRMO"), false);
});
