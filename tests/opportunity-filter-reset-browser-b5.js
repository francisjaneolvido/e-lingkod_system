// eslint-disable-next-line @typescript-eslint/no-unused-expressions
async page=>{
 const context=await page.context().browser().newContext();page=await context.newPage();const base='http://localhost:3103',observed=[];
 const check=(v,m)=>{if(!v)throw Error(m);};
 try{
  const listings=()=>page.locator('section[aria-labelledby="available-title"] article');
  async function apply(value){await page.getByRole('textbox',{name:'Position or employer'}).fill(value);const response=page.waitForResponse(r=>r.url().includes('/api/opportunities?'));await page.getByRole('button',{name:'Apply filters',exact:true}).click();check((await response).ok(),'Filter API');await page.waitForFunction(q=>new URL(location.href).searchParams.get('q')===q,value);}
  async function reset(label){await page.getByRole('link',{name:'Reset filters',exact:true}).click();await page.waitForFunction(()=>!new URL(location.href).search);const values=await page.locator('form[aria-label="Opportunity filters"]').evaluate(f=>Array.from(new FormData(f).values()).filter(Boolean));const count=await listings().count();observed.push({label,url:page.url(),values,count});check(values.length===0&&count===10,'Reset URL/controls/results disagree: '+JSON.stringify(observed));}
  await page.goto(base+'/opportunities');await apply('No such synthetic job');await page.waitForFunction(()=>!document.querySelector('section[aria-labelledby="available-title"] article'));await reset('AJAX from clean page');
  await page.goto(base+'/opportunities?q=No+such+synthetic+job');await reset('Query-linked initial page');
  await apply('Welder');await reset('Later AJAX filter');return {passed:true,observed};
 }finally{await context.close();}
}
