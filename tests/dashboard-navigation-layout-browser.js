// Responsive utility grouping and mixed-chart label layout on a disposable runner.
// eslint-disable-next-line @typescript-eslint/no-unused-expressions
async page=>{
 const rows=[];await new Promise(r=>setTimeout(r,11000));await page.context().clearCookies();await page.goto('http://localhost:3103/login?next=%2Fadmin%2Fcensus%2Fanalytics');
 await page.locator('#loginEmail').fill('b3.admin@example.test');await page.locator('#loginPassword').fill('B3-browser-password-2026!');await page.getByRole('button',{name:/^log in$/i}).click();await page.locator('.elb-source-overview .elb-chart').first().waitFor();
 for(const width of [1440,820,390]){await page.setViewportSize({width,height:1000});for(const theme of ['light','dark','oled']){
  for(let i=0;i<3&&await page.locator('html').getAttribute('data-theme')!==theme;i++)await page.getByRole('button',{name:/^Current theme:/}).click();
  const row=await page.evaluate(()=>{const title=document.querySelector('.elb-admin-heading-group').getBoundingClientRect(),actions=document.querySelector('.elb-admin-topbar-end').getBoundingClientRect(),trigger=document.querySelector('header .elb-theme-trigger').getBoundingClientRect(),toggle=document.querySelector('.elb-admin-menu-toggle').getBoundingClientRect();return {noOverlap:title.right<=actions.left,rightmost:actions.right-trigger.right<2,adjacent:toggle.width===0||trigger.left-toggle.right<=12,labelsFit:[...document.querySelectorAll('.elb-chart-category,.elb-donut-key')].every(el=>el.scrollWidth<=el.clientWidth+1),noSort:!document.querySelector('.elb-source-overview select'),bodyFits:document.body.scrollWidth<=innerWidth+2};});rows.push({width,theme,...row});
 }}return {rows,passed:rows.every(r=>r.noOverlap&&r.rightmost&&r.adjacent&&r.labelsFit&&r.noSort&&r.bodyFits)};
}
