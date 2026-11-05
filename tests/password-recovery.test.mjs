import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync, rmSync } from "node:fs";
import path from "node:path";
import { loadServerTypescript } from "./helpers/load-typescript.mjs";

loadServerTypescript();

test("recovery applies the existing full password policy", async () => {
  assert.ok(existsSync("src/features/auth/password-recovery.ts"), "password recovery policy is implemented");
  const { isValidResetPassword } = await import("../src/features/auth/password-recovery.ts");
  for (const value of [null, "shortA1!", "alllowercase123!", "ALLUPPERCASE123!", "NoDigits!!!!!!!", "NoSymbols12345", "Aa1!".repeat(33)]) assert.equal(isValidResetPassword(value), false);
  assert.equal(isValidResetPassword("UpdatedPass!123"), true);
});

test("mail links keep tokens in fragments and reject untrusted origins", async () => {
  assert.ok(existsSync("src/features/auth/password-recovery.ts"), "password recovery links are implemented");
  const { passwordResetLink, resetDestination } = await import("../src/features/auth/password-recovery.ts");
  const link = passwordResetLink("https://example.test", "abcdefghijklmnopqrstuvwx");
  assert.equal(link, "https://example.test/reset-password#token=abcdefghijklmnopqrstuvwx");
  assert.equal(new URL(link).search, "");
  assert.equal(resetDestination("http://localhost:3105"), "http://localhost:3105/reset-password");
  for (const origin of ["https://user:pass@example.test", "https://example.test/path", "javascript:alert(1)", "http://example.test", "https://example.test?next=x", "https://example.test/#x"]) assert.throws(() => resetDestination(origin));
  assert.throws(() => passwordResetLink("https://example.test", "bad\r\ntoken"));
});

test("captured mail is guarded and produces a private message rather than a public link", async () => {
  assert.ok(existsSync("src/lib/password-reset-mail.ts"), "password recovery transport is implemented");
  const { deliverPasswordReset } = await import("../src/lib/password-reset-mail.ts");
  const saved = { ...process.env };
  const directory = path.resolve(".scratch/site-release/mail-unit-" + process.pid);
  try {
    process.env.PASSWORD_RESET_CAPTURE_DIR = directory;
    process.env.NODE_ENV = "test";
    process.env.DATABASE_URL = "mysql://test:test@127.0.0.1:3306/ordinary_database";
    process.env.ELB_SITE_RELEASE_TEST_DATABASE = "true";
    await assert.rejects(deliverPasswordReset({ email: "synthetic@example.test", token: "abcdefghijklmnopqrstuvwx", origin: "http://localhost:3105" }));
    process.env.DATABASE_URL = "mysql://test:test@127.0.0.1:3306/elb_site_release_test_unit";
    await deliverPasswordReset({ email: "synthetic@example.test", token: "abcdefghijklmnopqrstuvwx", origin: "http://localhost:3105" });
    const names = readdirSync(directory);
    assert.equal(names.length, 1);
    const message = JSON.parse(readFileSync(path.join(directory, names[0]), "utf8"));
    assert.equal(message.to, "synthetic@example.test");
    assert.equal(message.url, "http://localhost:3105/reset-password#token=abcdefghijklmnopqrstuvwx");
    assert.match(message.text, /30 minutes/);
    process.env.NODE_ENV = "production";
    await assert.rejects(deliverPasswordReset({ email: "synthetic@example.test", token: "abcdefghijklmnopqrstuvwx", origin: "http://localhost:3105" }));
  } finally {
    for (const key of Object.keys(process.env)) if (!(key in saved)) delete process.env[key];
    Object.assign(process.env, saved);
    rmSync(directory, { recursive: true, force: true });
  }
});
