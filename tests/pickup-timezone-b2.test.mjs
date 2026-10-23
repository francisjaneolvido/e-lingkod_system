import {test} from "node:test";
import assert from "node:assert/strict";
import {loadServerTypescript} from "./helpers/load-typescript.mjs";
const hooks=loadServerTypescript();
const {manilaPickupInstant,parsePickupInstant,formatPickupTime}=await import("../src/features/services/pickup-time.ts");hooks.deregister();
test("B2-R4 Philippine wall-clock entry has one explicit UTC instant",()=>{
  assert.equal(manilaPickupInstant("2026-10-26T09:30"),"2026-10-26T01:30:00.000Z");
  assert.equal(manilaPickupInstant("2026-10-26T00:15"),"2026-10-25T16:15:00.000Z");
  assert.equal(manilaPickupInstant("2028-02-29T23:59"),"2028-02-29T15:59:00.000Z");
});
test("B2-R4 rejects invalid wall clocks and ambiguous API timestamps",()=>{
  for(const value of ["","2026-02-29T09:30","2026-02-30T09:30","2026-10-26T24:00","2026-13-01T12:00"])assert.throws(()=>manilaPickupInstant(value));
  for(const value of [null,true,"2026-10-26T09:30","2026-02-30T09:30:00Z","2026-10-26T09:30:00+99:99"])assert.throws(()=>parsePickupInstant(value));
  assert.equal(parsePickupInstant("2026-10-26T09:30:00+08:00").toISOString(),"2026-10-26T01:30:00.000Z");assert.equal(parsePickupInstant("2026-10-26T01:30:00.000Z").toISOString(),"2026-10-26T01:30:00.000Z");
});
test("B2-R4 display identifies Philippine time and ignores process/browser locale timezone",()=>{
  const display=formatPickupTime("2026-10-26T01:30:00.000Z");assert.match(display,/9:30/);assert.match(display,/Philippine time \(UTC\+08:00\)/);assert.equal(formatPickupTime(new Date("2026-10-26T09:30:00+08:00")),display);
});
