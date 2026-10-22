/**
 * Explicit local-only demo login bootstrap (Admin + Staff + Citizen).
 *
 * This does NOT run during installation or app startup. It does not delete data,
 * promote existing users, overwrite passwords, or fabricate staff invitations.
 * Seed credentials live only in the developer's private .env file.
 */
import "dotenv/config";
import { randomUUID } from "node:crypto";
import { createRequire } from "node:module";
import { hashPassword } from "better-auth/crypto";

const require = createRequire(import.meta.url);
const adapterRequire = createRequire(require.resolve("@prisma/adapter-mariadb"));
const { createConnection } = adapterRequire("mariadb");

const DEMO_MODULE_KEYS = new Set([
  "REPORTS", "SERVICES", "EMERGENCY", "PROJECTS", "JOBS", "CENSUS", "COMMUNITY_DATA",
]);
const defaultStaffModules = ["REPORTS", "SERVICES", "JOBS", "COMMUNITY_DATA"];

function requiredValue(key, fallback) {
  const value = (process.env[key] ?? fallback ?? "").trim();
  if (!value) throw new Error(`${key} is required in your private .env file.`);
  return value;
}
function validEmail(key) {
  const value = requiredValue(key).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) || value.length > 191) {
    throw new Error(`${key} must be a valid email (maximum 191 characters).`);
  }
  return value;
}
function validPassword(key) {
  // Better Auth is configured for 12-128 characters in src/lib/auth.ts.
  const value = process.env[key] ?? "";
  if (value.length < 12 || value.length > 128 || /[\x00-\x1f\x7f]/.test(value)) {
    throw new Error(`${key} must be 12-128 characters without control characters.`);
  }
  return value;
}
function boundedValue(key, max, fallback) {
  const value = requiredValue(key, fallback);
  if (value.length > max) throw new Error(`${key} exceeds ${max} characters.`);
  return value;
}
function modulesFromEnv() {
  const raw = process.env.DEMO_STAFF_MODULES?.trim();
  const keys = raw ? raw.split(",").map(v => v.trim().toUpperCase()) : defaultStaffModules;
  if (!keys.length || keys.some(v => !DEMO_MODULE_KEYS.has(v)) || new Set(keys).size !== keys.length) {
    throw new Error("DEMO_STAFF_MODULES contains an invalid or duplicate module key.");
  }
  return keys;
}

async function main() {
  const databaseUrl = requiredValue("DATABASE_URL");
  const url = new URL(databaseUrl);
  const database = decodeURIComponent(url.pathname.slice(1));
  if (url.protocol !== "mysql:" || !/^[a-zA-Z0-9_]+$/.test(database)) {
    throw new Error("DATABASE_URL must point to a named MySQL/MariaDB database.");
  }
  if (!["127.0.0.1", "localhost", "[::1]"].includes(url.hostname) || process.env.NODE_ENV === "production") {
    throw new Error("Demo seeding is limited to a local, non-production database.");
  }
  const modules = modulesFromEnv();
  const users = [
    {
      role: "ADMIN",
      email: validEmail("ADMIN_EMAIL"), password: validPassword("ADMIN_PASSWORD"),
      name: boundedValue("ADMIN_NAME", 191, "LGU Administrator"),
    },
    {
      role: "STAFF",
      email: validEmail("STAFF_EMAIL"), password: validPassword("STAFF_PASSWORD"),
      name: boundedValue("STAFF_NAME", 191, "LGU Demo Staff"),
      department: boundedValue("STAFF_DEPARTMENT", 120, "Business Permits and Licensing Office (BPLO)"),
      designation: boundedValue("STAFF_DESIGNATION", 120, "LGU Staff"),
    },
    {
      role: "CITIZEN",
      email: validEmail("CITIZEN_EMAIL"), password: validPassword("CITIZEN_PASSWORD"),
      name: boundedValue("CITIZEN_NAME", 191, "Demo Citizen"),
    },
  ];
  if (new Set(users.map(user => user.email)).size !== users.length) {
    throw new Error("Admin, Staff and Citizen must use different emails.");
  }

  let conn;
  let inTransaction = false;
  try {
    conn = await createConnection({
      host: url.hostname,
      port: Number(url.port || 3306),
      user: decodeURIComponent(url.username),
      password: decodeURIComponent(url.password),
      database,
      connectTimeout: 10000,
    });
    await conn.beginTransaction();
    inTransaction = true;
    const messages = [];
    for (const user of users) {
      const existing = await conn.query(
        "SELECT id, role FROM user WHERE LOWER(email) = ? LIMIT 1 FOR UPDATE", [user.email],
      );
      if (existing.length) {
        if (existing[0].role !== user.role) {
          throw new Error(`${user.role}: ${user.email} already belongs to role ${existing[0].role}. No existing roles were changed.`);
        }
        const credentials = await conn.query(
          "SELECT id FROM account WHERE userId = ? AND providerId = 'credential' AND password IS NOT NULL LIMIT 1",
          [existing[0].id],
        );
        if (!credentials.length) {
          throw new Error(`${user.role}: ${user.email} has no password-based login. Existing account was not modified.`);
        }
        messages.push(`${user.role}: already exists (${user.email}); password and permissions left unchanged`);
        continue;
      }
      const id = randomUUID();
      const passwordHash = await hashPassword(user.password);
      await conn.query(
        "INSERT INTO user (id, name, email, emailVerified, role, department, designation, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, NOW(3), NOW(3))",
        [id, user.name, user.email, false, user.role, user.department ?? null, user.designation ?? null],
      );
      await conn.query(
        "INSERT INTO account (id, accountId, providerId, userId, password, createdAt, updatedAt) VALUES (?, ?, 'credential', ?, ?, NOW(3), NOW(3))",
        [randomUUID(), id, id, passwordHash],
      );
      if (user.role === "STAFF") {
        for (const module of modules) {
          await conn.query(
            "INSERT INTO staff_permission (id, userId, module, grantedAt) VALUES (?, ?, ?, NOW(3))",
            [randomUUID(), id, module],
          );
        }
      }
      messages.push(`${user.role}: created (${user.email})`);
    }
    await conn.commit();
    inTransaction = false;
    console.log(`Demo accounts ready in local database '${database}'.`);
    for (const line of messages) console.log(` - ${line}`);
    console.log(`New staff access modules: ${modules.join(", ")}`);
    console.log("Sign in at /login. No data tables, migrations, reports or other records were deleted.");
  } catch (error) {
    if (inTransaction && conn) {
      try { await conn.rollback(); } catch { /* keep original error */ }
    }
    if (error?.code === "ER_NO_SUCH_TABLE") {
      throw new Error("Required tables are missing. Run npm run db:migrate before demo seeding.");
    }
    throw error;
  } finally {
    if (conn) await conn.end();
  }
}

try { await main(); }
catch (error) {
  const message = error instanceof Error ? error.message : "Unexpected seeding error.";
  // Some driver errors can contain connection details. Do not print raw driver stack traces.
  if (error && typeof error === "object" && "code" in error) {
    console.error(`Demo seeding failed (${String(error.code)}). Check local DB connection and migrations.`);
  } else if (!message.includes("DATABASE_URL") && !message.includes("mysql://")) {
    console.error(message);
  } else {
    console.error("Check your local DATABASE_URL and required seed variables.");
  }
  process.exitCode = 1;
}
