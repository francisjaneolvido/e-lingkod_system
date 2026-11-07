// Invoked by scripts/verify-flat2.mjs against guarded synthetic fixtures only.
// eslint-disable-next-line @typescript-eslint/no-unused-expressions
async (page, config) => {
  const { origin, credentials, output, phase = 'after' } = config;
const checks = [...(config.resumeChecks || [])], failures = [], screenshots = [...(config.resumeScreenshots || [])];
const carriedNames = new Set(checks.map(check => check.name));
const diagnostics = { runtime: [], console: [], responses: [], requests: [] };
const observe = target => {
target.on('pageerror', error => diagnostics.runtime.push({ path: new URL(target.url()).pathname, message: error.message }));
target.on('console', message => { if (message.type() === 'error') diagnostics.console.push({ path: new URL(target.url()).pathname, message: message.text() }); });
target.on('response', response => { if (response.status() >= 400) diagnostics.responses.push({ path: new URL(response.url()).pathname, status: response.status() }); });
target.on('requestfailed', request => { if (!request.failure()?.errorText.includes('ERR_ABORTED')) diagnostics.requests.push({ path: new URL(request.url()).pathname, error: request.failure()?.errorText }); });
};
observe(page);
const roleCookies = new Map(Object.entries(config.cachedRoleCookies || {}));
  const selection = config.only ? new RegExp(config.only, 'i') : null;
const progress = () => config.onProgress?.({ phase, syntheticOnly: true, checks, failures, screenshots, diagnostics });
  const check = (condition, message) => { if (!condition) throw Error(message); };
  const run = async (name, operation) => {
if (carriedNames.has(name)) return;
    if (selection && !selection.test(name)) return;
    try { await operation(); checks.push({ name, passed: true }); }
    catch (error) { const message = String(error.message).split('\n')[0]; checks.push({ name, passed: false }); failures.push({ name, message }); }
    progress();
  };
  const wait = () => page.waitForFunction(() => document.querySelector('[aria-label="Analytics overview"]')?.getAttribute('aria-busy') === 'false');
  async function signIn(role) {
    await page.context().clearCookies();
if (roleCookies.has(role)) {
await page.context().addCookies(roleCookies.get(role));
const session = await page.context().request.get(origin + '/api/auth/get-session');
if ((await session.json())?.user) return;
await page.context().clearCookies(); roleCookies.delete(role);
}
    let response;
    for (let attempt = 0; attempt < 3; attempt++) {
      response = await page.context().request.post(origin + '/api/auth/sign-in/email', { headers: { origin }, data: credentials[role] });
      if (response.status() !== 429 || attempt === 2) break;
      // Independent reviewers may share this disposable server's auth limiter.
      await page.waitForTimeout(Math.min(30, Math.max(11, Number(response.headers()['retry-after']) || 11)) * 1000);
    }
    check(response.status() === 200, 'Synthetic ' + role + ' authentication failed (' + response.status() + ').');
    roleCookies.set(role, await page.context().cookies(origin));
  }
  async function analytics() {
    await page.goto(origin + '/admin/census/analytics', { waitUntil: 'domcontentloaded' });
    await page.getByRole('heading', { name: 'Workforce analytics', exact: false }).waitFor();
    await page.locator('[aria-label="Analytics overview"]').waitFor();
    await wait();
  }
async function capture(name, target = page) {
    const file = `${phase}-${name}.png`;
await target.screenshot({ path: output + '/' + file, fullPage: false, caret: 'initial' }); screenshots.push(file);
  }
  await signIn('admin'); await analytics();
  await run('two geographic maps occupy overview slots 3 and 6', async () => {
    check(await page.locator('[data-barangay-map]').count() === 2, 'Expected two real geographic maps.');
    for (const slot of [3, 6]) {
      const map = page.locator(`[data-barangay-map][data-map-slot="${slot}"]`);
      check(await map.count() === 1, 'Missing geographic map in slot ' + slot + '.');
      const shapes = await map.locator('svg .elb-map-region[role="button"]').evaluateAll(nodes => nodes.map(node => node.getAttribute('d') || node.querySelector('path')?.getAttribute('d') || ''));
      check(shapes.length === 14, 'Every municipal barangay must remain represented.');
      check(new Set(shapes).size === 14 && shapes.every(shape => shape.length > 20), 'Maps must contain distinct geographic paths.');
      check(await map.getByRole('button', { name: 'Table', exact: true }).count() === 1, 'Map needs a table alternative.');
    }
  });
  await run('map selection opens a keyboard accessible dialog and restores focus', async () => {
    const map = page.locator('[data-barangay-map][data-map-slot="3"]');
    const region = map.locator('.elb-map-region[role="button"]').first();
    check(await region.count() === 1, 'Map region missing.');
    await region.focus(); await page.keyboard.press('Enter');
    const dialog = page.getByRole('dialog', { name: /Barangay details/i });
    await dialog.waitFor();
    check(await dialog.evaluate(element => element.contains(document.activeElement)), 'Focus must move into the dialog.');
    await page.keyboard.press('Tab');
    check(await dialog.evaluate(element => element.contains(document.activeElement)), 'Tab focus must remain in the dialog.');
    await page.keyboard.press('Escape'); await dialog.waitFor({ state: 'hidden' });
    check(await region.evaluate(element => document.activeElement === element), 'Escape must return focus to the selected region.');
    await map.getByRole('button', { name: 'Table', exact: true }).click();
    const table = map.getByRole('table'); await table.waitFor();
    check(await table.locator('tbody tr').count() === 14, 'Table alternative must retain all 14 barangays.');
    const button = table.locator('tbody tr').first().getByRole('button').first();
    check(await button.count() === 1, 'Barangay table needs selectable rows.');
    await button.click(); await dialog.waitFor(); await page.keyboard.press('Escape');
    check(await button.evaluate(element => document.activeElement === element), 'Dialog must return focus to the table selection.');
  });
  await run('analytics draft filters require Apply and Reset restores defaults', async () => {
    await analytics();
    const applied = page.locator('.elb-applied-summary');
    const before = await applied.innerText(), beforeUrl = page.url();
    await page.getByRole('form', { name: 'Analytics filters' }).getByLabel(/^Barangay/).selectOption('Bambang');
    await page.waitForTimeout(650);
    check(await applied.innerText() === before && page.url() === beforeUrl, 'Changing a draft filter must preserve the applied view.');
    const response = page.waitForResponse(r => r.url().includes('/api/admin/census/analytics?') && r.request().method() === 'GET');
    await page.getByRole('button', { name: 'Apply analytics filters', exact: true }).click();
    check((await response).status() === 200, 'Applying filters must load the filtered analytics.');
    await page.waitForFunction(() => location.search.includes('barangay=Bambang')).catch(() => { throw Error('Apply must publish the selected barangay in the applied URL.'); });
    check((await applied.innerText()).includes('Bambang'), 'Applied view must state the selected barangay.');
    await page.getByRole('button', { name: 'Reset all filters', exact: true }).first().click(); await wait();
    await page.waitForFunction(() => !new URLSearchParams(location.search).get('barangay')).catch(() => { throw Error('Reset filters must restore the applied authorized default view.'); });
    check(!(await applied.innerText()).includes('Bambang'), 'Reset must restore the unrestricted authorized view.');
  });
  await run('theme cycles once per activation without focus or scroll jumps', async () => {
    await analytics();
    const toggle = page.locator('.elb-theme-trigger:visible');
    check(await toggle.count() === 1, 'Exactly one theme cycle control must be visible.');
    const initial = await page.locator('html').getAttribute('data-theme');
    const order = ['light', 'dark', 'oled'];
    for (let index = 1; index <= 3; index++) {
      await toggle.focus(); const y = await page.evaluate(() => scrollY);
      await page.keyboard.press('Enter');
      await page.waitForFunction(expected => document.documentElement.dataset.theme === expected, order[(order.indexOf(initial) + index) % 3]);
      check(await toggle.evaluate(element => document.activeElement === element), 'Theme control must retain keyboard focus.');
      check(Math.abs(await page.evaluate(() => scrollY) - y) < 3, 'Theme cycling must retain the scroll position.');
      check((await toggle.getAttribute('aria-label') || '').toLowerCase().includes('theme'), 'Theme control needs an accessible state label.');
    }
    await page.reload({ waitUntil: 'domcontentloaded' });
    check(await page.locator('html').getAttribute('data-theme') === initial, 'Theme choice must persist after reload.');
  });
  await run('geographic API distinguishes valid zero, missing, and out of scope data', async () => {
    const response = await page.context().request.get(origin + '/api/admin/census/analytics');
    check(response.status() === 200, 'Synthetic Admin must receive geography.');
    const payload = await response.json();
    const geography = payload.groups?.[0]?.geography;
    check(geography, 'Analytics group must expose scoped geography.');
    check(geography.scope === 'municipal' && geography.cells.length === 14 && geography.authorizedCodes.length === 14, 'Admin geography must retain all 14 authorized areas.');
    const bambang = geography.cells.find(cell => cell.filterKey === 'Bambang');
    const maahas = geography.cells.find(cell => cell.filterKey === 'Maahas');
    const anos = geography.cells.find(cell => cell.filterKey === 'Anos');
    check(bambang?.eligible === 2 && maahas?.eligible === 1, 'Geographic totals must match retained annual synthetic records.');
    check(anos?.values['eligible-records'].value === 0, 'Authorized zero-response barangays must retain a real zero.');
    check(anos?.values['training-interest-yes'].value === null, 'An absent training answer must remain unknown instead of becoming zero.');
    for (const metric of geography.metrics) {
      const bins = metric.legend.bins;
      check(bins.every((bin, index) => bin.min <= bin.max && (!index || bins[index - 1].max < bin.min)), 'Geographic legend bins must not overlap.');
    }
  });
  await run('analytics and public pages avoid horizontal overflow at 1024, 768 and 390 pixels', async () => {
    for (const width of [1024, 768, 390]) {
      await page.setViewportSize({ width, height: 900 });
      for (const route of ['/', '/login', '/admin/census/analytics']) {
        await page.goto(origin + route, { waitUntil: 'domcontentloaded' });
        if (route === '/admin/census/analytics') await wait();
        check(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 2), route + ' overflows at ' + width + 'px.');
      }
      await capture('analytics-' + width);
    }
  });
  await run('mobile navigation opens, closes with Escape and returns focus', async () => {
    await page.setViewportSize({ width: 390, height: 844 }); await analytics();
    const opener = page.getByRole('button', { name: 'Open navigation', exact: true });
    await opener.click();
    await page.waitForFunction(() => document.querySelector('button[aria-label="Open navigation"]')?.getAttribute('aria-expanded') === 'true');
    await page.keyboard.press('Escape');
    await page.waitForFunction(() => document.querySelector('button[aria-label="Open navigation"]')?.getAttribute('aria-expanded') === 'false');
    check(await opener.evaluate(element => document.activeElement === element), 'Mobile drawer must return focus to its opener.');
  });
  await run('reduced motion disables map and dialog animations', async () => {
    await page.emulateMedia({ reducedMotion: 'reduce' }); await analytics();
    const animated = await page.locator('[data-barangay-map], [data-barangay-map] *').evaluateAll(nodes => nodes.filter(node => {
      const style = getComputedStyle(node), seconds = value => value.split(',').some(part => parseFloat(part) > 0.01);
      return seconds(style.animationDuration) || seconds(style.transitionDuration);
    }).length);
    check(await page.locator('[data-barangay-map]').count() === 2, 'Reduced-motion view needs the geographic maps.');
    check(animated === 0, 'Map motion must respect reduced-motion preferences.');
    await page.emulateMedia({ reducedMotion: 'no-preference' });
  });
  await run('scoped Staff geography does not expose another barangay', async () => {
    await signIn('staff');
    const response = await page.context().request.get(origin + '/api/admin/census/analytics');
    check(response.status() === 200, 'Synthetic scoped Staff can read authorized analytics.');
    const payload = await response.json();
    const geography = payload.groups?.[0]?.geography;
    check(geography, 'Scoped Staff must receive geography.');
    check(geography.scope === 'restricted' && geography.cells.length === 1 && geography.authorizedCodes.length === 1, 'Staff geographic data must contain only the authorized barangay.');
    check(geography.cells[0].filterKey === 'Bambang' && geography.cells[0].eligible === 2, 'Staff geographic totals must retain the existing Bambang scope.');
    check(!JSON.stringify(geography).includes('Maahas'), 'Out-of-scope geographic values must be absent.');
    const denied = await page.context().request.get(origin + '/api/admin/census/analytics?barangay=Maahas');
    check(denied.status() === 403, 'Explicit out-of-scope filters must be denied.');
    await analytics();
    const map = page.locator('[data-barangay-map][data-map-slot="3"]');
    const paths = map.locator('svg .elb-map-region');
    check(await paths.count() === 14, 'Geographic outline must retain out-of-scope areas.');
    check(await map.locator('.elb-map-region[role="button"]').count() === 1, 'Only the authorized Staff barangay may be interactive.');
    const outside = map.locator('.elb-map-region[data-state="outside"]');
    check(await outside.count() === 13, 'Out-of-scope barangays must have a distinct geographic state.');
    check(await outside.evaluateAll(nodes => nodes.every(node => !node.hasAttribute('tabindex') && !node.hasAttribute('role'))), 'Outside-scope outlines must not claim interactive statistics.');
  });
  await run('citizen and operations Staff cannot read protected census analytics', async () => {
    for (const role of ['citizen', 'operations']) {
      if (!credentials[role]) continue;
      await signIn(role);
      const denied = await page.context().request.get(origin + '/api/admin/census/analytics');
      check(denied.status() === 403, 'The synthetic ' + role + ' role must be denied census analytics.');
      const payload = await denied.text();
      check(!payload.includes('geography') && !payload.includes('Maahas-only'), 'Denied analytics responses must not expose protected statistics.');
    }
  });
  if (config.matrix) {
    const routes = [
      ['anonymous', '/', 'landing'], ['anonymous', '/login', 'login'], ['anonymous', '/register', 'registration'],
      ['anonymous', '/forgot-password', 'recovery'], ['anonymous', '/reset-password', 'recovery-invalid'],
      ['anonymous', '/services', 'services'], ['anonymous', '/track', 'tracking'], ['anonymous', '/emergency', 'emergency'],
      ['anonymous', '/projects', 'projects'], ['anonymous', '/opportunities', 'opportunities'],
      ['anonymous', '/community-employment', 'employment'], ['anonymous', '/community-employment/insights', 'public-insights'],
      ['anonymous', '/community-census', 'census-public'],
      ['citizen', '/dashboard', 'citizen-dashboard'], ['citizen', '/account', 'citizen-account'],
      ['citizen', '/account/profile', 'citizen-profile'], ['citizen', '/reports', 'citizen-reports'],
      ['citizen', '/reports/new', 'report-form'], ['citizen', '/reports/ui-report', 'citizen-report-detail'],
      ['citizen', '/services/requests', 'citizen-requests'], ['citizen', '/services/mayors-business-permit', 'service-intake'],
      ['citizen', '/services/requests/ui-state-ACTION_REQUIRED', 'correction'],
      ['citizen', '/services/requests/ui-state-SCHEDULED', 'appointment'],
      ['citizen', '/community-survey', 'individual-survey'], ['citizen', '/establishment-survey', 'establishment-survey'],
      ['citizen', '/opportunities/profile', 'opportunity-profile'], ['citizen', '/notifications', 'notifications'],
      ['admin', '/admin', 'admin-overview'], ['admin', '/admin/reports', 'admin-reports'],
      ['admin', '/admin/reports/ui-report', 'report-review'], ['admin', '/admin/services', 'admin-services'],
      ['admin', '/admin/services/ui-service-1', 'service-review'], ['admin', '/admin/services/catalog', 'service-catalog'],
      ['admin', '/admin/services/reports', 'service-reports'], ['admin', '/admin/citizens', 'citizens'],
      ['admin', '/admin/citizens/verification', 'identity-review'], ['admin', '/admin/staff', 'staff-authority'],
      ['admin', '/admin/emergency', 'emergency-authority'], ['admin', '/admin/census', 'protected-records'],
      ['admin', '/admin/census/imports', 'protected-import'], ['admin', '/admin/census/analytics', 'analytics'],
      ['admin', '/admin/jobs', 'jobs'], ['admin', '/admin/jobs/new', 'job-form'],
      ['admin', '/admin/jobs/insights', 'job-insights'], ['admin', '/admin/jobs/data', 'job-data'],
      ['admin', '/admin/jobs/demand', 'workforce-demand'], ['admin', '/admin/jobs/legacy-spes', 'legacy-spes'],
      ['admin', '/admin/projects', 'project-authority'], ['admin', '/admin/pulse', 'pulse'], ['admin', '/admin/profile', 'admin-profile'],
      ['operations', '/admin/services', 'scoped-services'], ['operations', '/admin/emergency', 'scoped-emergency'],
      ['staff', '/admin/census', 'scoped-records'], ['staff', '/admin/census/analytics', 'scoped-analytics'],
    ];
    for (const role of ['anonymous', 'citizen', 'admin', 'operations', 'staff']) {
      if (role === 'anonymous') await page.context().clearCookies();
      else if (credentials[role]) await signIn(role); else continue;
      for (const theme of ['light', 'dark', 'oled']) {
        await page.evaluate(theme => localStorage.setItem('elb-appearance', theme), theme);
        const widths = [1440, 1024, 768, 390];
        const workers = Math.max(1, Math.min(2, Number(config.matrixWorkers) || 1));
        await Promise.all(Array.from({ length: workers }, async () => {
          const target = workers === 1 ? page : await page.context().newPage();
          if (target !== page) { observe(target); target.setDefaultTimeout(18000); target.setDefaultNavigationTimeout(180000); }
          while (widths.length) {
          const width = widths.shift();
          await target.setViewportSize({ width, height: width === 390 ? 844 : 1000 });
          for (const [, route, name] of routes.filter(([routeRole]) => routeRole === role)) {
            await run(`matrix ${role} ${route} ${theme} ${width}px`, async () => {
              const response = await target.goto(origin + route, { waitUntil: 'domcontentloaded' });
              // A streamed loading boundary and its replacement may coexist
              // before hydration reveals the final page. Wait for readiness
              // before auditing landmarks or capturing editable controls.
              await target.locator('main:visible').first().waitFor();
              await target.waitForLoadState('networkidle');
              await target.getByRole('status', { name: 'Loading page', exact: true }).waitFor({ state: 'hidden' });
              if (route === '/admin/census/analytics') await target.waitForFunction(() => document.querySelector('[aria-label="Analytics overview"]')?.getAttribute('aria-busy') === 'false');
              await target.evaluate(() => document.fonts.ready);
              check(response.status() < 400, 'Material surface returned HTTP ' + response.status() + '.');
              check(!['/login', '/verification'].includes(new URL(target.url()).pathname) || route === new URL(target.url()).pathname, 'Synthetic material surface unexpectedly requires authentication or verification.');
              check(await target.locator('html').getAttribute('data-theme') === theme, 'Material surface lost its theme.');
              check(await target.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 2), 'Material surface has horizontal overflow.');
              check(await target.locator('main').count() > 0, 'Material surface needs a main landmark.');
              await capture(`${name}-${theme}-${width}`, target);
            });
          }
          }
          if (target !== page) await target.close();
        }));
      }
    }
  }
  await run('no unexpected runtime, server, or network errors', async () => {
    check(diagnostics.runtime.length === 0, 'Unexpected browser runtime errors: ' + diagnostics.runtime.map(row => row.message).join('; '));
    check(!diagnostics.responses.some(row => row.status >= 500), 'Unexpected HTTP server failures.');
    check(diagnostics.requests.length === 0, 'Unexpected failed network requests.');
    check(!diagnostics.console.some(row => !/^Failed to load resource: the server responded with a status of (401|403|404|409)/.test(row.message)), 'Unexpected browser console errors.');
  });
  return { phase, syntheticOnly: true, checks, failures, screenshots, diagnostics, privateRoleCookies: Object.fromEntries(roleCookies) };
}
