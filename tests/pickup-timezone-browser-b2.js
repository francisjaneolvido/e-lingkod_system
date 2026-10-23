// Run against the guarded disposable B2 --serve --pickup-browser fixture.
// eslint-disable-next-line @typescript-eslint/no-unused-expressions -- CLI function expression.
async page=>{
  const base="http://127.0.0.1:3101",check=(value,message)=>{if(!value)throw Error(message);},browser=page.context().browser();
  check(browser,"A real browser instance is required");await page.context().clearCookies();
  const login=await page.request.post(base+"/api/auth/sign-in/email",{headers:{origin:base},data:{email:"pickup-staff@example.test",password:"Pickup-browser-test-2468"}});check(login.ok(),"Timezone fixture staff login: "+login.status());
  const cookies=await page.context().cookies(),date=new Date(Date.now()+2*86400000).toISOString().slice(0,10),entry=date+"T09:30",expectedInstant=date+"T01:30:00.000Z",observed=[],errors=[];
  for(const [timezoneId,id]of [["Asia/Manila","pickup-browser-manila-fixture"],["UTC","pickup-browser-utc-fixture"]]){
    const context=await browser.newContext({timezoneId,viewport:{width:1365,height:900}});
    try{
      await context.addCookies(cookies);const tab=await context.newPage();tab.on("pageerror",e=>errors.push(e.message));await tab.goto(base+"/admin/services/"+id);await tab.waitForLoadState("networkidle");
      let payloadInstant;tab.on("request",request=>{if(request.url().endsWith("/pickup")&&request.method()==="POST")payloadInstant=request.postDataJSON().scheduledAt;});
      await tab.getByLabel("Pickup location",{exact:true}).fill("Timezone comparison counter");await tab.getByLabel("Pickup instructions",{exact:true}).fill("Bring valid identification for this scheduled pickup.");
      const input=tab.getByLabel("Proposed pickup date & time",{exact:true});await input.fill(entry);check(await input.inputValue()===entry,"Identical wall-clock input must be retained");
      const response=tab.waitForResponse(r=>r.url().endsWith("/pickup")&&r.request().method()==="POST");await tab.getByRole("button",{name:"Propose pickup time",exact:true}).click();check((await response).ok(),"Timezone proposal failed");
      await tab.reload();const panel=tab.getByRole("heading",{name:"Document pickup & identity check",exact:true}).locator("..");
      const active=panel.locator("li").filter({hasText:"Timezone comparison counter"}).filter({hasText:/\bproposed\b/}).first();
      await active.waitFor();
      const time=active.locator("time"),storedInstant=await time.count()?await time.first().getAttribute("datetime"):null,display=await active.innerText();
      observed.push({timezone:await tab.evaluate(()=>Intl.DateTimeFormat().resolvedOptions().timeZone),entry,payloadInstant,storedInstant,display});
    }finally{await context.close();}
  }
  check(observed[0].payloadInstant===observed[1].payloadInstant,"B2-R4 identical entry must produce one instant in Manila and UTC: "+JSON.stringify(observed));
  for(const value of observed){check(value.payloadInstant===expectedInstant,"Philippine wall-clock entry must convert to UTC+08:00");check(value.storedInstant===expectedInstant,"Reloaded database appointment must retain the exact UTC instant: "+JSON.stringify(value));check(value.display.includes("9:30")&&value.display.includes("Philippine time"),"Appointment must display Philippine time: "+value.display);}
  check(observed[0].display===observed[1].display,"Appointment display must be timezone-independent");check(errors.length===0,JSON.stringify(errors));return{result:"PASS",finding:"B2-R4",expectedInstant,observed,unexpectedJavaScriptErrors:errors};
}
