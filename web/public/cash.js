'use strict';
window.createCash=function({getRecords,remote,onSaved,toast,onBusy,actionIcon}){
 const $=id=>document.getElementById(id),D=CashData;let drafts={},loaded=false,signature='',saving=false;
 const node=(tag,cls,text)=>{const e=document.createElement(tag);e.className=cls||'';if(text!==undefined)e.textContent=text;return e;};
 function load(){if(loaded)return;try{const raw=JSON.parse(localStorage.getItem('sv-web-cash-drafts')||'{}');drafts=raw&&!Array.isArray(raw)&&typeof raw==='object'?raw:{};}catch{drafts={};}loaded=true;}
 function persist(){try{localStorage.setItem('sv-web-cash-drafts',JSON.stringify(drafts));}catch{$('cash-status').textContent='Não foi possível guardar as alterações neste navegador. Mantenha esta tela aberta até salvar.';}}
 function rows(){return getRecords().filter(r=>r.date===VisaoData.today()).map(r=>({...r,cashClient:drafts[r.id]?.client??r.cashClient??'',amount:drafts[r.id]?.amount??(r.cashCents?D.input(r.cashCents):r.value==='REQ'?'REQ':''),payments:drafts[r.id]?.payments??D.decode(r.cashPayments)}));}
 function totals(){const list=rows(),s=D.summary(list);$('cash-total').textContent=D.money(s.total);$('cash-requests').textContent=s.requests;$('cash-pending').textContent=s.pending;$('cash-count').textContent=list.length+' vistoria(s)';$('cash-summary-rows').replaceChildren();
  for(const g of s.groups){const tr=node('tr');for(const text of [g.client,g.count,g.requests,D.money(g.cents)])tr.append(node('td','',text));$('cash-summary-rows').append(tr);}
  $('cash-payment-rows').replaceChildren();for(const [key,label]of [...D.methods,['unassigned','Sem método / divisão pendente'],['total','Total geral']]){const tr=node('tr',key==='total'?'cash-grand-total':'');tr.append(node('td','',label),node('td','',D.money(key==='total'?s.total:key==='unassigned'?s.unassigned:s.byMethod[key])));$('cash-payment-rows').append(tr);}
  $('cash-dirty').textContent=list.some(r=>drafts[r.id])?'Total inclui alterações ainda não salvas.':'';
 }
 async function save(id,status){
  if(saving)return;const record=getRecords().find(r=>r.id===id),draft=drafts[id];if(!record||!draft)return;
  const error=D.validate(draft);if(error){status.textContent=error;return;}
  const amount=D.cents(draft.amount),req=D.isReq(draft.amount),payments=Object.fromEntries(Object.entries(D.paymentValues(draft)).map(([k,v])=>[k,String(v)]));
  saving=true;onBusy(true);$('cash-view').querySelectorAll('button,input,select').forEach(e=>e.disabled=true);status.textContent='Salvando…';let failed=false;
  try{const result=await remote('cash-save',{id,revision:draft.revision??record.revision,cashClient:D.name(draft.client),cashCents:req?'REQ':amount===null?'':String(amount),cashPayments:payments});delete drafts[id];persist();onSaved({...result.record,cloud:true});$('cash-status').textContent='Dados do caixa salvos no Google Sheets.';toast('Caixa salvo.');}
  catch(e){failed=true;status.textContent=e.message;$('cash-status').textContent=e.message;}
  finally{saving=false;signature=failed?JSON.stringify(rows()):'';onBusy(false);if(failed)$('cash-view').querySelectorAll('button,input,select').forEach(e=>e.disabled=false);else render();}
 }
 function render(){if($('cash-view').hidden||saving)return;load();const list=rows(),next=JSON.stringify(list);$('cash-date').textContent=VisaoData.today().split('-').reverse().join('/');if(next===signature){totals();return;}signature=next;
  $('cash-rows').replaceChildren();$('cash-empty').hidden=list.length>0;
  for(const r of list){const tr=node('tr'),plate=node('td','cash-plate',r.plate||'—');tr.append(plate,node('td','',r.model||'—'));
   const client=node('input'),amount=node('input'),mode=node('select');client.value=r.cashClient;client.maxLength=120;client.autocomplete='off';client.placeholder='Cliente';client.setAttribute('aria-label','Cliente do caixa '+r.plate);amount.value=D.isReq(r.amount)?'':r.amount;amount.inputMode='decimal';amount.maxLength=14;amount.placeholder='Valor';amount.setAttribute('list','cash-values');amount.setAttribute('aria-label','Valor '+r.plate);mode.setAttribute('aria-label','REQ ou valor '+r.plate);for(const [value,label]of [['value','Valor (R$)'],['req','REQ']]){const option=node('option','',label);option.value=value;mode.append(option);}mode.value=D.isReq(r.amount)?'req':'value';amount.hidden=mode.value==='req';
   const clientCell=node('td'),amountCell=node('td');clientCell.append(client);amountCell.append(mode,amount);tr.append(clientCell,amountCell);
   let payments={...r.payments};const payCell=node('td','cash-method-cell'),details=node('details','cash-methods'),summary=node('summary'),choices=node('div','cash-method-choices'),split=node('div','cash-split'),reqLabel=node('span','cash-req','REQ');details.append(summary,choices);payCell.append(details,split,reqLabel);tr.append(payCell);
   const cell=node('td'),button=node('button','secondary'),status=node('span','cash-row-status',drafts[r.id]?'Não salvo':'');actionIcon(button,'check','Salvar caixa '+r.plate);button.type='button';status.setAttribute('role','status');const discard=node('button','text-button');discard.type='button';actionIcon(discard,'clear','Descartar alterações do caixa '+r.plate);discard.onclick=()=>{delete drafts[r.id];persist();signature='';render();};cell.append(button,discard,status);tr.append(cell);
   const changed=()=>{drafts[r.id]={client:client.value,amount:mode.value==='req'?'REQ':amount.value,payments:{...payments},revision:drafts[r.id]?.revision??r.revision};signature=JSON.stringify(rows());persist();status.textContent='Não salvo';totals();};
   function paymentControls(){const selected=Object.keys(payments),req=mode.value==='req';details.hidden=req;split.hidden=req;reqLabel.hidden=!req;summary.textContent=selected.length?D.methods.filter(([k])=>selected.includes(k)).map(([,label])=>label).join(' + '):'Selecionar pagamento';choices.replaceChildren();split.replaceChildren();
    for(const [key,label]of D.methods){const check=node('input'),wrap=node('label','cash-check');check.type='checkbox';check.checked=selected.includes(key);check.setAttribute('aria-label',label+' '+r.plate);wrap.append(check,node('span','',label));choices.append(wrap);check.onchange=()=>{const oldKeys=Object.keys(payments);if(check.checked){if(oldKeys.length===1)payments[oldKeys[0]]=amount.value;payments[key]=oldKeys.length===0?amount.value:'';}else delete payments[key];changed();paymentControls();};}
    if(selected.length>1){for(const [key,label]of D.methods.filter(([k])=>selected.includes(k))){const wrap=node('label','cash-split-label'),input=node('input');input.inputMode='decimal';input.placeholder='R$';input.maxLength=14;input.value=payments[key];input.setAttribute('aria-label','Valor em '+label+' '+r.plate);wrap.append(node('span','',label),input);split.append(wrap);input.oninput=()=>{payments[key]=input.value;changed();};}}
   }
   mode.onchange=()=>{payments={};amount.hidden=mode.value==='req';amount.value='';changed();paymentControls();};client.addEventListener('input',changed);amount.addEventListener('input',changed);client.addEventListener('change',()=>{client.value=D.name(client.value);changed();});button.onclick=()=>save(r.id,status);paymentControls();$('cash-rows').append(tr);
  }totals();
 }
 return {open(){load();signature='';render();},update:render,reset(){drafts={};loaded=false;signature='';localStorage.removeItem('sv-web-cash-drafts');$('cash-view').hidden=true;}};
};
