// Synthetic aggregation fixtures; no real people, documents or vehicle registrations.
const {test}=require('node:test'),assert=require('node:assert/strict');
const D=require('../public/analysis'),C=require('../public/catalog');
const rows=[
 {id:'1',date:'2026-10-01',brand:'VW',model:'Gol',fuel:'Flex',color:'Branca',city:'São Paulo',state:'SP',cpf:'TEST-DOC-001',plate:'TEST-VEHICLE-001',value:'008'},
 {id:'2',date:'2026-10-02',brand:'volkswagen',model:'GOL',fuel:'Gasolina / Álcool',color:'Branco',city:'sao paulo',state:'SP',cpf:'TESTDOC001',plate:'TESTVEHICLE001',value:'8'},
 {id:'3',date:'2026-09-30',brand:'Chevrolet',model:'Onix',fuel:'Gasolina',city:'Curitiba',state:'PR',cpf:'TESTDOC002',plate:'TESTVEHICLE002',value:'9'},
 {id:'4',date:'data inválida',brand:'',model:'Outro',fuel:'',color:'',value:''}
];
test('groups spelling variants and preserves number identifiers rather than summing values',()=>{
 assert.equal(D.group(rows,'brand').find(g=>g.key==='VOLKSWAGEN').count,2);
 assert.equal(D.group(rows,'fuel').find(g=>g.label==='Gasolina / Álcool').count,2);
 assert.equal(D.group(rows,'city').find(g=>g.key==='SAO PAULO').count,2);
 assert.equal(D.group(rows,'color').find(g=>g.label==='Branco').count,2);
 assert.deepEqual(D.group(rows,'value').map(g=>g.key).sort(),['008','8','9',D.missing].sort());
 assert.equal(D.summary(rows).vehicles,2);assert.equal(D.summary(rows).clients,2);assert.equal(D.summary(rows).count,4);
});
test('combined filters include date boundaries, isolate missing values and use normalized search',()=>{
 assert.deepEqual(D.filter(rows,{from:'2026-10-01',to:'2026-10-02',brand:'VOLKSWAGEN',city:'SAO PAULO'}).map(r=>r.id),['1','2']);
 assert.deepEqual(D.filter(rows,{query:'TESTVEHICLE001'}).map(r=>r.id),['1','2']);
 assert.deepEqual(D.filter(rows,{brand:D.missing}).map(r=>r.id),['4']);
 assert.equal(D.filter(rows,{from:'2026-10-03',to:'2026-10-01'}).length,0);
 assert.equal(D.filter(rows,{brand:'CHEVROLET',state:'SP'}).length,0);
});
test('timeline validates calendar dates and month ranges, without inventing inspection results',()=>{
 assert.equal(D.validDate('2026-02-30'),false);assert.equal(D.validDate('2024-02-29'),true);
 assert.deepEqual(D.timeline(rows,'month').map(g=>[g.key,g.count]),[['2026-09',1],['2026-10',2]]);
 assert.deepEqual(D.dateRange('2024-02'),{from:'2024-02-01',to:'2024-02-29'});
 assert.deepEqual(D.dateRange('2026-10-02'),{from:'2026-10-02',to:'2026-10-02'});
});
test('suggestions depend on brand and state, include previous records, and allow new vehicles',()=>{
 assert.ok(C.suggestions('model',rows,'VW').includes('Gol'));
 assert.ok(!C.suggestions('model',rows,'VW').includes('Onix'));
 assert.ok(!C.suggestions('model',[{brand:'Volkswagen',model:'Gol 1.6 MSI'}],'VW').includes('Gol 1.6 MSI'));
 assert.equal(C.canonical('model','Gol 1.6 MSI','VW'),'Gol');
 assert.equal(C.canonical('model','Corolla Cross XRE 2.0 16V Flex Aut.','Toyota'),'Corolla Cross');
 assert.equal(C.canonical('model','ONIX PLUS LT 1.0 Turbo','Chevrolet'),'Onix Plus');
 assert.equal(C.canonical('model','AGILE LTZ EFFECT EASYTR.1.4 8V FlexP. 5p','Chevrolet'),'AGILE');
 assert.ok(C.suggestions('model',[],'Chevrolet').every(m=>!/(?:Flex|MPFI|16V|Turbo|LTZ)/i.test(m)));
 assert.ok(C.suggestions('city',rows,'','PR').includes('Curitiba'));
 assert.ok(!C.suggestions('city',rows,'','PR').includes('São Paulo'));
 assert.equal(Object.keys(C.citiesByState).length,27);
 assert.equal(Object.values(C.citiesByState).reduce((n,a)=>n+a.length,0),5571);
 assert.ok(Object.keys(C.vehicles).length>100);
 assert.ok(Object.values(C.vehicles).reduce((n,a)=>n+a.length,0)>700);
 assert.ok(C.suggestions('color',[]).includes('Prata'));
 assert.equal(C.canonical('model','Modelo livre versão 2.0','Marca livre'),'Modelo livre versão 2.0');
 assert.equal(C.canonical('fuel','flex'),'Gasolina / Álcool');assert.equal(C.canonical('brand',' vw '),'Volkswagen');
});
