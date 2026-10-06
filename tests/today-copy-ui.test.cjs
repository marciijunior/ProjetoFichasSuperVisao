const {chromium}=require('playwright'),assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
 try{
  const context=await browser.newContext({permissions:['clipboard-read','clipboard-write'],viewport:{width:1366,height:768}}),page=await context.newPage();
  await page.clock.install({time:new Date('2026-10-06T02:59:00Z')}); // Still October 5 in São Paulo.
  const records=[{id:'one',client:'Hoje exemplo',cpf:'52998224725',model:'Onix',plate:'ABC1D23',date:'2026-10-05'}, {id:'two',client:'Ontem exemplo',cpf:'11144477735',date:'2026-10-04'}, {id:'three',client:'Empresa exemplo',cpf:'12ABC34501DE35',date:'2026-10-06'}];
  await page.route('**/api/fichas',r=>r.fulfill({json:{ok:true,authenticated:true,records}}));
  await page.goto(process.env.TEST_URL||'http://127.0.0.1:4176');await page.locator('.record').waitFor();
  assert.equal(await page.locator('.record').count(),1);assert.match(await page.locator('.record').innerText(),/HOJE EXEMPLO/i);
  assert.equal(await page.locator('.record-document').first().evaluate(n=>getComputedStyle(n).userSelect),'text');
  const box=await page.locator('.record-document').first().boundingBox();await page.mouse.move(box.x,box.y+box.height/2);await page.mouse.down();await page.mouse.move(box.x+box.width,box.y+box.height/2,{steps:15});await page.mouse.up();
  assert.equal(await page.evaluate(()=>window.getSelection().toString()),'529.982.247-25');assert.equal(await page.locator('#editor').isVisible(),false);
  await page.getByRole('button',{name:'Copiar CPF de Hoje exemplo',exact:true}).click();assert.equal(await page.evaluate(()=>navigator.clipboard.readText()),'52998224725');
  await page.click('#nav-analytics');assert.equal(await page.locator('#analysis-rows tr').count(),3);
  await page.click('[data-period=today]');assert.equal(await page.inputValue('#filter-from'),'2026-10-05');assert.equal(await page.inputValue('#filter-to'),'2026-10-05');assert.equal(await page.locator('#analysis-rows tr').count(),1);
  await page.locator('#analysis-rows').getByRole('button',{name:'Copiar CPF de Hoje exemplo',exact:true}).click();assert.equal(await page.evaluate(()=>navigator.clipboard.readText()),'52998224725');
  await page.click('#nav-home');await page.clock.fastForward(120000);assert.match(await page.locator('.record').innerText(),/EMPRESA EXEMPLO/i);
  await page.getByRole('button',{name:'Copiar CNPJ de Empresa exemplo',exact:true}).click();assert.equal(await page.evaluate(()=>navigator.clipboard.readText()),'12ABC34501DE35');
  for(const width of [360,390,1366]){await page.setViewportSize({width,height:768});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);}
  console.log('PASS: dia de São Paulo, histórico nas análises, filtro Hoje, seleção por mouse, cópia CPF/CNPJ e virada do dia.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
