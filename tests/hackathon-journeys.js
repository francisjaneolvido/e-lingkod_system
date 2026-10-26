// Read-only, opt-in browser smoke after an authorized ordinary fixture import.
// Only authentication sessions are written. Never submits/edits any survey.
// eslint-disable-next-line @typescript-eslint/no-unused-expressions -- Playwright CLI entry point.
async page=>{
  const base='http://localhost:3105',errors=[];
  const check=(value,message)=>{if(!value)throw Error(message);};
  page.on('pageerror',error=>errors.push(error.message));
  async function login(email,password,next){await page.goto('about:blank');await page.context().clearCookies();await new Promise(r=>setTimeout(r,11000));await page.goto(base+'/login?next='+encodeURIComponent(next));await page.locator('#loginEmail').fill(email);await page.locator('#loginPassword').fill(password);const response=page.waitForResponse(r=>r.url().endsWith('/api/auth/sign-in/email')&&r.request().method()==='POST');await page.getByRole('button',{name:/^log in$/i}).click();check((await response).status()===200,'Actual fixture UI sign-in failed');await page.waitForURL(url=>url.pathname!=='/login');}
  async function json(path){const r=await page.request.get(base+path);check(r.status()===200,'Protected read failed '+path);return r.json();}
  await login('individual.03@example.test','ElbDemo2026!003','/community-survey');
  const personal=await json('/api/community-survey?year=2026');
  check(JSON.stringify(personal).includes('SUBMITTED'),'Individual retained submission missing');
  await page.goto(base+'/opportunities');await page.getByText(/\[DEMO\]/).first().waitFor();check((await page.locator('body').innerText()).includes('[DEMO]'),'Persisted sample vacancies missing');
  await login('establishment.01@example.test','ElbDemo2026!081','/establishment-survey');
  const organization=await json('/api/establishment-surveys');check(JSON.stringify(organization).includes('[DEMO]'),'Owned establishment absent');
  await login('staff.02@example.test','ElbDemo2026!106','/admin/census/analytics');
  const scoped=await json('/api/admin/census/analytics');check(scoped.availableBarangays.length===1&&scoped.availableBarangays[0]==='Bambang','Staff scope widened');
  check((await page.request.get(base+'/api/admin/census/analytics?barangay=Maahas')).status()===403,'Out-of-scope read allowed');
  await login('staff.03@example.test','ElbDemo2026!107','/dashboard');
  check((await page.request.get(base+'/api/admin/census/analytics')).status()===403,'Ungranted Staff obtained analytics');
  await login('admin.01@example.test','ElbDemo2026!101','/admin/census/analytics');
  const admin=await json('/api/admin/census/analytics');check(admin.groups[0].count>=68,'Persisted fixture population missing');
  await page.goto(base+'/community-employment/insights');check(!(await page.locator('body').innerText()).includes('68 respondents'),'Public release accidentally enabled');
  await page.request.post(base+'/api/auth/sign-out',{headers:{origin:base},data:{}});
  check(!errors.length,'Browser errors '+JSON.stringify(errors));
  return {passed:true,uiLogins:5,readOnly:true,staffBarangays:scoped.availableBarangays,staffRespondents:scoped.groups[0].count,adminRespondents:admin.groups[0].count,errors};
}
