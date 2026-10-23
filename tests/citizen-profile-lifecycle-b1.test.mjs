import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { loadServerTypescript } from "./helpers/load-typescript.mjs";

test("B1 real database lifecycle, history, consent and ownership", { skip: !process.env.ELB_B1_TEST_DATABASE }, async t => {
  const database = new URL(process.env.DATABASE_URL).pathname.slice(1);
  assert.match(database, /^elb_b1_test_[a-f0-9]{32}$/);
  assert.equal(database, process.env.ELB_B1_TEST_DATABASE);
  const hooks = loadServerTypescript();
  const { prisma } = await import("../src/lib/prisma.ts");
  const { auth } = await import("../src/lib/auth.ts");
  const route = await import("../src/app/api/community-survey/route.ts");
  try {
    const origin = process.env.BETTER_AUTH_URL || "http://localhost:3000";
    const signedUp = await auth.api.signUpEmail({ body: { name: "Civic Tester", firstName: "Civic", lastName: "Tester", hasNoMiddleName: true, phoneNumber: "+639171234567", email: `b1-${randomUUID()}@example.test`, password: "B1-test-only-password-2468" }, headers: new Headers({ origin }), asResponse: true });
    assert.equal(signedUp.status, 200, await signedUp.clone().text());
    const cookie = signedUp.headers.getSetCookie().map(value => value.split(";")[0]).join("; ");
    assert(cookie, "real Better Auth signup must issue an authenticated session cookie");
    const account = await signedUp.json();
    const year = new Date().getFullYear();
    const body = { surveyYear: year, status: "SUBMITTED", barangay: "Batong Malake", ageGroup: "18-24", educationLevel: "SENIOR_HIGH", employmentStatus: "STUDENT", skills: ["Data Entry"], consentAggregated: true, consentOpportunityRecommendations: false, expectedVersion: 0, expectedConsentVersion: 0, requestKey: randomUUID() };
    const send = value => route.PUT(new Request(origin + "/api/community-survey", { method: "PUT", headers: { origin, cookie, "content-type": "application/json" }, body: JSON.stringify(value) }));
    const submitted = await send(body);
    assert.equal(submitted.status, 200, await submitted.clone().text());
    const first = await submitted.json();
    const draft = await send({ ...body, status: "DRAFT", barangay: "Baybayin", expectedVersion: first.version ?? 0, requestKey: randomUUID() });
    assert.equal(draft.status, 200, await draft.clone().text());
    const current = await prisma.communitySurvey.findUnique({ where: { userId_surveyYear: { userId: account.user.id, surveyYear: year } } });
    assert.equal(current.status, "SUBMITTED", "saving a later draft must not erase the submitted population");
    assert.equal(current.barangay, "Batong Malake", "unsubmitted answers must not replace submitted answers");
    const request = (method, value, session = cookie, extra = "") => new Request(origin + "/api/community-survey?year=" + year + extra, { method, headers: { origin, cookie: session, "content-type": "application/json" }, ...(value ? { body: JSON.stringify(value) } : {}) });
    const state = async () => { const response = await route.GET(request("GET")); assert.equal(response.status, 200); return response.json(); };

    await t.test("owned history retains the original submitted answers beside the current draft", async () => {
      const value = await state();
      assert.equal(value.hasDraft, true);
      assert.equal(value.barangay, "Baybayin");
      assert.equal(value.submitted.barangay, "Batong Malake");
      assert.equal(value.history.length, 1);
      assert.equal(value.history[0].answers.barangay, "Batong Malake");
      assert.equal(value.history[0].actorId, account.user.id);
      assert(!Number.isNaN(Date.parse(value.history[0].createdAt)));
    });
    await t.test("submission retries are stable and cannot change payload or erase the later draft", async () => {
      const retry = await send(body); assert.equal(retry.status, 200);
      assert.equal((await retry.json()).revisionId, first.revisionId);
      assert.equal((await state()).hasDraft, true);
      const changed = await send({ ...body, barangay: "Anos" }); assert.equal(changed.status, 409);
      const stale = await send({ ...body, requestKey: randomUUID(), expectedVersion: 0 }); assert.equal(stale.status, 409);
      assert.equal(await prisma.communitySurveyRevision.count({ where: { userId: account.user.id } }), 1);
    });
    await t.test("a new submission appends a revision without changing the earlier snapshot", async () => {
      const value = await state();
      const response = await send({ ...body, barangay: "Baybayin", expectedVersion: value.workspaceVersion, expectedConsentVersion: value.consentVersion, requestKey: randomUUID(), consentOpportunityRecommendations: true });
      assert.equal(response.status, 200, await response.clone().text());
      const updated = await state();
      assert.equal(updated.hasDraft, false); assert.equal(updated.history.length, 2);
      assert.equal(updated.history[0].answers.barangay, "Baybayin");
      assert.equal(updated.history[1].answers.barangay, "Batong Malake");
      assert.equal(updated.submitted.barangay, "Baybayin");
    });
    await t.test("concurrent requests append once and stale conflicting edits cannot overwrite", async () => {
      let value = await state();
      const shared = { ...body, expectedVersion: value.workspaceVersion, expectedConsentVersion: value.consentVersion, requestKey: randomUUID() };
      const same = await Promise.all([send(shared), send(shared)]);
      assert.deepEqual(same.map(r => r.status), [200, 200]);
      assert.equal((await same[0].json()).revisionId, (await same[1].json()).revisionId);
      value = await state();
      const base = { ...body, expectedVersion: value.workspaceVersion, expectedConsentVersion: value.consentVersion };
      const different = await Promise.all([send({ ...base, barangay: "Anos", requestKey: randomUUID() }), send({ ...base, barangay: "Mayondon", requestKey: randomUUID() })]);
      assert.deepEqual(different.map(r => r.status).sort(), [200, 409]);
      assert.equal((await state()).history.length, 4);
    });
    await t.test("current consent withdrawal blocks legacy fallback and stale historical grants", async () => {
      await prisma.jobseekerProfile.create({ data: { userId: account.user.id, skillsJson: '["Data Entry"]', interestsJson: "[]", education: "SENIOR_HIGH", preferredArea: "Batong Malake", availability: "ANY" } });
      const value = await state();
      const response = await route.PATCH(request("PATCH", { matching: false, programs: false, expectedConsentVersion: value.consentVersion }));
      assert.equal(response.status, 200, await response.clone().text());
      const { profileForCitizen } = await import("../src/features/jobs/server/data.ts");
      assert.equal(await profileForCitizen(account.user.id), null, "old optional profiles must not bypass withdrawn current consent");
      // A historical compatibility flag cannot grant current authorization.
      await prisma.communitySurvey.update({ where: { userId_surveyYear: { userId: account.user.id, surveyYear: year } }, data: { consentOpportunityRecommendations: true } });
      const { communityMatchProfile } = await import("../src/features/community/server/data.ts");
      assert.equal(await communityMatchProfile(account.user.id), null);
      const stale = await send({ ...body, expectedVersion: (await state()).workspaceVersion, expectedConsentVersion: value.consentVersion, requestKey: randomUUID(), consentOpportunityRecommendations: true });
      assert.equal(stale.status, 409, "an older consent version must not regrant permission");
    });
    await t.test("year-specific drafts and submissions do not replace another year's records", async () => {
      const response = await send({ ...body, surveyYear: year - 1, status: "DRAFT", expectedVersion: 0 });
      assert.equal(response.status, 200);
      const historical = await route.GET(new Request(origin + "/api/community-survey?year=" + (year - 1), { headers: { origin, cookie } }));
      assert.equal(historical.status, 200);
      assert.equal((await historical.json()).hasDraft, true);
      assert.equal((await state()).history.length, 4);
    });
    await t.test("public and staff requests are denied and another citizen cannot select the owner's records", async () => {
      assert.equal((await route.GET(request("GET", null, ""))).status, 401);
      const second = await auth.api.signUpEmail({ body: { name: "Other Tester", firstName: "Other", lastName: "Tester", hasNoMiddleName: true, phoneNumber: "+639171234568", email: `other-${randomUUID()}@example.test`, password: "B1-test-only-password-2468" }, headers: new Headers({ origin }), asResponse: true });
      assert.equal(second.status, 200, await second.clone().text());
      const otherCookie = second.headers.getSetCookie().map(v => v.split(";")[0]).join("; ");
      const other = await second.json();
      const unauthorized = await route.GET(request("GET", null, otherCookie, "&userId=" + account.user.id));
      assert.equal(unauthorized.status, 200); assert.equal((await unauthorized.json()).history.length, 0);
      const write = await route.PUT(request("PUT", { ...body, userId: account.user.id, status: "DRAFT", expectedVersion: 0 }, otherCookie));
      assert.equal(write.status, 200); assert.equal((await state()).history.length, 4);
      assert(await prisma.communitySurveyWorkspace.findUnique({ where: { userId_surveyYear: { userId: other.user.id, surveyYear: year } } }));
      await prisma.user.update({ where: { id: other.user.id }, data: { role: "STAFF" } });
      assert.equal((await route.GET(request("GET", null, otherCookie))).status, 403);
      assert.equal((await route.PUT(request("PUT", body, otherCookie))).status, 403);
      assert.equal((await route.PUT(new Request(origin + "/api/community-survey", { method: "PUT", headers: { origin: "https://attacker.example", cookie, "content-type": "application/json" }, body: JSON.stringify(body) }))).status, 403);
    });
    await t.test("withdrawal removes active use, retains protected history and a later draft stays withdrawn", async () => {
      let value = await state();
      const input = { surveyYear: year, expectedVersion: value.workspaceVersion, expectedConsentVersion: value.consentVersion, requestKey: randomUUID() };
      const withdrawals = await Promise.all([route.DELETE(request("DELETE", input)), route.DELETE(request("DELETE", input))]);
      assert.deepEqual(withdrawals.map(response=>response.status), [200,200], "concurrent retries of the same withdrawal must return the original result");
      value = await state(); assert.equal(value.submittedStatus, "WITHDRAWN"); assert.equal(value.history.length, 5);
      assert.equal(value.history[0].action, "WITHDRAWN"); assert.equal(value.consentOpportunityRecommendations, false);
      assert.equal(await prisma.communitySurvey.count({ where: { userId: account.user.id, status: "SUBMITTED" } }), 0);
      assert.equal((await route.DELETE(request("DELETE", input))).status, 200);
      assert.equal((await state()).history.length, 5);
      const draftResponse = await send({ surveyYear: year, status: "DRAFT", expectedVersion: value.workspaceVersion, barangay: "Anos" });
      assert.equal(draftResponse.status, 200); value = await state();
      assert.equal(value.submittedStatus, "WITHDRAWN"); assert.equal(value.hasDraft, true); assert.equal(value.history.length, 5);
    });
  } finally {
    await prisma.$disconnect();
    hooks.deregister();
  }
});

