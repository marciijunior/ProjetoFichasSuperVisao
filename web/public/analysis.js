(function(root){
  'use strict';
  const catalog=typeof module!=='undefined'?require('./catalog.js'):root.VehicleCatalog;
  const fields=['brand','model','city','state','fuel','year','color','value'];
  const missing='__missing__';
  function category(row,field){const value=catalog.canonical(field,row[field],row.brand);return value?catalog.key(value):missing;}
  function display(row,field){return catalog.canonical(field,row[field],row.brand)||'Não informado';}
  function validDate(value){if(!/^\d{4}-\d{2}-\d{2}$/.test(value||''))return false;const d=new Date(value+'T12:00:00Z');return Number.isFinite(d.valueOf())&&d.toISOString().slice(0,10)===value;}
  function filter(rows,filters){
    const q=catalog.key(filters.query),compact=q.replace(/[^A-Z0-9]/g,'');
    return rows.filter(r=>{
      if((filters.from||filters.to)&&!validDate(r.date))return false;
      if(filters.from&&r.date<filters.from||filters.to&&r.date>filters.to)return false;
      if(fields.some(f=>filters[f]&&category(r,f)!==filters[f]))return false;
      if(q&&!['client','cpf','plate','phone','model','brand','city'].some(f=>catalog.key(r[f]).includes(q)||(compact&&catalog.key(r[f]).replace(/[^A-Z0-9]/g,'').includes(compact))))return false;
      return true;
    });
  }
  function group(rows,field){const map=new Map();rows.forEach(r=>{const key=category(r,field);if(!map.has(key))map.set(key,{key,label:display(r,field),count:0});map.get(key).count++;});return [...map.values()].sort((a,b)=>b.count-a.count||a.label.localeCompare(b.label,'pt-BR',{numeric:true}));}
  function summary(rows){return {count:rows.length,vehicles:new Set(rows.map(r=>catalog.key(r.plate).replace(/[^A-Z0-9]/g,'')).filter(Boolean)).size,clients:new Set(rows.map(r=>String(r.cpf||'').toUpperCase().replace(/[^A-Z0-9]/g,'')).filter(Boolean)).size,missing:rows.filter(r=>!r.brand||!r.fuel||!r.city||!r.color).length};}
  function timeline(rows,unit){const map=new Map();rows.filter(r=>validDate(r.date)).forEach(r=>{const key=r.date.slice(0,unit==='month'?7:10);map.set(key,(map.get(key)||0)+1);});return [...map].sort(([a],[b])=>a.localeCompare(b)).map(([key,count])=>({key,count,label:unit==='month'?key.slice(5)+'/'+key.slice(0,4):key.slice(8)+'/'+key.slice(5,7)+'/'+key.slice(0,4)}));}
  function dateRange(key){if(key.length===10)return {from:key,to:key};const [year,month]=key.split('-').map(Number);return {from:key+'-01',to:new Date(Date.UTC(year,month,0)).toISOString().slice(0,10)};}
  function today(){return new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());}
  function preset(days){const to=today(),d=new Date(to+'T12:00:00Z');d.setUTCDate(d.getUTCDate()-days+1);return {from:d.toISOString().slice(0,10),to};}
  const api={fields,missing,category,display,validDate,filter,group,summary,timeline,dateRange,today,preset};
  if(typeof module!=='undefined')module.exports=api;else root.VisaoData=api;
})(typeof window!=='undefined'?window:globalThis);
