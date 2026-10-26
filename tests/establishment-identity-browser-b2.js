// Against the guarded disposable B2 browser server.
// eslint-disable-next-line @typescript-eslint/no-unused-expressions -- CLI function expression.
async page=>{
  const base="http://127.0.0.1:3101",check=(value,message)=>{if(!value)throw Error(message);},json=async response=>{const value=await response.json();check(response.ok(),JSON.stringify(value));return value;},errors=[];
  page.on("pageerror",error=>errors.push(error.message));await page.context().clearCookies();
  await json(await page.request.post(base+"/api/auth/sign-up/email",{headers:{origin:base},data:{name:"Annual Identity Reviewer",firstName:"Annual",lastName:"Reviewer",hasNoMiddleName:true,phoneNumber:"+639171234569",email:crypto.randomUUID()+"@example.test",password:"B2-browser-test-password-2468"}}));
  const year=new Date().getFullYear(),old=year-1,answers={businessName:"Historical Browser Identity",street:"25 Example Street",officeType:"MAIN",barangay:"Batong Malake",employerType:"PRIVATE",organizationType:"COOPERATIVE",industry:"FOOD_ACCOMMODATION",productsServices:"Original annual activity",operatingStatus:"OPERATING",contactName:"Survey Representative",contactPosition:"Manager",contactEmail:"representative@example.test"};
  const created=await json(await page.request.post(base+"/api/establishment-surveys",{headers:{origin:base},data:{...answers,surveyYear:old,requestKey:crypto.randomUUID()}}));
  const read=async yr=>json(await page.request.get(base+"/api/establishment-surveys?id="+created.establishmentId+"&year="+yr));
  const submit=async(yr,changes)=>{const state=await read(yr);return json(await page.request.put(base+"/api/establishment-surveys",{headers:{origin:base},data:{...answers,...changes,establishmentId:created.establishmentId,surveyYear:yr,status:"SUBMITTED",expectedRecordVersion:state.recordVersion,expectedVersion:state.workspaceVersion,requestKey:crypto.randomUUID()}}));};
  await submit(old,{});await submit(year,{businessName:"Current Browser Identity",correctIdentity:true});
  await json(await page.request.post(base+"/api/establishment-surveys",{headers:{origin:base},data:{...answers,requestKey:crypto.randomUUID()}}));
  await page.goto(base+"/establishment-survey");await page.getByRole("button",{name:/Current Browser Identity — 25 Example Street/}).click();await page.getByLabel("Survey year",{exact:true}).selectOption(String(old));
  await page.waitForFunction(()=>document.querySelector("#est-businessName")?.value==="Historical Browser Identity");
  const correction=page.getByRole("checkbox",{name:/Also correct the current establishment identity/});check(!await correction.isChecked(),"Historical edits must not opt into canonical corrections");
  await page.getByRole("button",{name:"Next",exact:true}).click();await page.getByLabel("Principal products / services",{exact:true}).fill("Updated historical activity");await page.getByRole("button",{name:"Save draft",exact:true}).click();await page.getByRole("status").filter({hasText:"Draft saved"}).waitFor();
  check((await read(old)).establishment.businessName==="Current Browser Identity","Nonidentity edit cannot revert current name or collide with another record");
  await page.getByRole("button",{name:"Previous",exact:true}).click();await page.getByLabel("Business name",{exact:true}).fill("Explicit Browser Correction");await correction.check();await page.getByRole("button",{name:"Save draft",exact:true}).click();await page.getByRole("status").filter({hasText:"Draft saved"}).waitFor();
  const corrected=await read(old);check(corrected.establishment.businessName==="Explicit Browser Correction","Explicit correction must update canonical identity");check(corrected.history[0].answers.businessName===answers.businessName,"Earlier submitted identity stays immutable");check(!await correction.isChecked(),"Correction intent clears after reconciliation");
  await page.getByLabel("Business name",{exact:true}).fill(answers.businessName);await correction.check();await page.getByRole("button",{name:"Save draft",exact:true}).click();await page.getByRole("alert").filter({hasText:/identity already exists|survey changed/}).waitFor();
  check((await read(old)).recordVersion===corrected.recordVersion,"Rejected duplicate correction cannot change record versions");
  check(errors.length===0,JSON.stringify(errors));return{result:"PASS",finding:"B2-R1",scenarios:["older-year nonidentity edit with occupied historical identity","explicit canonical correction with protected history","duplicate correction rollback and intent reset"],unexpectedJavaScriptErrors:errors};
}
