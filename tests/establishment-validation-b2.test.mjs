import { test } from "node:test";
import assert from "node:assert/strict";
import { loadServerTypescript } from "./helpers/load-typescript.mjs";
const hooks = loadServerTypescript();
const { parseEstablishmentAnswers: parse, establishmentIdentity, INDUSTRIES, INDUSTRY_VERSION, establishmentYear } = await import("../src/features/establishments/domain.ts");
hooks.deregister();

const { establishmentFixture: complete } = await import("./helpers/establishment-fixtures.mjs");
test("B2 separate partial draft, required submission and unknown vs zero workforce", () => {
  const draft = parse({ ...complete, employerType: "", totalWorkers: "", regularWorkers: null }, "DRAFT");
  assert.equal(draft.totalWorkers, null); assert.equal(draft.regularWorkers, null);
  assert.equal(parse({ ...complete, totalWorkers: 0, regularWorkers: 0, nonRegularWorkers: 0, partTimeWorkers: 0 }, "SUBMITTED").totalWorkers, 0);
  assert.throws(() => parse({ ...complete, employerType: "" }, "SUBMITTED"), /Employer/);
  assert.throws(() => parse({ ...complete, contactEmail: "", contactPhone: "" }, "SUBMITTED"), /contact/);
});
test("B2 rejects invalid numbers, malformed types, categories and inconsistent workforce", () => {
  for (const value of [-1, 1.5, true, {}, "1e3", "12staff", Infinity, 1000001]) assert.throws(() => parse({ ...complete, totalWorkers: value }, "DRAFT"));
  for (const value of ["FREE_TEXT", true, {}]) assert.throws(() => parse({ ...complete, industry: value }, "DRAFT"));
  assert.throws(() => parse({ ...complete, totalWorkers: 9 }, "SUBMITTED"), /total/);
  assert.throws(() => parse({ ...complete, regularWorkers: null, nonRegularWorkers: 11 }, "DRAFT"), /total/);
  assert.throws(() => parse({ ...complete, monthsOperated: 13 }, "DRAFT"));
  assert.throws(() => parse({ ...complete, startYear: new Date().getFullYear()+2 }, "DRAFT"));
  assert.throws(() => parse({ ...complete, businessName: [] }, "DRAFT"));
  assert.throws(() => parse({ ...complete, barangay: "elsewhere" }, "DRAFT"));
});
test("B2 identity is normalized, location-aware and every stable industry roundtrips", () => {
  assert.equal(establishmentIdentity(parse(complete,"DRAFT")), establishmentIdentity(parse({ ...complete, businessName: "  LAKE   FOOD cooperative ", street: "10 MAIN STREET" }, "DRAFT")));
  assert.notEqual(establishmentIdentity(parse(complete,"DRAFT")), establishmentIdentity(parse({ ...complete, street: "11 Main Street" },"DRAFT")));
  assert.notEqual(establishmentIdentity(parse(complete,"DRAFT")), establishmentIdentity(parse({ ...complete, officeType: "BRANCH" },"DRAFT")));
  assert.equal(new Set(INDUSTRIES.map(x=>x.value)).size, INDUSTRIES.length);
  for (const entry of INDUSTRIES) { const answers=parse({ ...complete, industry: entry.value },"SUBMITTED"); assert.equal(answers.industry, entry.value); assert.equal(answers.industryVersion, INDUSTRY_VERSION); }
});
test("B2 survey years and start-year consistency are strict", () => {
  for (const year of [true, {}, "", 2019, 2026.5, "2026x", new Date().getFullYear()+2]) assert.throws(() => establishmentYear(year));
  assert.equal(establishmentYear("2020"),2020);
  assert.throws(()=>parse({ ...complete, surveyYear:2020, startYear:2021 },"SUBMITTED"));
});
test("B2 never relabels another municipality as Los Baños",()=>{
  assert.throws(()=>parse({...complete,municipality:"Quezon City"},"DRAFT"),/municipality/);
  assert.throws(()=>parse({...complete,province:"Cavite"},"DRAFT"),/province/);
});
test("B2-R2 known employment-type subtotal constrains part-time workers without inventing a total",()=>{
  for(const counts of [{regularWorkers:2,nonRegularWorkers:3,partTimeWorkers:6},{regularWorkers:0,nonRegularWorkers:0,partTimeWorkers:1}])assert.throws(()=>parse({...complete,totalWorkers:null,...counts},"DRAFT"),/total|subtotal|part-time/i);
  for(const counts of [{regularWorkers:2,nonRegularWorkers:3,partTimeWorkers:5},{regularWorkers:0,nonRegularWorkers:0,partTimeWorkers:0},{regularWorkers:2,nonRegularWorkers:null,partTimeWorkers:6},{regularWorkers:null,nonRegularWorkers:3,partTimeWorkers:6},{regularWorkers:null,nonRegularWorkers:null,partTimeWorkers:10}]){
    const value=parse({...complete,totalWorkers:null,...counts},"SUBMITTED");assert.equal(value.totalWorkers,null);for(const [key,n]of Object.entries(counts))assert.equal(value[key],n);
  }
});
