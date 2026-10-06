'use strict';
const {createHash,createCipheriv,createDecipheriv,randomBytes}=require('node:crypto');
const ENDPOINT=process.env.GOOGLE_APPS_SCRIPT_URL;
const SHEET=process.env.GOOGLE_SPREADSHEET_ID;
const COOKIE='sv_session', MAX_AGE=12*60*60;
function key(){
  if(!process.env.SESSION_SECRET||process.env.SESSION_SECRET.length<32)throw Error('Configuração de acesso pendente no servidor.');
  return createHash('sha256').update(process.env.SESSION_SECRET).digest();
}
function seal(token){
  const iv=randomBytes(12),cipher=createCipheriv('aes-256-gcm',key(),iv);
  const body=Buffer.concat([cipher.update(JSON.stringify({token,expires:Date.now()+MAX_AGE*1000})),cipher.final()]);
  return Buffer.concat([iv,cipher.getAuthTag(),body]).toString('base64url');
}
function unseal(cookie){
  try{
    const raw=(cookie||'').split(';').map(s=>s.trim()).find(s=>s.startsWith(COOKIE+'='))?.slice(COOKIE.length+1);
    if(!raw||raw.length>1024)return null;
    const b=Buffer.from(raw,'base64url'),decipher=createDecipheriv('aes-256-gcm',key(),b.subarray(0,12));
    decipher.setAuthTag(b.subarray(12,28));
    const data=JSON.parse(Buffer.concat([decipher.update(b.subarray(28)),decipher.final()]));
    return data.expires>Date.now()&&/^[a-zA-Z0-9_-]{32,128}$/.test(data.token)?data.token:null;
  }catch{return null;}
}
function setCookie(res,value){res.setHeader('Set-Cookie',`${COOKIE}=${value}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${value?MAX_AGE:0}`);}
function reply(res,status,data){res.statusCode=status;res.setHeader('Content-Type','application/json; charset=utf-8');res.end(JSON.stringify(data));}
async function google(payload){
  // Redirects from Apps Script must become GET, with no credentials forwarded.
  const signal=AbortSignal.timeout(24000);
  let url=ENDPOINT,method='POST',body=JSON.stringify({...payload,spreadsheetId:SHEET});
  for(let i=0;i<4;i++){
    const r=await fetch(url,{method,body,headers:method==='POST'?{'Content-Type':'application/json'}:{},redirect:'manual',signal});
    if([301,302,303].includes(r.status)){
      const next=new URL(r.headers.get('location'),url);
      if(next.protocol!=='https:'||!['script.google.com','script.googleusercontent.com'].includes(next.hostname))throw Error('redirect');
      url=next.href;method='GET';body=undefined;continue;
    }
    if(!r.ok||!r.headers.get('content-type')?.includes('application/json'))throw Error('upstream');
    const data=await r.json();
    if(typeof data.ok!=='boolean'||(data.ok&&data.spreadsheetId!==SHEET))throw Error('response');
    return data;
  }
  throw Error('redirect');
}
async function handler(req,res){
  res.setHeader('Cache-Control','no-store');res.setHeader('Vary','Cookie');
  if(req.method!=='POST'){res.setHeader('Allow','POST');return reply(res,405,{ok:false,error:'Método não permitido.'});}
  // JSON-only requests and a mandatory same-origin header prevent cross-site form submissions.
  const origin=req.headers.origin;
  let validOrigin=false;
  try{const o=new URL(origin);validOrigin=o.host===req.headers.host&&(o.protocol==='https:'||(process.env.NODE_ENV!=='production'&&o.protocol==='http:'&&['localhost','127.0.0.1'].includes(o.hostname)));}catch{}
  if(!validOrigin||req.headers['sec-fetch-site']==='cross-site'||!req.headers['content-type']?.startsWith('application/json'))return reply(res,403,{ok:false,error:'Origem não permitida.'});
  let data;
  try{
    if(Number(req.headers['content-length']||0)>25000)throw Error();
    if(req.body!==undefined){data=typeof req.body==='string'?JSON.parse(req.body):req.body;if(Buffer.byteLength(JSON.stringify(data))>25000)throw Error();}
    else{let raw='';for await(const chunk of req){raw+=chunk;if(Buffer.byteLength(raw)>25000)throw Error();}data=JSON.parse(raw);}
    if(!data||typeof data!=='object'||Array.isArray(data))throw Error();
  }catch{return reply(res,400,{ok:false,error:'Pedido inválido ou muito grande.'});}
  try{key();}catch(e){return reply(res,503,{ok:false,error:e.message});}
  const action=data.action;
  if(action==='logout'){setCookie(res,'');return reply(res,200,{ok:true});}
  let token=unseal(req.headers.cookie);
  if(action==='session')return reply(res,200,{ok:true,authenticated:!!token});
  if(action==='login'){
    token=typeof data.token==='string'?data.token.trim():'';
    if(!/^[a-zA-Z0-9_-]{32,128}$/.test(token))return reply(res,401,{ok:false,error:'Chave de acesso inválida.'});
  }else if(!token)return reply(res,401,{ok:false,error:'Entre novamente com sua chave de acesso. Seu rascunho foi mantido.'});
  if(!['login','list','save','remove','cash-save'].includes(action))return reply(res,400,{ok:false,error:'Ação inválida.'});
  const payload={action:action==='login'?'ping':action,token};
  if(action==='save')payload.record=data.record;
  if(action==='remove'){payload.id=data.id;payload.revision=data.revision;}
  if(action==='cash-save'){payload.id=data.id;payload.revision=data.revision;payload.cashClient=data.cashClient;payload.cashCents=data.cashCents;}
  let result;
  // Same record ID/revision makes retries safe; the Sheets script is idempotent.
  for(let attempt=0;attempt<2;attempt++){
    try{result=await google(payload);break;}catch{}
  }
  if(!result)return reply(res,502,{ok:false,error:'Sem confirmação do Google Sheets. O rascunho foi mantido. Tente novamente.'});
  if(!result.ok){
    const denied=result.error==='Chave de acesso inválida.';
    if(denied)setCookie(res,'');
    return reply(res,denied?401:400,{ok:false,error:typeof result.error==='string'?result.error:'Falha ao acessar a planilha.'});
  }
  if(action==='login'){setCookie(res,seal(token));return reply(res,200,{ok:true});}
  return reply(res,200,result);
}
module.exports=handler;
