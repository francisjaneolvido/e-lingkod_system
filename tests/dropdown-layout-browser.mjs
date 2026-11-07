import fs from 'node:fs';
import path from 'node:path';
export async function runDropdownLayout({browser,origin,output}){
 if(origin!=='http://localhost:3117')throw Error('Only isolated synthetic preview allowed.');
 const context=await browser.newContext(),page=await context.newPage();page.setDefaultTimeout(20000);page.setDefaultNavigationTimeout(120000);const checks=[];
 const run=async(name,fn)=>{try{await fn();checks.push({name,passed:true});}catch(error){checks.push({name,passed:false,message:String(error.message).split('\n')[0]});}};
 try{for(const width of [1440,768,390])await run('Opportunities options remain contained, readable and selectable at '+width,async()=>{
  await page.setViewportSize({width,height:1000});await page.goto(origin+'/opportunities',{waitUntil:'networkidle'});await page.getByRole('form',{name:'Opportunity filters'}).waitFor();
  const more=page.getByText('Qualifications, work conditions and pay',{exact:true});await more.click();
  const geometry=await page.locator('form[aria-label="Opportunity filters"] select').evaluateAll(nodes=>nodes.map(node=>{const rect=node.getBoundingClientRect(),label=node.closest('label').getBoundingClientRect(),style=getComputedStyle(node);return {name:node.name,width:rect.width,labelWidth:label.width,left:rect.left,labelLeft:label.left,right:rect.right,labelRight:label.right,height:rect.height,font:parseFloat(style.fontSize)};}));
  await page.screenshot({path:path.join(output,'opportunities-open-'+width+'.png'),fullPage:true,caret:'initial'});
  const broken=geometry.filter(item=>item.width<120||item.left<item.labelLeft-2||item.right>item.labelRight+2||item.height<44||item.font<14);
  if(broken.length)throw Error('Overlapping or unusable select geometry: '+JSON.stringify(broken));
  if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2))throw Error('Page overflows horizontally.');
  const occupation=page.locator('select[name="occupation"]');await occupation.focus();await page.keyboard.press('ArrowDown');await page.keyboard.press('Enter');
  if(!await occupation.inputValue())throw Error('Native keyboard selection failed.');
  await page.keyboard.press('Escape');
 });}finally{await context.close();fs.writeFileSync(path.join(output,'dropdown-layout-summary.json'),JSON.stringify({syntheticOnly:true,completed:true,checks},null,2));}return checks;
}
