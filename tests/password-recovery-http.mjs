// Run via the disposable runner's --timing mode against the real Next HTTP route.
// Regression caught: awaiting email provider I/O before the known-account response.
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { createHash, randomUUID } from "node:crypto";
import { loadServerTypescript } from "./helpers/load-typescript.mjs";

const database = new URL(process.env.DATABASE_URL || "missing:");
const origin = new URL(process.env.BETTER_AUTH_URL || "missing:");
const control = path.resolve(process.env.ELB_RECOVERY_PROVIDER_CONTROL_FILE || "missing");
if (process.env.ELB_SITE_RELEASE_TEST_DATABASE !== "true" || database.protocol !== "mysql:"
  || !["localhost", "127.0.0.1", "[::1]"].includes(database.hostname)
  || !/^elb_site_release_test_[a-z0-9_]+$/.test(database.pathname.slice(1))
  || !["localhost", "127.0.0.1", "[::1]"].includes(origin.hostname)
  || !control.startsWith(path.resolve(".scratch/site-release") + path.sep)) {
  throw new Error("Recovery HTTP timing checks require a guarded disposable runner.");
}
loadServerTypescript();
const { prisma } = await import("../src/lib/prisma.ts");
await fs.mkdir(path.dirname(control), { recursive: true });
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
// Comparing digests keeps private fixture fields out of assertion diagnostics.
const digest = value => createHash("sha256").update(JSON.stringify(value)).digest("hex");
async function until(predicate, message, timeout = 15000) {
  const deadline = Date.now() + timeout;
  while (!(await predicate())) {
    assert.ok(Date.now() < deadline, message);
    await delay(20);
  }
}
async function exists(file) { try { await fs.access(file); return true; } catch (error) { if (error.code === "ENOENT") return false; throw error; } }
let ip = 170;
async function request(email) {
  const response = await fetch(new URL("/api/auth/request-password-reset", origin), {
    method: "POST", headers: { "content-type": "application/json", origin: origin.origin, "x-forwarded-for": `127.0.0.${ip++}` },
    body: JSON.stringify({ email, redirectTo: "/reset-password" }), signal: AbortSignal.timeout(20000),
  });
  return { status: response.status, body: await response.json() };
}

const observations = [];
try {
  await until(async () => { try { return (await fetch(new URL("/api/auth/ok", origin))).ok; } catch { return false; } }, "Next HTTP server became ready", 120000);
  const unknown = await request("browser.absent@example.test");
  assert.equal(unknown.status, 200);
  const user = await prisma.user.findUniqueOrThrow({ where: { email: "browser.pending@example.test" } });
  const originalAccounts = digest(await prisma.account.findMany({ where: { userId: user.id } }));
  const originalSessions = digest(await prisma.session.findMany({ where: { userId: user.id } }));
  const originalUser = digest(await prisma.user.findUniqueOrThrow({ where: { id: user.id } }));
  const resetCount = () => prisma.verification.count({ where: { value: user.id, identifier: { startsWith: "reset-password:" } } });
  const resetRows = () => prisma.verification.findMany({ where: { value: user.id, identifier: { startsWith: "reset-password:" } }, orderBy: { id: "asc" } });
  let expectedTokens = await resetCount();

  for (const result of ["success", "failure"]) {
    const earlierTokens = digest(await resetRows());
    const id = randomUUID();
    const prefix = path.join(path.dirname(control), id);
    await fs.writeFile(control, JSON.stringify({ id, result }));
    let received = false;
    const pending = request(user.email).then(value => { received = true; return value; });
    // Attach rejection immediately so a failed setup cannot cause an unhandled rejection.
    pending.catch(() => {});
    let beforeRelease;
    try {
      await until(() => exists(prefix + ".started"), "real transport entered the controlled provider");
      assert.equal(await resetCount(), expectedTokens + 1, "reset token exists before the held transport completes");
      beforeRelease = await Promise.race([pending.then(() => true), delay(2000).then(() => false)]);
      assert.equal(await exists(prefix + ".release"), false, "provider remained explicitly held during response observation");
      observations.push({ providerResult: result, responseBeforeProviderRelease: beforeRelease, responseReceived: received });
    } finally {
      await fs.writeFile(prefix + ".release", "release");
    }
    const response = await pending;
    assert.ok(digest(response) === digest(unknown), "known/unknown and provider success/failure share the same public HTTP result");
    await until(() => exists(prefix + ".finished"), "controlled provider completed");
    if (result === "success") expectedTokens++;
    await until(async () => await resetCount() === expectedTokens, "delivery failure removed only the newly undelivered token");
    if (result === "failure") assert.ok(digest(await resetRows()) === earlierTokens, "earlier delivered tokens remain exactly unchanged after failed delivery");
    assert.ok(digest(await prisma.user.findUniqueOrThrow({ where: { id: user.id } })) === originalUser, "recovery keeps role and review state");
    assert.ok(digest(await prisma.account.findMany({ where: { userId: user.id } })) === originalAccounts, "recovery keeps the existing password");
    assert.ok(digest(await prisma.session.findMany({ where: { userId: user.id } })) === originalSessions, "recovery request keeps current sessions");
  }
  await fs.writeFile(path.join(path.dirname(control), "timing-results.json"), JSON.stringify({ observations, genericResponses: true, failureCleanup: true }, null, 2));
  console.log(JSON.stringify({ recoveryHttpTiming: observations }));
  assert.ok(observations.every(item => item.responseBeforeProviderRelease), "known-account HTTP response must complete while the email provider is still held (both success and failure)");
  console.log("PASS: real Next HTTP recovery responses do not wait for held email provider; failure cleanup preserved existing state.");
} finally {
  await prisma.$disconnect();
}