test("B1 additive migration preserves legacy submissions, drafts and the latest consent choice", { skip: !process.env.ELB_B1_LEGACY_FIXTURES }, async () => {
  assert.match(new URL(process.env.DATABASE_URL).pathname.slice(1), /^elb_b1_test_[a-f0-9]{32}$/);
  const hooks = loadServerTypescript();
  const { prisma } = await import("../src/lib/prisma.ts");
  const { ownedSurveyState, currentProfileConsent } = await import("../src/features/community/server/survey-lifecycle.ts");
  try {
    const year = new Date().getFullYear();
    const current = await ownedSurveyState("b1_legacy_submitted", year);
    assert.equal(current.submittedStatus, "SUBMITTED"); assert.equal(current.workspaceVersion, 1);
    assert.equal(current.history.length, 1); assert.equal(current.history[0].answers.barangay, "Batong Malake");
    assert.deepEqual(current.history[0].answers.skills, ["Data Entry"]);
    assert.equal(current.history[0].answers.consentOpportunityRecommendations, false);
    const previous = await ownedSurveyState("b1_legacy_submitted", year - 1);
    assert.equal(previous.history.length, 1); assert.equal(previous.history[0].answers.consentOpportunityRecommendations, true);
    assert.equal((await currentProfileConsent("b1_legacy_submitted")).matching, false, "an older grant must not override the latest submitted refusal");
    const draft = await ownedSurveyState("b1_legacy_draft", year);
    assert.equal(draft.hasDraft, true); assert.equal(draft.workspaceVersion, 0); assert.equal(draft.history.length, 0);
    assert.deepEqual(draft.skills, ["Data Entry"]);
    assert.equal(await prisma.communitySurvey.count({ where: { userId: { startsWith: "b1_legacy_" } } }), 3);
  } finally { await prisma.$disconnect(); hooks.deregister(); }
});

