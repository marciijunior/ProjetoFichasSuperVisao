const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs');
(async()=>{
 const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
 try{
  const page=await browser.newPage({viewport:{width:1280,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  const records=Array.from({length:32},(_,i)=>({id:'fixture-'+i,client:'CLIENTE FICTÍCIO '+i,cpf:i%2?'52998224725':'11144477735',plate:'ABC'+String(1000+i),date:i<16?'2026-10-01':'2026-10-02',brand:i%2?'VW':'Chevrolet',model:i%2?'Gol':'Onix',fuel:i%3?'Flex':'Gasolina',city:i%2?'São Paulo':'Curitiba',state:i%2?'SP':'PR',color:i%2?'Prata':'Branco',year:String(2020+i%5),value:i%2?'008':'9',cloud:true}));
  let signedIn=true;
  await page.route('**/api/fichas',r=>{const req=r.request().postDataJSON();if(req.action==='logout')signedIn=false;return r.fulfill({json:{ok:true,authenticated:signedIn,records}});});
  await page.goto('http://127.0.0.1:4176');await page.click('#open-analytics');
  assert.equal(await page.locator('.metric strong').first().innerText(),'32');
  assert.equal(await page.locator('#analysis-rows tr').count(),25);await page.click('#page-next');assert.equal(await page.locator('#analysis-rows tr').count(),7);
  await page.selectOption('#filter-brand','VOLKSWAGEN');assert.equal(await page.locator('.metric strong').first().innerText(),'16');assert.ok((await page.locator('#filter-model option').allTextContents()).includes('Gol'));
  assert.ok(!(await page.locator('#filter-model option').allTextContents()).includes('Onix'));
  await page.selectOption('#filter-value','008');await page.fill('#filter-from','2026-10-01');await page.fill('#filter-to','2026-10-01');await page.locator('#filter-to').blur();
  assert.equal(await page.locator('.metric strong').first().innerText(),'8');
  const download=page.waitForEvent('download');await page.click('#export-filtered');const file=await(await download).path(),csv=fs.readFileSync(file,'utf8');assert.equal(csv.split('\r\n').length,9);assert.ok(csv.includes('"008"'));
  await page.fill('#filter-from','2026-10-03');await page.locator('#filter-from').blur();assert.equal(await page.locator('#filter-error').isVisible(),true);assert.equal(await page.locator('#export-filtered').isDisabled(),true);
  await page.click('#clear-filters');await page.selectOption('#breakdown-type','donut');assert.equal(await page.locator('#breakdown-chart .donut-svg').count(),1);
  await page.locator('#breakdown-chart .category-item').filter({hasText:'Volkswagen'}).click();assert.equal(await page.locator('.metric strong').first().innerText(),'16');
  await page.click('#clear-filters');await page.selectOption('#time-type','bar');await page.locator('#time-chart [role=button]').first().press('Enter');assert.equal(await page.locator('.metric strong').first().innerText(),'16');
  await page.click('#clear-filters');await page.selectOption('#location-type','donut');assert.ok(await page.locator('.timeline-svg').evaluate(e=>e.getBoundingClientRect().height>=240));await page.screenshot({path:'dist/analises-desktop-demonstracao.png',fullPage:true});
  for(const width of [360,390,768,1280]){await page.setViewportSize({width,height:844});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);}
  await page.setViewportSize({width:390,height:844});await page.screenshot({path:'dist/analises-celular-demonstracao.png',fullPage:true});
  await page.locator('#analysis-rows').getByRole('button',{name:'Editar ficha',exact:true}).first().click();await page.locator('#editor').waitFor({state:'visible'});assert.equal(await page.locator('#analytics').isVisible(),false);
  await page.fill('[name=brand]','vw');await page.locator('[name=brand]').blur();assert.equal(await page.inputValue('[name=brand]'),'Volkswagen');
  const models=await page.locator('#suggest-model option').evaluateAll(es=>es.map(e=>e.value));assert.ok(models.includes('Gol'));assert.ok(!models.includes('Onix'));
  await page.fill('[name=brand]','');await page.fill('[name=model]','Corolla');await page.locator('[name=model]').blur();assert.equal(await page.inputValue('[name=brand]'),'Toyota');
  await page.fill('[name=fuel]','flex');await page.locator('[name=fuel]').blur();assert.equal(await page.inputValue('[name=fuel]'),'Gasolina / Álcool');
  await page.fill('[name=color]','prata');await page.locator('[name=color]').blur();assert.equal(await page.inputValue('[name=color]'),'Prata');
  await page.selectOption('[name=state]','SP');let cities=await page.locator('#suggest-city option').evaluateAll(es=>es.map(e=>e.value));assert.ok(cities.includes('Araçatuba'));assert.ok(cities.includes('São Paulo'));assert.ok(!cities.includes('Curitiba'));
  await page.selectOption('[name=state]','PR');cities=await page.locator('#suggest-city option').evaluateAll(es=>es.map(e=>e.value));assert.ok(cities.includes('Curitiba'));assert.ok(!cities.includes('Araçatuba'));
  await page.selectOption('[name=state]','');await page.fill('[name=city]','aracatuba');await page.locator('[name=city]').blur();assert.equal(await page.inputValue('[name=city]'),'Araçatuba');assert.equal(await page.inputValue('[name=state]'),'SP');
  await page.click('#back');await page.click('#logout');await page.click('#confirm-yes');await page.locator('#login').waitFor({state:'visible'});assert.equal(await page.locator('#analytics').isVisible(),false);
  await page.unroute('**/api/fichas');await page.route('**/api/fichas',r=>r.fulfill({json:{ok:true,authenticated:true,records:[]}}));await page.reload();await page.click('#open-analytics');assert.equal(await page.locator('.metric strong').first().innerText(),'0');assert.equal(await page.locator('#analytics-empty').isVisible(),true);assert.equal(await page.locator('#time-chart svg').count(),0);
  assert.deepEqual(errors,[]);console.log('PASS: totais, filtros combinados, período inválido, paginação, exportação filtrada, rosca, colunas, filtros por clique/teclado, sugestões, planilha vazia e quatro larguras. Dados fictícios, sem acesso à planilha real.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
