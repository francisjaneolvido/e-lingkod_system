import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

/** Only the two reference pages; authentication is supplied by a private synthetic session. */
export async function runReferenceBrowser({ browser, origin, adminState, output }) {
  if (origin !== 'http://localhost:3117') throw Error('Synthetic preview origin required.');
  const checks = [];
  const assert = (value, message) => { if (!value) throw Error(message); };
  const run = async (name, operation) => {
    try { await operation(); checks.push({ name, passed: true }); }
    catch (error) { checks.push({ name, passed: false, message: String(error.message).split('\n')[0] }); }
  };
  const publicContext = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const adminContext = await browser.newContext({ storageState: adminState, viewport: { width: 1440, height: 1000 } });
  try {
    const page = await publicContext.newPage(); page.setDefaultTimeout(20000); page.setDefaultNavigationTimeout(180000);
    await page.goto(origin, { waitUntil: 'domcontentloaded' });
    await page.locator('.gateway-start').waitFor();
    await page.evaluate(() => document.fonts.ready);
    await run('existing carousel keyboard, touch, reduced motion and failed-image behavior', async () => {
      const code = fs.readFileSync('tests/hero-carousel-browser.js', 'utf8');
      const verify = new vm.Script('(' + code + ')').runInThisContext();
      const result = await verify(page);
      assert(result.length > 15, 'Carousel checks did not complete.');
    });
    await page.goto(origin, { waitUntil: 'domcontentloaded' });
    await page.locator('.gateway-start').waitFor();
    await run('guided task choice has one contextual next action and survives theme changes', async () => {
      await page.setViewportSize({ width: 390, height: 900 });
      const first = page.getByRole('radio', { name: 'Report a concern', exact: true });
      await first.focus(); await page.keyboard.press('ArrowRight');
      assert(await page.getByRole('radio', { name: 'Request a service', exact: true }).isChecked(), 'Arrow navigation must select the next task.');
      const next = page.locator('.gateway-continue');
      assert(await next.getAttribute('href') === '/services', 'Selected service has wrong next step.');
      assert(new URL(page.url()).pathname === '/', 'Choosing a task must not navigate prematurely.');
      const before = await page.locator('.gateway-start').boundingBox();
      await page.getByRole('button', { name: /Current theme:.*Switch to/ }).first().click();
      assert(await page.getByRole('radio', { name: 'Request a service', exact: true }).isChecked(), 'Theme change lost task selection.');
      await page.getByRole('radio', { name: 'Find opportunities', exact: true }).check();
      assert(await next.getAttribute('href') === '/community-employment', 'Opportunity entry point changed.');
      const after = await page.locator('.gateway-start').boundingBox();
      assert(Math.abs(before.height-after.height) < 3, 'Task preview changes must not move hit targets.');
      const panel = await page.locator('.gateway-start').boundingBox(), photo = await page.locator('.public-photo').boundingBox();
      assert(panel.y < photo.y, 'Functional entrance must precede illustration on mobile.');
      await first.check();
    });
    await run('service search, empty recovery, category controls and details stay usable', async () => {
      const search = page.getByLabel('Find a service', { exact: true });
      await search.fill('bagyo');
      assert(await page.locator('.public-service-entry').count() === 1, 'Emergency keyword search must find one service.');
      await page.locator('.public-service-entry').getByRole('button').click();
      const dialog = page.getByRole('dialog'); await dialog.waitFor();
      await page.keyboard.press('Escape'); await dialog.waitFor({ state: 'hidden' });
      await search.fill('zz-no-matching-service');
      await page.getByRole('heading', { name: 'No services match your search.' }).waitFor();
      await page.getByRole('button', { name: 'Clear filters', exact: true }).click();
      assert(await page.locator('.public-service-entry').count() === 6, 'Clearing search must restore the full directory.');
      await page.getByRole('button', { name: 'Community', exact: true }).click();
      assert(await page.locator('.public-service-entry').count() > 0 && await page.locator('.public-service-entry').count() < 6, 'Category control must filter the directory.');
      await page.getByRole('button', { name: 'All services', exact: true }).click();
    });
    await run('report tracker retains validation and private-detail guidance', async () => {
      await page.getByLabel('Tracking ID', { exact: true }).fill('invalid');
      await page.getByRole('button', { name: 'Track', exact: true }).click();
      await page.getByRole('alert').filter({ hasText: 'Enter your full tracking ID' }).waitFor();
      assert(await page.locator('#track-demo').getByRole('link', { name: /open My Reports/i }).count() === 1, 'Protected report link missing.');
    });

    const analytics = await adminContext.newPage(); analytics.setDefaultTimeout(20000); analytics.setDefaultNavigationTimeout(180000);
    const session = await adminContext.request.get(origin + '/api/auth/get-session');
    if ((await session.json())?.user?.role !== 'ADMIN') throw Error('Private synthetic Admin session expired; verify access first.');
    for (const population of ['INDIVIDUAL', 'ESTABLISHMENT', 'IMPORTS', 'SPES']) {
      await run(population + ' preserves maps, bars, distributions and source units', async () => {
        await analytics.goto(origin + '/admin/census/analytics?population=' + population + '&period=CURRENT&year=2026', { waitUntil: 'domcontentloaded' });
        await analytics.waitForFunction(() => document.querySelector('[aria-label="Analytics overview"]')?.getAttribute('aria-busy') === 'false');
        assert(await analytics.locator('[data-barangay-map]').count() >= 2, 'Both geographic metrics must remain available.');
        assert(await analytics.locator('[data-chart-type="bar"]').count() >= 1, 'Ranked bars missing.');
        assert(await analytics.locator('[data-chart-type="donut"]').count() >= 1, 'Appropriate distributions missing.');
        assert((await analytics.locator('.reference-reading-key').first().innerText()).includes('not municipality totals'), 'Source context must remain visible.');
        const before = analytics.url();
        const bar = analytics.locator('.reference-atlas .elb-chart-row').first();
        if (await bar.count()) {
          await bar.click(); assert(await bar.getAttribute('aria-pressed') === 'true', 'Bar selection feedback missing.');
          assert(analytics.url() === before, 'Chart highlight must not change filters.');
          await bar.press('Enter'); assert(await bar.getAttribute('aria-pressed') === 'false', 'Keyboard must clear the selection.');
        }
        const donut = analytics.locator('.reference-atlas .elb-donut-key').first();
        if (await donut.count()) {
          await donut.click(); assert(await donut.getAttribute('aria-pressed') === 'true', 'Donut selection feedback missing.');
          assert(analytics.url() === before, 'Distribution highlight must not change filters.');
        }
      });
    }
    await run('complete assistance roster remains a readable table below the overview', async () => {
      const roster = analytics.locator('.reference-roster table');
      assert(await roster.locator('tbody tr').count() === 14, 'All 14 roster entries must remain available.');
      assert(await roster.locator('thead th').count() === 3, 'Roster field headings missing.');
    });
  } finally {
    await publicContext.close(); await adminContext.close();
    fs.writeFileSync(path.join(output, 'reference-summary.json'), JSON.stringify({ completed: true, syntheticOnly: true, checks }, null, 2));
  }
  return checks;
}
