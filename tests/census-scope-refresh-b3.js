// Against the disposable census browser fixture, never an application database.
// eslint-disable-next-line @typescript-eslint/no-unused-expressions -- Playwright CLI function.
async page => {
  const base = 'http://localhost:3103', check = (value, message) => { if (!value) throw Error(message); };
  const secondContext = await page.context().browser().newContext();
  const other = await secondContext.newPage();
  async function login(target, email) {
    await target.goto('about:blank'); await new Promise(r => setTimeout(r, 11000));
    await target.goto(base + '/login?next=%2Fadmin%2Fcensus');
    await target.locator('#loginEmail').fill(email);
    await target.locator('#loginPassword').fill('B3-browser-password-2026!');
    await target.getByRole('button', { name: /^log in$/i }).click();
    await target.getByRole('heading', { name: 'Staff record scope', exact: true }).waitFor();
  }
  const editor = target => target.getByRole('heading', { name: 'Staff record scope', exact: true }).locator('..');
  async function authority(target) {
    const response = await target.request.get(base + '/api/admin/census/records?view=authority');
    check(response.ok(), 'Authority read failed'); return response.json();
  }
  try {
    await page.context().clearCookies();
    await login(page, 'b3.admin@example.test');
    const before = (await authority(page)).find(s => s.name === 'Browser Staff');
    await editor(page).getByRole('combobox').selectOption(before.id);
    check(await editor(page).getByRole('checkbox', { name: 'Bambang', exact: true }).isChecked(), 'Admin A did not load original scope');
    await login(other, 'b3.administrator@example.test');
    await editor(other).getByRole('combobox').selectOption(before.id);
    await editor(other).getByRole('checkbox', { name: 'Bambang', exact: true }).uncheck();
    await editor(other).getByRole('button', { name: 'Save record scope', exact: true }).click();
    await other.getByRole('status').filter({ hasText: 'Saved.' }).waitFor();
    const revoked = (await authority(other)).find(s => s.id === before.id);
    check(JSON.parse(revoked.censusScope.barangaysJson).length === 0, 'Admin B revocation failed');
    const refreshed = page.waitForResponse(r => r.url().includes('/api/admin/census/records?view=authority') && r.ok());
    await page.getByRole('button', { name: 'Maintain Bambang roster', exact: true }).click();
    await page.getByRole('checkbox', { name: /Browser Denied/ }).first().check();
    await page.getByRole('button', { name: 'Confirm assistance roster', exact: true }).click();
    await refreshed;
    await editor(page).getByText('Record scope changed in another session. Reload before saving.', { exact: true }).waitFor();
    const save = editor(page).getByRole('button', { name: 'Save record scope', exact: true });
    // The reviewed UI sends its stale checkboxes with the refreshed version here.
    if (!await save.isDisabled()) {
      const response = page.waitForResponse(r => r.url().endsWith('/api/admin/census/records') && r.request().method() === 'POST');
      await save.click(); await response;
    }
    const after = (await authority(page)).find(s => s.id === before.id);
    check(after.censusScope.version === revoked.censusScope.version && JSON.parse(after.censusScope.barangaysJson).length === 0, 'R3: background authority refresh undid Admin B revocation');
    check(await save.isDisabled(), 'Stale scope edit is still enabled');
    await editor(page).getByRole('button', { name: 'Reload record scope', exact: true }).click();
    check(!await editor(page).getByRole('checkbox', { name: 'Bambang', exact: true }).isChecked(), 'Explicit reload did not reconcile checkbox values');
    check(!await save.isDisabled(), 'Freshly reloaded scope cannot be saved');
    return { result: 'PASS', twoAdminSessions: true, originalVersion: before.censusScope.version, revokedVersion: revoked.censusScope.version, preservedVersion: after.censusScope.version, staleSaveBlocked: true, explicitReload: true };
  } finally { await secondContext.close(); }
}
