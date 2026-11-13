import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import ts from "typescript";
import vm from "node:vm";
const source = ts.transpileModule(fs.readFileSync(new URL("../src/features/civic/server/mutations.ts", import.meta.url), "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
function submission(status, delay = 0) {
  let saved, analyses = 0, writes = 0;
  const report = { findUnique: async () => null, count: async () => 0, create: async ({ data }) => { writes++; saved = data; return { id: "report-1", trackingId: "ELB-2026-123456789ABC" }; } };
  const prisma = { civicReport: report };
  const CivicError = class CivicError extends Error { constructor(message, status = 400) { super(message); this.status = status; } };
  const modules = {
    "server-only": {}, "node:crypto": { randomBytes: () => Buffer.alloc(6) }, "@/lib/prisma": { prisma },
    "@/lib/staff-access": {}, "@/lib/report-scope": {}, "@/lib/work-distribution/server": {},
    "@/lib/notifications/server": { notifyAdmins: async () => {} },
    "../validation": { CivicError, parseReportForm: () => ({ category: "WASTE_SANITATION", title: "Garbage outside", description: "A pile of garbage outside the civic hall", submissionKey: "key" }) },
    "./evidence": { preparePhotos: async () => [{ data: new Uint8Array([1]), byteSize: 1, mimeType: "image/jpeg" }], analyzeEvidence: async () => { analyses++; if (delay) await new Promise(resolve => setTimeout(resolve, delay)); return { status, score: .9, observations: "A meal", feedback: "This photo does not show garbage.", validatedAt: new Date() }; } },
    "./provider-budget": { consumeProviderBudget: async () => {} },
  };
  const compiled = { exports: {} };
  vm.runInNewContext(source, { module: compiled, exports: compiled.exports, require: name => modules[name] || {}, Date, Buffer, Uint8Array, Intl });
  return { submit: compiled.exports.submitReport, saved: () => saved, analyses: () => analyses, writes: () => writes };
}
test("a forged client request cannot persist a rejected photo", async () => {
  const { submit, saved } = submission("REJECTED");
  await assert.rejects(submit(new FormData(), { id: "citizen-1", role: "CITIZEN" }), /Photo 1 rejected/);
  assert.equal(saved(), undefined);
});
test("accepted per-photo validation results are persisted with the same report", async () => {
  const { submit, saved } = submission("ACCEPTED");
  await submit(new FormData(), { id: "citizen-1", role: "CITIZEN" });
  assert.equal(saved().photos.create[0].validationStatus, "ACCEPTED");
  assert.equal(saved().photos.create[0].validationScore, .9);
});
test("concurrent retries of one submission only analyze and save once", async () => {
  const { submit, analyses, writes } = submission("ACCEPTED", 20);
  const viewer = { id: "citizen-1", role: "CITIZEN" };
  const [first, second] = await Promise.all([submit(new FormData(), viewer), submit(new FormData(), viewer)]);
  assert.equal(first.id, second.id);
  assert.equal(analyses(), 1);
  assert.equal(writes(), 1);
});
