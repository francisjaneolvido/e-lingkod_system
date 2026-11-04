// Run against the guarded disposable census/UI fixture, never ordinary data.
// Catches a completed-training field positioned before the step's focus target.
// eslint-disable-next-line @typescript-eslint/no-unused-expressions
async page => {
  const base = 'http://localhost:3103', cases = [], issues = [], errors = [], failed = [], screenshots = [];
  const check = (ok, message, context) => { if (!ok) issues.push({ message, ...context }); };
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  page.on('requestfailed', request => { if (!request.failure()?.errorText.includes('ERR_ABORTED')) failed.push({ url: request.url(), error: request.failure()?.errorText }); });
  page.on('dialog', dialog => dialog.accept());
  const heading = name => page.getByRole('heading', { name, exact: true });
  const completed = () => page.getByRole('textbox', { name: /^Training you have completed/ });
  async function theme(value) {
    const button = page.locator('.elb-theme-trigger:visible');
    await button.waitFor();
    for (let n = 0; n < 3 && await page.locator('html').getAttribute('data-theme') !== value; n++) await button.click();
    await page.waitForFunction(value => document.documentElement.dataset.theme === value && !document.documentElement.hasAttribute('data-theme-changing'), value);
  }
  async function workStep() {
    await heading('Basic community profile').waitFor();
    await page.getByRole('button', { name: /^Next/ }).click();
    await heading('Skills you already have').waitFor();
    await page.getByRole('button', { name: /^Next/ }).click();
    await heading('Work, livelihood & opportunity interests').waitFor();
  }
  async function verifyEntry(entry, width, mode, answer) {
    const context = { entry, width, theme: mode };
    await heading('Training & skills development').waitFor();
    const focus = await heading('Training & skills development').evaluate(element => {
      const rect = element.getBoundingClientRect(), header = document.querySelector('header');
      const stickyBottom = header && ['fixed', 'sticky'].includes(getComputedStyle(header).position) ? Math.max(0, header.getBoundingClientRect().bottom) : 0;
      return { focused: element === document.activeElement, top: rect.top, bottom: rect.bottom, stickyBottom, viewport: innerHeight };
    });
    check(focus.focused && focus.top >= focus.stickyBottom && focus.bottom <= focus.viewport, 'Training heading is not focused and visible below sticky navigation', { ...context, focus });
    const arrival = '.scratch/features-5-6/artifacts/theme-consistency-r1/screenshots/training-' + entry + '-' + width + '-' + mode + '-arrival.png';
    await page.screenshot({ path: arrival, caret: 'initial', animations: 'disabled' });
    screenshots.push(arrival);
    await page.keyboard.press('Tab');
    const firstTab = await completed().evaluate(element => ({ reached: element === document.activeElement, active: document.activeElement?.labels?.[0]?.textContent?.trim().slice(0, 120) || document.activeElement?.tagName }));
    check(firstTab.reached, 'First forward Tab skipped completed-training textarea', { ...context, firstTab });
    if (answer !== null) check(await completed().inputValue() === answer, 'Navigation lost unsaved completed-training answer', context);
    const screenshot = '.scratch/features-5-6/artifacts/theme-consistency-r1/screenshots/training-' + entry + '-' + width + '-' + mode + '.png';
    await page.screenshot({ path: screenshot, caret: 'initial', animations: 'disabled' });
    screenshots.push(screenshot);
    cases.push({ ...context, focus, firstTab });
  }
  await page.goto(base + '/login?next=/community-survey', { waitUntil: 'domcontentloaded' });
  await page.locator('#loginEmail').fill('b3.citizen@example.test');
  await page.locator('#loginPassword').fill('B3-browser-password-2026!');
  await page.getByRole('button', { name: /^log in$/i }).click();
  await page.waitForURL(url => url.pathname === '/community-survey', { waitUntil: 'domcontentloaded' });
  for (const width of [1440, 320]) for (const mode of ['light', 'dark', 'oled']) {
    await page.setViewportSize({ width, height: 900 });
    await theme(mode);
    await workStep();
    await page.getByRole('button', { name: /^Next/ }).click();
    await verifyEntry('next', width, mode, null);
    const answer = 'Synthetic completed First Aid training\nSynthetic digital-skills workshop ' + width + ' ' + mode;
    await completed().fill(answer);
    for (const nextMode of ['light', 'dark', 'oled', mode]) {
      await theme(nextMode);
      check(await completed().inputValue() === answer, 'Theme cycling lost unsaved completed-training answer', { width, theme: mode, nextMode });
    }
    await page.getByRole('button', { name: 'Previous', exact: true }).click();
    await heading('Work, livelihood & opportunity interests').waitFor();
    await page.getByRole('button', { name: 'Skip optional section', exact: true }).click();
    await verifyEntry('skip', width, mode, answer);
    await page.getByRole('button', { name: /^Next/ }).click();
    await heading('Barriers & challenges').waitFor();
    await page.getByRole('button', { name: 'Previous', exact: true }).click();
    await verifyEntry('previous', width, mode, answer);
    const saved = page.waitForResponse(response => new URL(response.url()).pathname === '/api/community-survey' && response.request().method() === 'PUT');
    await page.getByRole('button', { name: 'Save draft', exact: true }).click();
    check((await saved).ok(), 'Draft mutation failed on disposable fixture', { width, theme: mode });
    await page.waitForFunction(() => [...document.querySelectorAll('button')].some(button => button.textContent.trim() === 'Save draft' && !button.disabled));
    await page.reload({ waitUntil: 'domcontentloaded' });
    await workStep();
    await page.getByRole('button', { name: /^Next/ }).click();
    await completed().waitFor();
    check(await completed().inputValue() === answer, 'Draft reload lost persisted completed-training answer', { width, theme: mode });
    cases.push({ entry: 'draft-save/reload', width, theme: mode, persisted: await completed().inputValue() === answer });
    for (let n = 0; n < 3; n++) await page.getByRole('button', { name: 'Previous', exact: true }).click();
  }
  return { passed: !issues.length && !errors.length && !failed.length, cases, issues, errors, failed, screenshots, ordinaryWrites: false };
}
