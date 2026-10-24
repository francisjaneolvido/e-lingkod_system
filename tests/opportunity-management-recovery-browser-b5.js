// eslint-disable-next-line @typescript-eslint/no-unused-expressions
async page=>{
 const context=await page.context().browser().newContext();page=await context.newPage();const base='http://localhost:3103';
 const check=(v,m)=>{if(!v)throw Error(m);};
 try{
  await page.goto(base+'/login?next=/admin/jobs?view=review');await page.locator('#loginEmail').fill('b5.admin@example.test');await page.locator('#loginPassword').fill('B5-browser-password-2026!');await page.getByRole('button',{name:/^log in/i}).click();await page.waitForURL(u=>u.pathname==='/admin/jobs');
  const created=await context.request.post(base+'/api/admin/jobs',{headers:{origin:base},data:{title:'[DEMO] Recovery management',employer:'[DEMO] Synthetic review',workType:'FULL_TIME',sector:'Skilled trades',barangay:'Bambang',location:'Los Baños',description:'[DEMO] Synthetic management action response-loss regression, not actual recruitment.',skills:['Welding'],interests:[],education:'ANY',contactInfo:'Demonstration only; no external contact.',reviewSource:'[DEMO] Synthetic PESO test source; no genuine verification.',payMin:'500',payMax:'700',payCurrency:'PHP',payBasis:'DAY',negotiable:false,certifications:[],isDemo:true,requestKey:crypto.randomUUID()}});check(created.ok(),'Create management fixture');const {id}=await created.json();
  check((await context.request.patch(base+'/api/admin/jobs/'+id,{headers:{origin:base},data:{action:'SUBMIT_REVIEW',expectedVersion:1,requestKey:crypto.randomUUID()}})).ok(),'Submit review fixture');
  await page.goto(base+'/admin/jobs?view=review');const row=page.locator('.jobs-desktop-table tbody tr').filter({hasText:'[DEMO] Recovery management'}).first();await row.getByRole('button',{name:/Review/}).click();const review=page.locator('.jobs-desktop-table .jobs-review-card');await review.getByRole('checkbox').nth(0).check();await review.getByRole('checkbox').nth(1).check();
  await review.locator('textarea').fill('[DEMO] Original synthetic review; no real employer verification.');
  const attempts=[];let discarded=false;await page.route('**/api/admin/jobs/'+id,async route=>{const body=route.request().postDataJSON(),response=await route.fetch();attempts.push({body,status:response.status()});if(!discarded){check(response.ok(),'Approval committed before loss');discarded=true;return route.abort('failed');}return route.fulfill({response});});
  await review.getByRole('button',{name:'Approve & publish',exact:true}).click();await page.locator('.jobs-banner--error').waitFor();
  await review.locator('textarea').fill('[DEMO] Changed note while original approval outcome is unresolved.');await review.getByRole('button',{name:'Approve & publish',exact:true}).click();
  await page.waitForFunction(()=>!!document.querySelector('.jobs-banner--error')||!document.querySelector('.jobs-review-card'));
  check(attempts.length===2&&attempts[1].status===200&&JSON.stringify(attempts[0].body)===JSON.stringify(attempts[1].body),'Review must replay exact original approval, not replace its identity: '+JSON.stringify(attempts));
  await page.getByText(/Earlier.*completed/).waitFor();return {passed:true,id,attempts:attempts.length,exactReplay:true,changedNoteNotSilentlyApplied:true};
 }finally{await context.close();}
}
