import test from "node:test";
import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import { readdir, readFile, mkdir } from "node:fs/promises";
import path from "node:path";
import mariadb from "mariadb";
import { format } from "node:util";
import { loadServerTypescript } from "./helpers/load-typescript.mjs";

const enabled = process.env.ELB_SITE_RELEASE_TEST_DATABASE === "true";
if (enabled) {
  const target = new URL(process.env.DATABASE_URL || "missing:");
  if (target.protocol !== "mysql:" || !["127.0.0.1", "localhost", "[::1]"].includes(target.hostname) || !/^elb_site_release_test_[a-z0-9_]+$/.test(target.pathname.slice(1))) throw new Error("Recovery tests refuse an unguarded database.");
}

test("password recovery real mail capture, auth tokens, transactions and sessions", { skip: !enabled }, async t => {
  loadServerTypescript();
  const { auth } = await import("../src/lib/auth.ts");
  const { prisma } = await import("../src/lib/prisma.ts");
  const { hashPassword, verifyPassword } = await import("better-auth/crypto");
  const origin = process.env.BETTER_AUTH_URL;
  assert.ok(origin, "runner configures an explicit auth origin");
  const capture = path.resolve(process.env.PASSWORD_RESET_CAPTURE_DIR || ".scratch/site-release/mail");
  process.env.PASSWORD_RESET_CAPTURE_DIR = capture;
  await mkdir(capture, { recursive: true });
  const oldPassword = "OriginalPass!123";
  const nextPassword = "UpdatedPass!456";
  let address = 30;
  async function request(endpoint, body, ip = `127.0.0.${address++}`) {
    return auth.handler(new Request(`${origin}/api/auth${endpoint}`, { method: "POST", headers: { "content-type": "application/json", origin, "x-forwarded-for": ip }, body: JSON.stringify(body) }));
  }
  async function fixture() {
    const id = `recovery-${randomUUID()}`;
    const email = `${id}@example.test`;
    await prisma.user.create({ data: { id, name: "Synthetic recovery citizen", email, role: "CITIZEN", identityStatus: "SUBMISSION_REQUIRED" } });
    await prisma.account.create({ data: { id: randomUUID(), accountId: id, providerId: "credential", userId: id, password: await hashPassword(oldPassword) } });
    const signedIn = await request("/sign-in/email", { email, password: oldPassword });
    assert.equal(signedIn.status, 200, "synthetic fixture has an authenticated limited session");
    return { id, email };
  }
  async function tokenFor(user) {
    const before = new Set(await readdir(capture));
    const response = await request("/request-password-reset", { email: user.email, redirectTo: "/reset-password" });
    assert.equal(response.status, 200);
    const files = (await readdir(capture)).filter(name => !before.has(name));
    const messages = await Promise.all(files.map(async name => JSON.parse(await readFile(path.join(capture, name), "utf8"))));
    const message = messages.find(item => item.to === user.email);
    assert.ok(message, "a real captured message was written by the transport");
    const url = new URL(message.url);
    assert.equal(url.pathname, "/reset-password");
    assert.equal(url.search, "");
    const token = new URLSearchParams(url.hash.slice(1)).get("token");
    assert.ok(token);
    return { token, response: await response.json() };
  }
  async function matches(user, password) {
    const account = await prisma.account.findFirstOrThrow({ where: { userId: user.id, providerId: "credential" } });
    return verifyPassword({ password, hash: account.password });
  }
  try {
    await t.test("registered and unregistered requests have identical public responses", async () => {
      const user = await fixture();
      const known = await tokenFor(user);
      const before = await readdir(capture);
      const unknown = await request("/request-password-reset", { email: `absent-${randomUUID()}@example.test` });
      assert.equal(unknown.status, 200);
      assert.deepEqual(await unknown.json(), known.response);
      assert.deepEqual(await readdir(capture), before, "unregistered addresses produce no captured mail");
      assert.equal(JSON.stringify(known.response).includes(known.token), false);
      assert.equal(JSON.stringify(known.response).includes("SUBMISSION_REQUIRED"), false);
      for (const redirectTo of ["https://outside.example/reset-password", "/admin", `${origin}/reset-password?next=/admin`]) {
        const denied = await request("/request-password-reset", { email: user.email, redirectTo });
        assert.ok([400, 403].includes(denied.status), "untrusted redirect denied by origin middleware or fixed-destination hook");
      }
    });
    await t.test("reset policy rejects weak passwords without spending the token", async () => {
      const user = await fixture();
      const { token } = await tokenFor(user);
      for (const newPassword of ["Short1!", "alllowercase123!", "ALLUPPERCASE123!", "NoSymbols123456"]) {
        const denied = await request("/reset-password", { token, newPassword });
        assert.equal(denied.status, 400);
        assert.equal(await matches(user, oldPassword), true);
        assert.equal(await prisma.verification.count({ where: { identifier: `reset-password:${token}` } }), 1);
      }
      const reset = await request("/reset-password", { token, newPassword: nextPassword });
      assert.equal(reset.status, 200);
    });
    await t.test("expiry, successful reset, reuse and concurrent reset preserve identity state", async () => {
      const user = await fixture();
      const snapshot = await prisma.user.findUniqueOrThrow({ where: { id: user.id }, select: { role: true, identityStatus: true, emailVerified: true } });
      const expired = randomBytes(24).toString("base64url");
      await prisma.verification.create({ data: { id: randomUUID(), identifier: `reset-password:${expired}`, value: user.id, expiresAt: new Date(Date.now() - 1000) } });
      assert.equal((await request("/reset-password", { token: expired, newPassword: nextPassword })).status, 400);
      assert.equal(await matches(user, oldPassword), true);
      const { token } = await tokenFor(user);
      assert.ok(await prisma.session.count({ where: { userId: user.id } }) > 0);
      const results = await Promise.all([request("/reset-password", { token, newPassword: nextPassword }), request("/reset-password", { token, newPassword: "ConcurrentPass!789" })]);
      assert.equal(results.filter(item => item.status === 200).length, 1, "one concurrent reset wins");
      assert.equal(await prisma.session.count({ where: { userId: user.id } }), 0, "all previous sessions revoked");
      assert.equal(await prisma.verification.count({ where: { identifier: `reset-password:${token}` } }), 0, "token consumed");
      assert.equal((await request("/reset-password", { token, newPassword: "ReuseDenied!123" })).status, 400);
      assert.deepEqual(await prisma.user.findUniqueOrThrow({ where: { id: user.id }, select: { role: true, identityStatus: true, emailVerified: true } }), snapshot);
    });
    await t.test("a failed password write rolls token and session revocation back, then permits retry", async () => {
      const user = await fixture();
      const { token } = await tokenFor(user);
      const trigger = `reset_failure_${randomBytes(6).toString("hex")}`;
      const sessionCount = await prisma.session.count({ where: { userId: user.id } });
      // Trigger is limited to this synthetic account in the guarded disposable schema.
      const database = new URL(process.env.DATABASE_URL);
      const ddl = await mariadb.createConnection({ host: database.hostname, port: Number(database.port || 3306), user: decodeURIComponent(database.username), password: decodeURIComponent(database.password), database: database.pathname.slice(1) });
      await ddl.query(`CREATE TRIGGER \`${trigger}\` BEFORE UPDATE ON \`account\` FOR EACH ROW BEGIN IF NEW.userId = '${user.id}' THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Synthetic password-write failure'; END IF; END`);
      try {
        const diagnostics = [];
        const priorError = console.error;
        let denied;
        try {
          console.error = (...args) => diagnostics.push(format(...args));
          denied = await request("/reset-password", { token, newPassword: nextPassword });
        } finally { console.error = priorError; }
        assert.equal(denied.status, 500);
        assert.equal(diagnostics.some(line => line.includes(token) || line.includes(nextPassword) || line.includes("PrismaClient") || line.includes("Synthetic password-write")), false, "logs contain fixed categories rather than token/password/Prisma payloads");
        assert.equal(await matches(user, oldPassword), true);
        assert.equal(await prisma.session.count({ where: { userId: user.id } }), sessionCount);
        assert.equal(await prisma.verification.count({ where: { identifier: `reset-password:${token}` } }), 1);
      } finally { await ddl.query(`DROP TRIGGER \`${trigger}\``); await ddl.end(); }
      assert.equal((await request("/reset-password", { token, newPassword: nextPassword })).status, 200);
      assert.equal(await matches(user, nextPassword), true);
      assert.equal(await prisma.session.count({ where: { userId: user.id } }), 0);
    });
    await t.test("delivery failures remain generic and invalidate only the undelivered token", async () => {
      const user = await fixture();
      const old = await tokenFor(user);
      const savedCapture = process.env.PASSWORD_RESET_CAPTURE_DIR;
      process.env.PASSWORD_RESET_CAPTURE_DIR = path.resolve("outside-capture-not-allowed");
      try {
        const failed = await request("/request-password-reset", { email: user.email });
        assert.equal(failed.status, 200);
        assert.deepEqual(await failed.json(), old.response);
        assert.equal(await prisma.verification.count({ where: { value: user.id, identifier: { startsWith: "reset-password:" } } }), 1, "only the earlier delivered token survives");
        assert.equal(await matches(user, oldPassword), true);
      } finally { process.env.PASSWORD_RESET_CAPTURE_DIR = savedCapture; }
      assert.equal((await request("/reset-password", { token: old.token, newPassword: nextPassword })).status, 200);
    });
    await t.test("recovery request limits apply across anonymous and registered addresses", async () => {
      const ip = "127.0.0.230";
      for (let attempt = 0; attempt < 3; attempt++) assert.equal((await request("/request-password-reset", { email: `limited-${attempt}@example.test` }, ip)).status, 200);
      const limited = await request("/request-password-reset", { email: "limited-fourth@example.test" }, ip);
      assert.equal(limited.status, 429);
      assert.ok(limited.headers.get("x-retry-after"));
    });
  } finally { await prisma.$disconnect(); }
});
