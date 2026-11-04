// Run against scripts/verify-municipal-merge.mjs --serve on localhost:3113 only.
// eslint-disable-next-line @typescript-eslint/no-unused-expressions
async page => {
  const base = 'http://localhost:3113';
  if (!page.url().startsWith(base)) throw Error('Disposable municipal server required');
  const check = (value, message) => { if (!value) throw Error(message); };
  const errors = [], matrix = [], roles = [];
  page.on('pageerror', error => errors.push(error.message));
  const contrast = (a,b) => {
    const lum = c => c.match(/[\d.]+/g).slice(0,3).map(Number).map(x=>x/255).map(x=>x<=.04045?x/12.92:((x+.055)/1.055)**2.4).reduce((v,x,i)=>v+x*[.2126,.7152,.0722][i],0);
    const x=lum(a),y=lum(b); return (Math.max(x,y)+.05)/(Math.min(x,y)+.05);
  };
  for (const [device,width,height] of [['desktop',1440,1000],['tablet',820,1180],['mobile',390,844]]) {
    await page.setViewportSize({width,height});
    for (const theme of ['light','dark','oled']) {
      await page.evaluate(t=>localStorage.setItem('elb-appearance',t),theme);
      for (const route of ['/projects','/projects?tab=offices','/services','/emergency','/community-employment','/opportunities']) {
        const response=await page.goto(base+route,{waitUntil:'networkidle'});
        check(response.status()===200,`${device}/${theme}/${route}: HTTP ${response.status()}`);
        await page.locator('main').first().waitFor();
        const info=await page.evaluate(()=>({theme:document.documentElement.dataset.theme,overflow:document.documentElement.scrollWidth-innerWidth,text:document.body.innerText}));
        check(info.theme===theme,`Theme persistence ${theme}`);
        check(info.overflow<=2,`Horizontal overflow ${device}/${theme}/${route}: ${info.overflow}`);
        check(!/PRIVATE (?:DRAFT|PENDING)/.test(info.text),'Unreviewed content leaked publicly');
        const row={device,theme,route,status:response.status(),overflow:info.overflow};
        if(route==='/projects') {
          check(info.text.includes('[TEST] Municipal integration project'),'Published project absent');
          check(info.text.includes('35%'),'Approved progress absent');
          const colors=await page.locator('input[name="q"]').evaluate(el=>({fg:getComputedStyle(el).color,bg:getComputedStyle(el).backgroundColor,height:el.getBoundingClientRect().height}));
          row.inputContrast=contrast(colors.fg,colors.bg);check(row.inputContrast>=4.5,`Unreadable ${theme} project filter`);check(colors.height>=44,'Project filter target');
          await page.screenshot({path:`.scratch/municipal-merge/projects-${device}-${theme}.png`,fullPage:true});
        }
        matrix.push(row);
      }
    }
  }
  await page.goto(base+'/projects');
  const appearance=page.getByRole('button',{name:/Current theme:/}).filter({visible:true});
  check(await appearance.count()===1,'One visible appearance control');
  await page.evaluate(()=>localStorage.setItem('elb-appearance','light'));await page.reload({waitUntil:'networkidle'});
  await page.locator('input[name="q"]').waitFor();
  for(const [key,expected] of [['Enter','dark'],[' ','oled'],['Enter','light']]) {
    const control=page.getByRole('button',{name:/Current theme:/}).filter({visible:true});await control.focus();await control.press(key);
    await page.waitForFunction(value=>document.documentElement.dataset.theme===value,expected);
    check(await control.evaluate(el=>el===document.activeElement),'Appearance focus retained');
  }
  async function login(role) {
    await page.context().clearCookies();
    await page.goto(base+'/login',{waitUntil:'networkidle'});
    await page.locator('#loginEmail').fill(`merge.${role}@example.test`);
    await page.locator('#loginPassword').fill('Municipal-browser-2026!');
    await page.getByRole('button',{name:/^log in$/i}).click();
    await page.waitForURL(url=>url.pathname!=='/login',{waitUntil:'networkidle'});
  }
  for(const role of ['citizen','denied']) {
    await login(role);await page.goto(base+'/admin/projects',{waitUntil:'networkidle'});
    check(!(await page.getByRole('button',{name:'+ New project draft',exact:true}).count()),`${role} must not edit projects`);
    roles.push({role,url:new URL(page.url()).pathname,editingDenied:true});
  }
  for(const role of ['staff','admin']) {
    await login(role);
    for(const [device,width,height] of [['desktop',1440,1000],['tablet',820,1180],['mobile',390,844]]) {
      await page.setViewportSize({width,height});
      for(const theme of ['light','dark','oled']) {
        await page.evaluate(t=>localStorage.setItem('elb-appearance',t),theme);
        await page.goto(base+'/admin/projects',{waitUntil:'networkidle'});
        await page.getByRole('button',{name:'+ New project draft',exact:true}).click();
        const field=page.getByRole('textbox',{name:'Project title',exact:true});await field.waitFor();
        const colors=await field.evaluate(el=>({fg:getComputedStyle(el).color,bg:getComputedStyle(el).backgroundColor}));
        check(contrast(colors.fg,colors.bg)>=4.5,`${role}/${theme} project editor contrast`);
        const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth);check(overflow<=2,`${role}/${device} overflow ${overflow}`);
        await page.getByRole('button',{name:role==='admin'?'+ Verify or correct contact':'+ Propose correction',exact:true}).click();
        check(await page.locator('select[name="officeName"]').isVisible(),'Directory editor accessible');
        await page.screenshot({path:`.scratch/municipal-merge/${role}-${device}-${theme}.png`,fullPage:true});
        roles.push({role,device,theme,editorContrast:contrast(colors.fg,colors.bg),overflow});
      }
    }
  }
  check(!errors.length,`Browser errors: ${errors.slice(0,5).join('; ')}`);
  return {matrix,roles,keyboardThemeCycle:true,browserErrors:errors};
};
