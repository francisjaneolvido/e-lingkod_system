// A concealed municipal desk must render its recovery page without a React error.
// eslint-disable-next-line @typescript-eslint/no-unused-expressions
async page => {
  const base = process.env.ELB_BROWSER_BASE_URL || 'http://localhost:3123';
  const errors = [], cases = [], issues = [], failed = [];
  page.on('pageerror', error => errors.push({ url: page.url(), message: error.message }));
  page.on('requestfailed', request => { if (!request.failure()?.errorText.includes('ERR_ABORTED')) failed.push(request.url()); });
  const response = await page.request.post(base + '/api/auth/sign-in/email', { headers: { origin: base }, data: { email: 'merge.denied@example.test', password: 'Municipal-browser-2026!' } });
  if (!response.ok()) throw Error('Synthetic denial login failed: ' + response.status());
  for (const width of [1440, 820, 390]) for (const mode of ['light', 'dark', 'oled']) {
    await page.setViewportSize({ width, height: 1000 });
    await page.evaluate(mode => localStorage.setItem('elb-appearance', mode), mode);
    const result = await page.goto(base + '/admin/projects', { waitUntil: 'networkidle' });
    await page.getByRole('heading', { name: 'This page isn’t available.', exact: true }).waitFor();
    const recovery = page.getByRole('link', { name: 'Return home', exact: true });
    await recovery.waitFor();
    const context = { width, theme: mode, status: result.status() };
    if (!(await recovery.isVisible()) || await page.getByRole('button', { name: '+ New project draft', exact: true }).count()) issues.push({ ...context, message: 'Recovery absent or municipal editor exposed' });
    const denied = await page.request.post(base + '/api/admin/projects', { headers: { origin: base }, data: { action: 'project.save', title: '[TEST] Unauthorized operation must be rejected' } });
    if (denied.status() !== 403) issues.push({ ...context, message: 'Unauthorized mutation was not denied', status: denied.status() });
    const theme = page.getByRole('button', { name: /Current theme:/ }).filter({ visible: true });
    if (await theme.count() !== 1) issues.push({ ...context, message: 'Recovery must retain one appearance control' });
    await recovery.focus();
    const focus = await recovery.evaluate(element => ({ focused: document.activeElement === element, outline: getComputedStyle(element).outlineStyle, width: parseFloat(getComputedStyle(element).outlineWidth) }));
    if (!focus.focused || focus.outline === 'none' || focus.width < 2) issues.push({ ...context, message: 'Recovery focus is not visible', focus });
    cases.push({ ...context, mutationStatus: denied.status(), focus });
  }
  return { passed: !errors.length && !issues.length && !failed.length, cases, errors, issues, failed, ordinaryWrites: false };
}
