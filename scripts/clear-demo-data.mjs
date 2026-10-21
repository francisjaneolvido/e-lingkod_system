/**
 * Delete app records while keeping every table, constraint and Prisma migration.
 * Dry-run by default; absolutely no automatic deletion during install/dev/migration.
 * Local development databases only. Requires explicit database-name confirmation.
 */
import "dotenv/config";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const adapterRequire = createRequire(require.resolve("@prisma/adapter-mariadb"));
const { createConnection } = adapterRequire("mariadb");
const args = new Set(process.argv.slice(2));
const execute = args.has("--execute");
const acknowledge = args.has("--i-understand-data-will-be-deleted");
const confirmation = [...args].find(v=>v.startsWith("--confirm-db="))?.slice("--confirm-db=".length);

if (!process.env.DATABASE_URL) throw Error("DATABASE_URL is missing from your local .env.");
const url = new URL(process.env.DATABASE_URL);
const database = decodeURIComponent(url.pathname.slice(1));
if (url.protocol !== "mysql:" || !/^[a-zA-Z0-9_]+$/.test(database)) throw Error("Invalid MySQL URL/database name.");
if (!["127.0.0.1","localhost","[::1]"].includes(url.hostname) || process.env.NODE_ENV === "production") {
  throw Error("This script is restricted to local, non-production MySQL databases.");
}
if (execute && (!acknowledge || confirmation !== database)) {
  throw Error(`Refusing deletion. Required flags: --execute --confirm-db=${database} --i-understand-data-will-be-deleted`);
}

// Whitelist only tables corresponding to @map'd Prisma models. Never touch _prisma_migrations.
const schema = readFileSync(new URL("../prisma/schema.prisma", import.meta.url), "utf8");
const models = [...schema.matchAll(/model\s+\w+\s*\{([\s\S]*?)^\}/gm)];
const intended = new Set(models.map(match=>match[1].match(/@@map\("([\w]+)"\)/)?.[1]).filter(Boolean));
if (!intended.has("user") || !intended.has("account") || !intended.has("civic_report")) {
  throw Error("Unexpected Prisma schema. No records were touched.");
}
const connection = await createConnection({
  host:url.hostname,port:Number(url.port||3306),user:decodeURIComponent(url.username),
  password:decodeURIComponent(url.password),database,connectTimeout:10000,
});
let transactionOpen = false;
try {
  const existing = await connection.query(`SELECT TABLE_NAME AS name FROM information_schema.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_TYPE = 'BASE TABLE'`,[database]);
  const tables = new Set(existing.map(row=>row.name).filter(name=>intended.has(name)));
  if (!tables.has("user") || !tables.has("account")) throw Error("Expected auth tables were not found. Apply migrations first.");
  if (tables.size !== intended.size) throw Error("App tables are missing; apply all migrations before clearing records.");
  const foreignKeys = await connection.query(`SELECT TABLE_NAME AS child, REFERENCED_TABLE_NAME AS parent FROM information_schema.KEY_COLUMN_USAGE WHERE TABLE_SCHEMA = ? AND REFERENCED_TABLE_NAME IS NOT NULL`,[database]);
  const childrenByParent = new Map([...tables].map(name=>[name,new Set()]));
  for (const {child,parent} of foreignKeys) {
    if (tables.has(parent) && tables.has(child)) childrenByParent.get(parent).add(child);
  }
  const ordered = [], visiting = new Set(), done = new Set();
  function visit(table) {
    if (done.has(table)) return;
    if (visiting.has(table)) throw Error("Circular database references; reset aborted safely.");
    visiting.add(table);
    for (const child of childrenByParent.get(table)) visit(child);
    visiting.delete(table);done.add(table);ordered.push(table);
  }
  for (const table of tables) visit(table);
  const counts=[];
  for (const table of ordered) {
    const result = await connection.query(`SELECT COUNT(*) AS total FROM \`${table}\``);
    counts.push({table,rows:Number(result[0].total)});
  }
  console.table(counts);
  console.log(`Database: ${database} | ${tables.size} app tables | ${counts.reduce((n,v)=>n+v.rows,0)} records`);
  console.log("The _prisma_migrations table is untouched. No tables will be dropped.");
  if (!execute) {
    console.log(`DRY RUN ONLY. Back up your database first. To delete records, run:\n npm run db:clear-data -- --execute --confirm-db=${database} --i-understand-data-will-be-deleted`);
  } else {
    await connection.beginTransaction();transactionOpen=true;
    for (const table of ordered) await connection.query(`DELETE FROM \`${table}\``);
    await connection.commit();transactionOpen=false;
    console.log(`All application records cleared from ${database}; schema and migrations preserved.`);
    console.log("Re-create your admin with npm run admin:seed (ADMIN_EMAIL and ADMIN_PASSWORD required in .env).");
  }
} catch(error) {
  if (transactionOpen) {try{await connection.rollback();}catch{/* original error */}}
  throw error;
} finally { await connection.end(); }
