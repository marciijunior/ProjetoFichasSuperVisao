'use strict';
window.createCash=function({getRecords,remote,onSaved,toast,onBusy,actionIcon}){
 const $=id=>document.getElementById(id),D=CashData;let drafts={},loaded=false,signature='',saving=false,failed=false;
 const node=(tag,cls,text)=>{const e=document.createElement(tag);e.className=cls||'';if(text!==undefined)e.textContent=text;return e;};
 function load(){if(loaded)return;try{const raw=JSON.parse(localStorage.getItem('sv-web-cash-drafts')||'{}');drafts=raw&&!Array.isArray(raw)&&typeof raw==='object'?raw:{};}catch{drafts={};}loaded=true;}
 function persist(){try{localStorage.setItem('sv-web-cash-drafts',JSON.stringify(drafts));}catch{$('cash-status').textContent='Não foi possível guardar as alterações neste navegador. Mantenha esta tela aberta até salvar.';}}
 function rows(){return getRecords().filter(r=>r.date===VisaoData.today()).map(r=>({...r,cashClient:drafts[r.id]?.client??r.cashClient??'',amount:drafts[r.id]?.amount??D.input(r.cashCents)}));}
 function totals(){const list=rows(),s=D.summary(list);$('cash-total').textContent=D.money(s.total);$('cash-requests').textContent=s.requests;$('cash-pending').textContent=s.pending;$('cash-count').textContent=list.length+' vistoria(s)';$('cash-summary-rows').replaceChildren();
  for(const g of s.groups){const tr=node('tr');for(const text of [g.client,g.count,g.requests,D.money(g.cents)])tr.append(node('td','',text));$('cash-summary-rows').append(tr);}
  $('cash-dirty').textContent=list.some(r=>drafts[r.id])?'Total inclui alterações ainda não salvas.':'';
 }
 async function save(id,status){
  if(saving)return;const record=getRecords().find(r=>r.id===id),draft=drafts[id];if(!record||!draft)return;
  const amount=D.cents(draft.amount);if(amount!==null&&!Number.isFinite(amount)){status.textContent='Informe um valor positivo ou zero, com até duas casas decimais.';return;}
  saving=true;onBusy(true);failed=false;$('cash-view').querySelectorAll('button,input').forEach(e=>e.disabled=true);status.textContent='Salvando…';
  try{const result=await remote('cash-save',{id,revision:draft.revision??record.revision,cashClient:D.name(draft.client),cashCents:amount===null?'':String(amount)});delete drafts[id];persist();onSaved({...result.record,cloud:true});$('cash-status').textContent='Dados do caixa salvos no Google Sheets.';toast('Caixa salvo.');}
  catch(e){failed=true;status.textContent=e.message;$('cash-status').textContent=e.message;}
  finally{saving=false;onBusy(false);signature='';if(!failed)render();else $('cash-view').querySelectorAll('button,input').forEach(e=>e.disabled=false);}
 }
 function render(){if($('cash-view').hidden||saving)return;load();const list=rows(),next=JSON.stringify(list);$('cash-date').textContent=VisaoData.today().split('-').reverse().join('/');if(next===signature){totals();return;}signature=next;
  $('cash-rows').replaceChildren();$('cash-empty').hidden=list.length>0;
  for(const r of list){const tr=node('tr'),plate=node('td','cash-plate',r.plate||'—');if(r.value==='REQ')plate.append(node('span','cash-req','REQ'));tr.append(plate,node('td','',r.model||'—'));
   const client=node('input'),amount=node('input');client.value=r.cashClient;client.maxLength=120;client.autocomplete='off';client.placeholder='Cliente';client.setAttribute('aria-label','Cliente do caixa '+r.plate);amount.value=r.amount;amount.inputMode='decimal';amount.maxLength=14;amount.placeholder='Valor';amount.setAttribute('list','cash-values');amount.setAttribute('aria-label','Valor '+r.plate);
   const clientCell=node('td'),amountCell=node('td');clientCell.append(client);amountCell.append(amount);tr.append(clientCell,amountCell);
   const cell=node('td'),button=node('button','secondary','Salvar'),status=node('span','cash-row-status',drafts[r.id]?'Não salvo':'');actionIcon(button,'check','Salvar caixa '+r.plate);button.type='button';button.setAttribute('aria-label','Salvar caixa '+r.plate);status.setAttribute('role','status');const discard=node('button','text-button');discard.type='button';actionIcon(discard,'clear','Descartar alterações do caixa '+r.plate);discard.onclick=()=>{delete drafts[r.id];persist();signature='';render();};cell.append(button,discard,status);tr.append(cell);
   const changed=()=>{drafts[r.id]={client:client.value,amount:amount.value,revision:drafts[r.id]?.revision??r.revision};signature=JSON.stringify(rows());persist();status.textContent='Não salvo';totals();};client.addEventListener('input',changed);amount.addEventListener('input',changed);client.addEventListener('change',()=>{client.value=D.name(client.value);changed();});button.onclick=()=>save(r.id,status);$('cash-rows').append(tr);
  }totals();
 }
 return {open(){load();signature='';render();},update:render,reset(){drafts={};loaded=false;signature='';localStorage.removeItem('sv-web-cash-drafts');$('cash-view').hidden=true;}};
};
