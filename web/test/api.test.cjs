process.env.GOOGLE_APPS_SCRIPT_URL='https://script.google.com/macros/s/test-deployment/exec';
process.env.GOOGLE_SPREADSHEET_ID='test-spreadsheet-id';
const {test,after}=require('node:test');
const assert=require('node:assert/strict');
const handler=require('../api/fichas');
const originalFetch=global.fetch;
process.env.SESSION_SECRET='test-only-session-secret-0123456789abcdef';
const TOKEN='a'.repeat(64),SHEET='test-spreadsheet-id';
let cookie,requests=[];
async function call(body,options={}){
  const headers={},req={method:'POST',headers:{host:'supervisao.example',origin:'https://supervisao.example','content-type':'application/json',...options.headers},body,...options};
  req.headers={host:'supervisao.example',origin:'https://supervisao.example','content-type':'application/json',...options.headers};
  const res={setHeader:(k,v)=>headers[k.toLowerCase()]=v,end:s=>res.data=JSON.parse(s)};
  await handler(req,res);return {status:res.statusCode,data:res.data,headers};
}
function success(data={}){return new Response(JSON.stringify({ok:true,spreadsheetId:SHEET,...data}),{headers:{'content-type':'application/json'}});}
after(()=>global.fetch=originalFetch);
test('private data requires an authenticated session',async()=>{
  global.fetch=()=>{throw Error('must not call upstream');};
  assert.equal((await call({action:'list'})).status,401);
  assert.equal((await call({action:'login',token:'wrong'})).status,401);
  assert.equal((await call({action:'session'})).data.authenticated,false);
});
test('login follows Google redirects without forwarding credentials and creates an encrypted HttpOnly cookie',async()=>{
  requests=[];global.fetch=async(url,options)=>{requests.push({url,options});return requests.length===1?new Response(null,{status:302,headers:{location:'https://script.googleusercontent.com/macros/echo?test=true'}}):success();};
  const result=await call({action:'login',token:TOKEN});
  assert.equal(result.status,200);cookie=result.headers['set-cookie'].split(';')[0];
  assert.match(result.headers['set-cookie'],/HttpOnly; Secure; SameSite=Strict/);
  assert.ok(!cookie.includes(TOKEN));assert.equal(requests[1].options.method,'GET');assert.equal(requests[1].options.body,undefined);
  assert.equal((await call({action:'session'},{headers:{cookie}})).data.authenticated,true);
});
test('fixed destination and token cannot be overridden by client input',async()=>{
  global.fetch=async(url,options)=>{const data=JSON.parse(options.body);assert.equal(data.token,TOKEN);assert.equal(data.spreadsheetId,SHEET);assert.ok(url.startsWith('https://script.google.com/'));return success({records:[]});};
  assert.equal((await call({action:'list',token:'evil',url:'https://evil.example',spreadsheetId:'evil'},{headers:{cookie}})).status,200);
});
test('blocks cross-site requests, unsupported methods, oversized bodies and tampered cookies',async()=>{
  assert.equal((await call({action:'list'},{headers:{origin:'https://evil.example',cookie}})).status,403);
  assert.equal((await call({action:'list'},{headers:{'sec-fetch-site':'cross-site',cookie}})).status,403);
  assert.equal((await call({action:'list'},{method:'GET'})).status,405);
  assert.equal((await call({action:'save',record:{client:'x'.repeat(26000)}},{headers:{cookie}})).status,400);
  assert.equal((await call({action:'list'},{headers:{cookie:cookie.slice(0,-8)+'tampered'}})).status,401);
});
test('retry preserves ID and revision after ambiguous upstream failure',async()=>{
  const bodies=[];global.fetch=async(url,options)=>{bodies.push(options.body);return bodies.length===1?new Response('temporary HTML',{status:502}):success({record:{id:'test-id-123',value:'008'}});};
  const result=await call({action:'save',record:{id:'test-id-123',revision:'rev1',value:'008'}},{headers:{cookie}});
  assert.equal(result.status,200);assert.equal(bodies.length,2);assert.equal(bodies[0],bodies[1]);assert.equal(result.data.record.value,'008');
});
test('never follows redirects to other hosts or reports false success',async()=>{
  global.fetch=async url=>{assert.ok(url.startsWith('https://script.google.com/'));return new Response(null,{status:302,headers:{location:'https://evil.example/'}});};
  const result=await call({action:'save',record:{id:'test-id-123'}},{headers:{cookie}});
  assert.equal(result.status,502);assert.equal(result.data.ok,false);
});
test('invalid Google key clears session; logout expires cookie',async()=>{
  global.fetch=async()=>new Response(JSON.stringify({ok:false,error:'Chave de acesso inválida.'}),{headers:{'content-type':'application/json'}});
  const denied=await call({action:'list'},{headers:{cookie}});assert.equal(denied.status,401);assert.match(denied.headers['set-cookie'],/Max-Age=0/);
  const result=await call({action:'logout'},{headers:{cookie}});assert.equal(result.status,200);assert.match(result.headers['set-cookie'],/Max-Age=0/);
});
