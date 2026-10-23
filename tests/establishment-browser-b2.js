// Run with playwright-cli against scripts/verify-establishment-profiling.mjs --serve.
// eslint-disable-next-line @typescript-eslint/no-unused-expressions -- CLI evaluates this function.
async page => {
  const base="http://127.0.0.1:3101",check=(ok,message)=>{if(!ok)throw Error(message);};
  const json=async response=>{const value=await response.json();check(response.ok(),JSON.stringify(value));return value;};
  const errors=[],serverErrors=[],failed=[];
  page.on("pageerror",error=>errors.push(error.message));
  page.on("response",response=>{if(response.status()>=500)serverErrors.push(response.url());});
  page.on("requestfailed",request=>failed.push(request.url()));
  await page.context().clearCookies();
  await json(await page.request.post(base+"/api/auth/sign-up/email",{headers:{origin:base},data:{name:"Establishment Browser",firstName:"Establishment",lastName:"Browser",hasNoMiddleName:true,phoneNumber:"+639171234569",email:"b2-"+crypto.randomUUID()+"@example.test",password:"B2-browser-test-password-2468"}}));
  await page.goto(base+"/establishment-survey");
  await page.getByRole("heading",{name:"Establishment Profiling",exact:true}).waitFor({timeout:8000});
  await page.getByRole("button",{name:"Add establishment",exact:true}).click();
  await page.getByLabel("Business name",{exact:true}).fill("Browser Cooperative");
  await page.getByLabel("Street / building / village",{exact:true}).fill("20 Main Street");
  await page.getByLabel("Office type",{exact:true}).selectOption("MAIN");
  await page.getByLabel("Barangay",{exact:true}).selectOption("Batong Malake");
  await page.getByRole("button",{name:"Create establishment draft",exact:true}).click();
  await page.getByRole("status").filter({hasText:"Establishment draft created"}).waitFor();
  const primaryLegible=await page.getByRole("button",{name:"Next",exact:true}).evaluate(button=>{const style=getComputedStyle(button);return style.color!==style.backgroundColor;});
  check(primaryLegible,"Primary action label must not have the same rendered color as its background");
  const records=await json(await page.request.get(base+"/api/establishment-surveys")),id=records[0].id,year=new Date().getFullYear();
  const state=async(yr=year)=>json(await page.request.get(base+"/api/establishment-surveys?id="+id+"&year="+yr));
  check((await state()).submitted===null,"New organization must be incomplete, not submitted");
  await page.getByRole("button",{name:"Next",exact:true}).click();
  await page.getByLabel("Employer type",{exact:true}).selectOption("PRIVATE");
  await page.getByLabel("Organization type",{exact:true}).selectOption("COOPERATIVE");
  await page.getByLabel("Line of business / industry",{exact:true}).selectOption("FOOD_ACCOMMODATION");
  await page.getByLabel("Principal products / services",{exact:true}).fill("Community catering");
  await page.getByLabel("Operating status",{exact:true}).selectOption("OPERATING");
  await page.getByRole("button",{name:"Save draft",exact:true}).click();
  await page.getByRole("status").filter({hasText:"Draft saved"}).waitFor();
  await page.reload();await page.getByRole("button",{name:/Browser Cooperative — 20 Main Street/}).click();
  await page.getByRole("button",{name:"Next",exact:true}).click();
  check(await page.getByLabel("Principal products / services",{exact:true}).inputValue()==="Community catering","Partial draft must survive reload");
  await page.getByRole("button",{name:"Next",exact:true}).click();
  await page.getByLabel("Total workers",{exact:true}).fill("5.5");
  await page.getByRole("button",{name:"Save draft",exact:true}).click();
  await page.getByRole("alert").filter({hasText:/whole nonnegative/}).waitFor();
  await page.getByLabel("Total workers",{exact:true}).fill("5");
  await page.getByLabel("Regular workers",{exact:true}).fill("3");
  await page.getByLabel("Nonregular workers",{exact:true}).fill("2");
  await page.getByLabel("Part-time workers",{exact:true}).fill("1");
  await page.getByLabel("Contact person",{exact:true}).fill("Authorized Representative");
  await page.getByLabel("Contact position",{exact:true}).fill("Manager");
  await page.getByLabel("Contact email",{exact:true}).fill("manager_test@example.test");
  await page.getByRole("button",{name:"Next",exact:true}).click();
  check(await page.getByText("manager_test@example.test",{exact:true}).isVisible(),"Review must preserve free-text email underscores exactly");
  const layouts=[];
  for(const [width,height] of [[1365,900],[820,1180],[390,844]]){
    await page.setViewportSize({width,height});
    check(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),"Horizontal overflow at "+width);
    layouts.push({width,height,overflow:false});
  }
  const submit=async()=>{await page.getByRole("button",{name:"Review and submit",exact:true}).click();await page.getByRole("dialog").getByRole("button",{name:"Submit survey",exact:true}).click();};
  await page.getByRole("button",{name:"Review and submit",exact:true}).click();
  check(await page.getByRole("dialog").isVisible(),"Submission dialog opens");
  await page.keyboard.press("Tab");check(await page.evaluate(()=>document.querySelector("dialog")?.contains(document.activeElement)),"Dialog traps keyboard focus");
  await page.keyboard.press("Escape");check(!await page.getByRole("dialog").isVisible(),"Escape cancels dialog");
  check((await state()).history.length===0,"Cancelled submission cannot persist");
  let lostSubmission=false;const submissions=[];
  await page.route("**/api/establishment-surveys",async route=>{
    const request=route.request();if(request.method()!=="PUT")return route.continue();submissions.push(request.postDataJSON());
    if(lostSubmission)return route.continue();lostSubmission=true;const response=await route.fetch();check(response.ok(),"Submission must commit before losing response");await route.abort("failed");
  });
  await submit();await page.getByRole("alert").filter({hasText:"Outcome not confirmed"}).waitFor();
  check((await state()).history.length===1,"Lost response test must commit first");
  await page.getByRole("button",{name:"Retry pending operation",exact:true}).click();
  await page.getByRole("status").filter({hasText:"Survey submitted"}).waitFor();
  check(submissions.length===2&&submissions[0].requestKey===submissions[1].requestKey,"Submission retry preserves identity");
  check((await state()).history.length===1,"Lost submission replay creates one revision");await page.unroute("**/api/establishment-surveys");
  await page.getByRole("button",{name:"Previous",exact:true}).click();await page.getByRole("button",{name:"Previous",exact:true}).click();
  await page.getByLabel("Principal products / services",{exact:true}).fill("Changed service draft");
  let lostGet=false,putCommitted=false;const draftRequests=[];
  await page.route("**/api/establishment-surveys**",async route=>{
    const request=route.request();
    if(request.method()==="PUT"){draftRequests.push(request.postDataJSON());const response=await route.fetch();check(response.ok(),"Draft write commits");putCommitted=true;return route.fulfill({response});}
    if(request.method()==="GET"&&request.url().includes("?id=")&&putCommitted&&!lostGet){lostGet=true;return route.abort("failed");}return route.continue();
  });
  await page.getByRole("button",{name:"Save draft",exact:true}).click();await page.getByRole("button",{name:"Retry pending operation",exact:true}).waitFor();
  await page.getByRole("button",{name:"Retry pending operation",exact:true}).click();await page.getByRole("status").filter({hasText:"Draft saved"}).waitFor();
  check(draftRequests.length===2&&draftRequests[0].requestKey===draftRequests[1].requestKey,"GET-loss retry preserves identity");
  const draft=await state();check(draft.answers.productsServices==="Changed service draft"&&draft.submitted.productsServices==="Community catering","Draft cannot erase current submitted response");
  await page.unroute("**/api/establishment-surveys**");
  const external={...draft.answers,establishmentId:id,surveyYear:year,status:"DRAFT",expectedRecordVersion:draft.recordVersion,expectedVersion:draft.workspaceVersion,requestKey:crypto.randomUUID(),productsServices:"Other tab saved"};
  await json(await page.request.put(base+"/api/establishment-surveys",{headers:{origin:base},data:external}));
  await page.getByLabel("Principal products / services",{exact:true}).fill("Stale tab edit");await page.getByRole("button",{name:"Save draft",exact:true}).click();
  await page.getByRole("alert").filter({hasText:/changed/}).waitFor();
  await page.getByRole("button",{name:"Refresh saved state",exact:true}).click();await page.getByRole("dialog").getByRole("button",{name:"Refresh saved state",exact:true}).click();
  await page.getByRole("status").filter({hasText:"Saved state refreshed"}).waitFor();
  check(await page.getByLabel("Principal products / services",{exact:true}).inputValue()==="Other tab saved","Refresh presents concurrent answers");
  let lostDelete=false;const deletes=[];
  await page.route("**/api/establishment-surveys",async route=>{
    if(route.request().method()!=="DELETE")return route.continue();deletes.push(route.request().postDataJSON());if(lostDelete)return route.continue();lostDelete=true;const response=await route.fetch();check(response.ok(),"Withdrawal commits before response loss");await route.abort("failed");
  });
  await page.getByRole("button",{name:"Withdraw this year's survey",exact:true}).click();await page.getByRole("dialog").getByRole("button",{name:"Withdraw survey",exact:true}).click();
  await page.getByRole("button",{name:"Retry pending operation",exact:true}).waitFor();await page.getByRole("button",{name:"Retry pending operation",exact:true}).click();
  await page.getByRole("status").filter({hasText:"Survey withdrawn"}).waitFor();
  check(deletes.length===2&&deletes[0].requestKey===deletes[1].requestKey,"Withdrawal replays original request");
  const withdrawn=await state();check(withdrawn.status==="WITHDRAWN"&&withdrawn.history.filter(x=>x.action==="WITHDRAWN").length===1,"Exactly one withdrawal event");
  await page.unroute("**/api/establishment-surveys");
  await page.getByLabel("Survey year",{exact:true}).selectOption(String(year-1));await page.getByRole("button",{name:"Save draft",exact:true}).click();
  await page.getByRole("status").filter({hasText:"Draft saved"}).waitFor();check((await state(year-1)).hasDraft,"Prior year has its own draft");check((await state()).status==="WITHDRAWN","Other year remains withdrawn");
  check(errors.length===0,"Unexpected JavaScript errors: "+JSON.stringify(errors));check(serverErrors.length===0,"Unexpected server errors: "+JSON.stringify(serverErrors));
  check(failed.length===3,"Only the three deliberately lost requests may fail: "+JSON.stringify(failed));
  return {result:"PASS",layouts,scenarios:["partial draft/reopen","workforce validation","keyboard/dialog Escape","committed submission response-loss replay","draft follow-up GET-loss replay","stale tab conflict/refresh","withdrawal response-loss replay","independent years"],unexpectedJavaScriptErrors:errors,unexpectedServerErrors:serverErrors,deliberatelyFailedRequests:failed.length};
}
