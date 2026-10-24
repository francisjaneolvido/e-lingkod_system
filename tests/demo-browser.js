// Maintained Playwright CLI journey. Requires npm run demo:dev on port 3102.
// eslint-disable-next-line @typescript-eslint/no-unused-expressions -- CLI evaluates function.
async page => {
  const base = 'http://localhost:3102';
  const check = (ok, message) => { if (!ok) throw Error(message); };
  const consoleErrors = [], serverErrors = [], networkFailures = [];
  page.on('pageerror', error => consoleErrors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') consoleErrors.push(message.text()); });
  page.on('response', response => { if (response.status() >= 500) serverErrors.push({ status: response.status(), url: response.url() }); });
  page.on('requestfailed', request => { if (!request.failure()?.errorText.includes('ERR_ABORTED')) networkFailures.push(request.url()); });
  async function login(email, password) {
    await page.goto('about:blank');
    await page.context().clearCookies();
    // Keep the installed shared sign-in bucket intact across four real UI logins.
    await new Promise(resolve => setTimeout(resolve, 11000));
    const next = email.startsWith('individual') ? '/community-survey' : email.startsWith('establishment') ? '/establishment-survey' : '/admin';
    await page.goto(base + '/login?next=' + encodeURIComponent(next));
    await page.locator('#loginEmail').fill(email);
    await page.locator('#loginPassword').fill(password);
    const response = page.waitForResponse(r => r.url().endsWith('/api/auth/sign-in/email') && r.request().method() === 'POST');
    await page.getByRole('button', { name: /^log in$/i }).click();
    check((await response).ok(), 'Real UI sign-in failed');
    await page.waitForURL(url => url.pathname !== '/login', { timeout: 20000 });
    check(await page.getByRole('complementary', { name: 'Demo environment' }).isVisible(), 'Demo marker missing');
  }
  await login('individual.02@example.test', 'ElbDemo2026!002');
  const sizes = [{ width: 1440, height: 1000 }, { width: 820, height: 1180 }, { width: 390, height: 844 }];
  for (const viewport of sizes) {
    await page.setViewportSize(viewport); await page.goto(base + '/community-survey');
    await page.getByRole('heading', { name: 'Personal Employment and Livelihood Survey', exact: true }).waitFor();
    check(await page.locator('body').evaluate(body => body.scrollWidth <= window.innerWidth + 2), `Horizontal overflow ${viewport.width}`);
    await page.keyboard.press('Tab');
    check(await page.evaluate(() => document.activeElement?.tagName !== 'BODY'), 'Keyboard cannot reach controls');
  }
  const stateResponse = await page.request.get(base + '/api/community-survey?year=2026');
  check(stateResponse.ok(), 'Own survey read failed');
  const state = await stateResponse.json();
  check(JSON.stringify(state).includes('SUBMITTED'), 'Persisted submitted state absent');
  await page.goto(base + '/opportunities');
  await page.getByText('[DEMO]', { exact: false }).filter({ visible: true }).first().waitFor();
  check((await page.locator('body').innerText()).includes('Synthetic Employer'), 'Persisted vacancies absent');
  await login('establishment.03@example.test', 'ElbDemo2026!083');
  await page.goto(base + '/establishment-survey');
  await page.getByRole('heading', { name: 'Establishment Profiling', exact: true }).waitFor();
  await page.getByRole('button', { name: /Corrected/ }).click();
  check(await page.getByLabel('Business name', { exact: true }).inputValue().then(v => v.includes('Corrected')), 'Identity correction missing in real form');
  const owned = await (await page.request.get(base + '/api/establishment-surveys')).json();
  check(JSON.stringify(owned).includes('Corrected'), 'Own establishment list missing');
  await page.getByRole('button', { name: 'Next', exact: true }).click();
  check(await page.getByLabel('Line of business / industry', { exact: true }).inputValue(), 'Industry category missing');
  await login('staff.02@example.test', 'ElbDemo2026!106');
  const denied = await page.request.post(base + '/api/admin/jobs', { headers: { origin: base }, data: {} });
  check(denied.status() === 403, 'Community-only staff unexpectedly allowed Jobs writes');
  await login('admin.01@example.test', 'ElbDemo2026!101');
  await page.goto(base + '/admin/jobs');
  await page.getByText('[DEMO]', { exact: false }).filter({ visible: true }).first().waitFor();
  check((await page.locator('body').innerText()).includes('Needs verification'), 'Admin review workflow absent');
  check(consoleErrors.length === 0, JSON.stringify({ consoleErrors }));
  check(serverErrors.length === 0, JSON.stringify({ serverErrors }));
  check(networkFailures.length === 0, JSON.stringify({ networkFailures }));
  return { result: 'PASS', realUiLogins: 4, viewports: sizes.map(v => v.width), journeys: ['individual persisted survey', 'published vacancies', 'establishment identity/category', 'staff permission denial', 'admin review list'], consoleErrors, serverErrors, networkFailures };
}