test("R2 coherent owned state rejects overwriting a submission committed between reads", { skip: !process.env.ELB_B1_TEST_DATABASE, timeout: 15000 }, async () => {
  assert.match(new URL(process.env.DATABASE_URL).pathname.slice(1), /^elb_b1_test_[a-f0-9]{32}$/);
  const hooks = loadServerTypescript();
  const { prisma } = await import("../src/lib/prisma.ts");
  const { ownedSurveyState, saveCitizenSurvey } = await import("../src/features/community/server/survey-lifecycle.ts");
  const firstRead = Promise.withResolvers(), remainingReads = Promise.withResolvers();
  let reading;
  const restores = [];
  const restore = () => { for (const undo of restores.splice(0).reverse()) undo(); };
  try {
    const id = randomUUID(), year = new Date().getFullYear();
    await prisma.user.create({ data: { id, name: "Snapshot Tester", email: id + "@example.test", role: "CITIZEN" } });
    const viewer = { id, role: "CITIZEN" };
    const answers = { status: "SUBMITTED", surveyYear: year, barangay: "Batong Malake", ageGroup: "25-34", educationLevel: "COLLEGE", employmentStatus: "EMPLOYED_FULL_TIME", skills: ["Data Entry"], consentAggregated: true, consentOpportunityRecommendations: false };
    const first = await saveCitizenSurvey({ ...answers, expectedVersion: 0, expectedConsentVersion: 0, requestKey: randomUUID() }, viewer);
    const engines = await prisma.$queryRawUnsafe("SELECT ENGINE AS engine FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME IN ('community_survey','community_survey_workspace','community_survey_revision','citizen_profile_consent')");
    assert.equal(engines.length, 4);
    assert(engines.every(row => row.engine === "InnoDB"), "Consistent-read regression requires actual InnoDB tables");
    const gate = async (model, query) => {
      if (model === "communitySurvey") {
        const result = await query(); // Establish A's real database read before B commits.
        firstRead.resolve();
        return result;
      }
      await remainingReads.promise;
      return query(); // Read the other records only after B has committed.
    };
    const operations = { communitySurvey: "findUnique", communitySurveyWorkspace: "findUnique", citizenProfileConsent: "findUnique", communitySurveyRevision: "findMany" };
    for (const [model, operation] of Object.entries(operations)) {
      const delegate = prisma[model], original = delegate[operation];
      delegate[operation] = args => gate(model, () => original.call(delegate, args));
      restores.push(() => { delegate[operation] = original; });
    }
    // Transparent gates apply to both pre-fix independent queries and a corrected
    // interactive transaction. Every query still executes against the real DB.
    let startingRead = false;
    const transactionMethod = prisma.$transaction, transaction = transactionMethod.bind(prisma);
    restores.push(() => { prisma.$transaction = transactionMethod; });
    prisma.$transaction = (callback, options) => {
      if (!startingRead || typeof callback !== "function") return transaction(callback, options);
      return transaction(tx => callback(new Proxy(tx, {
        get(target, model) {
          if (!(model in operations)) return Reflect.get(target, model);
          const delegate = target[model], operation = operations[model];
          return new Proxy(delegate, {
            get(object, member) {
              const original = Reflect.get(object, member);
              return member === operation ? args => gate(model, () => original.call(object, args)) : original;
            }
          });
        }
      })), options);
    };
    startingRead = true;
    reading = ownedSurveyState(id, year);
    startingRead = false;
    await firstRead.promise;
    const second = await saveCitizenSurvey({ ...answers, barangay: "Baybayin", consentOpportunityRecommendations: true, expectedVersion: first.version, expectedConsentVersion: first.consentVersion, requestKey: randomUUID() }, viewer);
    remainingReads.resolve();
    const observed = await reading;
    restore();
    await assert.rejects(
      saveCitizenSurvey({ ...answers, barangay: observed.barangay, expectedVersion: observed.workspaceVersion, expectedConsentVersion: observed.consentVersion, requestKey: randomUUID() }, viewer),
      { status: 409 },
      "An older answer snapshot must not receive tokens that permit overwriting unseen B"
    );
    assert.equal(observed.barangay, "Batong Malake");
    assert.equal(observed.submitted.barangay, "Batong Malake");
    assert.equal(observed.workspaceVersion, first.version);
    assert.equal(observed.consentVersion, first.consentVersion);
    assert.equal(observed.consentOpportunityRecommendations, false);
    assert.equal(observed.history.length, 1);
    assert.equal(observed.history[0].answers.barangay, "Batong Malake");
    const current = await ownedSurveyState(id, year);
    assert.equal(current.barangay, "Baybayin");
    assert.equal(current.workspaceVersion, second.version);
  } finally {
    remainingReads.resolve();
    if (reading) await reading.catch(() => {});
    restore();
    await prisma.$disconnect();
    hooks.deregister();
  }
});

