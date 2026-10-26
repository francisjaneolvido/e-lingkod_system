// Execute with the existing disposable test:analytics:browser server only.
// eslint-disable-next-line @typescript-eslint/no-unused-expressions -- Playwright CLI entry point.
async page=>{
  const base='http://localhost:3103',failures=[];
  page.on('pageerror',error=>failures.push(error.message));
  page.on('response',r=>{if(r.status()>=500)failures.push(r.status()+' '+r.url());});
  const check=(value,message)=>{if(!value)throw Error(message);};
  async function login(name){await page.goto('about:blank');await page.context().clearCookies();await new Promise(r=>setTimeout(r,11000));await page.goto(base+'/login?next='+encodeURIComponent('/admin/jobs/legacy-spes'));await page.locator('#loginEmail').fill('b3.'+name+'@example.test');await page.locator('#loginPassword').fill('B3-browser-password-2026!');await page.getByRole('button',{name:/^log in$/i}).click();await page.waitForURL(url=>url.pathname!=='/login');}
  await login('staff');await page.getByRole('heading',{name:'SPES Survey Import',exact:true}).waitFor();
  // Include inline RSC/serialized props, not only visible row counts.
  check(!(await page.content()).includes('2 validated anonymous source rows'),'Staff received unscoped event text in full page payload');
  await page.getByLabel('Survey source label').fill('B4 CENSUS-only browser import');
  await page.getByLabel('CSV file').setInputFiles({name:'anonymous.csv',mimeType:'text/csv',buffer:Buffer.from('consent,barangay,education,skills,interests,availability\nYES,Bambang,COLLEGE,Welding,Skilled trades,ANY')});
  let response=page.waitForResponse(r=>r.url().endsWith('/api/admin/jobs/import/preview')&&r.request().method()==='POST');await page.getByRole('button',{name:'Preview CSV',exact:true}).click();check((await response).status()===200,'CENSUS preview denied');
  response=page.waitForResponse(r=>r.url().endsWith('/api/admin/jobs/import')&&r.request().method()==='POST');await page.getByRole('button',{name:'Confirm & import',exact:true}).click();check((await response).status()===201,'CENSUS import denied');await page.getByRole('heading',{name:'Survey imported',exact:true}).waitFor();
  await login('admin');await page.getByRole('heading',{name:'SPES Survey Import',exact:true}).waitFor();check((await page.content()).includes('2 validated anonymous source rows'),'Admin lost audit access');
  check(!failures.length,'Browser/server failures: '+JSON.stringify(failures));
  return {passed:true,logins:2,entirePagePayload:true,censusOnlyPreview:200,censusOnlyCommit:201,adminOriginalAuditPreserved:true,failures};
}
