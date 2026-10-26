// Run through Playwright CLI against the disposable census/analytics browser
// runner on localhost:3103. Never use an ordinary application database.
// eslint-disable-next-line @typescript-eslint/no-unused-expressions
async page => {
  for(const other of page.context().pages())if(other!==page)await other.close();
  const base='http://localhost:3103',check=(ok,message)=>{if(!ok)throw Error(message);};
  const errors=[],network=[],failed=[],matrix=[];
  page.on('pageerror',e=>errors.push(e.message));
  page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  page.on('response',r=>{if(r.status()>=500)network.push({status:r.status(),url:r.url()});});
  page.on('requestfailed',r=>{if(!r.failure()?.errorText.includes('ERR_ABORTED'))failed.push(r.url());});
  const contrast=async locator=>locator.evaluate(el=>{
    const numbers=s=>s.match(/[\d.]+/g)?.map(Number)||[];
    const c=getComputedStyle(el),fg=numbers(c.color);let p=el,bg=[];
    while(p){const b=numbers(getComputedStyle(p).backgroundColor);if(b.length>=3&&(b[3]??1)===1){bg=b;break;}p=p.parentElement;}
    if(bg.length<3)return 0;
    const lum=v=>v.slice(0,3).map(x=>x/255).map(x=>x<=.04045?x/12.92:((x+.055)/1.055)**2.4).reduce((n,x,i)=>n+x*[.2126,.7152,.0722][i],0);
    const a=lum(fg),b=lum(bg);return (Math.max(a,b)+.05)/(Math.min(a,b)+.05);
  });
  async function theme(value){await page.getByLabel('Appearance',{exact:true}).selectOption(value);check(await page.locator('html').getAttribute('data-theme')===value,'Theme did not apply');}
  async function layout(label){check(await page.locator('body').evaluate(e=>e.scrollWidth<=innerWidth+2),'Horizontal overflow: '+label);}
  async function login(role,next){
    // Respect the installed auth limiter across successive synthetic role runs.
    await new Promise(resolve=>setTimeout(resolve,11000));
    await page.context().clearCookies();
    await page.goto(base+'/login?next='+encodeURIComponent(next));
    await page.locator('#loginEmail').fill(`b3.${role}@example.test`);
    await page.locator('#loginPassword').fill('B3-browser-password-2026!');
    const response=page.waitForResponse(r=>r.url().endsWith('/api/auth/sign-in/email')&&r.request().method()==='POST');
    await page.getByRole('button',{name:/^log in$/i}).click();check((await response).ok(),'Fixture login failed: '+role);
    await page.waitForURL(u=>u.pathname!=='/login');
  }
  await login('citizen','/admin/census');
  const denied=page.getByRole('link',{name:'Open my reports',exact:true});await denied.waitFor();
  check((await page.request.get(base+'/api/admin/census/records')).status()===403,'Citizen obtained census data');
  for(const width of [1440,820,390]){await page.setViewportSize({width,height:1000});for(const t of ['light','dark','oled']){
    await theme(t);await layout('Citizen denial '+width+'/'+t);check(await contrast(denied)>=4.5,'Denied action has unreadable contrast');
    await denied.focus();await page.keyboard.press('Tab');await page.keyboard.press('Shift+Tab');check(await denied.evaluate(e=>e.matches(':focus-visible')&&getComputedStyle(e).outlineStyle!=='none'),'No keyboard focus');
    check(await page.locator('body').evaluate(e=>getComputedStyle(e).backgroundColor)===(t==='oled'?'rgb(0, 0, 0)':t==='dark'?'rgb(16, 27, 41)':'rgb(255, 255, 255)'),'Incorrect canvas');
    matrix.push({journey:'Citizen denial',width,theme:t});
  }}
  await page.reload();check(await page.locator('html').getAttribute('data-theme')==='oled','Theme not persistent after reload');
  for(const route of ['/','/community-survey','/establishment-survey','/reports/new','/services','/emergency','/opportunities','/community-employment/insights']){
    const response=await page.goto(base+route);check(response.status()<500,'Citizen route failed: '+route);await layout(route);
    check(await page.getByLabel('Appearance',{exact:true}).count()===1,'Appearance absent: '+route);
    for(const width of [1440,820,390]){await page.setViewportSize({width,height:1000});for(const t of ['light','dark','oled']){await theme(t);await layout(route+'/'+t);matrix.push({journey:route,width,theme:t});}}
  }
  check(!await page.locator('.elb-chart').count(),'Public deferred analytics unexpectedly released');
  await login('staff','/admin/census/analytics');
  await page.getByRole('heading',{name:'Workforce & social analytics',exact:true}).waitFor();
  await page.locator('.elb-chart-row').first().waitFor();
  const scoped=await (await page.request.get(base+'/api/admin/census/analytics?population=INDIVIDUAL&period=CURRENT&year=2026')).json();
  check(scoped.groups.reduce((n,g)=>n+g.count,0)===2,'Staff scope count changed');
  for(const width of [1440,820,390]){await page.setViewportSize({width,height:1000});for(const t of ['light','dark','oled']){
    await theme(t);await layout('Staff chart '+width+'/'+t);
    const chart=page.locator('.elb-chart').first();await chart.getByLabel('Sort chart',{exact:true}).selectOption('count');
    const row=chart.locator('.elb-chart-row').first();await row.focus();await page.keyboard.press('Enter');check(await row.getAttribute('aria-pressed')==='true','Keyboard chart selection failed');
    check(await contrast(row)>=4.5,'Chart category contrast');
    await chart.getByText(/^View .* as a table$/).click();check(await chart.locator('table').isVisible(),'Chart table alternative absent');
    check(await chart.locator('table tbody tr').count()>0,'Chart table has no values');
    await chart.getByText(/^View .* as a table$/).click();await row.click();
    matrix.push({journey:'Staff chart',width,theme:t});
  }}
  await page.getByRole('combobox',{name:/^Population/}).selectOption('ESTABLISHMENT');await page.getByRole('button',{name:'Apply analytics filters',exact:true}).click();
  await page.locator('.elb-chart-row').first().waitFor();
  check((await page.locator('#admin-content').innerText()).includes('Establishment annual records'),'Population filter did not apply');
  check((await page.locator('#admin-content').innerText()).includes('unknown'),'Unknown workforce context lost');
  const touchContext=await page.context().browser().newContext({viewport:{width:390,height:844},hasTouch:true,storageState:await page.context().storageState()});
  const touchChart=await touchContext.newPage();await touchChart.goto(base+'/admin/census/analytics');const touchRow=touchChart.locator('.elb-chart-row').first();await touchRow.waitFor();await touchRow.tap();check(await touchRow.getAttribute('aria-pressed')==='true','Touch chart selection failed');await touchContext.close();
  await login('admin','/admin/census');
  await page.getByRole('heading',{name:'Protected census records',exact:true}).waitFor();
  await page.getByRole('button',{name:'View details and history'}).first().click();const dialog=page.getByRole('dialog');await dialog.waitFor();
  for(const t of ['light','dark','oled']){await theme(t);check(await dialog.isVisible(),'Dialog vanished');await layout('Admin history/'+t);}
  await page.keyboard.press('Escape');check(!await dialog.isVisible(),'History dialog Escape failed');
  for(const route of ['/admin/services/reports','/admin/jobs/demand','/admin/pulse','/admin/emergency','/admin/staff','/admin/census/imports']){
    const response=await page.goto(base+route);check(response.status()<500,'Admin route failed: '+route);
    for(const width of [1440,820,390]){await page.setViewportSize({width,height:1000});for(const t of ['light','dark','oled']){await theme(t);await layout(route+'/'+width+'/'+t);matrix.push({journey:route,width,theme:t});}}
    if(route==='/admin/services/reports'||route==='/admin/jobs/demand'||route==='/admin/pulse')check(await page.locator('.elb-chart').count()>0,'Insight overview missing: '+route);
  }
  await login('denied','/admin/census');await page.getByRole('heading',{name:'This page isn’t available.',exact:true}).waitFor();
  check((await page.request.get(base+'/api/admin/census/records')).status()===403,'Ungranted Staff obtained census data');
  check(await contrast(page.getByRole('link',{name:'Return home',exact:true}))>=4.5,'Unavailable-page recovery unreadable');
  const sibling=await page.context().newPage();await sibling.goto(base+'/opportunities');
  await sibling.waitForFunction(()=>document.querySelector('#elb-appearance')?.value===document.documentElement.dataset.theme);
  await sibling.getByLabel('Appearance',{exact:true}).selectOption('light');
  await page.waitForFunction(()=>document.documentElement.dataset.theme==='light');await sibling.close();
  const browser=page.context().browser();
  const context=await browser.newContext({viewport:{width:390,height:844},hasTouch:true});
  const touch=await context.newPage();await touch.goto(base+'/login');await touch.getByLabel('Appearance',{exact:true}).tap();await touch.keyboard.press('Escape');await touch.getByLabel('Appearance',{exact:true}).selectOption('oled');
  check(await touch.locator('html').getAttribute('data-theme')==='oled','Touch theme failed');
  await context.close();
  const cold=await browser.newContext();await cold.addInitScript(()=>localStorage.setItem('elb-appearance','oled'));
  const early=await cold.newPage();await early.route('**/_next/**/*.js',r=>r.abort());await early.goto(base+'/login',{waitUntil:'domcontentloaded'});
  check(await early.locator('html').getAttribute('data-theme')==='oled','Bootstrap depended on hydration');
  check(await early.locator('body').evaluate(e=>getComputedStyle(e).backgroundColor)==='rgb(0, 0, 0)','Cold OLED canvas flashed to light without hydration');await cold.close();
  check(network.length===0,'Server/network failures: '+JSON.stringify(network));
  check(failed.length===0,'Failed requests: '+JSON.stringify(failed));
  check(errors.length===0,'Console/page failures: '+JSON.stringify([...new Set(errors)]));
  return {matrix,protectedApiDenials:2,themePersistence:true,crossTab:true,touch:true,withoutHydration:true,errors,network,failed};
}
