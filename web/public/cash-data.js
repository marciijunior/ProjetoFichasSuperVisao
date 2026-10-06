(function(root){
 'use strict';
 const name=v=>String(v??'').normalize('NFC').trim().replace(/\s+/g,' ').toLocaleUpperCase('pt-BR');
 function cents(value){
  let s=String(value??'').trim();if(!s)return null;
  if(/^\d{1,3}(?:\.\d{3})+,\d{1,2}$/.test(s))s=s.replace(/\./g,'');
  if(!/^\d+(?:[,.]\d{1,2})?$/.test(s))return NaN;
  const [whole,fraction='']=s.replace(',','.').split('.'),result=Number(whole)*100+Number(fraction.padEnd(2,'0'));
  return Number.isSafeInteger(result)&&result<=999999999?result:NaN;
 }
 const money=n=>(n/100).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
 const input=n=>n===''||n===undefined||n===null?'':(Number(n)/100).toFixed(2).replace('.',',');
 function summary(rows){
  const groups=new Map();let total=0,requests=0,pending=0;
  for(const r of rows){const client=name(r.cashClient),amount=cents(r.amount),req=String(r.value).toUpperCase()==='REQ',valid=Number.isFinite(amount);
   if(!client||!valid)pending++;if(req)requests++;if(valid)total+=amount;
   const label=client||'SEM CLIENTE',g=groups.get(label)||{client:label,count:0,requests:0,cents:0};g.count++;if(req)g.requests++;if(valid)g.cents+=amount;groups.set(label,g);
  }
  return {total,requests,pending,groups:[...groups.values()].sort((a,b)=>a.client.localeCompare(b.client,'pt-BR'))};
 }
 const api={name,cents,money,input,summary};if(typeof module!=='undefined')module.exports=api;else root.CashData=api;
})(typeof window!=='undefined'?window:globalThis);
