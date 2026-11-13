import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import ts from "typescript";
import vm from "node:vm";
import { createRequire } from "node:module";
const load = createRequire(import.meta.url);
load.extensions[".ts"] = (module, path) => module._compile(ts.transpileModule(fs.readFileSync(path,"utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, path);
const policy = load("../src/features/civic/evidence-policy.ts");
const config = load("../src/features/civic/config.ts");
const source = ts.transpileModule(fs.readFileSync(new URL("../src/features/civic/server/evidence.ts", import.meta.url), "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
function adapter(fetchImpl) {
  const compiled = { exports: {} };
  const require = name => ({ "server-only": {}, sharp: {}, "../config": config, "../evidence-policy": policy, "../validation": { CivicError: class CivicError extends Error { constructor(message, status = 400) { super(message); this.status = status; } } } })[name];
  vm.runInNewContext(source, { module: compiled, exports: compiled.exports, require, fetch: fetchImpl, process: { env: { OPENAI_API_KEY: "test-key" } }, Buffer, setTimeout, clearTimeout, AbortController, Date });
  return compiled.exports.analyzeEvidence;
}
const output = result => ({ ok: true, json: async () => result });
const modelResult = data => output({ status: "completed", output: [{ content: [{ type: "output_text", text: JSON.stringify(data) }] }] });
test("safe category-relevant photo is checked by moderation and vision", async () => {
  const calls = [];
  const analyze = adapter(async (url, options) => { calls.push([url, JSON.parse(options.body)]); return url.endsWith("/moderations") ? output({ results: [{ flagged: false }] }) : modelResult({ relevant: true, safe: true, score: .91, observations: "Damaged roadway", feedback: "Road damage visible." }); });
  const result = await analyze(new Uint8Array([1,2,3]), "ROADS_DRAINAGE", "Pothole", "Deep pothole on the roadway");
  assert.equal(result.status, "ACCEPTED");
  assert.match(calls[1][1].input[0].content[0].text, /Deep pothole/);
  assert.equal(calls[1][1].store, false);
});
test("flagged content and mismatched categories never produce accepted evidence", async () => {
  let calls = 0;
  const flagged = adapter(async () => { calls++; return output({ results: [{ flagged: true }] }); });
  assert.equal((await flagged(new Uint8Array([1]), "WASTE_SANITATION", "Garbage", "Garbage outside the hall")).status, "REJECTED");
  assert.equal(calls, 1);
  const mismatch = adapter(async url => url.endsWith("/moderations") ? output({ results: [{ flagged: false }] }) : modelResult({ relevant: false, safe: true, score: .1, observations: "A meal", feedback: "Please photograph the reported garbage." }));
  assert.equal((await mismatch(new Uint8Array([1]), "WASTE_SANITATION", "Garbage", "Garbage outside the hall")).status, "REJECTED");
});
test("moderation outage, refusal, and malformed vision response fail closed", async () => {
  const outage = adapter(async () => ({ ok: false }));
  await assert.rejects(outage(new Uint8Array([1]), "OTHER", "Problem", "Problem description"), error => error.status === 503);
  const refusal = adapter(async url => url.endsWith("/moderations") ? output({ results: [{ flagged: false }] }) : output({ status: "incomplete", output: [] }));
  await assert.rejects(refusal(new Uint8Array([1]), "OTHER", "Problem", "Problem description"), error => error.status === 503);
});
