const {chromium}=require('playwright');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
 try{
  const page=await browser.newPage({viewport:{width:390,height:844}}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  let authenticated=false,offline=false,rows=[],saves=0;
  await page.route('**/api/fichas',async route=>{
   const req=route.request().postDataJSON();let result={ok:true},status=200;
   if(offline){await route.abort();return;}
   if(req.action==='login'){authenticated=req.token==='a'.repeat(64);if(!authenticated){status=401;result={ok:false,error:'Chave de acesso inválida.'};}}
   else if(req.action==='session')result.authenticated=authenticated;
   else if(req.action==='logout')authenticated=false;
   else if(!authenticated){status=401;result={ok:false,error:'Entre novamente com sua chave de acesso.'};}
   else if(req.action==='list')result.records=rows;
   else if(req.action==='save'){saves++;result.record={...req.record,revision:'rev'+saves};rows=[result.record,...rows.filter(r=>r.id!==req.record.id)];}
   else if(req.action==='remove')rows=rows.filter(r=>r.id!==req.id);
   await route.fulfill({status,contentType:'application/json',body:JSON.stringify(result)});
  });
  await page.clock.setFixedTime(new Date('2026-09-25T12:00:00Z'));await page.goto('http://127.0.0.1:4176');
  await page.locator('#login').waitFor({state:'visible'});assert.equal(await page.locator('#workspace').isVisible(),false);
  await page.fill('#access-key','wrong');await page.click('#login-submit');await page.locator('#login-error').waitFor({state:'visible'});
  await page.fill('#access-key','a'.repeat(64));await page.click('#login-submit');await page.locator('#workspace').waitFor({state:'visible'});
  assert.equal(await page.evaluate(()=>JSON.stringify(localStorage).includes('a'.repeat(64))),false);
  await page.click('#new');
  assert.deepEqual(await page.locator('#form [required]').evaluateAll(ns=>ns.map(n=>n.name).sort()),['client','cpf','model','plate']);
  assert.equal(await page.locator('[name=date]').getAttribute('readonly'),null);
  assert.match(await page.inputValue('[name=date]'),/^\d{4}-\d{2}-\d{2}$/);
  await page.fill('[name=date]','2026-09-25');
  await page.fill('[name=client]','CLIENTE FICTÍCIO WEB');await page.fill('[name=cpf]','52998224725');await page.fill('[name=model]','Veículo de teste');await page.fill('[name=plate]','ABC1D23');
  for(const number of ['8','9','10','11','12','13','14','15']){await page.click('[data-number="'+number+'"]');assert.equal(await page.inputValue('[name=value]'),number);}
  await page.fill('[name=value]','008');offline=true;await page.click('#form button[type=submit]');await page.locator('#form-error').waitFor({state:'visible'});assert.equal(saves,0);
  const id=await page.evaluate(()=>JSON.parse(localStorage.getItem('sv-web-draft')).id);
  offline=false;await page.reload();await page.locator('#editor').waitFor({state:'visible'});assert.equal(await page.inputValue('[name=value]'),'008');
  await page.click('#form button[type=submit]');await page.locator('#home').waitFor({state:'visible'});assert.equal(rows.length,1);assert.equal(rows[0].id,id);assert.equal(rows[0].value,'008');assert.equal(rows[0].date,'2026-09-25');
  await page.locator('.record-actions button').first().click();await page.fill('[name=model]','Modelo editado');await page.click('#form button[type=submit]');await page.locator('#home').waitFor({state:'visible'});assert.equal(rows[0].model,'Modelo editado');
  await page.locator('.record-actions button').first().click();await page.click('#delete');await page.click('#confirm-yes');await page.locator('#home').waitFor({state:'visible'});assert.equal(rows.length,0);
  for(const width of [360,390,768,1280]){await page.setViewportSize({width,height:844});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);}
  await page.setViewportSize({width:390,height:844});await page.screenshot({path:'dist/supervisao-web-inicio.png',fullPage:true});
  await page.click('#new');await page.fill('[name=client]','Rascunho mantido');authenticated=false;await page.fill('[name=cpf]','52998224725');await page.fill('[name=model]','Teste');await page.fill('[name=plate]','ABC1D23');await page.click('#form button[type=submit]');await page.locator('#login').waitFor({state:'visible'});
  assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('sv-web-draft')).client),'Rascunho mantido');
  await page.fill('#access-key','a'.repeat(64));await page.click('#login-submit');await page.locator('#editor').waitFor({state:'visible'});await page.click('#back');await page.click('#logout');await page.click('#confirm-yes');await page.locator('#login').waitFor({state:'visible'});
  assert.equal(await page.evaluate(()=>localStorage.getItem('sv-web-draft')),null);assert.equal(await page.evaluate(()=>localStorage.getItem('sv-web-records')),null);
  await page.screenshot({path:'dist/supervisao-web-acesso.png',fullPage:true});assert.deepEqual(errors,[]);
  console.log('PASS: login, proteção de tela, campos, sugestões, rascunho offline, CRUD, sessão expirada, saída e quatro tamanhos de tela. Dados simulados.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
