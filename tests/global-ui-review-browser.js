// Run via Playwright CLI with the existing disposable census --serve --analytics
// runner on localhost:3103. Measures rendered application pages, never mocks.
// eslint-disable-next-line @typescript-eslint/no-unused-expressions
async page => {
  const base = 'http://localhost:3103', rows = [], focusChecks = [], failures = [], errors = [], network = [];
  const check = (ok, message) => { if (!ok) failures.push(message); };
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('response', r => { if (r.status() >= 500) network.push({url:r.url(), status:r.status()}); });
  async function login(role, next) {
    // Respect the real authentication limiter between fixture accounts.
    await new Promise(resolve => setTimeout(resolve, 11000));
    await page.context().clearCookies();
    await page.goto(base + '/login?next=' + encodeURIComponent(next));
    await page.locator('#loginEmail').fill('b3.' + role + '@example.test');
    await page.locator('#loginPassword').fill('B3-browser-password-2026!');
    await page.getByRole('button', {name:/^log in$/i}).click();
    await page.waitForURL(u => u.pathname !== '/login');
    // Avoid a moving screenshot crop during the site's optional smooth scroll.
    await page.addStyleTag({content:'html { scroll-behavior: auto !important; }'});
  }
  async function theme(t) {
    await page.waitForFunction(() => document.querySelector('#elb-appearance')?.value === document.documentElement.dataset.theme);
    // A same-value SSR select can look ready before its React handler exists.
    if(await page.locator('html').getAttribute('data-theme')===t){const other=t==='light'?'dark':'light';await page.getByLabel('Appearance',{exact:true}).selectOption(other);await page.waitForFunction(value=>document.documentElement.dataset.theme===value,other);}
    await page.getByLabel('Appearance', {exact:true}).selectOption(t);
    await page.waitForFunction(value=>document.documentElement.dataset.theme===value,t);
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  }
  async function measure(locator, label, image = false) {
    await locator.scrollIntoViewIfNeeded();
    await locator.evaluate(el=>el.scrollIntoView({behavior:'instant',block:'center'}));
    await page.evaluate(()=>document.fonts.ready);
    await page.evaluate(() => Promise.all(document.getAnimations().filter(a => a.effect?.getTiming().iterations !== Infinity).map(a => a.finished.catch(() => {}))));
    const style = await locator.evaluate(el => {
      const range=document.createRange();range.selectNodeContents(el);const box=el.getBoundingClientRect();
      return {color:getComputedStyle(el).color,style:el.getAttribute('style'),textRects:Array.from(range.getClientRects()).map(r=>({left:(r.left-box.left)/box.width,right:(r.right-box.left)/box.width,top:(r.top-box.top)/box.height,bottom:(r.bottom-box.top)/box.height}))};
    });
    let background;
    if (image) {
      // Sample the actual photograph + ::after overlay at every pixel behind
      // text-line bounds. Badge padding/rounded corners contain no text and
      // must not be mistaken for a foreground/background pairing.
      await locator.evaluate(el => { el.style.setProperty('color','transparent','important');el.style.setProperty('text-shadow','none','important'); });
      // Locator screenshots account for page scroll, unlike a viewport box
      // passed directly as a document-coordinate page screenshot clip.
      try { background = (await locator.screenshot({animations:'disabled',caret:'initial',scale:'css'})).toString('base64'); }
      finally { await locator.evaluate((el, saved) => { if(saved === null) el.removeAttribute('style'); else el.setAttribute('style',saved); }, style.style); }
    }
    const result = await locator.evaluate(async (el, {background, color, textRects}) => {
      // Let Chromium resolve rgb/oklab/color-mix and alpha into sRGB bytes.
      const probe=document.createElement('canvas');probe.width=probe.height=1;
      const probeCtx=probe.getContext('2d',{willReadFrequently:true});
      const rgb = s => {probeCtx.clearRect(0,0,1,1);probeCtx.fillStyle=s;probeCtx.fillRect(0,0,1,1);const p=probeCtx.getImageData(0,0,1,1).data;return [p[0],p[1],p[2],p[3]/255];};
      const over = (fg,bg) => {const alpha=fg[3]??1; return fg.slice(0,3).map((v,i)=>v*alpha+bg[i]*(1-alpha));};
      const luminance = c => c.slice(0,3).map(v=>v/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4).reduce((s,v,i)=>s+v*[.2126,.7152,.0722][i],0);
      const ratio = (a,b) => {const x=luminance(a),y=luminance(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05);};
      const fg=rgb(color); let min=Infinity, max=0, samples=0;
      if(background) {
        const image=new Image(); image.src='data:image/png;base64,'+background; await image.decode();
        const canvas=document.createElement('canvas');canvas.width=image.width;canvas.height=image.height;
        const ctx=canvas.getContext('2d');ctx.drawImage(image,0,0);const pixels=ctx.getImageData(0,0,image.width,image.height).data;
        for(let i=0;i<pixels.length;i+=4){const x=((i/4)%image.width+.5)/image.width,y=(Math.floor(i/4/image.width)+.5)/image.height;
          if(!textRects.some(r=>x>=r.left&&x<=r.right&&y>=r.top&&y<=r.bottom))continue;
          const bg=[pixels[i],pixels[i+1],pixels[i+2]];const value=ratio(over(fg,bg),bg);min=Math.min(min,value);max=Math.max(max,value);samples++;}
      } else {
        const layers=[];for(let p=el;p;p=p.parentElement)layers.push(rgb(getComputedStyle(p).backgroundColor));
        let bg=[255,255,255];for(const layer of layers.reverse())bg=over(layer,bg);
        min=max=ratio(over(fg,bg),bg);samples=1;
      }
      const box=el.getBoundingClientRect();return {min,max,samples,color,visible:box.width>0&&box.height>0,clipped:el.scrollWidth>el.clientWidth+1};
    }, {background,color:style.color,textRects:style.textRects});
    rows.push({label,...result});check(result.samples>0&&result.min>=4.5,label+' contrast '+result.min.toFixed(3));
    check(result.visible&&!result.clipped,label+' invisible/clipped');
  }
  async function focus(locator,label) {
    await locator.focus();await page.keyboard.press('Tab');await page.keyboard.press('Shift+Tab');
    await page.evaluate(() => Promise.all(document.getAnimations().filter(a => a.effect?.getTiming().iterations !== Infinity).map(a => a.finished.catch(() => {}))));
    check(await locator.evaluate(el=>el.matches(':focus-visible')&&getComputedStyle(el).outlineStyle!=='none'&&parseFloat(getComputedStyle(el).outlineWidth)>=2),label+' lacks keyboard focus');
    const saved=await locator.getAttribute('style');
    // Outline is outside the button, so compare its actual color with the
    // adjacent tab container (not the filled button's background).
    const ring=await locator.evaluate(el=>{const layers=[];for(let p=el.parentElement;p;p=p.parentElement)layers.push(getComputedStyle(p).backgroundColor);return {color:getComputedStyle(el).outlineColor,layers};});
    const ratio=await page.evaluate(({color,layers})=>{const canvas=document.createElement('canvas');canvas.width=canvas.height=1;const ctx=canvas.getContext('2d');const rgb=s=>{ctx.clearRect(0,0,1,1);ctx.fillStyle=s;ctx.fillRect(0,0,1,1);return Array.from(ctx.getImageData(0,0,1,1).data);};const lum=c=>c.slice(0,3).map(v=>v/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4).reduce((n,v,i)=>n+v*[.2126,.7152,.0722][i],0);let bg=[255,255,255];for(const layer of layers.reverse()){const fg=rgb(layer),a=fg[3]/255;bg=fg.slice(0,3).map((v,i)=>v*a+bg[i]*(1-a));}const a=lum(rgb(color)),b=lum(bg);return (Math.max(a,b)+.05)/(Math.min(a,b)+.05);},ring);
    focusChecks.push({label,ratio});check(ratio>=3,label+' low-contrast focus '+ratio);
    check(await locator.getAttribute('style')===saved,'Focus check mutated style');
  }
  await login('admin','/admin/staff');
  await page.getByRole('tablist',{name:'LGU staff management'}).waitFor();
  for(const width of [1440,820,390]) {
    await page.setViewportSize({width,height:1000});
    for(const t of ['light','dark','oled']) {
      await theme(t);const key=width+'/'+t;
      if(width<1024) await page.getByRole('button',{name:'Open navigation',exact:true}).click();
      await measure(page.locator('.elb-admin-avatar'),'Sidebar expanded '+key);
      await focus(page.locator('.elb-admin-user'),'Profile '+key);
      const logout=page.locator('.elb-admin-logout button');await logout.hover();
      await measure(logout,'Sidebar logout hover '+key);
      if(width>=1024) {
        await page.getByRole('button',{name:'Collapse sidebar',exact:true}).click();
        await measure(page.locator('.elb-admin-avatar'),'Sidebar compact '+key);
        await page.getByRole('button',{name:'Expand sidebar',exact:true}).click();
      } else await page.getByRole('button',{name:'Close navigation',exact:true}).click();
      if(width>=640) await measure(page.locator('.elb-admin-topbar-avatar'),'Topbar '+key);
      const tabs=page.getByRole('tab');
      for(let i=0;i<4;i++) {
        const tab=tabs.nth(i);await tab.click();
        await measure(tab.locator('span.block').last(),'Selected tab '+i+'/'+key);
        await focus(tab,'Selected tab '+i+'/'+key);
        await tab.hover();await measure(tab.locator('span.block').last(),'Selected hover '+i+'/'+key);
        const other=tabs.nth((i+1)%4);await other.hover();
        await measure(other.locator('span.block').last(),'Unselected hover '+i+'/'+key);
        await focus(other,'Unselected tab '+i+'/'+key);
        const controls=await tab.getAttribute('aria-controls');
        check(await page.locator('[id="'+controls+'"]').count()===1,'Tab '+i+' missing unique panel');
      }
      check(await page.locator('body').evaluate(el=>el.scrollWidth<=innerWidth+2),'Staff page overflow '+key);
    }
  }
  // Touch the actual staff tabs in a touch-enabled browser context.
  const touch=await page.context().browser().newContext({viewport:{width:390,height:1000},isMobile:true,hasTouch:true,storageState:await page.context().storageState()});
  const touchPage=await touch.newPage();await touchPage.goto(base+'/admin/staff');
  for(const t of ['light','dark','oled']){await touchPage.getByLabel('Appearance',{exact:true}).selectOption(t);for(let i=0;i<4;i++){await touchPage.getByRole('tab').nth(i).tap();check(await touchPage.getByRole('tab').nth(i).getAttribute('aria-selected')==='true','Touch tab '+i+'/'+t);}}
  await touch.close();
  await login('citizen','/reports/new');
  // Confirm the report island is hydrated through a real local state change
  // before temporarily changing text paint for background sampling.
  await page.locator('input[name="category"]').first().check();
  await page.locator('form[aria-label="Submit a civic report"] .lucide-check').waitFor();
  const story=page.locator('aside[aria-label="Reporting guide"] > div').first();
  await story.scrollIntoViewIfNeeded();
  await story.locator('img').evaluate(image=>image.decode());
  for(const width of [1440,820,390]){await page.setViewportSize({width,height:1000});for(const t of ['light','dark','oled']){
    await theme(t);const key=width+'/'+t;
    check(await story.evaluate(el=>getComputedStyle(el,'::after').backgroundImage.includes('linear-gradient')),'Missing image overlay '+key);
    await measure(story.locator('p'),'Image paragraph '+key,true);
    await measure(story.getByText('Illustrative community image',{exact:true}),'Illustration label '+key,true);
    check(await page.locator('body').evaluate(el=>el.scrollWidth<=innerWidth+2),'Civic page overflow '+key);
  }}
  await page.goto(base+'/');
  await page.addStyleTag({content:'html { scroll-behavior: auto !important; }'});
  const vision=page.getByText('eLB Vision',{exact:true});await vision.scrollIntoViewIfNeeded();
  await vision.locator('xpath=../..').locator('img').evaluate(image=>image.decode());
  for(const width of [1440,820,390]){await page.setViewportSize({width,height:1000});for(const t of ['light','dark','oled']){
    await theme(t);await measure(vision,'Community image label '+width+'/'+t,true);
  }}
  for(const width of [1440,820,390]){await page.setViewportSize({width,height:1000});for(const t of ['light','dark','oled']){
    await theme(t);const opener=page.locator('#service-directory button');await opener.click();
    const dialog=page.getByRole('dialog');await dialog.waitFor();
    for(const selector of ['h2','h2 + p','p.relative'])await measure(dialog.locator(selector).first(),'Service dialog '+selector+'/'+width+'/'+t,true);
    await focus(dialog.getByRole('button',{name:'Close service details',exact:true}),'Dialog close '+width+'/'+t);
    await page.keyboard.press('Escape');check(!await dialog.isVisible(),'Dialog did not close');
    check(await opener.evaluate(el=>el===document.activeElement),'Dialog failed focus return');
  }}
  check(!errors.length,'Console/page errors '+JSON.stringify(errors));check(!network.length,'Server errors '+JSON.stringify(network));
  return {rows,focusChecks,failures,errors,network,touchTabs:12,passed:failures.length===0};
}
