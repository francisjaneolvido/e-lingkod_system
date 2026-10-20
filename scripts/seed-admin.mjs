/**
 * One-time LGU administrator bootstrap for E-Lingkod Bayan.
 * This intentionally does NOT run on `npm run dev`: administrator accounts
 * must only be created by someone with local access to the database.
 *
 * Requires ADMIN_EMAIL, ADMIN_PASSWORD, and optionally ADMIN_NAME in .env.
 */
import "dotenv/config";
import { randomUUID } from "node:crypto";
import { createRequire } from "node:module";
import { hashPassword } from "better-auth/crypto";

// Same MariaDB driver already used by scripts/set-admin.mjs.
const require = createRequire(import.meta.url);
const adapterRequire = createRequire(require.resolve("@prisma/adapter-mariadb"));
const { createConnection } = adapterRequire("mariadb");

const email = (process.env.ADMIN_EMAIL ?? "").trim().toLowerCase();
const password = process.env.ADMIN_PASSWORD ?? "";
const name = (process.env.ADMIN_NAME ?? "LGU Administrator").trim();

function fail(message) {
  console.error(message);
  process.exitCode = 1;
}

if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 191) {
  fail("Set a valid ADMIN_EMAIL (maximum 191 characters) in your local .env file.");
} else if (password.length < 12 || password.length > 128) {
  fail("Set ADMIN_PASSWORD to a unique password of 12–128 characters in your local .env file.");
} else if (!name || name.length > 191) {
  fail("Set ADMIN_NAME to a non-empty display name of 191 characters or less.");
} else if (!process.env.DATABASE_URL) {
  fail("DATABASE_URL is missing. Check your local .env file.");
} else {
  let connection;
  let inTransaction = false;
  try {
    const url = new URL(process.env.DATABASE_URL);
    if (url.protocol !== "mysql:" || !url.pathname.slice(1)) {
      throw new Error("InvalidMySqlUrl");
    }
    connection = await createConnection({
      host: url.hostname,
      port: Number(url.port || 3306),
      user: decodeURIComponent(url.username),
      password: decodeURIComponent(url.password),
      database: decodeURIComponent(url.pathname.slice(1)),
      connectTimeout: 10000,
    });
    await connection.beginTransaction();
    inTransaction = true;
    const existing = await connection.query("SELECT id, role FROM user WHERE LOWER(email) = ? LIMIT 1", [email]);
    if (existing.length) {
      if (existing[0].role === "ADMIN") {
        console.log("An admin with this email already exists. No account or password was changed.");
      } else {
        console.error("This email belongs to an existing Citizen. No role or password was changed. Use npm run civic:admin -- email@example.com if you intend to promote it.");
        process.exitCode = 1;
      }
      await connection.rollback();
      inTransaction = false;
    } else {
      const userId = randomUUID();
      const hashed = await hashPassword(password); // Better Auth's own login-compatible hashing
      await connection.query(
        "INSERT INTO user (id, name, email, emailVerified, role, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, NOW(3), NOW(3))",
        [userId, name, email, false, "ADMIN"],
      );
      await connection.query(
        "INSERT INTO account (id, accountId, providerId, userId, password, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, NOW(3), NOW(3))",
        [randomUUID(), userId, "credential", userId, hashed],
      );
      await connection.commit();
      inTransaction = false;
      console.log(`Admin account created: ${email}`);
      console.log("Sign in at /login, then visit /admin/reports. Remove ADMIN_PASSWORD from .env after setup.");
    }
  } catch (error) {
    if (inTransaction && connection) {
      try { await connection.rollback(); } catch { /* keep the original failure */ }
    }
    if (error instanceof Error && error.message === "InvalidMySqlUrl") {
      fail("DATABASE_URL must use a valid mysql:// URL with a database name.");
    } else {
      // Error codes are safe to display; avoid printing raw connection URLs/passwords.
      const code = error && typeof error === "object" && "code" in error ? String(error.code) : "UNKNOWN";
      const hints = {
        ECONNREFUSED: "MySQL is not running or the host/port is incorrect.",
        ETIMEDOUT: "The database did not respond. Check host, port, and firewall.",
        ER_ACCESS_DENIED_ERROR: "The MySQL username or password in DATABASE_URL is incorrect.",
        ER_BAD_DB_ERROR: "The database in DATABASE_URL does not exist.",
        ER_NO_SUCH_TABLE: "Required tables are missing. Run npx prisma migrate deploy.",
      };
      fail(`Admin setup failed (${code}). ${hints[code] ?? "Check the MySQL connection and migrations. Run npx prisma migrate status."}`);
    }
  } finally {
    if (connection) await connection.end();
  }
}
