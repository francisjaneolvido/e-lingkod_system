import fs from 'node:fs';
import path from 'node:path';

export async function runAnalyticsNavigation({browser,origin,adminState,output}) {
  if(origin!=='http://localhost:3117')throw Error('Synthetic preview required.');
  const context=await browser.newContext({storageState:adminState,viewport:{width:1440,height:1000}});
  const page=await context.newPage();page.setDefaultTimeout(10000);page.setDefaultNavigationTimeout(120000);
  const checks=[];const assert=(condition,message)=>{if(!condition)throw Error(message);};
  const ready=()=>page.waitForFunction(()=>document.querySelector('[aria-label="Analytics overview"]')?.getAttribute('aria-busy')==='false');
  const start=async()=>{await page.goto(origin+'/admin/census/analytics?population=INDIVIDUAL&period=YEAR&year=2026&employment=__UNKNOWN__');await ready();};
  const apply=async barangay=>{await page.getByRole('form',{name:'Analytics filters'}).getByLabel(/^Barangay/).selectOption(barangay);await page.getByRole('button',{name:'Apply analytics filters',exact:true}).click();await ready();};
  const run=async(name,fn)=>{try{await fn();checks.push({name,passed:true});}catch(error){checks.push({name,passed:false,message:String(error.message).split('\n')[0]});}};
  try {
    const session=await context.request.get(origin+'/api/auth/get-session');assert((await session.json())?.user?.role==='ADMIN','Verified synthetic Admin session required.');
    await run('barangay recovery beside overview preserves unrelated applied filters',async()=>{
      await start();await apply('Bambang');
      await page.screenshot({path:path.join(output,'barangay-applied.png'),fullPage:false});
      const clear=page.getByRole('button',{name:'Clear barangay',exact:true});
      assert(await clear.count()===1,'Missing visible Clear barangay beside the overview.');
      await clear.click();await ready();
      const url=new URL(page.url());assert(!url.searchParams.has('barangay'),'Clear must remove only geography.');
      assert(url.searchParams.get('employment')==='__UNKNOWN__'&&url.searchParams.get('period')==='YEAR'&&url.searchParams.get('year')==='2026','Clear discarded unrelated applied filters.');
      assert(await page.getByRole('form',{name:'Analytics filters'}).getByLabel(/^Barangay/).inputValue()==='','Draft must agree after clear.');
    });
    await run('meaningful applied transitions support Back Forward and reload',async()=>{
      await start();const baseline=await page.evaluate(()=>history.length);await apply('Bambang');await apply('Maahas');
      assert(await page.evaluate(()=>history.length)>=baseline+2,'Applied transitions replaced history instead of adding entries.');
      await page.goBack();await ready();assert(new URL(page.url()).searchParams.get('barangay')==='Bambang','Back did not restore Bambang.');
      assert(await page.getByRole('form',{name:'Analytics filters'}).getByLabel(/^Barangay/).inputValue()==='Bambang','Back restored URL but not controls.');
      assert((await page.locator('.elb-applied-summary').innerText()).includes('Bambang'),'Back restored URL but not results.');
      await page.goForward();await ready();assert(new URL(page.url()).searchParams.get('barangay')==='Maahas','Forward did not restore Maahas.');
      await page.reload();await ready();assert(await page.getByRole('form',{name:'Analytics filters'}).getByLabel(/^Barangay/).inputValue()==='Maahas','Reload lost geography.');
    });
    await run('another permitted map region stays reachable without inventing its counts',async()=>{
      await start();await apply('Bambang');
      const map=page.locator('[data-map-slot="3"]');
      const other=map.locator('.elb-map-region[role="button"]').filter({has:page.locator('title')});
      assert(await other.count()===14,'Applied geography incorrectly removes permitted map navigation.');
      const region=map.locator('.elb-map-region[aria-label^="Maahas:"]');await region.focus();await region.press('Enter');
      const drawer=page.getByRole('dialog',{name:'Barangay details'});await drawer.waitFor();
      assert(new URL(page.url()).searchParams.get('barangay')==='Bambang','Opening another region silently applied a filter.');
      await drawer.getByRole('button',{name:'Apply Maahas filter',exact:true}).click();await ready();
      assert(new URL(page.url()).searchParams.get('barangay')==='Maahas','Explicit map Apply did not change region.');
    });
    await run('applied filters are individually removable and Reset all filters is separate',async()=>{
      await start();await apply('Bambang');await page.getByRole('button',{name:'Remove Employment filter',exact:true}).click();await ready();
      assert(!new URL(page.url()).searchParams.has('employment')&&new URL(page.url()).searchParams.get('barangay')==='Bambang','Removing one filter discarded another.');
      await page.getByRole('button',{name:'Reset all filters',exact:true}).first().click();await ready();
      const params=new URL(page.url()).searchParams;assert(params.get('population')==='INDIVIDUAL'&&params.get('period')==='CURRENT'&&!params.has('barangay')&&!params.has('employment'),'Reset defaults incorrect.');
    });
  }finally{await context.close();fs.writeFileSync(path.join(output,'navigation-summary.json'),JSON.stringify({completed:true,syntheticOnly:true,checks},null,2));}
  return checks;
}
