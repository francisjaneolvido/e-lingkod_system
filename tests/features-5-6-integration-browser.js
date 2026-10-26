// Run against the combined --analytics --opportunities disposable browser fixture.
// eslint-disable-next-line @typescript-eslint/no-unused-expressions
async page=>{
 const context=await page.context().browser().newContext();page=await context.newPage();const base='http://localhost:3103',errors=[],network=[],results=[];
 const check=(ok,message)=>{if(!ok)throw Error(message);};
 page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=500)network.push(r.status()+' '+r.url());});
 async function login(email,password,next){await page.goto('about:blank');await context.clearCookies();await page.goto(base+'/login?next='+encodeURIComponent(next));await page.locator('#loginEmail').fill(email);await page.locator('#loginPassword').fill(password);const r=page.waitForResponse(r=>r.url().endsWith('/api/auth/sign-in/email'));await page.getByRole('button',{name:/^log in$/i}).click();check((await r).ok(),'Real sign in');await page.waitForURL(u=>u.pathname!=='/login');}
 try{
  await login('b5.other@example.test','B5-browser-password-2026!','/admin');
  const jobsOnly=await page.locator('body').innerText();check(!jobsOnly.includes('New survey responses'),'JOBS-only staff homepage discloses unscoped submitted-survey totals');
  check((await context.request.get(base+'/api/admin/census/analytics')).status()===403,'JOBS permission must not grant protected analytics');results.push('JOBS-only homepage and analytics denial');
  await login('b3.staff@example.test','B3-browser-password-2026!','/admin');
  const censusTile=page.locator('a[href="/admin/census"]').filter({hasText:/Protected census records/});await censusTile.last().waitFor();check(!(await censusTile.last().innerText()).includes('Planned'),'Census tool still reported as planned');
  await censusTile.last().click();await page.getByRole('heading',{name:'Protected census records',exact:true}).waitFor();
  await page.getByRole('link',{name:'Workforce analytics',exact:true}).first().click();await page.getByRole('heading',{name:/workforce.*social analytics/i}).waitFor();
  check((await context.request.post(base+'/api/admin/jobs',{headers:{origin:base},data:{}})).status()===403,'CENSUS must not grant JOBS maintenance');results.push('CENSUS-only record/analytics navigation and JOBS denial');
  await login('b5.citizen@example.test','B5-browser-password-2026!','/community-employment');
  for(const width of [1440,820,390]){
   await page.setViewportSize({width,height:1000});
   if(width<1024){await page.getByRole('button',{name:'Open menu',exact:true}).click();await page.getByRole('button',{name:'Community',exact:true}).click();}
   else await page.getByRole('button',{name:'Community',exact:true}).hover();
   console.log('Citizen navigation width '+width+' '+JSON.stringify(await page.getByRole('link',{name:/Establishment Profiling/}).allTextContents()));await page.getByRole('link',{name:/Establishment Profiling/}).first().click();await page.getByRole('heading',{name:/Establishment Profiling/i}).waitFor();
   check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2),'Citizen form overflow '+width);await page.goto(base+'/community-employment');
  }
  await page.goto(base+'/community-survey');await page.getByRole('heading',{name:'Personal Employment and Livelihood Survey',exact:true}).waitFor();
  await page.goto(base+'/opportunities');await page.getByRole('heading',{name:'Available listings',exact:true}).waitFor();
  const baseline=await page.locator('section[aria-labelledby="available-title"] article').count();check(baseline===10,'Combined fixture expected ten public listings');
  await page.getByRole('textbox',{name:'Position or employer'}).fill('No integration vacancy exists');await page.getByRole('button',{name:'Apply filters',exact:true}).click();await page.getByText(/No active listings match these filters\./).waitFor();check(!(await page.locator('body').innerText()).includes('filterForm.values'),'Implementation phrase visible');
  await page.getByRole('link',{name:'Reset filters',exact:true}).click();await page.waitForFunction(n=>document.querySelectorAll('section[aria-labelledby="available-title"] article').length===n,baseline);
  // The fallback message must also use product language when an error body has no message.
  await page.route('**/api/opportunities?*',r=>r.fulfill({status:400,contentType:'application/json',body:'{}'}));await page.getByRole('button',{name:'Apply filters',exact:true}).click();await page.getByRole('alert').filter({hasText:'Review the filters.'}).waitFor();await page.unroute('**/api/opportunities?*');
  check((await context.request.get(base+'/api/admin/census/records')).status()===403,'Citizen census denial');check((await context.request.get(base+'/api/admin/census/analytics')).status()===403,'Citizen public-release deferral');results.push('Citizen profiling/establishment/opportunities navigation, copy, filters and privacy');
  check(errors.length===0&&network.length===0,'Unexpected failures '+JSON.stringify({errors,network}));return{passed:true,results,viewports:[1440,820,390],errors,network};
 }finally{await context.close();}
}
