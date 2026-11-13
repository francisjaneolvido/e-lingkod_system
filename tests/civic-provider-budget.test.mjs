import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import ts from "typescript";
import { createRequire } from "node:module";
const load = createRequire(import.meta.url);
load.extensions[".ts"] = (module, path) => module._compile(ts.transpileModule(fs.readFileSync(path,"utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, path);
const { providerBucket, providerLimit } = load("../src/features/civic/provider-budget-policy.ts");
test("provider budget keys isolate users, operations and hour windows", () => {
  const now = Date.UTC(2026,10,13,12,15);
  assert.equal(providerBucket("user1", "AI_PREVIEW", now), providerBucket("user1", "AI_PREVIEW", now + 10 * 60_000));
  assert.notEqual(providerBucket("user1", "AI_PREVIEW", now), providerBucket("user1", "AI_PREVIEW", now + 60 * 60_000));
  assert.notEqual(providerBucket("user1", "AI_PREVIEW", now), providerBucket("user2", "AI_PREVIEW", now));
  assert.notEqual(providerBucket("user1", "AI_PREVIEW", now), providerBucket("user1", "AI_SUBMIT", now));
  assert.equal(providerLimit("AI_PREVIEW"), 18);
  assert.equal(providerLimit("AI_SUBMIT"), 30);
  assert.equal(providerLimit("GEOCODE"), 30);
});
