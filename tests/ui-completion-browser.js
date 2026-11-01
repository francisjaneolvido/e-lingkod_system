// Run against the guarded census/analytics disposable browser runner.
// eslint-disable-next-line @typescript-eslint/no-unused-expressions
async page=>{
 const base='http://localhost:3103',failures=[],cases=[],errors=[],requests=[];
 const check=(ok,message)=>{if(!ok)failures.push(message);};
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 page.on('requestfailed',r=>{if(!r.failure()?.errorText.includes('ERR_ABORTED'))requests.push(r.url());});
 await page.goto(base+'/login');await page.evaluate(()=>localStorage.setItem('elb-appearance','light'));await page.reload();
 const control=page.locator('.elb-theme-trigger:visible');await control.waitFor();await page.waitForFunction(()=>!document.querySelector('.elb-theme-trigger:disabled'));
 await page.evaluate(()=>{const hidden=document.createElement('div');hidden.id='hidden-navigation-regression';hidden.hidden=true;hidden.innerHTML='<div data-appearance-host></div>';document.body.append(hidden);});
 check(await page.locator('.elb-theme-trigger:visible').count()===1,'Hidden navigation suppressed fallback');await page.evaluate(()=>document.querySelector('#hidden-navigation-regression').remove());
 for(const next of ['dark','oled','light']){await control.focus();await page.keyboard.press(next==='oled'?'Space':'Enter');check(await page.locator('html').getAttribute('data-theme')===next,'Cycling expected '+next);check(await control.evaluate(el=>el===document.activeElement),'Focus lost on '+next);const labels={light:'Light. Switch to Dark.',dark:'Dark. Switch to OLED.',oled:'OLED. Switch to Light.'};check(await control.getAttribute('aria-label')==='Current theme: '+labels[next],'Current/next theme announcement mismatch');}
 check(await page.getByRole('menu').count()===0,'Appearance must not open a menu');
 await page.locator('#loginEmail').fill('b3.admin@example.test');await page.locator('#loginPassword').fill('B3-browser-password-2026!');await page.getByRole('button',{name:/^log in$/i}).click();await page.waitForURL(u=>u.pathname!=='/login');
 await page.goto(base+'/admin/census/analytics');await page.getByRole('region',{name:'Analytics overview',exact:true}).waitFor();
 check(await page.locator('[data-chart-type="donut"]').count()>0,'Default overview missing donut');
 check(await page.locator('[data-chart-type="bar"]').count()>0,'Default overview missing bars');
 const trigger=page.locator('.elb-theme-trigger:visible');
 const placement=await trigger.evaluate(el=>{const r=el.getBoundingClientRect(),header=el.closest('header').getBoundingClientRect();return {right:r.right,headerRight:header.right};});
 check(placement.headerRight-placement.right<=52,'Appearance is not rightmost utility');
 for(let i=0;i<3;i++)if(await page.locator('html').getAttribute('data-theme')!=='oled')await trigger.click();
 const surfaces=await page.evaluate(()=>({canvas:getComputedStyle(document.querySelector('.elb-admin')).backgroundColor,card:getComputedStyle(document.querySelector('.elb-chart')).backgroundColor}));
 check(surfaces.canvas==='rgb(0, 0, 0)','OLED canvas must remain black');check(surfaces.card!=='rgb(0, 0, 0)','OLED card merges with black canvas');
 cases.push({placement,surfaces});return {passed:!failures.length&&!errors.length&&!requests.length,failures,errors,requests,cases};
}
