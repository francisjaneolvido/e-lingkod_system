// Playwright CLI, against scripts/verify-census-records.mjs --serve only.
// eslint-disable-next-line @typescript-eslint/no-unused-expressions -- CLI evaluates the function.
async page => {
  const base = 'http://localhost:3103', errors = [], serverErrors = [], failed = [];
  const check = (value, message) => { if (!value) throw Error(message); };
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('response', r => { if (r.status() >= 500) serverErrors.push(r.url()); });
  page.on('requestfailed', r => { if (!r.failure()?.errorText.includes('ERR_ABORTED')) failed.push(r.url()); });
  async function login(name) {
    await page.goto('about:blank'); await page.context().clearCookies(); await new Promise(r => setTimeout(r, 11000));
    await page.goto(base + '/login?next=' + encodeURIComponent(name === 'citizen' ? '/community-survey' : '/admin/census'));
    await page.locator('#loginEmail').fill(`b3.${name}@example.test`); await page.locator('#loginPassword').fill('B3-browser-password-2026!');
    const response = page.waitForResponse(r => r.url().endsWith('/api/auth/sign-in/email') && r.request().method() === 'POST');
    await page.getByRole('button', { name: /^log in$/i }).click(); check((await response).ok(), 'Sign in failed'); await page.waitForURL(u => u.pathname !== '/login');
  }
  await login('citizen');
  check((await page.request.get(base + '/api/admin/census/records')).status() === 403, 'Citizen leaked protected records');
  await login('staff'); await page.getByRole('heading', { name: 'Protected census records', exact: true }).waitFor();
  await page.getByRole('button', { name: 'View details and history' }).first().waitFor();
  check(await page.getByRole('button', { name: /Maintain .* roster/ }).count() === 0, 'Staff can maintain roster');
  for (const width of [1440, 820, 390]) { await page.setViewportSize({ width, height: 1000 }); check(await page.locator('body').evaluate(e => e.scrollWidth <= window.innerWidth + 2), 'Horizontal overflow at ' + width); }
  await page.getByRole('button', { name: 'View details and history' }).first().click();
  const dialog = page.getByRole('dialog'); await dialog.waitFor();
  await dialog.getByText('Immutable history · 22 revisions', { exact: true }).waitFor();
  await dialog.getByLabel('Review action', { exact: true }).first().selectOption('VERIFIED');
  await dialog.getByLabel('Review note (optional)', { exact: true }).first().fill('Synthetic scoped browser verification');
  await dialog.getByRole('button', { name: 'Record review event' }).first().click();
  await dialog.getByText(/VERIFIED · Browser Staff/).waitFor();
  await dialog.getByRole('button', { name: 'Next history' }).click(); await dialog.getByText('Revision 1 · SUBMITTED', { exact: true }).waitFor();
  await page.keyboard.press('Escape'); check(!await dialog.isVisible(), 'Escape did not close details');
  await page.getByLabel('Record type', { exact: true }).selectOption('ESTABLISHMENT'); await page.getByRole('button', { name: 'Apply filters' }).click();
  await page.getByRole('heading', { name: '[DEMO] Browser Organization', exact: true }).waitFor();
  await login('admin'); await page.getByRole('heading', { name: 'Protected census records', exact: true }).waitFor();
  await page.getByRole('button', { name: 'Maintain Bambang roster', exact: true }).click();
  await page.getByRole('checkbox', { name: /Browser Denied/ }).first().check();
  await page.getByRole('button', { name: 'Confirm assistance roster', exact: true }).click();
  await page.getByText('1 designated staff', { exact: true }).waitFor();
  const roster = await (await page.request.get(base + '/api/admin/census/records?view=roster')).json();
  check(roster.find(r => r.barangay === 'Bambang').count === 1, 'Roster count not persisted');
  check(roster.find(r => r.barangay === 'Maahas').count === null, 'Unconfigured roster became zero');
  await page.goto(base + '/admin/census/imports'); await page.getByRole('heading', { name: 'Census imports and provenance', exact: true }).waitFor();
  const csv = 'Reference,Barangay,Age,Education\nA,Bambang,25-34,college\nA,Bambang,25-34,college\nB,Bambang,25-34,college\nC,Bambang,35-44,college\nC,Bambang,45-54,college\nD,Bambang,bad-age,college\n';
  await page.getByLabel(/Source file/).setInputFiles({ name: 'b3-browser.csv', mimeType: 'text/csv', buffer: Buffer.from(csv) });
  await page.getByRole('button', { name: 'Inspect source columns' }).click();
  await page.getByLabel('Map Age', { exact: true }).selectOption('ageGroup'); await page.getByLabel('Map Education', { exact: true }).selectOption('educationLevel');
  await page.getByLabel('Stable dataset source name/code').fill('BROWSER-SYNTHETIC'); await page.getByLabel('Source survey year', { exact: true }).fill('2025');
  await page.getByLabel('Activity date (optional; separate from source survey year)', { exact: true }).fill('2026-02-17');
  await page.getByLabel('Coverage (optional)', { exact: true }).fill('Synthetic Bambang coverage');
  await page.getByLabel('Original purpose (optional)', { exact: true }).fill('Historical source purpose');
  await page.getByLabel('Source notes (optional)', { exact: true }).fill('Browser provenance evidence');
  await page.getByLabel('Activity name', { exact: true }).fill('Synthetic browser source'); await page.getByLabel('Implementing office', { exact: true }).fill('PESO');
  await page.getByRole('button', { name: 'Validate mapped import' }).click(); await page.getByRole('heading', { name: 'Validated preview' }).waitFor();
  await page.getByRole('button', { name: 'Save validated import batch' }).click(); await page.getByRole('status').filter({ hasText: 'Imported 2; skipped 1; rejected 1; review needed 2.' }).waitFor();
  await page.getByRole('button', { name: 'Save validated import batch' }).click(); await page.getByRole('status').filter({ hasText: 'Original batch replayed.' }).waitFor();
  await page.getByText('CSV record 6 · REVIEW_NEEDED', { exact: true }).waitFor();
  await page.getByText('CSV record 7 · REJECTED', { exact: true }).waitFor();
  const batches = await (await page.request.get(base + '/api/admin/census/imports')).json();
  const batch = batches.batches.find(b => b.sourceKey === 'BROWSER-SYNTHETIC');
  check(batch.surveyYear === 2025 && batch.activity.activityDate === '2026-02-17T00:00:00.000Z', 'Activity date was lost or confused with source survey year');
  check(batch.activity.coverage === 'Synthetic Bambang coverage' && batch.activity.originalPurpose === 'Historical source purpose' && batch.activity.notes === 'Browser provenance evidence', 'Browser source provenance was discarded');
  await page.keyboard.press('Tab'); check(await page.evaluate(() => document.activeElement?.tagName !== 'BODY'), 'No keyboard access');
  check(errors.length === 0, JSON.stringify(errors)); check(serverErrors.length === 0, JSON.stringify(serverErrors)); check(failed.length === 0, JSON.stringify(failed));
  return { result: 'PASS', uiLogins: 3, viewports: [1440, 820, 390], completeHistory: 22, importOutcomes: { imported: 2, skipped: 1, rejected: 1, reviewNeeded: 2 }, exactImportReplay: true, errors, serverErrors, failed };
}
