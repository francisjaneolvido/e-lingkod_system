/* eslint-disable @typescript-eslint/no-unused-expressions -- Playwright evaluates this file as a function expression. */
async (page) => {
  const results = [];
  const check = (name, condition) => {
    if (!condition) throw new Error(name);
    results.push(name);
  };
  const base = page.url().startsWith('http') ? new URL(page.url()).origin : 'http://127.0.0.1:3103';
  await page.goto(`${base}/`);
  const photos = page.getByRole('region', { name: 'Community photos' });
  const hero = page.locator('#home');
  const next = photos.getByRole('button', { name: 'Next community photo' });
  const selected = index => photos.getByRole('button', { name: `Show community photo ${index} of 3` }).getAttribute('aria-pressed');
  await next.focus();
  const initialHeight = await hero.evaluate(el => el.getBoundingClientRect().height);
  check('Only the selected photo is mounted', await hero.locator('img').count() === 1);
  check('First photo loads eagerly', await hero.locator('img').getAttribute('loading') === 'eager');
  check('First photo has high fetch priority', await hero.locator('img').getAttribute('fetchpriority') === 'high');
  await next.click();
  check('Next advances', await selected(2) === 'true');
  check('Next retains focus', await next.evaluate(el => el === document.activeElement));
  check('Photo changes retain hero height', await hero.evaluate(el => el.getBoundingClientRect().height) === initialHeight);
  await next.press('End');
  check('End selects last', await selected(3) === 'true');
  await next.press('ArrowRight');
  check('Right arrow wraps', await selected(1) === 'true');
  await next.press('ArrowLeft');
  check('Left arrow wraps', await selected(3) === 'true');
  await next.press('Home');
  check('Home selects first', await selected(1) === 'true');
  const second = photos.getByRole('button', { name: 'Show community photo 2 of 3' });
  await second.focus();
  await second.press('Enter');
  check('Enter selects a photo without moving focus', await selected(2) === 'true' && await second.evaluate(el => el === document.activeElement));
  await page.emulateMedia({ reducedMotion: 'reduce' });
  for (const width of [320, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.waitForFunction(() => document.documentElement.scrollWidth <= innerWidth);
    check(`No overflow at ${width}px`, await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    check(`44px photo targets at ${width}px`, await photos.getByRole('button').evaluateAll(buttons => buttons.every(button => {
      const rect = button.getBoundingClientRect();
      return rect.width >= 44 && rect.height >= 44;
    })));
  }
  await next.press('Home');
  await hero.evaluate(el => {
    el.dispatchEvent(new TouchEvent('touchstart', { bubbles: true, touches: [new Touch({ identifier: 1, target: el, clientX: 250, clientY: 350 })] }));
    el.dispatchEvent(new TouchEvent('touchend', { bubbles: true, changedTouches: [new Touch({ identifier: 1, target: el, clientX: 80, clientY: 355 })] }));
  });
  check('Horizontal swipe advances', await selected(2) === 'true');
  await hero.evaluate(el => {
    el.dispatchEvent(new TouchEvent('touchstart', { bubbles: true, touches: [new Touch({ identifier: 1, target: el, clientX: 250, clientY: 350 })] }));
    el.dispatchEvent(new TouchEvent('touchend', { bubbles: true, changedTouches: [new Touch({ identifier: 1, target: el, clientX: 240, clientY: 550 })] }));
  });
  check('Vertical gestures leave photo unchanged', await selected(2) === 'true');
  await hero.locator('img').dispatchEvent('error');
  check('Image failures remove the broken image', await hero.locator('img').count() === 0);
  check('Image failures show useful fallback', await photos.getByText('Community image unavailable. Services remain available.').isVisible());
  check('Service link is preserved', await hero.locator('a[href="/#services"]').count() === 1);
  check('Tracking link is preserved', await hero.locator('a[href="/track"]').count() === 1);
  return results;
}