test("R3 migrated draft-only profiles retain authorized fallback without bypassing refusal or participation", { skip: !process.env.ELB_B1_LEGACY_FIXTURES }, async () => {
  assert.match(new URL(process.env.DATABASE_URL).pathname.slice(1), /^elb_b1_test_[a-f0-9]{32}$/);
  const hooks = loadServerTypescript();
  const { prisma } = await import("../src/lib/prisma.ts");
  const { ownedSurveyState, currentProfileConsent, changeCitizenConsent, withdrawCitizenSurvey, saveCitizenSurvey } = await import("../src/features/community/server/survey-lifecycle.ts");
  const { profileForCitizen } = await import("../src/features/jobs/server/data.ts");
  const { communityMatchProfile } = await import("../src/features/community/server/data.ts");
  const id = "b1_legacy_draft", year = new Date().getFullYear(), viewer = { id, role: "CITIZEN" };
  try {
    const consent = await currentProfileConsent(id);
    assert.equal(consent.matching, true, "Migration must preserve the explicitly created legacy optional profile grant");
    assert.equal(await communityMatchProfile(id), null, "An incomplete draft is not a submitted matching profile");
    const fallback = await profileForCitizen(id);
    assert(fallback, "R3: a DRAFT alone must not disable otherwise authorized legacy matching");
    assert.deepEqual(fallback.skills, ["Data Entry"]);

    await changeCitizenConsent({ matching: false, programs: false, expectedConsentVersion: consent.version }, viewer);
    assert.equal(await profileForCitizen(id), null, "Current refusal must block legacy matching");
    let state = await ownedSurveyState(id, year);
    await changeCitizenConsent({ matching: true, programs: false, expectedConsentVersion: state.consentVersion }, viewer);
    state = await ownedSurveyState(id, year);
    await withdrawCitizenSurvey({ surveyYear: year, expectedVersion: state.workspaceVersion, expectedConsentVersion: state.consentVersion, requestKey: randomUUID() }, viewer);
    assert.equal(await profileForCitizen(id), null, "Withdrawal must block fallback");
    state = await ownedSurveyState(id, year);
    await changeCitizenConsent({ matching: true, programs: false, expectedConsentVersion: state.consentVersion }, viewer);
    assert.equal(await profileForCitizen(id), null, "Regranting a purpose must not bypass withdrawn survey participation");
    state = await ownedSurveyState(id, year);
    await saveCitizenSurvey({ status: "SUBMITTED", surveyYear: year, barangay: "Anos", ageGroup: "25-34", educationLevel: "COLLEGE", employmentStatus: "EMPLOYED_FULL_TIME", skills: ["Food Processing"], consentAggregated: true, consentOpportunityRecommendations: true, expectedVersion: state.workspaceVersion, expectedConsentVersion: state.consentVersion, requestKey: randomUUID() }, viewer);
    assert.equal(await profileForCitizen(id), null, "Submitted survey selection must not fall back to an older profile");
    assert.deepEqual((await communityMatchProfile(id)).skills, ["Food Processing"]);
  } finally { await prisma.$disconnect(); hooks.deregister(); }
});

