// Against the guarded B2 --serve --pickup-browser fixture; no application data.
// eslint-disable-next-line @typescript-eslint/no-unused-expressions -- CLI function expression.
async page=>{
  const base="http://127.0.0.1:3101",errors=[],check=(value,message)=>{if(!value)throw Error(message);};page.on("pageerror",e=>errors.push(e.message));
  const sessions=new Map();
  const signin=async role=>{await page.context().clearCookies();if(sessions.has(role)){await page.context().addCookies(sessions.get(role));return;}const response=await page.request.post(base+"/api/auth/sign-in/email",{headers:{origin:base},data:{email:`pickup-${role}@example.test`,password:"Pickup-browser-test-2468"}});check(response.ok(),"Fixture signin failed for "+role+": "+response.status()+" "+(response.ok()?"":await response.text()));sessions.set(role,await page.context().cookies());};
  const staffPage=async()=>{await signin("staff");await page.goto(base+"/admin/services/pickup-browser-fixture");await page.getByRole("heading",{name:"Document pickup & identity check",exact:true}).waitFor();};
  const citizenPage=async()=>{await signin("citizen");await page.goto(base+"/services/requests/pickup-browser-fixture");await page.getByRole("heading",{name:"Physical document pickup",exact:true}).waitFor();};
  const propose=async()=>{
    await page.getByLabel("Pickup location",{exact:true}).fill("Municipal BPLO counter");await page.getByLabel("Pickup instructions",{exact:true}).fill("Bring valid identification to collect the approved document.");
    const date=new Date(Date.now()+86400000).toISOString().slice(0,16),dateField=page.getByLabel("Proposed pickup date & time",{exact:true});await dateField.fill(date);check(await dateField.inputValue()===date,"Pickup datetime input retains its value");
    const response=page.waitForResponse(r=>r.url().endsWith("/pickup")&&r.request().method()==="POST");await page.getByRole("button",{name:"Propose pickup time",exact:true}).click();check((await response).ok(),"Pickup proposal failed");
  };
  // Allow an interrupted/repeated fixture run to request replacement of its old slot.
  await citizenPage();const reset=page.getByRole("button",{name:"Request pickup change",exact:true});
  if(await reset.isVisible()){await page.getByLabel("Requested pickup change",{exact:true}).fill("Prepare a fresh pickup proposal for this fixture run.");await reset.click();await page.getByText("Status: change requested",{exact:true}).waitFor();}
  await staffPage();await propose();
  await citizenPage();
  const preview=page.getByRole("button",{name:"Preview document",exact:true}).first();await preview.click();
  const image=page.getByRole("img",{name:"Uploaded document: test-fixture.png",exact:true});await image.waitFor();
  await page.waitForFunction(()=>Array.from(document.images).some(image=>image.alt==="Uploaded document: test-fixture.png"&&image.naturalWidth>0));
  await page.getByRole("button",{name:"Close preview",exact:true}).first().click();
  await page.getByLabel("Claimant name",{exact:true}).fill("Citizen Claimant");await page.getByRole("button",{name:"Confirm pickup",exact:true}).click();
  await page.getByText("Status: confirmed",{exact:true}).waitFor();
  await page.getByLabel("Requested pickup change",{exact:true}).fill("Please arrange another time tomorrow.");await page.getByRole("button",{name:"Request pickup change",exact:true}).click();
  await page.getByText("Status: change requested",{exact:true}).waitFor();
  await staffPage();await propose();await citizenPage();
  await page.getByLabel("Claimant name",{exact:true}).fill("Citizen Claimant");await page.getByRole("button",{name:"Confirm pickup",exact:true}).click();await page.getByText("Status: confirmed",{exact:true}).waitFor();
  await staffPage();await page.getByText("Citizen-confirmed claimant: Citizen Claimant",{exact:true}).first().waitFor();await page.getByLabel("Actual claimant name",{exact:true}).fill("Alternate Actual Claimant");await page.getByLabel("Release remarks",{exact:true}).fill("Physical document collection at the counter.");
  check(!await page.getByRole("button",{name:"Record actual document release",exact:true}).isEnabled(),"Explicit ID check gates release button");
  await page.getByRole("checkbox",{name:"I checked the claimant's valid identification in person.",exact:true}).check();
  await page.getByRole("button",{name:"Record actual document release",exact:true}).click();await page.getByRole("alert").filter({hasText:"The confirmed pickup time has not occurred yet"}).waitFor();
  await page.goto(base+"/admin/services/pickup-browser-claimed-fixture");
  const staffAudit=page.getByRole("heading",{name:"Document pickup & identity check",exact:true}).locator("..");await staffAudit.getByText("Citizen-confirmed claimant: Confirmed Browser Claimant",{exact:true}).waitFor();await staffAudit.getByText("Actual claimant: Alternate Browser Claimant",{exact:true}).waitFor();
  await signin("citizen");await page.goto(base+"/services/requests/pickup-browser-claimed-fixture");
  const citizenAudit=page.getByRole("heading",{name:"Physical document pickup",exact:true}).locator("..");await citizenAudit.getByText("Citizen-confirmed claimant: Confirmed Browser Claimant",{exact:true}).waitFor();await citizenAudit.getByText("Actual claimant: Alternate Browser Claimant",{exact:true}).waitFor();
  await signin("admin");await page.goto(base+"/admin/staff");await page.getByRole("tab",{name:/Invite new staff/}).click();const select=page.getByRole("combobox",{name:"Department / office",exact:true});await select.selectOption("Public Employment Service Office (PESO)");
  await page.getByRole("button",{name:"Use suggested modules",exact:true}).first().click();await select.selectOption("__OTHER__");await page.getByLabel("Custom department / office",{exact:true}).first().fill("Local Test Office");
  check(await page.getByLabel("Custom department / office",{exact:true}).first().inputValue()==="Local Test Office","Custom office remains editable");
  check(errors.length===0,"Unexpected JavaScript errors: "+JSON.stringify(errors));
  return{result:"PASS",scenarios:["assigned staff proposal","authorized image preview/close","citizen confirmation/change","staff replacement proposal","differing actual name retains ID-check and future-time gates","staff/citizen audit displays preserve both claimant names","office suggestions require action","custom office"],unexpectedJavaScriptErrors:errors};
}
