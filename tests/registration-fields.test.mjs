import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import vm from "node:vm";
const require = createRequire(import.meta.url);
const ts = require("typescript");
const path = "src/features/auth/registration-validation.ts";
const compiled = ts.transpileModule(readFileSync(path,"utf8"),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const module = {exports:{}};
vm.runInNewContext(`(function(module,exports){${compiled}\n})`,{})(module,module.exports);
const {checkRegistration,normalizePhilippineMobile,passwordChecks} = module.exports;
const valid = {firstName:"Juan",lastName:"Dela Cruz",middleInitial:"M.",hasNoMiddleName:false,phoneNumber:"09171234567",email:"juan@example.com",password:"StrongPass!123",confirmPassword:"StrongPass!123"};
test("valid Philippine citizen with separate names and canonical mobile number",()=>{
 const result=checkRegistration(valid);assert.equal(result.ok,true);
 assert.equal(result.data.phoneNumber,"+639171234567");assert.equal(result.data.middleInitial,"M");assert.equal(result.data.name,"Juan M. Dela Cruz");
});
test("person with no middle name can register without inventing an initial",()=>{
 const result=checkRegistration({...valid,middleInitial:"",hasNoMiddleName:true});assert.equal(result.ok,true);assert.equal(result.data.name,"Juan Dela Cruz");
});
test("single-letter names, numbers in names and fake initials are blocked",()=>{
 for(const candidate of [{firstName:"J"},{lastName:"1Diaz"},{middleInitial:"AB"},{middleInitial:"",hasNoMiddleName:false}]){
  assert.equal(checkRegistration({...valid,...candidate}).ok,false);
 }
});
test("mobile validation rejects letters and incorrect PH numbering",()=>{
 for(const phone of ["0917ABC4567","0917123456","091712345678","08171234567","+63900123ABCD"])
  assert.equal(checkRegistration({...valid,phoneNumber:phone}).ok,false);
 assert.equal(normalizePhilippineMobile("+639171234567"),"+639171234567");
 assert.equal(normalizePhilippineMobile("639171234567"),"+639171234567");
});
test("password rules require length, lowercase, uppercase, digit and symbol",()=>{
 for(const password of ["short!Aa1","alllower123!","ALLUPPER123!","NoNumber!!!!!","NoSymbol123A"])
  assert.equal(checkRegistration({...valid,password,confirmPassword:password}).ok,false);
 assert.equal(Object.values(passwordChecks(valid.password)).every(Boolean),true);
});
test("email validity and matching password are required",()=>{
 assert.equal(checkRegistration({...valid,email:"not-an-email"}).ok,false);
 assert.equal(checkRegistration({...valid,confirmPassword:"mismatch"}).ok,false);
});
test("Better Auth enforces signup validation server side and keeps role server-controlled",()=>{
 const auth=readFileSync("src/lib/auth.ts","utf8");
 assert.match(auth,/ctx\.path !== "\/sign-up\/email"/);
 assert.match(auth,/checkRegistration\(body/);
 assert.match(auth,/input: false/);
 assert.match(auth,/name: profile\.name/);
});
test("SQL migration preserves the legacy Better Auth name column",()=>{
 const migration=readFileSync("prisma/migrations/20261021120000_citizen_registration_fields/migration.sql","utf8");
 assert.match(migration,/ADD COLUMN `firstName`/);
 assert.match(migration,/ADD COLUMN `lastName`/);
 assert.doesNotMatch(migration,/DROP TABLE|DROP COLUMN `name`/i);
});
test("data reset script is opt-in and preserves prisma migration history",()=>{
 const src=readFileSync("scripts/clear-demo-data.mjs","utf8");
 assert.match(src,/--confirm-db=/);
 assert.match(src,/--i-understand-data-will-be-deleted/);
 assert.match(src,/!execute/);
 assert.match(src,/DELETE FROM/);
 assert.doesNotMatch(src,/TRUNCATE TABLE|DROP TABLE|DELETE FROM `_prisma_migrations`/i);
});
