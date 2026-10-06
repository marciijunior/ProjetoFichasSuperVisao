(function(root){
 'use strict';
 const methods=[['dinheiro','Dinheiro'],['pix','Pix'],['debito','Cartão de débito'],['credito','Cartão de crédito'],['transferencia','Transferência bancária'],['boleto','Boleto'],['cheque','Cheque'],['carteira','Carteira digital'],['outros','Outros']];
 const name=v=>String(v??'').normalize('NFC').trim().replace(/\s+/g,' ').toLocaleUpperCase('pt-BR');
 function cents(value){let s=String(value??'').trim();if(!s)return null;if(/^\d{1,3}(?:\.\d{3})+,\d{1,2}$/.test(s))s=s.replace(/\./g,'');if(!/^\d+(?:[,.]\d{1,2})?$/.test(s))return NaN;const [whole,fraction='']=s.replace(',','.').split('.'),result=Number(whole)*100+Number(fraction.padEnd(2,'0'));return Number.isSafeInteger(result)&&result<=999999999?result:NaN;}
 const isReq=value=>String(value??'').trim().toUpperCase()==='REQ';
 const money=n=>(n/100).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
 const input=n=>isReq(n)?'REQ':n===''||n===undefined||n===null?'':(Number(n)/100).toFixed(2).replace('.',',');
 function decode(raw){try{const obj=typeof raw==='string'?JSON.parse(raw||'{}'):raw||{};return Object.fromEntries(methods.filter(([key])=>Object.hasOwn(obj,key)).map(([key])=>[key,input(obj[key])]));}catch{return {};}}
 function paymentValues(row){const source=row.payments??decode(row.cashPayments),keys=Object.keys(source);return Object.fromEntries(keys.map(key=>[key,keys.length===1?cents(row.amount):cents(source[key])]));}
 function validate(row){
  const amount=cents(row.amount),keys=Object.keys(row.payments||{});if(isReq(row.amount))return keys.length?'REQ não deve ter pagamento.':null;
  if(amount===null)return keys.length?'Informe o valor antes de selecionar um pagamento.':null;
  if(!Number.isFinite(amount))return 'Informe REQ ou um valor positivo ou zero, com até duas casas decimais.';
  if(!keys.length)return 'Selecione um método de pagamento.';
  const values=paymentValues(row);if(keys.some(k=>!methods.some(([id])=>id===k)||!Number.isFinite(values[k])))return 'Informe o valor de cada método selecionado.';
  if(Object.values(values).reduce((a,b)=>a+b,0)!==amount)return 'A soma dos pagamentos deve ser igual ao valor da vistoria.';
  return null;
 }
 function summary(rows){
  const groups=new Map(),byMethod=Object.fromEntries(methods.map(([k])=>[k,0]));let total=0,requests=0,pending=0,unassigned=0;
  for(const r of rows){const client=name(r.cashClient),amount=cents(r.amount),req=isReq(r.amount)||(!String(r.amount??'').trim()&&isReq(r.value)),valid=Number.isFinite(amount);
   if(!client||(!req&&(!valid||validate({...r,payments:r.payments??decode(r.cashPayments)}))))pending++;
   if(req)requests++;if(valid){total+=amount;const normalized={...r,payments:r.payments??decode(r.cashPayments)};if(validate(normalized))unassigned+=amount;else for(const [k,v]of Object.entries(paymentValues(normalized)))byMethod[k]+=v;}
   const label=client||'SEM CLIENTE',g=groups.get(label)||{client:label,count:0,requests:0,cents:0};g.count++;if(req)g.requests++;if(valid)g.cents+=amount;groups.set(label,g);
  }
  return {total,requests,pending,byMethod,unassigned,groups:[...groups.values()].sort((a,b)=>a.client.localeCompare(b.client,'pt-BR'))};
 }
 const api={name,cents,money,input,summary,methods,isReq,decode,paymentValues,validate};if(typeof module!=='undefined')module.exports=api;else root.CashData=api;
})(typeof window!=='undefined'?window:globalThis);
