// Run against the guarded disposable server:
// playwright-cli -s=elb-b1 run-code --filename=tests/citizen-profile-browser-b1.js
// eslint-disable-next-line @typescript-eslint/no-unused-expressions -- playwright-cli evaluates this function expression.
async page => {
  const base = "http://127.0.0.1:3101";
  const check = (value, message) => { if (!value) throw Error(message); };
  const json = async response => { const body = await response.json(); check(response.ok(), JSON.stringify(body)); return body; };
  await page.unroute("**/api/community-survey");
  await page.unroute("**/api/community-survey?year=*");
  await page.context().clearCookies();
  const account = await json(await page.request.post(base + "/api/auth/sign-up/email", {
    headers: { origin: base },
    data: { name: "Browser Reviewer", firstName: "Browser", lastName: "Reviewer", hasNoMiddleName: true, phoneNumber: "+639171234569", email: "review-" + crypto.randomUUID() + "@example.test", password: "B1-browser-test-password-2468" }
  }));
  const year = new Date().getFullYear();
  await json(await page.request.put(base + "/api/community-survey", {
    headers: { origin: base },
    data: { status: "SUBMITTED", surveyYear: year, barangay: "Batong Malake", ageGroup: "25-34", educationLevel: "COLLEGE", employmentStatus: "EMPLOYED_FULL_TIME", skills: ["Data Entry"], consentAggregated: true, consentOpportunityRecommendations: false, expectedVersion: 0, expectedConsentVersion: 0, requestKey: crypto.randomUUID() }
  }));
  await page.goto(base + "/community-survey");
  await page.getByRole("heading", { name: "Personal Employment and Livelihood Survey", exact: true }).waitFor();
  await page.getByLabel("Barangay", { exact: true }).fill("Anos");
  const matching = page.getByRole("checkbox", { name: "Opportunity recommendations", exact: true });
  const programs = page.getByRole("checkbox", { name: "Program recommendations", exact: true });
  await matching.check();
  await programs.check();
  let interposed = false, observedVersion;
  await page.route("**/api/community-survey?year=*", async route => {
    if (interposed || route.request().method() !== "GET") return route.continue();
    interposed = true;
    // Tab A's PATCH has committed. A second client revokes before A's GET.
    const before = await json(await page.request.get(base + "/api/community-survey"));
    await json(await page.request.patch(base + "/api/community-survey", { headers: { origin: base }, data: { matching: false, programs: true, expectedConsentVersion: before.consentVersion } }));
    const response = await route.fetch();
    const observed = await response.json();
    check(observed.consentOpportunityRecommendations === false, "Intervening revocation was not observed");
    observedVersion = observed.consentVersion;
    await route.fulfill({ response });
  });
  await page.getByRole("button", { name: "Save preferences", exact: true }).click();
  await page.getByRole("status").filter({ hasText: "Optional preferences saved." }).first().waitFor();
  check(interposed, "R1 did not exercise the controlled request ordering");
  check(!await matching.isChecked(), "R1: refreshed consent token must not retain a stale grant");
  check(await programs.isChecked(), "R1: separate program purpose was lost");
  check(await page.getByLabel("Barangay", { exact: true }).inputValue() === "Anos", "R1: refreshing consent erased unsaved survey answers");
  await page.unroute("**/api/community-survey?year=*");
  for (let i = 0; i < 6; i++) await page.getByRole("button", { name: "Next", exact: true }).click();
  const submittedRequest = page.waitForRequest(request => request.url().endsWith("/api/community-survey") && request.method() === "PUT");
  await page.getByRole("button", { name: "Submit updated response", exact: true }).click();
  const payload = (await submittedRequest).postDataJSON();
  check(payload.expectedConsentVersion === observedVersion && payload.consentOpportunityRecommendations === false, "R1: submission paired the revocation token with an old grant");
  await page.getByRole("status").filter({ hasText: "Your response was submitted." }).first().waitFor();
  const current = await json(await page.request.get(base + "/api/community-survey"));
  check(current.barangay === "Anos" && current.consentOpportunityRecommendations === false, "R1: submitted result lost answers or reversed revocation");
  const results = ["R1 controlled intervening consent revocation"];
  const jsErrors = [];
  page.on("pageerror", error => jsErrors.push(error.message));
  let priorOperationKey;
  for (const [index, failure] of ["response-lost", "refresh-failed"].entries()) {
    const targetYear = year - index - 1;
    const initial = await json(await page.request.get(base + "/api/community-survey"));
    await json(await page.request.put(base + "/api/community-survey", {
      headers: { origin: base },
      data: { status: "SUBMITTED", surveyYear: targetYear, barangay: "Batong Malake", ageGroup: "25-34", educationLevel: "COLLEGE", employmentStatus: "EMPLOYED_FULL_TIME", skills: ["Data Entry"], consentAggregated: true, consentOpportunityRecommendations: true, expectedVersion: 0, expectedConsentVersion: initial.consentVersion, requestKey: crypto.randomUUID() }
    }));
    await page.goto(base + "/community-survey?year=" + targetYear);
    await page.getByRole("heading", { name: "Personal Employment and Livelihood Survey", exact: true }).waitFor();
    const attempts = [];
    let committed, failedRefresh = false;
    await page.route("**/api/community-survey", async route => {
      if (route.request().method() !== "DELETE") return route.continue();
      attempts.push(route.request().postDataJSON());
      const response = await route.fetch(); // The real server transaction has completed.
      const value = await response.json();
      if (attempts.length === 1) {
        check(response.status() === 200, "R4 first withdrawal did not commit");
        committed = value;
        if (failure === "response-lost") return route.abort("failed");
      }
      await route.fulfill({ response });
    });
    await page.route("**/api/community-survey?year=*", async route => {
      if (failure === "refresh-failed" && committed && !failedRefresh) {
        failedRefresh = true;
        return route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ error: "Expected failed refresh after committed withdrawal" }) });
      }
      await route.continue();
    });
    const withdrawThroughUi = async () => {
      await page.getByRole("button", { name: "Withdraw this year's response", exact: true }).click();
      await page.getByRole("button", { name: "Withdraw response", exact: true }).click();
    };
    await withdrawThroughUi();
    await page.getByRole("alert").filter({ hasText: failure === "response-lost" ? "Failed to fetch" : "Expected failed refresh after committed withdrawal" }).first().waitFor();
    check(committed?.revisionId, "R4 must fail after commit, not before the server processes DELETE");
    const afterCommit = await json(await page.request.get(base + "/api/community-survey?year=" + targetYear));
    check(afterCommit.submittedStatus === "WITHDRAWN" && afterCommit.history.filter(h => h.action === "WITHDRAWN").length === 1, "R4 first server outcome was not exactly one committed withdrawal");
    const retryResponse = page.waitForResponse(response => response.url().endsWith("/api/community-survey") && response.request().method() === "DELETE");
    await withdrawThroughUi();
    const replayResponse = await retryResponse;
    check(attempts.length === 2 && JSON.stringify(attempts[0]) === JSON.stringify(attempts[1]), "R4 " + failure + ": retry replaced the committed withdrawal identity");
    const replay = await replayResponse.json();
    check(replayResponse.status() === 200 && replay.replayed === true && replay.revisionId === committed.revisionId, "R4 retry did not replay the original committed event");
    await page.getByRole("status").filter({ hasText: "Response withdrawn from active use." }).first().waitFor();
    const reconciled = await json(await page.request.get(base + "/api/community-survey?year=" + targetYear));
    check(reconciled.history.filter(h => h.action === "WITHDRAWN").length === 1, "R4 retry appended another withdrawal");
    check(reconciled.consentOpportunityRecommendations === false && reconciled.consentProgramRecommendations === false, "R4 withdrawal failed to revoke current purposes");
    check(reconciled.history.some(h => h.action === "SUBMITTED"), "R4 lost protected submitted history");
    if (priorOperationKey) check(priorOperationKey !== attempts[0].requestKey, "R4 changed year reused an old operation identity");
    priorOperationKey = attempts[0].requestKey;
    await page.unroute("**/api/community-survey");
    await page.unroute("**/api/community-survey?year=*");
    results.push("R4 " + failure + ": committed operation replayed once through UI");
  }
  // A later draft is a genuinely new operation in the same year, not a retry.
  await page.getByRole("button", { name: "Save draft", exact: true }).click();
  await page.getByRole("status").filter({ hasText: "Draft saved." }).first().waitFor();
  const freshRequest = page.waitForRequest(request => request.url().endsWith("/api/community-survey") && request.method() === "DELETE");
  await page.getByRole("button", { name: "Withdraw this year's response", exact: true }).click();
  await page.getByRole("button", { name: "Withdraw response", exact: true }).click();
  check((await freshRequest).postDataJSON().requestKey !== priorOperationKey, "R4 completed operation identity was not cleared");
  await page.getByRole("status").filter({ hasText: "Response withdrawn from active use." }).first().waitFor();
  const last = await json(await page.request.get(base + "/api/community-survey?year=" + (year - 2)));
  check(!last.hasDraft && last.history.filter(h => h.action === "WITHDRAWN").length === 2, "R4 new operation replayed an old event or left the new draft active");
  check(jsErrors.length === 0, "Unexpected browser JavaScript errors: " + jsErrors.join("; "));
  results.push("R4 confirmed completion clears identity for a new withdrawal");
  // R6 starts with a new citizen's first workspace-only draft (also R5 UI coverage).
  await page.context().clearCookies();
  await json(await page.request.post(base + "/api/auth/sign-up/email", {
    headers: { origin: base },
    data: { name: "Draft Reviewer", firstName: "Draft", lastName: "Reviewer", hasNoMiddleName: true, phoneNumber: "+639171234560", email: "draft-review-" + crypto.randomUUID() + "@example.test", password: "B1-browser-test-password-2468" }
  }));
  await page.goto(base + "/community-survey");
  await page.getByRole("heading", { name: "Personal Employment and Livelihood Survey", exact: true }).waitFor();
  await page.getByLabel("Barangay", { exact: true }).fill("Anos");
  await page.getByRole("button", { name: "Save draft", exact: true }).click();
  await page.getByRole("status").filter({ hasText: "Draft saved." }).first().waitFor();
  const beforeAbort = await json(await page.request.get(base + "/api/community-survey"));
  const withdrawals = [];
  await page.route("**/api/community-survey", async route => {
    if (route.request().method() !== "DELETE") return route.continue();
    withdrawals.push(route.request().postDataJSON());
    if (withdrawals.length === 1) return route.abort("failed"); // Never reaches the server.
    await route.continue();
  });
  const requestWithdrawal = async () => {
    await page.getByRole("button", { name: "Withdraw this year's response", exact: true }).click();
    await page.getByRole("button", { name: "Withdraw response", exact: true }).click();
  };
  await requestWithdrawal();
  await page.getByRole("alert").filter({ hasText: "Failed to fetch" }).first().waitFor();
  const uncommitted = await json(await page.request.get(base + "/api/community-survey"));
  check(uncommitted.history.length === 0 && uncommitted.workspaceVersion === beforeAbort.workspaceVersion, "R6 fault must abort before server handling");
  await page.getByRole("checkbox", { name: "Opportunity recommendations", exact: true }).check();
  await page.getByRole("button", { name: "Save preferences", exact: true }).click();
  await page.getByRole("status").filter({ hasText: "Optional preferences saved." }).first().waitFor();
  const preferences = await json(await page.request.get(base + "/api/community-survey"));
  check(preferences.consentVersion === beforeAbort.consentVersion + 1 && preferences.workspaceVersion === beforeAbort.workspaceVersion, "R6 preference save did not advance only the purpose token");
  const withdrawalResponse = page.waitForResponse(response => response.url().endsWith("/api/community-survey") && response.request().method() === "DELETE");
  await requestWithdrawal();
  const completed = await withdrawalResponse;
  check(withdrawals[1].expectedConsentVersion === preferences.consentVersion, "R6 pending withdrawal reused an obsolete consent version after a successful preference save");
  check(withdrawals[1].requestKey === withdrawals[0].requestKey && withdrawals[1].expectedVersion === beforeAbort.workspaceVersion, "R6 changed operation identity or rebased an unseen workspace");
  check(completed.status() === 200, "R6 withdrawal after preference save must succeed");
  await page.getByRole("status").filter({ hasText: "Response withdrawn from active use." }).first().waitFor();
  await page.getByText("This year's response is withdrawn.", { exact: false }).waitFor();
  let withdrawn = await json(await page.request.get(base + "/api/community-survey"));
  check(withdrawn.submittedStatus === "WITHDRAWN" && withdrawn.submitted === null && withdrawn.history.length === 1 && withdrawn.history[0].action === "WITHDRAWN", "R5/R6 workspace-only withdrawal lacks accurate state or invented a submission");
  check(!withdrawn.consentOpportunityRecommendations && !withdrawn.consentProgramRecommendations, "R6 withdrawal did not revoke current purposes");
  await page.unroute("**/api/community-survey");
  await page.getByRole("checkbox", { name: "Opportunity recommendations", exact: true }).check();
  await page.getByRole("button", { name: "Save preferences", exact: true }).click();
  await page.getByRole("status").filter({ hasText: "Optional preferences saved." }).first().waitFor();
  withdrawn = await json(await page.request.get(base + "/api/community-survey"));
  check(withdrawn.submittedStatus === "WITHDRAWN" && withdrawn.submitted === null && withdrawn.history.length === 1, "R5 purpose regrant must not restore withdrawn participation");
  check(await page.getByRole("button", { name: "Withdraw this year's response", exact: true }).count() === 0, "R5 UI falsely presents withdrawn participation as active");
  check(jsErrors.length === 0, "Unexpected browser JavaScript errors: " + jsErrors.join("; "));
  results.push("R6 precommit failure + preference save advances withdrawal token and succeeds once");
  results.push("R5 workspace-only withdrawal and regrant retain withdrawn UI/history without a submission");
  return { status: "PASS", checks: results, unexpectedJavaScriptErrors: jsErrors, userId: account.user.id };
}
