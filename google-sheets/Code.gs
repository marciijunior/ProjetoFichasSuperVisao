// SuperVisão 1.1 — vincule este script à planilha Fichas SuperVisao.
// Execute configurar uma vez e implante como aplicativo da Web.
const SPREADSHEET_ID = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
const TAB_NAME = 'Fichas';
const KEYS = ['client','cpf','model','plate','value','date','phone','brand','city','state','chassis','renavam','fuel','power','year','color','engine','id','updatedAt','deleted','cashClient','cashCents','cashPayments'];
const HEADERS = ['Nome do cliente','CPF','Modelo','Placa','Número','Data de realização','Telefone','Marca','Município','UF','Chassi','Renavam','Combustível','Potência do motor','Ano de fabricação','Cor','Número do motor','ID da ficha','Atualizado em','Excluída','Cliente do caixa','Valor do caixa em centavos','Pagamentos do caixa'];
const LIMITS = {client:120,cpf:14,model:100,plate:8,value:30,date:10,phone:22,brand:60,city:100,state:2,chassis:17,renavam:11,fuel:60,power:60,year:4,color:40,engine:60};
function publicError(message) { const error=new Error(message);error.publicMessage=message;throw error; }
function sheet_() {
  const sheet=SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(TAB_NAME);
  if(!sheet)publicError('A aba Fichas não foi encontrada.');
  const headers=sheet.getRange(1,1,1,HEADERS.length).getDisplayValues()[0];
  if(JSON.stringify(headers)!==JSON.stringify(HEADERS)){
    const size=[22,20].find(n=>JSON.stringify(headers.slice(0,n))===JSON.stringify(HEADERS.slice(0,n))&&headers.slice(n).every(v=>!v));
    if(!size)publicError('Os cabeçalhos da aba Fichas foram alterados. Restaure a estrutura antes de salvar.');
    const extra=sheet.getRange(1,size+1,Math.max(1,sheet.getLastRow()),HEADERS.length-size).getDisplayValues();
    if(extra.some(row=>row.some(Boolean)))publicError('As novas colunas do caixa precisam estar vazias antes da atualização.');
    sheet.getRange(1,size+1,1,HEADERS.length-size).setValues([HEADERS.slice(size)]);
  }
  return sheet;
}
function configurar() {
  sheet_();
  const props=PropertiesService.getScriptProperties();
  if(!props.getProperty('ACCESS_TOKEN'))props.setProperty('ACCESS_TOKEN',(Utilities.getUuid()+Utilities.getUuid()).replace(/-/g,''));
  // A chave aparece somente ao proprietário que executa a configuração; não é gravada em células nem em logs.
  const token=props.getProperty('ACCESS_TOKEN');
  if(!/^[a-zA-Z0-9_-]{32,128}$/.test(token))publicError('Use uma chave com 32 a 128 letras ou algarismos nas propriedades do script.');
  console.log('Configuração concluída. A chave está em Configurações do projeto, Propriedades do script, ACCESS_TOKEN.');
}
function validCpf_(value) {
  if(!/^\d{11}$/.test(value)||/^(\d)\1{10}$/.test(value))return false;
  for(let length=9;length<=10;length++){let sum=0;for(let i=0;i<length;i++)sum+=Number(value[i])*(length+1-i);const digit=(sum*10)%11;if((digit===10?0:digit)!==Number(value[length]))return false;}return true;
}
function revision_(row) {
  return Utilities.base64EncodeWebSafe(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,JSON.stringify(row)));
}
function record_(row) {
  const record={};KEYS.forEach((k,i)=>record[k]=String(row[i]||''));record.revision=revision_(row);record.client=normalName_(record.client);record.cashClient=normalName_(record.cashClient);return record;
}
function clean_(input) {
  if(!input||typeof input!=='object')publicError('Ficha inválida.');
  const result={};
  Object.keys(LIMITS).forEach(k=>{result[k]=String(input[k]??'').trim();if(result[k].length>LIMITS[k])publicError('Um campo excede o tamanho permitido.');});
  result.cpf=result.cpf.toUpperCase().replace(/[.\/\s-]/g,'');result.plate=result.plate.toUpperCase().replace(/[-\s]/g,'');
  result.chassis=result.chassis.toUpperCase();result.engine=result.engine.toUpperCase();
  result.client=normalName_(result.client);result.value=result.value.toUpperCase();
  if(!result.client||!result.model)publicError('Nome e modelo são obrigatórios.');
  if(!validCpf_(result.cpf)&&!validCnpj_(result.cpf))publicError('Informe um CPF ou CNPJ válido.');
  if(!/^[A-Z]{3}\d[A-Z0-9]\d{2}$/.test(result.plate))publicError('Informe uma placa válida.');
  if(result.value&&!/^(?:\d{1,30}|REQ)$/.test(result.value))publicError('Informe um número ou REQ.');
  if(result.date){
    const parsed=new Date(result.date+'T12:00:00Z');
    if(!/^\d{4}-\d{2}-\d{2}$/.test(result.date)||!Number.isFinite(parsed.valueOf())||parsed.toISOString().slice(0,10)!==result.date)publicError('Informe uma data válida.');
  }
  result.id=String(input.id||'');
  if(!/^[a-zA-Z0-9-]{8,64}$/.test(result.id))publicError('Identificador de ficha inválido.');
  return result;
}
function write_(sheet,rowNumber,row) {
  if(rowNumber>sheet.getMaxRows())sheet.insertRowsAfter(sheet.getMaxRows(),100);
  // Explicit stringValue prevents spreadsheet formulas and preserves CPF/identifiers with leading zeros.
  Sheets.Spreadsheets.batchUpdate({requests:[{updateCells:{range:{sheetId:sheet.getSheetId(),startRowIndex:rowNumber-1,endRowIndex:rowNumber,startColumnIndex:0,endColumnIndex:KEYS.length},rows:[{values:row.map(value=>({userEnteredValue:{stringValue:String(value)}}))}],fields:'userEnteredValue'}}]},SPREADSHEET_ID);
}
function handle_(request) {
  const secret=PropertiesService.getScriptProperties().getProperty('ACCESS_TOKEN');
  if(!secret||secret.length<32||typeof request.token!=='string'||request.token!==secret)publicError('Chave de acesso inválida.');
  if(request.spreadsheetId!==SPREADSHEET_ID)publicError('Planilha de destino incorreta.');
  if(!['ping','list','save','remove','cash-save'].includes(request.action))publicError('Ação inválida.');
  const lock=LockService.getScriptLock();
  if(!lock.tryLock(20000))publicError('Outra ficha está sendo salva. Tente novamente.');
  try {
    const sheet=sheet_(),count=sheet.getLastRow()-1;
    if(count>10000)publicError('A planilha ultrapassou o limite de 10.000 registros desta versão.');
    if(request.action==='ping')return {};
    const rows=count>0?sheet.getRange(2,1,count,KEYS.length).getDisplayValues():[];
    if(request.action==='list')return {records:rows.filter(row=>row[17]&&row[19]!=='1').map(record_).reverse()};
    const id=request.action==='save'?String(request.record?.id||''):String(request.id||'');
    if(!/^[a-zA-Z0-9-]{8,64}$/.test(id))publicError('Identificador de ficha inválido.');
    const index=rows.findIndex(row=>row[17]===id),existing=index<0?null:record_(rows[index]);
    if(request.action==='cash-save'){
      if(!existing||existing.deleted==='1')publicError('A ficha não está mais disponível. Atualize o caixa.');
      const client=normalName_(request.cashClient),cents=String(request.cashCents??'').trim().toUpperCase();
      if(client.length>120)publicError('O cliente do caixa deve ter até 120 caracteres.');
      if(cents&&cents!=='REQ'&&!/^(?:0|[1-9]\d{0,8})$/.test(cents))publicError('Informe um valor válido, com no máximo duas casas decimais.');
      const payments=payments_(request.cashPayments??existing.cashPayments,cents,request.cashPayments!==undefined);
      if(existing.cashClient===client&&existing.cashCents===cents&&existing.cashPayments===payments)return {record:existing};
      if(request.revision!==existing.revision)publicError('Esta ficha mudou. Atualize o caixa antes de salvar. Seus campos continuam disponíveis.');
      existing.cashClient=client;existing.cashCents=cents;existing.cashPayments=payments;existing.updatedAt=new Date().toISOString();
      const updated=KEYS.map(k=>existing[k]||'');write_(sheet,index+2,updated);return {record:record_(updated)};
    }
    if(request.action==='remove'){
      if(!existing||existing.deleted==='1')return {};
      if(request.revision!==existing.revision)publicError('Esta ficha mudou. Atualize as fichas antes de excluir.');
      const tombstone=KEYS.map(k=>k==='id'?id:k==='updatedAt'?new Date().toISOString():k==='deleted'?'1':'');
      write_(sheet,index+2,tombstone);return {};
    }
    const record=clean_(request.record);
    if(!existing&&count>=10000)publicError('A planilha atingiu o limite de 10.000 registros desta versão.');
    if(existing?.deleted==='1')publicError('Esta ficha já foi excluída. Crie uma nova ficha.');
    if(!existing&&request.record.revision)publicError('A ficha original não está mais na planilha. Atualize as fichas.');
    record.date=record.date||existing?.date||Utilities.formatDate(new Date(),'America/Sao_Paulo','yyyy-MM-dd');
    record.cashClient=existing?.cashClient||'';record.cashCents=existing?.cashCents||'';record.cashPayments=existing?.cashPayments||'';
    if(existing){
      const same=Object.keys(LIMITS).every(k=>record[k]===existing[k]);
      if(same)return {record:existing};
      if(request.record.revision!==existing.revision)publicError('Esta ficha mudou em outro lugar. Guarde suas alterações, descarte o rascunho e atualize as fichas antes de editar novamente.');
    }
    record.updatedAt=new Date().toISOString();record.deleted='';
    const row=KEYS.map(k=>record[k]||'');
    write_(sheet,index<0?count+2:index+2,row);
    return {record:record_(row)};
  }finally{lock.releaseLock();}
}
function normalName_(value){return String(value??'').normalize('NFC').trim().replace(/\s+/g,' ').toLocaleUpperCase('pt-BR');}
function doPost(e) {
  let response;
  try{
    if(!e?.postData?.contents||e.postData.contents.length>25000)publicError('Pedido inválido ou muito grande.');
    const result=handle_(JSON.parse(e.postData.contents));
    response={ok:true,spreadsheetId:SPREADSHEET_ID,...result};
  }catch(error){
    const permission=/caller does not have permission|permission denied|storage quota|insufficient.*storage/i.test(String(error.message||error));
    response={ok:false,error:error.publicMessage||(permission?'O Google bloqueou a gravação. Verifique o espaço da conta proprietária e a permissão de edição da planilha. O rascunho foi mantido.':'Não foi possível acessar a planilha. Tente novamente. O rascunho foi mantido.')};
  }
  return ContentService.createTextOutput(JSON.stringify(response)).setMimeType(ContentService.MimeType.JSON);
}


  function validCnpj_(value){
    const v=String(value).toUpperCase().replace(/[.\/\s-]/g,'');
    if(!/^[A-Z0-9]{12}\d{2}$/.test(v)||/^(.)\1{13}$/.test(v))return false;
    for(let size=12;size<=13;size++){
      let sum=0,weight=size-7;
      for(let i=0;i<size;i++){sum+=(v.charCodeAt(i)-48)*weight;if(--weight<2)weight=9;}
      const rest=sum%11;if(Number(v[size])!==(rest<2?0:11-rest))return false;
    }return true;
  }

function payments_(raw,cents,required){
  let data;try{data=typeof raw==='string'?JSON.parse(raw||'{}'):(raw||{});}catch{publicError('Métodos de pagamento inválidos.');}
  if(!data||Array.isArray(data)||typeof data!=='object')publicError('Métodos de pagamento inválidos.');
  const allowed=['dinheiro','pix','debito','credito','transferencia','boleto','cheque','carteira','outros'],keys=Object.keys(data);
  if(keys.some(k=>!allowed.includes(k)))publicError('Método de pagamento inválido.');
  if(cents===''||cents==='REQ'){if(keys.length)publicError('REQ ou valor em branco não deve ter pagamento.');return '';}
  let total=0;const result={};for(const key of allowed){if(!keys.includes(key))continue;const value=String(data[key]);if(!/^(?:0|[1-9]\d{0,8})$/.test(value))publicError('Valor de pagamento inválido.');total+=Number(value);result[key]=value;}
  if(!keys.length){if(required)publicError('Selecione um método de pagamento.');return '';}
  if(total!==Number(cents))publicError('A soma dos pagamentos deve ser igual ao valor da vistoria.');
  return JSON.stringify(result);
}
