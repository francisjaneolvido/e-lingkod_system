import "dotenv/config";
import { createRequire } from "node:module";

// Reuse the MySQL driver that is already installed with the Prisma adapter.
const require = createRequire(import.meta.url);
const adapterRequire = createRequire(require.resolve("@prisma/adapter-mariadb"));
const { createConnection } = adapterRequire("mariadb");
const args = process.argv.slice(2);
const email = args.find(argument => !argument.startsWith("--"))?.trim().toLowerCase();
const role = args.includes("--citizen") ? "CITIZEN" : "ADMIN";

if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
  console.error("Usage: node scripts/set-admin.mjs your-registered-email@example.com [--citizen]");
  process.exit(1);
}
let connection;
try {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is missing. Check your existing .env.");
  const url = new URL(process.env.DATABASE_URL);
  if (url.protocol !== "mysql:") throw new Error("DATABASE_URL must use mysql://.");
  connection = await createConnection({
    host: url.hostname, port: Number(url.port || 3306), user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password), database: decodeURIComponent(url.pathname.slice(1)), connectTimeout: 10000,
  });
  const rows = await connection.query("SELECT id FROM user WHERE LOWER(email) = ? LIMIT 1", [email]);
  if (!rows.length) throw new Error("No account found. Register this email in the website first.");
  await connection.query("UPDATE user SET role = ?, updatedAt = NOW(3) WHERE id = ?", [role, rows[0].id]);
  console.log(`Account role updated to ${role}. Refresh the website. ${role === "ADMIN" ? "Open /admin/reports." : "Staff access is now revoked."}`);
} catch (error) {
  console.error(error instanceof Error && ["DATABASE_URL is missing. Check your existing .env.", "DATABASE_URL must use mysql://.", "No account found. Register this email in the website first."].includes(error.message) ? error.message : "Could not update the account. Check that MySQL is running and your .env credentials are correct.");
  process.exitCode = 1;
} finally { if (connection) await connection.end(); }
