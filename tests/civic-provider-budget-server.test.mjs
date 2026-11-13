import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import ts from "typescript";
import vm from "node:vm";
import { createRequire } from "node:module";
const load = createRequire(import.meta.url);
load.extensions[".ts"] = (module, path) => module._compile(ts.transpileModule(fs.readFileSync(path,"utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, path);
const policy = load("../src/features/civic/provider-budget-policy.ts");
const source = ts.transpileModule(fs.readFileSync(new URL("../src/features/civic/server/provider-budget.ts", import.meta.url), "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
function budget() {
  const counts = new Map();
  const prisma = { rateLimit: { upsert: async ({ where, create, update }) => {
    const count = (counts.get(where.key) || 0) + (counts.has(where.key) ? update.count.increment : create.count);
    counts.set(where.key, count); return { count };
  }, deleteMany: async () => ({ count: 0 }) } };
  const compiled = { exports: {} };
  const require = name => ({ "server-only": {}, "node:crypto": { randomUUID: () => "uuid" }, "@/lib/prisma": { prisma }, "../provider-budget-policy": policy, "../validation": { CivicError: class CivicError extends Error { constructor(message, status = 400) { super(message); this.status = status; } } } })[name];
  vm.runInNewContext(source, { module: compiled, exports: compiled.exports, require, Date, BigInt, Math: Object.assign(Object.create(Math), { random: () => 1 }), Promise });
  return compiled.exports.consumeProviderBudget;
}
test("attempted photos consume preview budget even after reaching the limit", async () => {
  const consume = budget();
  for (let i = 0; i < 6; i++) await consume("citizen-one", "AI_PREVIEW", 3);
  await assert.rejects(consume("citizen-one", "AI_PREVIEW", 1), error => error.status === 429);
  await consume("citizen-one", "AI_SUBMIT", 3);
  await consume("citizen-two", "AI_PREVIEW", 3);
});
test("address lookups share a global short-window allowance", async () => {
  const consume = budget();
  for (let i = 0; i < 4; i++) await consume(`citizen-${i}`, "GEOCODE");
  await assert.rejects(consume("citizen-fifth", "GEOCODE"), error => error.status === 429);
});