test("R5 profile-only migration retains workspace withdrawal authority through regrant and later submission", { skip: !process.env.ELB_B1_LEGACY_FIXTURES }, async () => {
  assert.match(new URL(process.env.DATABASE_URL).pathname.slice(1), /^elb_b1_test_[a-f0-9]{32}$/);
  const hooks = loadServerTypescript();
  const { prisma } = await import("../src/lib/prisma.ts");
  const { ownedSurveyState, currentProfileConsent, saveCitizenSurvey, withdrawCitizenSurvey, changeCitizenConsent } = await import("../src/features/community/server/survey-lifecycle.ts");
  const { profileForCitizen } = await import("../src/features/jobs/server/data.ts");
  const { communityMatchProfile } = await import("../src/features/community/server/data.ts");
  const id = "b1_legacy_profile_only", year = new Date().getFullYear(), viewer = { id, role: "CITIZEN" };
  try {
    assert.equal(await prisma.communitySurvey.count({ where: { userId: id } }), 0);
    assert.equal(await prisma.communitySurveyWorkspace.count({ where: { userId: id } }), 0);
    assert.equal((await currentProfileConsent(id)).matching, true);
    assert.deepEqual((await profileForCitizen(id)).skills, ["Data Entry"], "Authorized profile-only migration must preserve legacy matching");
    await saveCitizenSurvey({ status: "DRAFT", surveyYear: year, barangay: "Anos", expectedVersion: 0 }, viewer);
    let state = await ownedSurveyState(id, year);
    assert.equal(state.hasDraft, true);
    assert.equal(state.submitted, null);
    assert(await profileForCitizen(id), "The first workspace draft must not disable authorized legacy matching");
    const input = { surveyYear: year, expectedVersion: state.workspaceVersion, expectedConsentVersion: state.consentVersion, requestKey: randomUUID() };
    const withdrawal = await withdrawCitizenSurvey(input, viewer);
    assert.equal((await currentProfileConsent(id)).matching, false);
    await changeCitizenConsent({ matching: true, programs: false, expectedConsentVersion: withdrawal.consentVersion }, viewer);
    state = await ownedSurveyState(id, year);
    assert.equal(await profileForCitizen(id), null, "R5: a purpose regrant must not bypass a withdrawal without an annual row");
    assert.equal(await communityMatchProfile(id), null);
    assert.equal(state.status, "WITHDRAWN");
    assert.equal(state.submittedStatus, "WITHDRAWN", "Owned UI state must show withdrawn participation without inventing a submission");
    assert.equal(state.submitted, null);
    assert.equal(state.hasDraft, false);
    assert.equal(state.history.length, 1);
    assert.equal(state.history[0].action, "WITHDRAWN");
    assert.equal(await prisma.communitySurvey.count({ where: { userId: id } }), 0, "No completed compatibility response may be fabricated");
    assert.equal((await withdrawCitizenSurvey(input, viewer)).revisionId, withdrawal.revisionId);
    assert.equal((await currentProfileConsent(id)).matching, true, "A replay must not revoke a later independent consent choice");
    await saveCitizenSurvey({ status: "DRAFT", surveyYear: year, barangay: "Baybayin", expectedVersion: state.workspaceVersion }, viewer);
    state = await ownedSurveyState(id, year);
    assert.equal(state.submittedStatus, "WITHDRAWN");
    assert.equal(state.hasDraft, true);
    assert.equal(await profileForCitizen(id), null, "A later draft must not restore withdrawn legacy participation");
    await saveCitizenSurvey({ status: "SUBMITTED", surveyYear: year, barangay: "Baybayin", ageGroup: "25-34", educationLevel: "COLLEGE", employmentStatus: "EMPLOYED_FULL_TIME", skills: ["Food Processing"], consentAggregated: true, consentOpportunityRecommendations: true, expectedVersion: state.workspaceVersion, expectedConsentVersion: state.consentVersion, requestKey: randomUUID() }, viewer);
    state = await ownedSurveyState(id, year);
    assert.equal(state.submittedStatus, "SUBMITTED");
    assert.equal(state.status, "SUBMITTED");
    assert.equal(state.history.length, 2);
    assert.deepEqual(state.history.map(h => h.action), ["SUBMITTED", "WITHDRAWN"]);
    assert.deepEqual((await communityMatchProfile(id)).skills, ["Food Processing"]);
    assert.equal(await profileForCitizen(id), null, "Legitimate submitted-profile selection still supersedes the legacy profile");
  } finally { await prisma.$disconnect(); hooks.deregister(); }
});
