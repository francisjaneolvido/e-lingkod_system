// Exercise the combined municipal and reviewed UI implementations on an owned fixture.
// eslint-disable-next-line @typescript-eslint/no-unused-expressions
async page => {
  const base = process.env.ELB_BROWSER_BASE_URL || 'http://localhost:3123';
  if (!/^http:\/\/localhost:\d+$/.test(base)) throw Error('Loopback fixture origin required');
  const cases = [], errors = [], failed = [], issues = [], expectedDenials = [], screenshots = [], rateLimits = [];
  let expectedPageDenial = false;
  const check = (value, message, context) => { if (!value) issues.push({ message, ...context }); };
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') { if (expectedPageDenial && /status of 404/.test(message.text())) expectedDenials.push({ url: page.url(), message: message.text(), expected: 'Scoped page concealed with notFound' }); else errors.push({ url: page.url(), message: message.text() }); } });
  page.on('requestfailed', request => { if (!request.failure()?.errorText.includes('ERR_ABORTED')) failed.push({ url: request.url(), error: request.failure()?.errorText }); });
  page.on('response', response => { if (response.status() >= 500) errors.push({ url: response.url(), status: response.status() }); });
  const control = () => page.getByRole('button', { name: /Current theme:/ }).filter({ visible: true });
  async function theme(mode) {
    await control().waitFor();
    await page.waitForFunction(() => [...document.querySelectorAll('.elb-theme-trigger')].some(element => element.checkVisibility() && !element.disabled));
    for (let i = 0; i < 3 && await page.locator('html').getAttribute('data-theme') !== mode; i++) await control().click();
    await page.waitForFunction(mode => document.documentElement.dataset.theme === mode && !document.documentElement.hasAttribute('data-theme-changing'), mode);
  }
  async function login(email, password) {
    await page.context().clearCookies();
    await page.goto(base + '/login', { waitUntil: 'domcontentloaded' });
    await page.locator('#loginEmail').fill(email);
    await page.locator('#loginPassword').fill(password);
    for (let attempt = 0; attempt < 3; attempt++) {
      const response = page.waitForResponse(value => value.request().method() === 'POST' && new URL(value.url()).pathname === '/api/auth/sign-in/email');
      await page.getByRole('button', { name: /^log in$/i }).click();
      const result = await response;
      if (result.status() !== 429) {
        if (!result.ok()) throw Error('Synthetic login rejected: ' + result.status());
        await page.waitForURL(url => url.pathname !== '/login', { waitUntil: 'domcontentloaded' });
        return;
      }
      const seconds = Math.min(60, Math.max(11, Number(result.headers()['retry-after']) || 60));
      rateLimits.push({ attempt, seconds });
      await new Promise(resolve => setTimeout(resolve, seconds * 1000));
    }
    throw Error('Bounded login retries exhausted; rate limit preserved');
  }
  const roles = [
    { role: 'public', routes: ['/projects', '/projects?tab=offices', '/login'] },
    { role: 'citizen', email: 'b3.citizen@example.test', password: 'B3-browser-password-2026!', routes: ['/projects', '/services/requests/ui-service-2', '/community-survey', '/establishment-survey', '/opportunities', '/admin/census'] },
    { role: 'staff', email: 'merge.staff@example.test', password: 'Municipal-browser-2026!', routes: ['/admin/projects', '/projects?tab=offices', '/admin/census'] },
    { role: 'admin', email: 'b3.admin@example.test', password: 'B3-browser-password-2026!', routes: ['/admin/projects', '/admin/census/analytics', '/admin/jobs/demand', '/admin/services/reports', '/admin/pulse'] },
  ];
  for (const actor of roles) {
    if (actor.email) await login(actor.email, actor.password);
    for (const width of [1440, 820, 390]) for (const mode of ['light', 'dark', 'oled']) {
      for (const route of actor.routes) {
        expectedPageDenial = route === '/admin/census' && actor.role !== 'admin';
        const response = await page.goto(base + route, { waitUntil: 'domcontentloaded' });
        await page.locator('h1').first().waitFor();
        await theme(mode);
        const context = { role: actor.role, width, theme: mode, route };
        await page.setViewportSize({ width, height: 1000 });
        check(expectedPageDenial ? [200, 404].includes(response.status()) : response.status() === 200, 'Combined page returned an unexpected status', { ...context, status: response.status() });
        check(await control().count() === 1, 'Expected exactly one visible cycling appearance control', context);
        const layout = await control().evaluate(element => {
          const rect = element.getBoundingClientRect();
          return { width: rect.width, height: rect.height, right: rect.right, viewport: innerWidth, overflow: document.documentElement.scrollWidth - innerWidth };
        });
        check(layout.width >= 44 && layout.height >= 44 && layout.right <= layout.viewport && layout.overflow <= 2, 'Appearance placement or page overflow', { ...context, layout });
        const label = await control().getAttribute('aria-label');
        check(label?.includes(mode === 'oled' ? 'OLED' : mode === 'dark' ? 'Dark' : 'Light'), 'Appearance label and applied mode disagree', context);
        await control().focus();
        // A pointer click intentionally does not activate :focus-visible.
        // Traverse away and back with actual keyboard input before measuring it.
        await page.keyboard.press('Tab');
        await page.keyboard.press('Shift+Tab');
        const outline = await control().evaluate(element => ({ style: getComputedStyle(element).outlineStyle, width: parseFloat(getComputedStyle(element).outlineWidth), focused: element === document.activeElement }));
        check(outline.focused && outline.style !== 'none' && outline.width >= 2, 'Cycling control has no visible keyboard focus', { ...context, outline });
        if (route.startsWith('/projects')) {
          const payload = await response.text();
          check(!/PRIVATE (?:DRAFT|PENDING)/.test(payload), 'Public response exposed unreviewed municipal content', context);
          if (route === '/projects') check(await page.getByText('[TEST] Municipal integration project', { exact: true }).count() > 0, 'Published fixture missing', context);
        }
        if (route === '/admin/projects') check(await page.getByRole('button', { name: '+ New project draft', exact: true }).count() === 1, 'Authorized municipal management unavailable', context);
        if (route === '/admin/census' && actor.role !== 'admin') {
          const denied = await page.request.get(base + '/api/admin/census/analytics');
          check(denied.status() === 403, 'Municipal authority leaked census analytics permission', { ...context, status: denied.status() });
          expectedDenials.push({ ...context, status: denied.status() });
        }
        if (['/admin/census/analytics', '/admin/jobs/demand', '/admin/services/reports', '/admin/pulse'].includes(route)) {
          await page.locator('details,table').first().waitFor({ state: 'attached' });
          check(await page.locator('svg').count() > 0, 'Insight visualization missing', context);
          check(await page.locator('details,table').count() > 0, 'Insight details/table alternative missing', context);
        }
        if (['/projects', '/projects?tab=offices', '/admin/projects', '/admin/census/analytics'].includes(route)) {
          const file = '.scratch/ui-main-integration/screenshots/combined-' + actor.role + '-' + route.replaceAll('/', '_').replaceAll('?', '_') + '-' + width + '-' + mode + '.png';
          await page.screenshot({ path: file, fullPage: true, caret: 'initial', animations: 'disabled' });
          screenshots.push(file);
        }
        cases.push({ ...context, layout, outline });
      }
      await theme('light');
      for (const [key, next] of [['Enter', 'dark'], [' ', 'oled'], ['Enter', 'light']]) {
        await control().focus();
        await control().press(key);
        await page.waitForFunction(next => document.documentElement.dataset.theme === next, next);
        check(await control().evaluate(element => element === document.activeElement), 'Cycling moved keyboard focus', { role: actor.role, width, next });
        check(await page.evaluate(() => localStorage.getItem('elb-appearance')) === next, 'Cycling preference did not persist', { role: actor.role, width, next });
      }
    }
  }
  return { passed: !issues.length && !errors.length && !failed.length, cases, issues, errors, failed, expectedDenials, screenshots, rateLimits, ordinaryWrites: false };
}
