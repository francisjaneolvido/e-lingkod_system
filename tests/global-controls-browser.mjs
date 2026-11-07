import fs from 'node:fs';
import path from 'node:path';
export async function runGlobalControls({browser,origin,adminState,output,only}){
 if(origin!=='http://localhost:3117')throw Error('Guarded synthetic preview only.');
 const checks=[],errors=[];const assert=(value,message)=>{if(!value)throw Error(message);};
 const context=await browser.newContext({storageState:adminState,viewport:{width:1440,height:1000},hasTouch:true,reducedMotion:'reduce'});context.setDefaultTimeout(15000);context.setDefaultNavigationTimeout(60000);
 const run=async(name,operation)=>{if(only&&!new RegExp(only,'i').test(name))return;try{await operation();checks.push({name,passed:true});}catch(error){const locator=String(error.message).match(/waiting for ([^\n]+)/)?.[1];checks.push({name,passed:false,error:String(error.message).split('\n')[0],...(locator?{locator}:{})});}fs.writeFileSync(path.join(output,'controls-summary.json'),JSON.stringify({completed:false,syntheticOnly:true,checks,errors},null,2));};
 const page=await context.newPage();page.on('pageerror',error=>errors.push(error.message));
 const capture=async name=>page.screenshot({path:path.join(output,name+'.png'),fullPage:false,caret:'initial'});
 try{
  await page.goto(origin+'/admin/services/catalog',{waitUntil:'domcontentloaded'});
  const role=await page.evaluate(async()=>{const response=await fetch('/api/auth/get-session',{signal:AbortSignal.timeout(20000)});return (await response.json())?.user?.role;});assert(role==='ADMIN','Synthetic Admin identity required.');
  await page.getByRole('button',{name:'New service',exact:true}).click();await page.getByRole('button',{name:'Add question',exact:true}).click();
  const row=page.locator('.service-question-fields').last();await row.waitFor();await row.getByRole('combobox',{name:/^Type/}).selectOption('select');await row.getByLabel('Options (comma separated)',{exact:true}).fill('First long descriptive option for a synthetic service,Second option');
  for(const theme of ['light','dark','oled'])for(const width of [1440,768,390])await run('Service builder content grid and select keyboard '+theme+' '+width,async()=>{
   await page.setViewportSize({width,height:1000});await page.evaluate(theme=>{localStorage.setItem('elb-appearance',theme);document.documentElement.dataset.theme=theme;document.documentElement.classList.toggle('dark',theme!=='light');dispatchEvent(new Event('elb-theme-change'));},theme);
   const geometry=await row.evaluate(node=>({width:node.clientWidth,scrollWidth:node.scrollWidth,columns:getComputedStyle(node).gridTemplateColumns,fields:[...node.querySelectorAll('input:not([type="checkbox"]),select,textarea')].map(field=>{const r=field.getBoundingClientRect(),p=field.closest('label')?.getBoundingClientRect();return {width:r.width,left:r.left,right:r.right,parentLeft:p?.left,parentRight:p?.right};})}));
   assert(geometry.scrollWidth<=geometry.width+2,'Question grid creates implicit overflow.');assert(geometry.fields.every(field=>field.width>=120&&field.left>=field.parentLeft-2&&field.right<=field.parentRight+2),'Question field overlaps its label or is unusably narrow.');
   const select=row.getByRole('combobox',{name:/^Type/});await select.focus();await page.keyboard.press('Alt+ArrowDown');await page.keyboard.press('ArrowDown');await page.keyboard.press('Enter');await page.keyboard.press('Alt+ArrowDown');await page.keyboard.press('Escape');await select.selectOption('select');
   const remove=row.getByRole('button',{name:/^Remove question/});assert(await remove.evaluate(node=>{const rect=node.getBoundingClientRect();return rect.height>=44&&rect.width>=44;}),'Question delete action needs an accessible name and44px target.');
   assert((await row.getByLabel('Options (comma separated)',{exact:true}).inputValue()).split(',').map(value=>value.trim()).join('|')==='First long descriptive option for a synthetic service|Second option','Unsaved local answers lost.');
   assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2),'Builder page overflows.');await row.scrollIntoViewIfNeeded();await capture('builder-'+theme+'-'+width);
  });
  await page.goto(origin+'/admin/services',{waitUntil:'domcontentloaded'});
  for(const theme of ['light','dark','oled'])for(const width of [1440,768,390])await run('Service tools inline overlay and keyboard '+theme+' '+width,async()=>{
   await page.setViewportSize({width,height:1000});await page.evaluate(theme=>{document.documentElement.dataset.theme=theme;document.documentElement.classList.toggle('dark',theme!=='light');dispatchEvent(new Event('elb-theme-change'));},theme);
   const group=page.locator('.elb-action-group').filter({hasText:'Service tools'}).first(),summary=group.locator('summary');await summary.focus();await page.keyboard.press('Enter');assert(await group.evaluate(node=>node.open),'Tools did not open.');
   const bounds=await group.boundingBox();assert(bounds.x>=-2&&bounds.x+bounds.width<=width+2,'Inline tools exceed viewport.');await group.locator('a').first().focus();await page.keyboard.press('Escape');assert(!await group.evaluate(node=>node.open),'Escape did not close tools.');assert(await summary.evaluate(node=>node===document.activeElement),'Escape did not return focus.');
   await summary.tap();await page.locator('h1').tap();assert(!await group.evaluate(node=>node.open),'Outside tap did not close tools.');await capture('service-tools-'+theme+'-'+width);
  });
  await run('Service queue search clear and icon touch targets',async()=>{
   const firstAction=page.locator('table a').filter({hasText:'Open'}).first();if(await firstAction.count())assert(await firstAction.evaluate(node=>getComputedStyle(node).whiteSpace==='nowrap'&&node.getBoundingClientRect().height>=44),'Open action must stay on one line with a44px target.');
   const input=page.getByLabel('Search service requests',{exact:true});await input.fill('no-synthetic-result-987');await page.getByRole('button',{name:'Apply filters',exact:true}).click();await page.waitForURL(url=>url.searchParams.get('q')==='no-synthetic-result-987');await page.waitForLoadState('networkidle');await page.locator('h1').first().waitFor();
   const active=page.getByLabel('Search service requests',{exact:true});assert(await active.inputValue()==='no-synthetic-result-987','Applied search not restored.');assert(await active.evaluate(node=>parseFloat(getComputedStyle(node).paddingInlineStart)>=32),'Search icon overlaps text.');
   const mine=page.locator('input[name="mine"]').locator('..');assert(await mine.evaluate(node=>node.getBoundingClientRect().height)>=44,'Assigned checkbox label touch target too short.');
   await page.getByRole('link',{name:'Clear filters',exact:true}).click();await page.waitForURL(url=>!url.searchParams.has('q'));await page.waitForLoadState('networkidle');await page.waitForFunction(()=>document.querySelector('input[name="q"]')?.value==='');
  });
  await run('ActionGroup Escape inside modal keeps outer dialog and returns focus',async()=>{
   await page.waitForLoadState('networkidle');const original=page.locator('.elb-action-group').first();await original.locator('summary').focus();await page.keyboard.press('Enter');await page.keyboard.press('Escape');await page.waitForFunction(()=>!document.querySelector('.elb-action-group')?.open);
   await page.evaluate(()=>{const dialog=document.createElement('dialog');dialog.id='global-control-modal';dialog.setAttribute('aria-label','Control layout fixture');dialog.style.cssText='width:calc(100% - 32px);max-height:70vh;padding:16px;background:var(--card);color:var(--foreground);border:1px solid var(--border)';const scroll=document.createElement('div');scroll.style.cssText='max-height:220px;overflow:auto';const group=document.querySelector('.elb-action-group');group.before(document.createComment('test-group-home'));scroll.append(group);dialog.append(scroll);document.body.append(dialog);dialog.showModal();});
   const modal=page.getByRole('dialog',{name:'Control layout fixture'}),group=modal.locator('.elb-action-group'),summary=group.locator('summary');await summary.click();await group.locator('a').first().focus();await page.keyboard.press('Escape');assert(await modal.evaluate(node=>node.open),'Escape propagated and closed outer modal.');assert(!await group.evaluate(node=>node.open),'Inner group not closed.');assert(await summary.evaluate(node=>node===document.activeElement),'Inner focus return failed.');await capture('tools-inside-modal');await page.evaluate(()=>document.querySelector('#global-control-modal').close());
  });
 }finally{await context.close();fs.writeFileSync(path.join(output,'controls-summary.json'),JSON.stringify({completed:true,syntheticOnly:true,checks,errors},null,2));}return checks;
}
