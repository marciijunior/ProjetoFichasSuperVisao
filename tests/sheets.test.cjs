const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {test}=require('node:test');
const source=fs.readFileSync('google-sheets/Code.gs','utf8');
const ID='test-spreadsheet-id',TOKEN='a'.repeat(64);
function fixture(){
  let rows=[],writes=0,locked=false,blocked=false;
  const headers=['Nome do cliente','CPF','Modelo','Placa','Número','Data de realização','Telefone','Marca','Município','UF','Chassi','Renavam','Combustível','Potência do motor','Ano de fabricação','Cor','Número do motor','ID da ficha','Atualizado em','Excluída','Cliente do caixa','Valor do caixa em centavos'];
  const sheet={getRange:(row,col,count)=>({getDisplayValues:()=>row===1?[headers]:rows.slice(row-2,row-2+count).map(r=>r.slice())}),getLastRow:()=>rows.length+1,getMaxRows:()=>1000,getSheetId:()=>1100};
  const ctx=vm.createContext({
    SpreadsheetApp:{openById:id=>{assert.equal(id,ID);return {getSheetByName:()=>sheet};}},
    PropertiesService:{getScriptProperties:()=>({getProperty:key=>key==='SPREADSHEET_ID'?ID:TOKEN})},
    Utilities:{formatDate:()=> '2026-10-05',DigestAlgorithm:{SHA_256:'sha256'},computeDigest:(_,s)=>crypto.createHash('sha256').update(s).digest(),base64EncodeWebSafe:buffer=>buffer.toString('base64url')},
    LockService:{getScriptLock:()=>({tryLock:()=>{assert.equal(locked,false);locked=true;return true;},releaseLock:()=>{locked=false;}})},
    Sheets:{Spreadsheets:{batchUpdate:body=>{assert.equal(locked,true);if(blocked)throw Error('The caller does not have permission');const update=body.requests[0].updateCells;rows[update.range.startRowIndex-1]=update.rows[0].values.map(cell=>cell.userEnteredValue.stringValue);writes++;}}},
    ContentService:{MimeType:{JSON:'json'},createTextOutput:text=>({setMimeType:()=>JSON.parse(text)})}
  });
  vm.runInContext(source,ctx);
  const call=(action,payload={})=>ctx.doPost({postData:{contents:JSON.stringify({action,spreadsheetId:ID,token:TOKEN,...payload})}});
  const record={id:'test-record-0001',client:'Cliente fictício',cpf:'52998224725',model:'Modelo de teste',plate:'abc1d23'};
  return {call,record,rows,blockWrites:()=>blocked=true,get writes(){return writes;}};
}
test('quatro campos obrigatórios; data automática; opcionais vazios',()=>{
  const f=fixture(),result=f.call('save',{record:f.record});assert.equal(result.ok,true);assert.equal(result.record.date,'2026-10-05');assert.equal(result.record.value,'');assert.equal(result.record.plate,'ABC1D23');assert.equal(f.call('list').records.length,1);
  for(const field of ['client','cpf','model','plate']){const r=f.call('save',{record:{...f.record,id:'another-id-123', [field]:''}});assert.equal(r.ok,false,field);}
});
test('número livre com sugestões, sem moeda; preserva zeros iniciais',()=>{
  for(const value of ['8','9','10','11','12','13','14','15','00042','999']){const f=fixture();assert.equal(f.call('save',{record:{...f.record,value}}).record.value,value);}
  for(const value of ['R$ 8','8,00','-1','1e3','abc']){const f=fixture();assert.equal(f.call('save',{record:{...f.record,value}}).ok,false);}
});
test('autenticação e destino são verificados antes de escrever',()=>{
  const f=fixture();assert.equal(f.call('save',{record:f.record,token:'wrong'}).ok,false);assert.equal(f.call('save',{record:f.record,spreadsheetId:'other'}).ok,false);assert.equal(f.writes,0);
});
test('retry após resposta perdida é idempotente; data pode ser alterada',()=>{
  const f=fixture(),first=f.call('save',{record:f.record}).record;const retry=f.call('save',{record:f.record});assert.equal(retry.ok,true);assert.equal(f.writes,1);
  const edited=f.call('save',{record:{...first,model:'Novo modelo',date:'2026-09-30'}});assert.equal(edited.ok,true);assert.equal(edited.record.date,'2026-09-30');assert.equal(f.rows.length,1);
  assert.equal(f.call('save',{record:{...edited.record,date:'2026-02-30'}}).ok,false);
  const manual=fixture();assert.equal(manual.call('save',{record:{...manual.record,date:'2024-02-29'}}).record.date,'2024-02-29');
});
test('edição concorrente, inclusive edição direta na planilha, não é sobrescrita',()=>{
  const f=fixture(),first=f.call('save',{record:f.record}).record;
  f.rows[0][0]='Alterado na planilha';assert.equal(f.call('save',{record:{...first,model:'Novo modelo'}}).ok,false);assert.equal(f.rows[0][0],'Alterado na planilha');
});
test('exclusão limpa dados pessoais e evita ressurreição por tentativa atrasada',()=>{
  const f=fixture(),first=f.call('save',{record:f.record}).record;
  assert.equal(f.call('remove',{id:first.id,revision:'old'}).ok,false);
  assert.equal(f.call('remove',{id:first.id,revision:first.revision}).ok,true);assert.equal(f.call('list').records.length,0);
  assert.equal(f.rows[0].slice(0,17).join(''),'');assert.equal(f.call('remove',{id:first.id,revision:first.revision}).ok,true);assert.equal(f.call('save',{record:first}).ok,false);
});
test('texto enviado como stringValue, sem fórmulas executáveis',()=>{
  const f=fixture(),result=f.call('save',{record:{...f.record,client:'=IMPORTXML("X";"Y")'}});assert.equal(result.ok,true);assert.equal(f.rows[0][0],'=IMPORTXML("X";"Y")');
});
test('CPF inválido, corpo inválido e campos longos recusados',()=>{
  const f=fixture();assert.equal(f.call('save',{record:{...f.record,cpf:'11111111111'}}).ok,false);
  assert.equal(f.call('save',{record:{...f.record,model:'x'.repeat(101)}}).ok,false);
  assert.equal(f.call('other').ok,false);
});

