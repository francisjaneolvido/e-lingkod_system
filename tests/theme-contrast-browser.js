// Maintained contrast regressions; localhost:3103 disposable fixtures only.
// eslint-disable-next-line @typescript-eslint/no-unused-expressions
async page => {
 const base='http://localhost:3103',rows=[];
 const check=(ok,message)=>{if(!ok)throw Error(message);};
 const contrast=async e=>e.evaluate(el=>{const rgb=s=>s.match(/[\d.]+/g).map(Number),lum=a=>a.slice(0,3).map(v=>v/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4).reduce((s,v,i)=>s+v*[.2126,.7152,.0722][i],0);let p=el,bg;while(p){const c=rgb(getComputedStyle(p).backgroundColor);if((c[3]??1)===1){bg=c;break;}p=p.parentElement;}const a=lum(rgb(getComputedStyle(el).color)),b=lum(bg||[255,255,255]);return(Math.max(a,b)+.05)/(Math.min(a,b)+.05);});
 async function theme(t){await page.waitForFunction(()=>document.querySelector('#elb-appearance')?.value===document.documentElement.dataset.theme);await page.getByLabel('Appearance',{exact:true}).selectOption(t);}
 async function login(role,next){await new Promise(r=>setTimeout(r,11000));await page.context().clearCookies();await page.goto(base+'/login?next='+encodeURIComponent(next));await page.locator('#loginEmail').fill('b3.'+role+'@example.test');await page.locator('#loginPassword').fill('B3-browser-password-2026!');await page.getByRole('button',{name:/^log in$/i}).click();await page.waitForURL(u=>u.pathname!=='/login');}
 await login('citizen','/reports/new');
 for(const t of ['dark','oled','light']){
  await page.goto(base+'/reports/new');await theme(t);
  const input=page.locator('input:not([type="hidden"]):not([type="file"]):not([type="checkbox"]):not([type="radio"])').first();
  await input.waitFor();const value=await contrast(input);rows.push({surface:'Civic input',theme:t,contrast:value});check(value>=4.5,'Civic input contrast '+t+': '+value);
  const states=await input.evaluate(el=>{const helper=document.createElement('span');el.parentElement.append(helper);helper.style.color='var(--input)';const expected=getComputedStyle(helper).color;const actual=getComputedStyle(el).borderTopColor;const old=el.getAttribute('aria-invalid');el.setAttribute('aria-invalid','true');helper.style.color='var(--destructive)';const errorExpected=getComputedStyle(helper).color;const errorActual=getComputedStyle(el).borderTopColor;if(old===null)el.removeAttribute('aria-invalid');else el.setAttribute('aria-invalid',old);helper.remove();return{expected,actual,errorExpected,errorActual};});
  check(states.actual===states.expected&&states.errorExpected===states.errorActual,'Input boundary/error theme mismatch '+t);
  const border=await page.locator('html').evaluate(e=>getComputedStyle(e).getPropertyValue('--border').trim());check(border.length>0,'Invalid root border token');
  await page.goto(base+'/');await theme(t);
  for(const selector of ['a[class~="bg-brand-gold"]','#service-civic p']){const target=page.locator(selector).first();await target.waitFor();const ratio=await contrast(target);rows.push({surface:selector,theme:t,contrast:ratio});check(ratio>=4.5,'Landing contrast '+selector+'/'+t+': '+ratio);}
 }
 await login('admin','/admin/census');
 for(const t of ['light','dark','oled']){await theme(t);const ratio=await contrast(page.locator('.elb-admin-page-title'));rows.push({surface:'Admin heading',theme:t,contrast:ratio});check(ratio>=4.5,'Admin topbar contrast '+t+': '+ratio);}
 return rows;
}
