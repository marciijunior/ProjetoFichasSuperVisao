'use strict';
const $ = id => document.getElementById(id);
const fieldNames = ['client','phone','cpf','date','value','brand','model','plate','city','state','chassis','renavam','fuel','power','year','color','engine'];
const labels = {client:'Nome do cliente',phone:'Telefone',cpf:'CPF/CNPJ',date:'Data de realização',value:'Número',brand:'Marca',model:'Modelo',plate:'Placa',city:'Município',state:'Estado',chassis:'Chassi',renavam:'Renavam',fuel:'Combustível',power:'Potência',year:'Ano de fabricação',color:'Cor',engine:'Número do motor'};
const form = $('form');
let records = [], drafts = [], savedDraft = {}, current = {}, busy = false, toastTimer, configured = false;

const localDate = () => VisaoData.today();
const uid = () => crypto.randomUUID();
const normalize = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase();
function el(tag, className, text) { const n=document.createElement(tag); n.className=className||''; if(text!==undefined)n.textContent=text; return n; }
function actionIcon(button,icon,label){
  const svg=document.createElementNS('http://www.w3.org/2000/svg','svg'),use=document.createElementNS('http://www.w3.org/2000/svg','use');
  use.setAttribute('href','#icon-'+icon);svg.setAttribute('aria-hidden','true');svg.append(use);button.replaceChildren(svg);button.setAttribute('aria-label',label);button.title=label;button.classList.add('action-icon');return button;
}
function actionButton(icon,label,fn){const b=actionIcon(el('button','text-button'),icon,label);b.type='button';b.disabled=busy;b.onclick=fn;return b;}
function documentPreview(record){
  const wrapper=el('span','document-preview'),raw=String(record.cpf||'').toUpperCase().replace(/[.\/\s-]/g,'');
  const formatted=/^\d{11}$/.test(raw)?raw.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/,'$1.$2.$3-$4'):/^[A-Z0-9]{12}\d{2}$/.test(raw)?raw.replace(/^(.{2})(.{3})(.{3})(.{4})(.{2})$/,'$1.$2.$3/$4-$5'):String(record.cpf||'');
  if(!formatted){wrapper.textContent='—';return wrapper;}
  const label=raw.length===14?'CNPJ':'CPF',text=el('span','record-document',formatted);text.setAttribute('aria-label',label+' '+formatted);
  const copy=actionButton('copy','Copiar '+label+' de '+record.client,async()=>{try{await navigator.clipboard.writeText(raw);toast(label+' copiado.');}catch{toast('Não foi possível copiar. Selecione o documento e copie com Ctrl+C.');}});
  wrapper.append(text,copy);return wrapper;
}
function recordIdentity(record){const heading=el('span','record-identity');heading.append(el('strong','',record.client),documentPreview(record));return heading;}
function toast(text) { $('toast').textContent=text; $('toast').hidden=false; clearTimeout(toastTimer); toastTimer=setTimeout(()=>$('toast').hidden=true,7000); }
function confirmAction(title,message,action) { $('confirm-title').textContent=title; $('confirm-message').textContent=message; $('confirm-yes').onclick=()=>{$('confirm').close();action();}; $('confirm-no').onclick=()=>$('confirm').close(); $('confirm').showModal(); }
function getData() { const d={...current,documentType:$('document-type').value}; fieldNames.forEach(k=>d[k]=form.elements.namedItem(k).value.trim()); return d; }
function formatDocument(){
  const input=form.elements.cpf,isCnpj=$('document-type').value==='cnpj';
  const before=input.value,position=input.selectionStart??before.length;
  const count=before.slice(0,position).replace(/[^a-z0-9]/gi,'').length;
  let raw=before.toUpperCase().replace(isCnpj?/[^A-Z0-9]/g:/\D/g,'').slice(0,isCnpj?14:11);
  const groups=isCnpj?[2,3,3,4,2]:[3,3,3,2],separators=isCnpj?['.','.','/','-']:['.','.','-'];
  let formatted='',offset=0;groups.forEach((size,i)=>{if(raw.length>offset)formatted+=(i?separators[i-1]:'')+raw.slice(offset,offset+size);offset+=size;});
  input.value=formatted;input.maxLength=isCnpj?18:14;input.inputMode=isCnpj?'text':'numeric';input.placeholder=isCnpj?'00.000.000/0000-00':'000.000.000-00';input.setAttribute('aria-label',isCnpj?'CNPJ':'CPF');
  if(document.activeElement===input){let caret=0,n=0;while(caret<formatted.length&&n<count){if(/[A-Z0-9]/.test(formatted[caret]))n++;caret++;}input.setSelectionRange(caret,caret);}
}
form.elements.cpf.addEventListener('input',formatDocument);
$('document-type').addEventListener('change',()=>{form.elements.cpf.value='';formatDocument();persistDraft();form.elements.cpf.focus();});
function persistDraft() {
  if(!configured||$('editor').hidden)return true;
  try { const d=getData();storeDrafts([d,...drafts.filter(r=>r.id!==d.id)]);current=d;return true; }
  catch {toast('Não foi possível guardar o rascunho no aparelho.');return false;}
}
function storeDrafts(updated){localStorage.setItem('sv-web-drafts',JSON.stringify(updated));drafts=updated;savedDraft=drafts[0]||{};if(savedDraft.id)localStorage.setItem('sv-web-draft',JSON.stringify(savedDraft));else localStorage.removeItem('sv-web-draft');}
function clearDraft(id=current.id) {storeDrafts(drafts.filter(d=>d.id!==id));}
function cache(updated) { localStorage.setItem('sv-web-records',JSON.stringify(updated));records=updated; }
function lock(value) { busy=value; document.querySelectorAll('button').forEach(b=>b.disabled=value);form.querySelectorAll('input,select').forEach(n=>n.disabled=value);if(!value)render(); }
async function remote(action,payload={}) {
  let response,result;
  try {
    response=await fetch('/api/fichas',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({action,...payload}),signal:AbortSignal.timeout(58000)});
    result=await response.json();
  }catch{throw Error('Sem confirmação do Google Sheets. O rascunho foi mantido. Tente novamente.');}
  if(!response.ok||!result.ok){
    if(response.status===401&&action!=='login'){persistDraft();configured=false;showLogin();}
    else if(action==='save'||action==='remove'){$('connection-badge').textContent='Gravação bloqueada';$('sync-status').classList.add('has-error');$('sync-status').textContent=result.error||'Falha na gravação.';}
    throw Error(result.error||'Falha ao acessar o Google Sheets.');
  }
  if(action==='save'||action==='remove'){$('connection-badge').textContent='Salvamento OK';$('sync-status').classList.remove('has-error');}
  return result;
}
function showLogin(){
  $('workspace').hidden=true;$('login').hidden=false;$('connection-badge').textContent='Acesso restrito';
}
async function openWorkspace(){
  configured=true;$('login').hidden=true;$('workspace').hidden=false;$('connection-badge').textContent='Sessão ativa';
  try{records=JSON.parse(localStorage.getItem('sv-web-records')||'[]');savedDraft=JSON.parse(localStorage.getItem('sv-web-draft')||'{}');drafts=JSON.parse(localStorage.getItem('sv-web-drafts')||'[]');if(!Array.isArray(records))records=[];if(!Array.isArray(drafts))drafts=[];if(!savedDraft||typeof savedDraft!=='object')savedDraft={};if(savedDraft.id&&!drafts.some(d=>d.id===savedDraft.id))drafts.unshift(savedDraft);drafts=drafts.filter(d=>d&&typeof d==='object'&&d.id);savedDraft=drafts[0]||{};}catch{records=[];drafts=[];savedDraft={};toast('Não foi possível recuperar o rascunho deste navegador.');}
  render();if(savedDraft.id)editor(savedDraft);else home();await refresh();
}
$('login-form').onsubmit=async event=>{
  event.preventDefault();if(busy)return;lock(true);$('login-error').hidden=true;
  try{await remote('login',{token:$('access-key').value.trim()});$('access-key').value='';lock(false);await openWorkspace();}
  catch(e){$('login-error').textContent=e.message;$('login-error').hidden=false;}
  finally{lock(false);}
};
$('logout').onclick=()=>confirmAction('Sair do SuperVisão?','As fichas salvas continuam na planilha. Os rascunhos e a cópia deste navegador serão removidos.',async()=>{
  lock(true);try{await remote('logout');localStorage.removeItem('sv-web-records');localStorage.removeItem('sv-web-draft');localStorage.removeItem('sv-web-drafts');records=[];drafts=[];savedDraft={};current={};form.reset();$('editor').hidden=true;configured=false;dashboard.reset();render();showLogin();}catch(e){toast(e.message);}finally{lock(false);}
});
function editor(data) {
  current={...data,date:data.date||localDate()};$('home').hidden=true;$('analytics').hidden=true;$('drafts-view').hidden=true;$('editor').hidden=false;
  fieldNames.forEach(k=>form.elements.namedItem(k).value=current[k]||'');
  $('document-type').value=current.documentType||(String(current.cpf||'').replace(/[^a-z0-9]/gi,'').length>11?'cnpj':'cpf');formatDocument();
  $('editor-title').textContent=records.some(r=>r.id===current.id)?'Editar ficha':'Nova ficha';
  $('delete').hidden=!records.some(r=>r.id===current.id);$('form-error').hidden=true;suggestions.update();persistDraft();window.scrollTo(0,0);
}
function home(){$('editor').hidden=true;$('analytics').hidden=true;$('drafts-view').hidden=true;$('home').hidden=false;render();window.scrollTo(0,0);}
function showDrafts(){$('editor').hidden=true;$('analytics').hidden=true;$('home').hidden=true;$('drafts-view').hidden=false;renderDrafts();window.scrollTo(0,0);}
window.goBack=()=>{if(busy)return;if($('confirm').open){$('confirm').close();return;}if(!$('editor').hidden){if(persistDraft())home();}};
function begin(data){editor(drafts.find(d=>d.id===data.id)||data);}
function removeRecord(record){
  confirmAction('Excluir ficha?',`Excluir a ficha de ${record.client||'cliente sem nome'}?`,async()=>{
    if(busy)return;lock(true);try{if(record.cloud)await remote('remove',{id:record.id,revision:record.revision});cache(records.filter(r=>r.id!==record.id));clearDraft(record.id);if(current.id===record.id)home();toast('Ficha excluída.');}catch(e){toast(e.message);}finally{lock(false);}
  });
}
function renderDrafts(){
  $('draft-count').textContent=drafts.length;$('draft-list').replaceChildren();
  if(!drafts.length)$('draft-list').append(el('p','muted','Nenhum rascunho.'));
  drafts.forEach(d=>{const row=el('div','draft-row'),info=el('div','record-main');info.append(el('strong','',d.client||'Sem nome'));const detail=[d.model,d.plate].filter(Boolean).join(' · ');if(detail)info.append(el('small','',detail));row.append(info,actionButton('edit','Continuar rascunho de '+(d.client||'cliente sem nome'),()=>editor(d)),actionButton('trash','Excluir rascunho de '+(d.client||'cliente sem nome'),()=>confirmAction('Excluir rascunho?','As alterações não salvas serão descartadas.',()=>{try{clearDraft(d.id);render();}catch{toast('Não foi possível excluir o rascunho.');}})));$('draft-list').append(row);});
}
function render(){
  dashboard.update(records,busy);
  $('total').textContent=records.length;$('today').textContent=records.filter(r=>r.date===localDate()).length;$('export').disabled=busy||records.length===0;renderDrafts();
  const q=normalize($('search').value),compact=q.replace(/[^A-Z0-9]/g,'');
  const filtered=records.filter(r=>r.date===localDate()).filter(r=>!q||['client','plate','phone','model','cpf'].some(k=>normalize(r[k]).includes(q)||(compact&&normalize(r[k]).replace(/[^A-Z0-9]/g,'').includes(compact))));
  $('records').replaceChildren();
  if(!filtered.length){const empty=el('div','empty');empty.append(el('h2','',q?'Nenhuma ficha encontrada hoje':'Nenhuma vistoria hoje'),el('p','',q?'Altere os filtros de busca.':' '));$('records').append(empty);}
  filtered.forEach(r=>{const row=el('div','record-row'),b=el('div','record'),main=el('span','record-main'),meta=el('span','record-meta');main.append(recordIdentity(r),el('small','',[r.brand,r.model].filter(Boolean).join(' · ')),el('span','record-status',r.cloud?'Salva no Google Sheets':'Somente no aparelho'));if(r.value!==undefined&&r.value!==null&&String(r.value).trim()!==''){const number=el('span','record-number',r.value);number.setAttribute('aria-label','Número '+r.value);main.append(number);}meta.append(el('span','plate',r.plate||'SEM PLACA'),document.createTextNode((r.date||'').split('-').reverse().join('/')));b.append(main,meta);const actions=el('div','record-actions');actions.append(actionButton('edit','Editar ficha de '+r.client,()=>begin(r)),actionButton('trash','Excluir ficha de '+r.client,()=>removeRecord(r)));row.append(b,actions);$('records').append(row);});
}
function validate(d){
  if(d.date&&!VisaoData.validDate(d.date))return ['date','Informe uma data válida.'];
  if(d.city&&d.state&&!VehicleCatalog.cityInState(d.city,d.state))return ['city','O município não pertence ao estado selecionado.'];
  if(!d.client)return ['client','Digite o nome do cliente.'];
  if(d.documentType==='cnpj'?!DocumentParser.validCNPJ(d.cpf):!DocumentParser.validCPF(d.cpf))return ['cpf',d.documentType==='cnpj'?'Informe um CNPJ válido com 14 caracteres.':'Informe um CPF válido com 11 dígitos.'];
  if(!d.model)return ['model','Digite o modelo do veículo.'];
  if(!/^[A-Z]{3}\d[A-Z0-9]\d{2}$/.test(d.plate))return ['plate','Informe uma placa válida. Exemplos: ABC1234 ou ABC1D23.'];
  if(d.value&&!/^\d{1,30}$/.test(d.value))return ['value','Use apenas algarismos no campo Número. Sugestões: 8 a 15.'];
  if(d.phone&&!/^(?:55)?\d{10,11}$/.test(d.phone.replace(/\D/g,'')))return ['phone','Confira o telefone com DDD.'];
  if(d.chassis&&!/^[A-HJ-NPR-Z0-9]{17}$/.test(d.chassis))return ['chassis','Confira o chassi: 17 caracteres, sem I, O ou Q.'];
  if(d.renavam&&!/^\d{9,11}$/.test(d.renavam))return ['renavam','Confira o Renavam: 9 a 11 dígitos.'];
  if(d.year&&(!/^\d{4}$/.test(d.year)||+d.year<1900||+d.year>new Date().getFullYear()+1))return ['year','Confira o ano de fabricação.'];
  return null;
}
function showError(message){$('form-error').textContent=message;$('form-error').hidden=false;}
form.addEventListener('input',()=>{$('form-error').hidden=true;persistDraft();});form.addEventListener('change',persistDraft);
document.querySelectorAll('[data-number]').forEach(b=>b.onclick=()=>{form.elements.namedItem('value').value=b.dataset.number;persistDraft();});
form.addEventListener('submit',async event=>{
  event.preventDefault();if(busy)return;
  const d=getData();d.plate=d.plate.toUpperCase().replace(/[-\s]/g,'');d.chassis=d.chassis.toUpperCase();d.engine=d.engine.toUpperCase();d.cpf=d.cpf.toUpperCase().replace(/[^A-Z0-9]/g,'');
  for(const field of ['brand','model','fuel','color','city'])d[field]=VehicleCatalog.canonical(field,d[field],d.brand);
  if(!d.date)d.date=localDate();
  const error=validate(d);if(error){showError(error[1]);form.elements.namedItem(error[0]).focus();return;}
  if(!configured){showError('Entre com sua chave de acesso para salvar. Seu rascunho está guardado neste navegador.');return;}
  if(!persistDraft())return;lock(true);
  try { const payload={id:d.id,revision:d.revision};fieldNames.forEach(k=>payload[k]=d[k]);const result=await remote('save',{record:payload});const saved={...result.record,cloud:true};cache([saved,...records.filter(r=>r.id!==saved.id)]);clearDraft();home();$('sync-status').textContent='Ficha salva no Google Sheets.';toast('Ficha salva no Google Sheets.'); }
  catch(e){showError(e.message);}
  finally{lock(false);}
});
$('new').onclick=()=>begin({id:uid(),date:localDate()});$('back').onclick=window.goBack;$('search').addEventListener('input',render);
$('discard').onclick=()=>confirmAction('Descartar rascunho?','As alterações não salvas serão descartadas.',()=>{try{clearDraft();home();}catch(e){toast(e.message);}});
$('delete').onclick=()=>removeRecord(records.find(r=>r.id===current.id)||current);
async function refresh(){
  if(busy)return;if(!configured){toast('Configure a conexão com Google Sheets.');return;}lock(true);$('sync-status').textContent='Consultando Google Sheets…';
  try {const result=await remote('list');const rows=result.records.map(r=>({...r,cloud:true})),ids=new Set(rows.map(r=>r.id));cache([...rows,...records.filter(r=>!r.cloud&&!ids.has(r.id))]);$('sync-status').classList.remove('has-error');$('sync-status').textContent='Fichas atualizadas pelo Google Sheets.';}
  catch(e){$('sync-status').classList.add('has-error');$('sync-status').textContent=e.message+' Exibindo a última cópia disponível.';}finally{lock(false);}
}
$('refresh').onclick=refresh;
function exportRows(rows){
  const quote=v=>'"'+String(/^[\s]*[=+@-]/.test(v)?"'"+v:v).replace(/"/g,'""')+'"';
  const csv='\uFEFF'+[fieldNames.map(k=>quote(labels[k])).join(';'),...rows.map(r=>fieldNames.map(k=>quote(r[k]||'')).join(';'))].join('\r\n');
  const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'})),a=el('a');a.href=url;a.download='SuperVisao-fichas.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
$('export').onclick=()=>exportRows(records);
const suggestions=VehicleCatalog.install(form,()=>records,persistDraft);
const dashboard=createDashboard({getRecords:()=>records,onEdit:begin,onExport:exportRows,onBack:home,onRefresh:refresh,documentPreview});
for(const [id,icon,label]of [['logout','logout','Sair'],['refresh','refresh','Atualizar fichas'],['export','download','Exportar fichas'],['analytics-back','back','Voltar às fichas'],['analytics-refresh','refresh','Atualizar dados'],['clear-filters','clear','Limpar filtros'],['export-filtered','download','Exportar fichas filtradas'],['page-prev','back','Página anterior'],['page-next','arrow','Próxima página'],['discard','trash','Descartar rascunho'],['delete','trash','Excluir ficha']])actionIcon($(id),icon,label);
actionIcon(form.querySelector('[type=submit]'),'check','Salvar ficha');
$('open-analytics').onclick=()=>{$('home').hidden=true;$('editor').hidden=true;$('drafts-view').hidden=true;$('analytics').hidden=false;dashboard.open();window.scrollTo(0,0);};
function leaveEditor(){return $('editor').hidden||persistDraft();}
$('nav-home').onclick=()=>{if(!busy&&leaveEditor())home();};
$('nav-new').onclick=()=>{if(!busy&&leaveEditor())$('new').click();};
$('nav-drafts').onclick=()=>{if(!busy&&leaveEditor())showDrafts();};
$('nav-analytics').onclick=()=>{if(!busy&&leaveEditor())$('open-analytics').click();};
$('nav-logout').onclick=()=>{if(!busy&&leaveEditor())$('logout').click();};
document.addEventListener('visibilitychange',()=>{if(document.hidden)persistDraft();else if(configured)render();});setInterval(()=>{if(configured&&!document.hidden&&!busy)render();},60000);window.addEventListener('pagehide',persistDraft);
['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'].forEach(uf=>{const o=el('option','',uf);o.value=uf;form.elements.namedItem('state').append(o);});
(async()=>{try{const session=await remote('session');if(session.authenticated)await openWorkspace();else showLogin();}catch(e){showLogin();$('login-error').textContent=e.message;$('login-error').hidden=false;}})();