test('bloqueio do Google informa espaço e permissão sem confirmar gravação',()=>{
  const f=fixture();f.blockWrites();const result=f.call('save',{record:f.record});
  assert.equal(result.ok,false);assert.match(result.error,/espaço da conta proprietária/);assert.equal(f.writes,0);
  assert.equal(f.call('list').ok,true);
});

test('CNPJ numérico e alfanumérico preservados; dígitos inválidos rejeitados',()=>{
 for(const cpf of ['11222333000181','12ABC34501DE35','04252011000110']){const f=fixture();const r=f.call('save',{record:{...f.record,cpf}});assert.equal(r.ok,true);assert.equal(r.record.cpf,cpf);}
 for(const cpf of ['11222333000182','12ABC34501DE36','00000000000000']){const f=fixture();assert.equal(f.call('save',{record:{...f.record,cpf}}).ok,false);}
});

test('REQ e caixa: nomes, centavos, concorrência e preservação na edição',()=>{
 const f=fixture(),first=f.call('save',{record:{...f.record,value:'req',client:'  José   da silva '}}).record;
 assert.equal(first.value,'REQ');assert.equal(first.client,'JOSÉ DA SILVA');assert.equal(first.cashClient,'');assert.equal(first.cashCents,'');
 const payload={id:first.id,revision:first.revision,cashClient:'  ação  veículos ',cashCents:'8050'};
 const saved=f.call('cash-save',payload);assert.equal(saved.ok,true);assert.equal(saved.record.cashClient,'AÇÃO VEÍCULOS');assert.equal(saved.record.cashCents,'8050');
 assert.equal(f.call('cash-save',payload).ok,true);assert.equal(f.writes,2);
 assert.equal(f.call('cash-save',{...payload,cashCents:'9000'}).ok,false);
 for(const value of ['-1','80.50','1e3','1000000000'])assert.equal(f.call('cash-save',{...payload,revision:saved.record.revision,cashCents:value}).ok,false);
 const edited=f.call('save',{record:{...saved.record,model:'Outro modelo'}}).record;assert.equal(edited.cashCents,'8050');assert.equal(edited.cashClient,'AÇÃO VEÍCULOS');
 assert.equal(f.call('remove',{id:edited.id,revision:edited.revision}).ok,true);assert.equal(f.rows[0][20],'');assert.equal(f.rows[0][21],'');
});
