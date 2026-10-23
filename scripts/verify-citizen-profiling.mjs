import { randomUUID } from "node:crypto";
import { createRequire } from "node:module";
import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import dotenv from "dotenv";
import mariadb from "mariadb";

dotenv.config({ quiet: true });
const require = createRequire(import.meta.url);
const configured = new URL(process.env.DATABASE_URL || "missing:");
if (configured.protocol !== "mysql:") throw new Error("A configured MySQL connection is required; credentials are not printed.");
const database = `elb_b1_test_${randomUUID().replaceAll("-", "")}`;
const testUrl = new URL(configured);
testUrl.pathname = `/${database}`;
const legacy = process.argv.includes("--legacy");
const connection = await mariadb.createConnection({ host: configured.hostname, port: Number(configured.port || 3306), user: decodeURIComponent(configured.username), password: decodeURIComponent(configured.password), connectTimeout: 5000, multipleStatements: true });
const env = { ...process.env, DATABASE_URL: testUrl.href, ELB_B1_TEST_DATABASE: database, ...(legacy ? { ELB_B1_LEGACY_FIXTURES: "1" } : {}) };
try {
  await connection.query(`CREATE DATABASE \`${database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
  console.log(`Isolated disposable database: ${database}; application database is not modified.`);
  if (legacy) {
    await connection.query(`USE \`${database}\``);
    for (const name of fs.readdirSync("prisma/migrations").filter(name => fs.existsSync(path.join("prisma/migrations", name, "migration.sql"))).sort()) {
      if (name === "20261023030000_citizen_profile_history") {
        for (const id of ["b1_legacy_submitted", "b1_legacy_draft", "b1_legacy_profile_only"]) await connection.query("INSERT INTO user (id,name,email,role,updatedAt) VALUES (?,?,?,'CITIZEN',?)", [id, "Legacy test fixture", id + "@example.test", new Date()]);
        const jsonFields = ["skillsJson","skillLevelsJson","trainingCategoriesJson","trainingProgramsJson","trainingBarriersJson","employmentBarriersJson","preferredOccupationsJson","businessChallengesJson","businessSupportJson","priorityProgramsJson","publicServiceBarriersJson"];
        for (const [userId, year, status, matching] of [["b1_legacy_submitted", new Date().getFullYear()-1, "SUBMITTED", true], ["b1_legacy_submitted", new Date().getFullYear(), "SUBMITTED", false], ["b1_legacy_draft", new Date().getFullYear(), "DRAFT", false]]) {
          const fields = ["id","userId","surveyYear","status","barangay","ageGroup","educationLevel","employmentStatus","consentAggregated","consentOpportunityRecommendations","updatedAt","submittedAt",...jsonFields];
          const values = [userId+year,userId,year,status,"Batong Malake","25-34","COLLEGE","EMPLOYED_FULL_TIME",true,matching,new Date(),status==="SUBMITTED"?new Date():null,...jsonFields.map(field => field==="skillsJson"?'["Data Entry"]':field==="skillLevelsJson"?"{}":"[]")];
          await connection.query("INSERT INTO community_survey ("+fields.map(field=>"`"+field+"`").join(",")+") VALUES ("+fields.map(()=>"?").join(",")+")", values);
        }
        for (const userId of ["b1_legacy_draft", "b1_legacy_profile_only"]) await connection.query("INSERT INTO jobseeker_profile (userId,skillsJson,interestsJson,education,preferredArea,availability,updatedAt) VALUES (?,?,?,?,?,?,?)", [userId,'["Data Entry"]',"[]","COLLEGE","Batong Malake","ANY",new Date()]);
      }
      await connection.query(fs.readFileSync(path.join("prisma/migrations", name, "migration.sql"), "utf8"));
    }
    console.log("Migration SQL verified with legacy submitted/draft fixtures before the additive B1 migration.");
  } else {
    const migration = spawnSync(process.execPath, [require.resolve("prisma/build/index.js"), "migrate", "deploy"], { env, stdio: "inherit" });
    if (migration.status !== 0) throw new Error("Isolated migration deployment failed.");
  }
  if (process.argv.includes("--serve")) {
    const child = spawn(process.execPath, [require.resolve("next/dist/bin/next"), "dev", "--hostname", "127.0.0.1", "--port", "3101"], { env: { ...env, ELB_NEXT_DIST_DIR: ".next-b1-test", BETTER_AUTH_URL: "http://127.0.0.1:3101" }, stdio: "inherit", windowsHide: true });
    let stopping = false;
    const stop = () => { stopping = true; if (child.pid) { if (process.platform === "win32") spawnSync("taskkill", ["/PID", String(child.pid), "/T", "/F"], { windowsHide: true, stdio: "ignore" }); else child.kill("SIGTERM"); } };
    process.stdin.resume(); process.stdin.once("data", stop); process.once("SIGINT", stop); process.once("SIGTERM", stop);
    console.log("Browser test server uses the disposable database at http://127.0.0.1:3101; send stop on stdin to clean up.");
    const code = await new Promise((resolve, reject) => { child.once("exit", resolve); child.once("error", reject); });
    if (!stopping && typeof code === "number" && code !== 0) process.exitCode = code;
    process.stdin.pause(); process.removeListener("SIGINT", stop); process.removeListener("SIGTERM", stop);
  } else {
    const result = spawnSync(process.execPath, ["--test", "tests/citizen-profile-lifecycle-b1.test.mjs"], { env, stdio: "inherit" });
    process.exitCode = result.status ?? 1;
  }
} finally {
  // Cleanup is limited to this invocation's generated disposable database.
  if (!/^elb_b1_test_[a-f0-9]{32}$/.test(database) || configured.pathname.slice(1) === database) throw new Error("Unsafe test database cleanup refused.");
  await connection.query(`DROP DATABASE IF EXISTS \`${database}\``);
  await connection.end();
}
