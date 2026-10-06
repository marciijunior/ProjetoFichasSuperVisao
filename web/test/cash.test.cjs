const {test}=require('node:test'),assert=require('node:assert/strict'),D=require('../public/cash-data');
test('centavos exatos, REQ sem valor e métodos agrupados',()=>{
 assert.equal(D.cents('80,50'),8050);assert.equal(D.cents('1.200,50'),120050);assert.equal(D.cents(''),null);assert.equal(D.cents('0'),0);assert.ok(Number.isNaN(D.cents('-1')));assert.ok(Number.isNaN(D.cents('1,234')));
 const s=D.summary([{cashClient:' ação ',amount:'80,10',value:'REQ',payments:{pix:''}},{cashClient:'AÇÃO',amount:'90,20',payments:{dinheiro:'40',credito:'50,20'}},{cashClient:'AÇÃO',amount:'REQ',payments:{}}]);
 assert.equal(s.total,17030);assert.equal(s.requests,1);assert.equal(s.pending,0);assert.equal(s.byMethod.pix,8010);assert.equal(s.byMethod.dinheiro,4000);assert.equal(s.byMethod.credito,5020);assert.equal(s.groups[0].client,'AÇÃO');assert.equal(s.groups[0].count,3);
});
test('pagamento único usa total; divisão inválida não infla totais',()=>{
 assert.equal(D.validate({amount:'80',payments:{pix:''}}),null);assert.deepEqual(D.paymentValues({amount:'80',payments:{pix:''}}),{pix:8000});
 assert.match(D.validate({amount:'80',payments:{pix:'50',dinheiro:'40'}}),/soma/);
 assert.match(D.validate({amount:'80',payments:{pix:'',dinheiro:'40'}}),/cada/);
 assert.match(D.validate({amount:'REQ',payments:{pix:'80'}}),/REQ/);
 assert.equal(D.validate({amount:'REQ',payments:{}}),null);
 const s=D.summary([{cashClient:'TESTE',amount:'80',payments:{pix:'50',dinheiro:'40'}}]);assert.equal(s.total,8000);assert.equal(s.unassigned,8000);assert.equal(s.byMethod.pix,0);assert.equal(s.byMethod.dinheiro,0);
 const old=D.summary([{cashClient:'TESTE',amount:'80',cashPayments:''}]);assert.equal(old.unassigned,8000);assert.equal(old.pending,1);
 assert.deepEqual(D.decode('{"pix":"8050"}'),{pix:'80,50'});
});
