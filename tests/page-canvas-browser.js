// Rendered page-vs-card surface regression across public and Citizen layouts.
// eslint-disable-next-line @typescript-eslint/no-unused-expressions
async page=>{
 const cases=[],issues=[],errors=[];page.on('pageerror',e=>errors.push(e.message));
 async function theme(t){for(let i=0;i<3&&await page.locator('html').getAttribute('data-theme')!==t;i++)await page.getByRole('button',{name:/^Current theme:/}).click();await page.waitForFunction(()=>!document.documentElement.hasAttribute('data-theme-changing'));}
 async function check(route){await page.goto('http://localhost:3103'+route);await page.getByRole('heading',{level:1}).first().waitFor();for(const t of ['light','dark','oled']){await theme(t);const state=await page.locator('main').evaluate(el=>{const c=document.createElement('canvas'),ctx=c.getContext('2d');c.width=c.height=1;const rgba=s=>{ctx.clearRect(0,0,1,1);ctx.fillStyle=s;ctx.fillRect(0,0,1,1);return [...ctx.getImageData(0,0,1,1).data];};let bg=[255,255,255];const layers=[];for(let p=el;p;p=p.parentElement)layers.push(rgba(getComputedStyle(p).backgroundColor));for(const a of layers.reverse())bg=a.slice(0,3).map((v,i)=>v*a[3]/255+bg[i]*(1-a[3]/255));return {canvas:bg,token:rgba(getComputedStyle(document.documentElement).getPropertyValue('--background')).slice(0,3)};});if(state.canvas.some((v,i)=>Math.abs(v-state.token[i])>1))issues.push({route,theme:t,...state});cases.push({route,theme:t,...state});}}
 await page.context().clearCookies();for(const route of ['/services','/opportunities','/emergency'])await check(route);
 await page.goto('http://localhost:3103/login');await page.locator('#loginEmail').fill('b3.citizen@example.test');await page.locator('#loginPassword').fill('B3-browser-password-2026!');await page.getByRole('button',{name:/^log in$/i}).click();await page.waitForURL(u=>u.pathname!='/login');
 for(const route of ['/account','/account/profile','/notifications','/services/requests','/services/requests/ui-state-DRAFT'])await check(route);
 return {passed:!issues.length&&!errors.length,cases,issues,errors};
}
