(function (root) {
  'use strict';
  const normalize = text => String(text || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().replace(/\s+/g, ' ').trim();
  const key = text => normalize(text).replace(/[^A-Z0-9]/g, '');
  const aliases = {
    renavam: ['CODIGO RENAVAM', 'RENAVAM'], plate: ['PLACA'], chassis: ['CHASSI', 'CHASS'],
    cpf: ['CPF/CNPJ', 'CPF'], client: ['NOME DO PROPRIETARIO', 'NOME'],
    brandModel: ['MARCA/MODELO/VERSAO', 'MARCA/MODELO'], brand: ['MARCA'], model: ['MODELO'],
    year: ['ANO DE FABRICACAO', 'ANO FABRICACAO'], color: ['COR PREDOMINANTE', 'COR'],
    fuel: ['COMBUSTIVEL'], power: ['POTENCIA/CILINDRADA', 'POTENCIA'],
    engine: ['NUMERO DO MOTOR', 'N° MOTOR', 'MOTOR'], city: ['MUNICIPIO'], state: ['UF'], local: ['LOCAL'],
    domicile: ['MUNICIPIO DE DOMICILIO OU RESIDENCIA'],
    buyer: ['IDENTIFICACAO DO COMPRADOR'], seller: ['IDENTIFICACAO DO VENDEDOR'],
    category: ['CATEGORIA'], body: ['CARROCERIA'],
    stop: ['ANO MODELO', 'EXERCICIO', 'CAT', 'CAPACIDADE', 'PESO BRUTO TOTAL', 'CMT', 'EIXOS', 'LOTACAO',
      'NUMERO DO CRV', 'NUMERO CRV', 'CODIGO DE SEGURANCA CRV', 'CODIGO DE SEGURANCA DO CLA', 'NUMERO ATPVE',
      'ESPECIE/TIPO', 'PLACA ANTERIOR/UF', 'DATA', 'DATA EMISSAO DO CRV', 'DATA DECLARADA DA VENDA',
      'HODOMETRO', 'E-MAIL', 'ENDERECO DE DOMICILIO OU RESIDENCIA', 'VALOR DECLARADO NA VENDA',
      'DADOS DO SEGURO DPVAT', 'INFORMACOES DO SEGURO DPVAT', 'OBSERVACOES DO VEICULO',
      'MENSAGENS SENATRAN', 'AUTENTICACAO DAS ASSINATURAS', 'ASSINATURA DO COMPRADOR',
      'ASSINATURA DO PROPRIETARIO (VENDEDOR)']
  };
  const dictionary = Object.entries(aliases).flatMap(([field, items]) => items.map(text => ({field, text, key:key(text)})))
    .sort((a,b) => b.key.length - a.key.length);
  const states = /^(AC|AL|AP|AM|BA|CE|DF|ES|GO|MA|MT|MS|MG|PA|PB|PR|PE|PI|RJ|RN|RS|RO|RR|SC|SP|SE|TO)$/;
  const colors = new Set(['AMARELA','AZUL','BEGE','BRANCA','CINZA','DOURADA','GRENA','LARANJA','MARROM','PRATA','PRETA','ROSA','ROXA','VERDE','VERMELHA','FANTASIA']);
  const vehicleFields = ['renavam','plate','chassis','brandModel','brand','model','year','color','fuel','power','engine','city','state','local'];
  function validCPF(value) {
    const cpf = String(value).replace(/\D/g, '');
    if (!/^\d{11}$/.test(cpf) || /^(\d)\1{10}$/.test(cpf)) return false;
    for (let size=9; size<=10; size++) {
      let sum=0; for (let i=0; i<size; i++) sum += Number(cpf[i])*(size+1-i);
      if ((sum*10%11)%10 !== Number(cpf[size])) return false;
    }
    return true;
  }
  function clean(field, raw) {
    const text = normalize(raw).replace(/^[:\s]+/, '');
    const compact = text.replace(/\s/g,'');
    if (!text || text.length > 120 || dictionary.some(item => key(text) === item.key)) return '';
    if (field === 'plate') { const value=compact.replace(/-/g,''); return /^[A-Z]{3}\d[A-Z0-9]\d{2}$/.test(value) ? value : ''; }
    if (field === 'chassis') return /^[A-HJ-NPR-Z0-9]{17}$/.test(compact) ? compact : '';
    if (field === 'renavam') { const value=compact.replace(/[.-]/g,''); return /^\d{9,11}$/.test(value) ? value : ''; }
    if (field === 'cpf') return /^[\d.\s-]+$/.test(text) && validCPF(text) ? text.replace(/\D/g,'') : '';
    if (field === 'year') return /^(19|20)\d{2}$/.test(text) && +text<=new Date().getFullYear()+1 ? text : '';
    if (field === 'color') return colors.has(compact) ? compact : '';
    if (field === 'state') return states.test(text) ? text : '';
    if (field === 'power') {
      const match=compact.match(/^(\d{1,4}(?:[.,]\d{1,2})?)(CV|KW)(?:\/\d+(?:CC|CM3)?)?$/);
      return match ? match[1]+' '+match[2] : '';
    }
    if (field === 'engine') return /^[A-Z0-9*-]{5,30}$/.test(text) && /\d/.test(text) ? text : '';
    if (field === 'fuel') {
      const values=text.split(/[\/,+]/).map(value=>value.trim());
      return values.every(value=>/^(ALCOOL|GASOLINA|DIESEL|GNV|GAS NATURAL|ELETRICO|ELETRICA|HIBRIDO|HIBRIDA|ETANOL)$/.test(value)) ? values.join(' / ') : '';
    }
    if (field === 'client') return /^[A-Z][A-Z .&'-]{3,99}$/.test(text) && !/[A-Z]\.[A-Z]/.test(text) ? text : '';
    if (field === 'city' || field === 'domicile') return /^[A-Z][A-Z .'-]{1,79}$/.test(text) ? text : '';
    if (field === 'local') return /^[A-Z][A-Z ./'-]{1,89}$/.test(text) ? text : '';
    if (['brand','model','brandModel'].includes(field)) return /^[A-Z0-9][A-Z0-9 /().+&-]{1,99}$/.test(text) ? text : '';
    return '';
  }
  function finish(fields) {
    if (fields.brandModel) {
      const parts=fields.brandModel.replace(/^I\//,'').split('/');
      if (parts.length>=2 && parts.every(part=>part.trim())) { fields.brand=parts.shift().trim(); fields.model=parts.join('/').trim(); }
      delete fields.brandModel;
    }
    const location=(fields.local || '').match(/^(.+?)(?:\s*[-/]\s*|\s+)([A-Z]{2})$/);
    if (location && states.test(location[2])) { fields.city=location[1].trim(); fields.state=location[2]; }
    delete fields.local;
    return fields;
  }
  function detect(text) {
    const value=key(text);
    if (/ATPV|IDENTIFICACAODOCOMPRADOR|IDENTIFICACAODOVENDEDOR|AUTORIZACAOPARATRANSFERENCIA/.test(value)) return 'atpv';
    if (/CRLV|CERTIFICADODEREGISTROELICENCIAMENTO/.test(value) || /COMBUSTIVEL/.test(value) && /POTENCIA/.test(value)) return 'crlv';
    return 'unknown';
  }
  function rowsFor(input) {
    const width=+input.width, height=+input.height;
    if (!(width>0 && height>0)) return [];
    const words=[];
    for (const line of (input.lines || [])) {
      const elements=Array.isArray(line.elements) && line.elements.length ? line.elements : [line];
      for (const item of elements) {
        if (![item.x,item.y,item.width,item.height].every(Number.isFinite) || item.width<=0 || item.height<=0) continue;
        const text=normalize(item.text); if (!text) continue;
        const parts=text.split(' '); let offset=0;
        // Estimate word spans only when an OCR engine supplies whole-line boxes.
        for (const part of parts) {
          words.push({text:part,x:(item.x+item.width*offset/text.length)/width,y:item.y/height,
            w:item.width*part.length/text.length/width,h:item.height/height,
            confidence:item.confidence || line.confidence || 0});
          offset+=part.length+1;
        }
      }
    }
    words.sort((a,b)=>(a.y+a.h/2)-(b.y+b.h/2) || a.x-b.x);
    const rows=[];
    for (const word of words) {
      const center=word.y+word.h/2;
      const row=rows.find(item=>Math.abs(item.cy-center)<=Math.max(.002,Math.min(item.h,word.h)*.6));
      if (row) { row.words.push(word); row.h=Math.max(row.h,word.h); }
      else rows.push({cy:center,h:word.h,words:[word]});
    }
    rows.forEach((row,index)=>{ row.index=index; row.words.sort((a,b)=>a.x-b.x); });
    return rows;
  }
  function anchorsFor(rows) {
    const anchors=[];
    for (const row of rows) {
      for (let start=0; start<row.words.length; start++) {
        let match=null;
        for (let end=start; end<Math.min(start+10,row.words.length); end++) {
          if (end>start && row.words[end].x-(row.words[end-1].x+row.words[end-1].w)>.045) break;
          const value=key(row.words.slice(start,end+1).map(word=>word.text).join(' '));
          const label=dictionary.find(item=>item.key===value);
          if (label) match={...label,start,end};
        }
        if (match) {
          const group=row.words.slice(match.start,match.end+1);
          const x=group[0].x, right=group[group.length-1].x+group[group.length-1].w;
          group.forEach(word=>word.label=true);
          anchors.push({...match,x,right,y:Math.min(...group.map(word=>word.y)),h:Math.max(...group.map(word=>word.h)),row:row.index});
          start=match.end;
        }
      }
    }
    return anchors;
  }
  function analyze(input, options={}) {
    const text=typeof input==='string' ? input : String(input.text || '');
    const type=['atpv','crlv'].includes(options.type) ? options.type : detect(text);
    const output={type,fields:{},parties:[],warnings:[]};
    const rows=typeof input==='object' ? rowsFor(input) : [];
    if (!rows.length) {
      if (typeof input==='object') {
        output.warnings.push('Não foi possível localizar os campos na imagem. Tente outra foto ou preencha manualmente.');
        return output;
      }
      output.fields=plain(text,type);
      if (type==='atpv') output.warnings.push('Comprador e vendedor exigem leitura com posição ou preenchimento manual.');
      return output;
    }
    const anchors=anchorsFor(rows);
    const left=anchors.filter(a=>['renavam','plate'].includes(a.field)).sort((a,b)=>a.x-b.x)[0];
    const right=left && anchors.filter(a=>['seller','category','power','body'].includes(a.field) && a.x>left.x+.24).sort((a,b)=>a.x-b.x)[0];
    const gutter=right ? right.x-.018 : null;
    function valueAt(anchor) {
      const sameRow=anchors.filter(a=>a.row===anchor.row && a.x>anchor.x+.01).sort((a,b)=>a.x-b.x)[0];
      const boundary=Math.min(sameRow ? sameRow.x-.006 : 1, gutter && anchor.x<gutter ? gutter : 1);
      const minX=anchor.x-.014;
      const below=anchors.filter(a=>a.y>anchor.y+anchor.h*.8 && a.x>=minX && a.x<boundary).sort((a,b)=>a.y-b.y)[0];
      const bottom=Math.min(anchor.y+Math.min(.085,Math.max(.04,anchor.h*10)),below ? below.y : 1);
      for (const row of rows) {
        if (row.index<anchor.row || row.cy>bottom || row.cy<anchor.y) continue;
        let candidates=row.words.filter(word=>!word.label && word.x>=minX && word.x+word.w/2<boundary && (row.index!==anchor.row || word.x>=anchor.right-.002));
        if (!candidates.length) continue;
        if (row.index!==anchor.row && candidates[0].x>anchor.x+.04) continue;
        // A missing neighbouring label must not join values from distinct cells.
        const gap=candidates.findIndex((word,index)=>index>0 && word.x-(candidates[index-1].x+candidates[index-1].w)>.035);
        if (gap>0) candidates=candidates.slice(0,gap);
        if (candidates.some(word=>word.confidence>0 && word.confidence<.65)) return '';
        return candidates.map(word=>word.text).join(' ');
      }
      return '';
    }
    const uncertain=new Set();
    function one(field, list=anchors) {
      const candidates=list.filter(a=>a.field===field);
      if (candidates.length!==1) return '';
      const raw=valueAt(candidates[0]);
      const value=clean(field,raw);
      if (raw && !value) uncertain.add(field);
      return value;
    }
    for (const field of vehicleFields) {
      if (type==='atpv' && ['fuel','power','engine','city','state','local'].includes(field)) continue;
      const value=one(field); if (value) output.fields[field]=value;
    }
    if (type==='atpv') {
      for (const role of ['buyer','seller']) {
        const headers=anchors.filter(a=>a.field===role);
        if (headers.length!==1) continue;
        const header=headers[0];
        const end=anchors.filter(a=>['buyer','seller','stop'].includes(a.field) && a.y>header.y+.01 && Math.abs(a.x-header.x)<.045 &&
          (a.field!=='stop' || /ASSINATURA|MENSAGENS|VALORDECLARADO/.test(a.key))).sort((a,b)=>a.y-b.y)[0];
        const region=anchors.filter(a=>a.y>header.y && a.y<Math.min(end ? end.y : 1,header.y+.29) && a.x>=header.x-.015 &&
          (!gutter || header.x>=gutter || a.x<gutter));
        const person={role};
        for (const field of ['client','cpf','domicile','state']) { const value=one(field,region); if (value) person[field]=value; }
        if (person.client || person.cpf) output.parties.push(person);
      }
      output.warnings.push('Escolha comprador ou vendedor para sugerir nome e CPF. O município de domicílio não identifica necessariamente o município do veículo.');
      output.warnings.push('Este recibo não informa combustível, potência nem número do motor. Complete esses campos pelo CRLV.');
    } else {
      for (const field of ['client','cpf']) { const value=one(field); if (value) output.fields[field]=value; }
    }
    finish(output.fields);
    const names={client:'nome',chassis:'chassi',cpf:'CPF',plate:'placa',renavam:'Renavam',engine:'número do motor',year:'ano de fabricação',power:'potência'};
    const rejected=[...uncertain].map(field=>names[field]).filter(Boolean);
    if (rejected.length) output.warnings.push('Leitura inconclusiva: '+rejected.join(', ')+'. Confira no documento e digite manualmente.');
    if (type==='unknown') output.warnings.push('Tipo de documento não identificado. Confira o tipo e os campos antes de usar.');
    return output;
  }
  function plain(text,type) {
    const lines=String(text).split(/\r?\n/).map(normalize).filter(Boolean), fields={};
    for (const field of [...vehicleFields,'client','cpf']) {
      if (type==='atpv' && ['client','cpf','city','state','local','fuel','power','engine'].includes(field)) continue;
      const matches=[];
      for (let i=0;i<lines.length;i++) {
        const line=lines[i];
        const longest=dictionary.find(item=>key(line)===item.key || line.startsWith(item.text+':') || line.startsWith(item.text+' '));
        if (!longest || longest.field!==field) continue;
        const next=key(line)===longest.key ? lines[i+1] || '' : line.slice(longest.text.length).replace(/^[:\s]+/,'');
        matches.push(clean(field,next));
      }
      if (matches.length===1 && matches[0]) fields[field]=matches[0];
    }
    const years=normalize(text).match(/ANO (?:DE )?FABRICACAO ANO MODELO ((?:19|20)\d{2}) (?:19|20)\d{2}/);
    if (!fields.year && years) fields.year=years[1];
    return finish(fields);
  }
  function validCNPJ(value){
    const v=String(value).toUpperCase().replace(/[.\/\s-]/g,'');
    if(!/^[A-Z0-9]{12}\d{2}$/.test(v)||/^(.)\1{13}$/.test(v))return false;
    for(let size=12;size<=13;size++){
      let sum=0,weight=size-7;
      for(let i=0;i<size;i++){sum+=(v.charCodeAt(i)-48)*weight;if(--weight<2)weight=9;}
      const rest=sum%11;if(Number(v[size])!==(rest<2?0:11-rest))return false;
    }return true;
  }
  const api={parse:(input,options)=>analyze(input,options).fields,analyze,validCPF,validCNPJ,normalize};
  if (typeof module!=='undefined' && module.exports) module.exports=api; else root.DocumentParser=api;
})(typeof window!=='undefined' ? window : globalThis);
