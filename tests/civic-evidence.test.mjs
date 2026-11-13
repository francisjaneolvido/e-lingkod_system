import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import ts from "typescript";
import { createRequire } from "node:module";
const load = createRequire(import.meta.url);
load.extensions[".ts"] = (module, path) => module._compile(ts.transpileModule(fs.readFileSync(path,"utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, path);
const { evidenceContext, parseEvidenceResponse } = load("../src/features/civic/evidence-policy.ts");

test("the actual selected category and specific concern guide validation", () => {
  assert.match(evidenceContext("ROADS_DRAINAGE", "Flooded canal", "Water covers the road"), /flood/i);
  assert.match(evidenceContext("WASTE_SANITATION", "Dumped bags", "Garbage beside the river"), /garbage/i);
  assert.throws(() => evidenceContext("UNKNOWN", "Title", "Description"));
});
test("only visible relevant safe evidence with adequate score is accepted", () => {
  const valid = { relevant: true, safe: true, score: 0.88, observations: "Overflowing roadside bin", feedback: "Visible garbage supports the concern." };
  assert.equal(parseEvidenceResponse(valid).status, "ACCEPTED");
  assert.equal(parseEvidenceResponse({ ...valid, score: 0.4 }).status, "UNCERTAIN");
  assert.equal(parseEvidenceResponse({ ...valid, relevant: false }).status, "REJECTED");
  assert.equal(parseEvidenceResponse({ ...valid, safe: false }).status, "REJECTED");
});
test("missing, malformed and invented model results never approve evidence", () => {
  for (const response of [null, {}, { relevant: true, safe: true, score: 1, observations: "", feedback: "yes" }, { relevant: true, safe: true, score: 100, observations: "bin", feedback: "yes" }]) {
    assert.throws(() => parseEvidenceResponse(response));
  }
});
