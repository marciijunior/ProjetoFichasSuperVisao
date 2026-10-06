'use strict';
window.createDashboard=function({getRecords,onEdit,onExport,onBack,onRefresh,documentPreview}){
  const D=VisaoData,C=VehicleCatalog,$=id=>document.getElementById(id);
  const labels={brand:'Marca',model:'Modelo',city:'Município',state:'Estado',fuel:'Combustível',year:'Ano de fabricação',color:'Cor',value:'Número'};
  const palette=['#071d53','#df1822','#426ba9','#af263e','#667da3','#934662','#879ab9','#b66c78','#adb8cc'];
  const filters={};let page=1,filtered=[],isBusy=false,lastSignature='';
  function node(tag,className,text){const e=document.createElement(tag);if(className)e.className=className;if(text!==undefined)e.textContent=text;return e;}
  function svg(tag,attrs={},text){const e=document.createElementNS('http://www.w3.org/2000/svg',tag);for(const [k,v]of Object.entries(attrs))e.setAttribute(k,v);if(text!==undefined)e.textContent=text;return e;}
  function option(select,value,label){const o=node('option','',label);o.value=value;select.append(o);}
  function button(text,fn,className=''){const b=node('button',className,text);b.type='button';b.disabled=isBusy;b.onclick=fn;if(text==='Abrir'){const svg=document.createElementNS('http://www.w3.org/2000/svg','svg'),use=document.createElementNS('http://www.w3.org/2000/svg','use');use.setAttribute('href','#icon-edit');svg.setAttribute('aria-hidden','true');svg.append(use);b.replaceChildren(svg);b.setAttribute('aria-label','Editar ficha');b.title='Editar ficha';b.classList.add('action-icon');}return b;}
  function activate(e,fn,label){e.setAttribute('role','button');e.setAttribute('tabindex','0');e.setAttribute('aria-label',label);e.onclick=()=>{if(!isBusy)fn();};e.onkeydown=event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();if(!isBusy)fn();}};}
  for(const [field,label]of Object.entries(labels)){
    const l=node('label','',label),s=node('select');s.id='filter-'+field;l.append(s);$('category-filters').append(l);
    s.onchange=()=>{filters[field]=s.value;if(field==='brand'){filters.model='';$('filter-model').value='';}if(field==='state'){filters.city='';$('filter-city').value='';}page=1;render();};
  }
  for(const field of ['brand','model','fuel','year','color','value'])option($('breakdown-field'),field,labels[field]);
  function refreshOptions(){
    const rows=getRecords();
    for(const field of D.fields){
      const select=$('filter-'+field),source=rows.filter(r=>(field!=='model'||!filters.brand||D.category(r,'brand')===filters.brand)&&(field!=='city'||!filters.state||D.category(r,'state')===filters.state));
      const groups=D.group(source,field).sort((a,b)=>a.label.localeCompare(b.label,'pt-BR',{numeric:true}));
      select.replaceChildren();option(select,'','Todos');for(const g of groups)option(select,g.key,g.label);
      if(filters[field]&&!groups.some(g=>g.key===filters[field]))option(select,filters[field],filters[field]===D.missing?'Não informado':filters[field]);
      select.value=filters[field]||'';select.disabled=isBusy;
    }
  }
  function setCategory(field,key){filters[field]=filters[field]===key?'':key;if(field==='brand')filters.model='';if(field==='state')filters.city='';page=1;render();}
  function chips(){
    $('active-filters').replaceChildren();
    for(const [field,value]of Object.entries(filters)){
      if(!value)continue;
      const label=field==='query'?'Busca':field==='from'?'De':field==='to'?'Até':labels[field];
      const text=value===D.missing?'Não informado':D.group(getRecords(),field).find(g=>g.key===value)?.label||value;
      const b=button(label+': '+text+' ×',()=>{filters[field]='';const input=$('filter-'+field);if(input)input.value='';page=1;render();},'filter-chip');
      b.setAttribute('aria-label','Remover filtro '+label+': '+text);$('active-filters').append(b);
    }
  }
  function metrics(){
    const stats=D.summary(filtered);$('analytics-metrics').replaceChildren();
    for(const [key,label]of [['count','Vistorias no filtro'],['vehicles','Veículos distintos'],['clients','Clientes distintos'],['missing','Fichas a complementar']]){
      const card=node('div','metric');card.append(node('strong','',stats[key].toLocaleString('pt-BR')),node('span','',label));
      if(key==='missing')card.title='Fichas sem marca, combustível, município ou cor. Esses campos continuam opcionais.';
      $('analytics-metrics').append(card);
    }
  }
  function drawTime(){
    const host=$('time-chart');host.replaceChildren();
    let unit=$('time-unit').value,series=D.timeline(filtered,unit),note='Somente períodos com fichas são exibidos. A altura representa a quantidade de vistorias.';
    if(unit==='day'&&series.length>90){unit='month';series=D.timeline(filtered,unit);note='Visualização agrupada em meses porque o filtro tem mais de 90 dias com registros.';}
    const unknown=filtered.filter(r=>!D.validDate(r.date)).length;
    $('time-note').textContent=note+(unknown?' '+unknown+' ficha(s) sem data válida não aparecem neste gráfico.':'');
    if(!series.length){host.append(node('p','chart-empty','Sem datas para apresentar neste filtro.'));return;}
    const width=Math.max(640,series.length*40),height=240,left=44,top=22,bottom=190,plot=width-left-25,max=Math.max(...series.map(x=>x.count));
    const graph=svg('svg',{viewBox:`0 0 ${width} ${height}`,width,height,class:'timeline-svg',role:'group','aria-label':'Quantidade de vistorias por '+(unit==='day'?'dia':'mês')});
    const x=i=>left+plot*(i+.5)/series.length,y=count=>bottom-count/max*(bottom-top);
    for(const count of [...new Set([0,Math.round(max/2),max])]){const yy=y(count);graph.append(svg('line',{x1:left,y1:yy,x2:width-10,y2:yy,stroke:'#dfe5ef'}),svg('text',{x:left-9,y:yy+4,'text-anchor':'end',class:'axis-label'},String(count)));}
    if($('time-type').value==='line'&&series.length>1)graph.append(svg('polyline',{points:series.map((s,i)=>`${x(i)},${y(s.count)}`).join(' '),fill:'none',stroke:'#071d53','stroke-width':3}));
    series.forEach((s,i)=>{
      const group=svg('g',{class:'chart-point'}),desc=s.label+': '+s.count+' vistoria(s)';
      group.append(svg('title',{},desc));
      if($('time-type').value==='bar')group.append(svg('rect',{x:x(i)-Math.min(14,plot/series.length*.3),y:y(s.count),width:Math.min(28,plot/series.length*.6),height:bottom-y(s.count),rx:3,fill:'#071d53'}));
      else group.append(svg('circle',{cx:x(i),cy:y(s.count),r:6,fill:'#df1822',stroke:'#fff','stroke-width':2}));
      // Transparent hit area allows comfortable mouse and touch selection.
      group.append(svg('rect',{x:x(i)-16,y:top-8,width:32,height:bottom-top+16,fill:'transparent'}));
      activate(group,()=>{Object.assign(filters,D.dateRange(s.key));$('filter-from').value=filters.from;$('filter-to').value=filters.to;page=1;render();},desc+'. Filtrar este período');graph.append(group);
      if(series.length<15||i%Math.ceil(series.length/15)===0)graph.append(svg('text',{x:x(i),y:217,'text-anchor':'middle',class:'axis-label'},unit==='month'?s.label:s.label.slice(0,5)));
    });host.append(graph);
  }
  function drawCategories(hostId,field,type){
    const host=$(hostId);host.replaceChildren();const groups=D.group(filtered,field),total=filtered.length;
    if(!total){host.append(node('p','chart-empty','Sem fichas para apresentar neste filtro.'));return;}
    if(type==='donut'){
      const ring=svg('svg',{viewBox:'0 0 220 220',class:'donut-svg',role:'group','aria-label':'Distribuição por '+labels[field]});
      const shown=groups.slice(0,8),others=groups.slice(8).reduce((sum,g)=>sum+g.count,0);if(others)shown.push({label:'Outras categorias (veja a lista)',count:others});
      let offset=0;shown.forEach((g,i)=>{const length=g.count/total*100,circle=svg('circle',{cx:110,cy:110,r:78,fill:'none',stroke:palette[i], 'stroke-width':30,pathLength:100,'stroke-dasharray':`${length} ${100-length}`,'stroke-dashoffset':-offset,transform:'rotate(-90 110 110)'});offset+=length;circle.append(svg('title',{},g.label+': '+g.count+' ('+(length).toFixed(1)+'%)'));if(g.key)activate(circle,()=>setCategory(field,g.key),g.label+': '+g.count+'. Filtrar');ring.append(circle);});
      ring.append(svg('text',{x:110,y:110,'text-anchor':'middle',class:'donut-total'},String(total)),svg('text',{x:110,y:132,'text-anchor':'middle',class:'axis-label'},'vistorias'));host.append(ring);
    }
    const list=node('div','chart-category-list');const max=groups[0]?.count||1;
    groups.forEach((g,i)=>{const b=button('',()=>setCategory(field,g.key),'category-item');b.title=g.label+': '+g.count+' de '+total+' fichas';b.setAttribute('aria-label',g.label+': '+g.count+' vistorias. Filtrar');b.setAttribute('aria-pressed',String(filters[field]===g.key));
      const heading=node('span','category-label');heading.append(node('span','',g.label),node('strong','',g.count+' · '+(g.count/total*100).toLocaleString('pt-BR',{maximumFractionDigits:1})+'%'));b.append(heading);
      if(type==='bar'){const bar=svg('svg',{viewBox:'0 0 300 9',preserveAspectRatio:'none',class:'bar-svg','aria-hidden':'true'});bar.append(svg('rect',{width:300,height:9,rx:4,fill:'#edf1f9'}),svg('rect',{width:Math.max(1,g.count/max*300),height:9,rx:4,fill:palette[i%palette.length]}));b.append(bar);}
      else {const marker=svg('svg',{viewBox:'0 0 18 14',class:'legend-index','aria-hidden':'true'});marker.append(svg('circle',{cx:7,cy:7,r:5,fill:palette[Math.min(i,8)]}));b.prepend(marker);}list.append(b);
    });host.append(list);
  }
  function table(){
    const rows=[...filtered],sort=$('table-sort').value;
    rows.sort((a,b)=>sort==='client'?String(a.client||'').localeCompare(String(b.client||''),'pt-BR'):sort==='brand'?(D.display(a,'brand')+' '+D.display(a,'model')).localeCompare(D.display(b,'brand')+' '+D.display(b,'model'),'pt-BR'):String(a.date||'').localeCompare(String(b.date||''))*(sort==='oldest'?1:-1));
    const pages=Math.max(1,Math.ceil(rows.length/25));page=Math.min(page,pages);$('analysis-rows').replaceChildren();
    rows.slice((page-1)*25,page*25).forEach(r=>{const tr=node('tr');for(const text of [D.validDate(r.date)?r.date.split('-').reverse().join('/'):'Não informada',r.client||'Não informado',[C.canonical('brand',r.brand),C.canonical('model',r.model,r.brand)].filter(Boolean).join(' ')||'Não informado',r.plate||'—',[r.city,r.state].filter(Boolean).join(' / ')||'Não informado',r.value||'—'])tr.append(node('td','',text));const doc=node('td');doc.append(documentPreview(r));tr.insertBefore(doc,tr.children[2]);const cell=node('td');cell.append(button('Abrir',()=>onEdit(r),'text-button'));tr.append(cell);$('analysis-rows').append(tr);});
    if(!rows.length){const tr=node('tr'),td=node('td','table-empty','Nenhuma ficha encontrada.');td.colSpan=8;tr.append(td);$('analysis-rows').append(tr);}
    $('table-count').textContent=rows.length+' ficha(s) selecionada(s) de '+getRecords().length;
    $('page-label').textContent='Página '+page+' de '+pages;$('page-prev').disabled=isBusy||page<=1;$('page-next').disabled=isBusy||page>=pages;$('export-filtered').disabled=isBusy||!rows.length;
  }
  function render(){
    const invalid=filters.from&&filters.to&&filters.from>filters.to;
    $('filter-error').hidden=!invalid;$('filter-error').textContent=invalid?'A data inicial deve ser anterior ou igual à data final.':'';
    filtered=invalid?[]:D.filter(getRecords(),filters);refreshOptions();chips();metrics();$('analytics-empty').hidden=filtered.length>0;drawTime();drawCategories('breakdown-chart',$('breakdown-field').value,$('breakdown-type').value);drawCategories('location-chart',$('location-field').value,$('location-type').value);table();
  }
  for(const field of ['from','to','query'])$('filter-'+field).addEventListener(field==='query'?'input':'change',()=>{filters[field]=$('filter-'+field).value;page=1;render();});
  for(const id of ['time-unit','time-type','breakdown-field','breakdown-type','location-field','location-type'])$(id).onchange=render;
  $('table-sort').onchange=()=>{page=1;table();};$('page-prev').onclick=()=>{page--;table();};$('page-next').onclick=()=>{page++;table();};
  $('clear-filters').onclick=()=>{Object.keys(filters).forEach(k=>delete filters[k]);['from','to','query'].forEach(k=>$('filter-'+k).value='');page=1;render();};
  document.querySelectorAll('[data-period]').forEach(b=>b.onclick=()=>{const period=b.dataset.period;Object.assign(filters,period==='today'?{from:D.today(),to:D.today()}:period==='all'?{from:'',to:''}:period==='month'?{from:D.today().slice(0,7)+'-01',to:D.today()}:D.preset(Number(period)));$('filter-from').value=filters.from;$('filter-to').value=filters.to;page=1;render();});
  $('export-filtered').onclick=()=>onExport(filtered);$('analytics-back').onclick=onBack;
  $('analytics-refresh').onclick=async()=>{await onRefresh();$('analytics-status').textContent=$('sync-status').textContent;render();};
  return {open(){lastSignature='';$('analytics-status').textContent=$('sync-status').textContent;render();},update(rows,busy){isBusy=busy;if($('analytics').hidden)return;const signature=JSON.stringify(rows)+busy;if(signature!==lastSignature){lastSignature=signature;render();}},reset(){Object.keys(filters).forEach(k=>delete filters[k]);['from','to','query'].forEach(k=>$('filter-'+k).value='');page=1;$('analytics').hidden=true;}};
};
