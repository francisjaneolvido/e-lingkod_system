// Real protected UI on the disposable census browser runner, localhost:3103.
// eslint-disable-next-line @typescript-eslint/no-unused-expressions
async page => {
 const base='http://localhost:3103';
 await new Promise(r=>setTimeout(r,11000));await page.context().clearCookies();
 await page.goto(base+'/login?next=%2Fadmin%2Fcensus%2Fanalytics');
 await page.locator('#loginEmail').fill('b3.admin@example.test');await page.locator('#loginPassword').fill('B3-browser-password-2026!');
 await page.getByRole('button',{name:/^log in$/i}).click();await page.waitForURL(u=>u.pathname==='/admin/census/analytics');
 await page.waitForFunction(()=>document.querySelector('[aria-label="Analytics overview"]')?.getAttribute('aria-busy')==='false');
 const read=()=>page.waitForResponse(r=>new URL(r.url()).pathname==='/api/admin/census/analytics'&&r.request().method()==='GET');
 let response=read();await page.getByRole('textbox',{name:'Reported skill (exact text)',exact:true}).fill('machine_learning');await response;
 await page.waitForFunction(()=>document.querySelector('[aria-label="Applied filters"]')?.textContent.includes('machine'));
 const chip=await page.getByRole('group',{name:'Applied filters',exact:true}).innerText();
 const exactTextPreserved=chip.includes('machine_learning')&&!chip.includes('machine learning');
 response=read();await page.getByRole('button',{name:'Reset filters',exact:true}).click();await response;
 response=read();await page.getByRole('combobox',{name:'Population',exact:true}).selectOption('IMPORTS');await response;response=read();await page.getByRole('textbox',{name:'Dataset source (optional)',exact:true}).fill('Café_archive');await response;await page.waitForFunction(()=>document.querySelector('[aria-label="Applied filters"]')?.textContent.includes('Café'));const sourceChip=await page.getByRole('group',{name:'Applied filters',exact:true}).innerText();const sourcePreserved=sourceChip.includes('Café_archive');response=read();await page.getByRole('button',{name:'Reset filters',exact:true}).click();await response;
 response=read();await page.getByRole('combobox',{name:'Period',exact:true}).selectOption('YEAR');await response;
 await page.getByRole('spinbutton',{name:'Survey year',exact:true}).fill('');
 const retry=page.getByRole('button',{name:'Retry analytics',exact:true});await retry.waitFor();
 let invalidReadRequests=0;const onRequest=r=>{if(new URL(r.url()).pathname==='/api/admin/census/analytics')invalidReadRequests++;};page.on('request',onRequest);
 await retry.click();const validationRetained=await retry.isVisible();page.off('request',onRequest);
 const exportsHidden=!await page.getByRole('link',{name:'Export applied aggregates (CSV)',exact:true}).count();
 response=read();await page.getByRole('button',{name:'Reset filters',exact:true}).click();await response;
 return {exactTextPreserved,sourcePreserved,chip,sourceChip,validationRetained,invalidReadRequests,exportsHidden,passed:exactTextPreserved&&sourcePreserved&&validationRetained&&invalidReadRequests===0&&exportsHidden};
}
