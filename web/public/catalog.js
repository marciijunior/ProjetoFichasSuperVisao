(function(root){
  'use strict';
  const snapshot=typeof module!=='undefined'?require('./catalog-data.js'):root.SuperVisaoCatalogData;
  const citiesByState=snapshot.citiesByState;
  // Base model names. Keep compound names intact when removing catalog trims.
  const vehicles={
    Chevrolet:['Onix','Onix Plus','Prisma','Celta','Corsa','Classic','Cruze','Spin','Tracker','S10','Montana','Meriva','Zafira','Astra','Vectra','Captiva','Equinox','Trailblazer'],
    Fiat:['Uno','Mille','Palio','Siena','Grand Siena','Argo','Cronos','Mobi','Strada','Toro','Pulse','Fastback','Doblo','Fiorino','Ducato','Idea','Punto','Linea','Bravo','Stilo'],
    Volkswagen:['Gol','Voyage','Fox','CrossFox','SpaceFox','Polo','Virtus','Nivus','T-Cross','Taos','Tiguan','Golf','Jetta','Passat','Saveiro','Amarok','Kombi','Fusca','Santana','Parati','up!'],
    Ford:['Ka','Fiesta','Focus','Fusion','EcoSport','Ranger','Maverick','Territory','Edge','F-250','Transit','Courier','Escort'],
    Toyota:['Corolla','Corolla Cross','Yaris','Etios','Hilux','SW4','RAV4','Prius'],
    Honda:['Civic','City','Fit','HR-V','WR-V','CR-V','Accord','CG 125','CG 150','CG 160','Biz','Pop 110i','Bros','PCX','XRE 300','CB 300F','CB 500','NXR 160 Bros'],
    Hyundai:['HB20','HB20S','HB20X','Creta','Tucson','ix35','Santa Fe','i30','Azera','HR'],
    Renault:['Kwid','Sandero','Logan','Duster','Oroch','Captur','Fluence','Clio','Scenic','Master','Kangoo','Megane'],
    Nissan:['Kicks','Versa','March','Sentra','Frontier','Livina','Tiida','Leaf'],
    Jeep:['Renegade','Compass','Commander','Wrangler','Grand Cherokee'],
    Peugeot:['206','207','208','2008','307','308','408','3008','Partner','Boxer'],
    Citroën:['C3','C3 Aircross','C4','C4 Cactus','C4 Lounge','Xsara Picasso','Berlingo','Jumper'],
    Mitsubishi:['Lancer','ASX','Outlander','Eclipse Cross','Pajero','Pajero TR4','L200'],
    Kia:['Picanto','Cerato','Soul','Sportage','Sorento','Bongo'],
    'CAOA Chery':['Tiggo 2','Tiggo 3X','Tiggo 5X','Tiggo 7','Tiggo 8','Arrizo 5','Arrizo 6'],
    BYD:['Dolphin','Dolphin Mini','Song Plus','Song Pro','Yuan Plus','Seal','King','Shark'],
    GWM:['Haval H6','Ora 03'],
    Suzuki:['Jimny','Grand Vitara','Vitara','SX4','Burgman','Yes','Intruder','V-Strom'],
    Yamaha:['Factor','Fazer','FZ15','FZ25','Lander','Crosser','XT 660R','NMAX','Neo','Fluo','MT-03','MT-07'],
    BMW:['320i','X1','X3','X5','G 310 GS','F 850 GS','R 1250 GS'],
    'Mercedes-Benz':['Classe A','Classe C','Classe E','GLA','GLC','Sprinter','Accelo','Atego','Actros'],
    Audi:['A3','A4','A5','Q3','Q5','Q7'],
    Volvo:['XC40','XC60','XC90','S60','FH','FM','VM'],
    'Land Rover':['Discovery','Discovery Sport','Range Rover Evoque','Defender'],
    Iveco:['Daily','Tector','S-Way'],Scania:['P 310','P 360','R 450','R 540'],
    'Harley-Davidson':['Iron 883','Sportster','Fat Boy','Road King'],
    Kawasaki:['Ninja 400','Ninja 650','Z400','Z650','Versys 650'],
    'Royal Enfield':['Himalayan','Meteor 350','Classic 350','Interceptor 650'],
    Shineray:['XY 50','Jet 50','Jet 125']
  };
  const fuels=['Gasolina','Álcool','Gasolina / Álcool','Diesel','GNV','Elétrico','Híbrido'];
  const colors=['Branco','Preto','Prata','Cinza','Vermelho','Azul','Verde','Amarelo','Bege','Marrom','Laranja','Dourado','Roxo','Rosa','Fantasia'];
  const key=v=>String(v??'').trim().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\s+/g,' ').toUpperCase();
  const compoundModels={
    Ford:['Bronco Sport','Club Wagon','Crown Victoria','Del Rey'],
    Chevrolet:['Bolt EUV','Bolt EV'],Toyota:['GR Yaris','GR Corolla','Land Cruiser'],
    Volkswagen:['New Beetle','Grand Saveiro'],Hyundai:['Grand Santa Fe'],
    'Citroën':['Grand C4 Picasso','C4 Picasso'],
    BYD:['Atto 8','Sealion 7','Yuan Pro'],GWM:['Haval H9','Ora 05','Poer P30','Tank 300','Wey 07'],
    'Land Rover':['Range Rover','Range Rover Sport','Range Rover Velar'],
    Chrysler:['300 C','300 M','Grand Caravan','Le Baron','PT Cruiser','Town & Country'],
    Daewoo:['Super Salon'],Daihatsu:['Gran Move'],Kia:['Grand Carnival'],
    GAC:['Aion ES','Aion UT','Aion V','Aion Y','Hyptec HT'],
    CHANGAN:['Mini Star'],JAC:['iEV 20','iEV 330P','iEV 350T','iEV 40','iEV 750V','T 140'],
    Lexus:['GS 300','LS 400','LS 430','LS 460','LS 500h','RX 300','SC 400'],
    Maserati:['Gran Turismo'],Mazda:['RX 7'],Mitsubishi:['3000 GT'],
    Plymouth:['Gran Voyager'],Porsche:['718 Boxster','718 Cayman','718 Spyder'],
    Rover:['Mini Cooper'],SERES:['Seres 3','Seres 5'],Suzuki:['Super Carry'],
    Volvo:['ES 90'],'CAOA Chery':['Arrizo 5e'],MINI:['Cooper Countryman','Cooper Clubman'],
    FOTON:['Tunland V7','Tunland V9','eView Connect','eView Grand']
  };
  const modelNames=Object.fromEntries(Object.entries(vehicles).map(([brand,names])=>[brand,[...names,...(compoundModels[brand]||[])]]));
  for(const [brand,names]of Object.entries(compoundModels))modelNames[brand]||=[...names];
  const modelAliases={};
  function namedModel(value,brand){
    const k=key(value);
    return (modelNames[brand]||[]).filter(name=>k===key(name)||k.startsWith(key(name)+' ')||k.startsWith(key(name)+'/')).sort((a,b)=>b.length-a.length)[0];
  }
  function baseModel(value,brand){
    if(brand==='Toyota'&&/^Hilux SW4\b/i.test(value))return 'SW4';
    if(brand==='Land Rover'&&/^New Range/i.test(value))return 'Range Rover';
    if(brand==='Land Rover'&&/^Range\.R\./i.test(value))return 'Range Rover Sport';
    const known=namedModel(value,brand);if(known)return known;
    if(brand==='Toyota'&&/^BAND\./i.test(value))return 'Bandeirante';
    if(brand==='Land Rover'){
      if(/^Def\w*\./i.test(value))return 'Defender';
      if(/^Disc\w*\.(?:\s*)(?:Sp\.|Sport)/i.test(value))return 'Discovery Sport';
      if(/^Disc\w*\./i.test(value))return 'Discovery';
      if(/^Range R\./i.test(value))return /Evoque/i.test(value)?'Range Rover Evoque':/Velar/i.test(value)?'Range Rover Velar':/Sport/i.test(value)?'Range Rover Sport':'Range Rover';
    }
    // The catalog starts with the model identifier; remaining words are trim/specs.
    return String(value).trim().split(/[\s/(]/)[0].replace(/[.,]+$/,'');
  }
  const cityLookup=new Map(Object.values(citiesByState).flat().map(v=>[key(v),v]));
  const cityKeys=Object.fromEntries(Object.entries(citiesByState).map(([uf,cities])=>[uf,new Set(cities.map(key))]));
  const aliases={brand:{VW:'Volkswagen',VOLKS:'Volkswagen',GM:'Chevrolet','GENERAL MOTORS':'Chevrolet','KIA MOTORS':'Kia',CHERY:'CAOA Chery',MERCEDES:'Mercedes-Benz','MERCEDES BENZ':'Mercedes-Benz'},fuel:{FLEX:'Gasolina / Álcool','ALCOOL / GASOLINA':'Gasolina / Álcool','GASOLINA/ALCOOL':'Gasolina / Álcool','GASOLINA / ETANOL':'Gasolina / Álcool',ETANOL:'Álcool'},color:{BRANCA:'Branco',PRETA:'Preto',VERMELHA:'Vermelho',AMARELA:'Amarelo',DOURADA:'Dourado'}};
  function canonical(field,value,brand=''){
    const clean=String(value??'').trim().replace(/\s+/g,' '),k=key(clean);
    if(!k)return '';
    if(field==='city')return cityLookup.get(k)||clean;
    if(aliases[field]?.[k])return aliases[field][k];
    if(field==='model'){
      const b=canonical('brand',brand);
      const match=modelAliases[b]?.get(k)||namedModel(clean,b);
      if(match)return match;
      if(!b){const matches=unique(Object.keys(modelAliases).map(name=>modelAliases[name].get(k)||namedModel(clean,name)));if(matches.length===1)return matches[0];}
    }
    const choices=field==='brand'?Object.keys(vehicles):field==='fuel'?fuels:field==='color'?colors:field==='city'?Object.values(citiesByState).flat():field==='model'?(vehicles[canonical('brand',brand)]||Object.values(vehicles).flat()):[];
    return choices.find(v=>key(v)===k)||clean;
  }
  function unique(values){const seen=new Map();values.filter(Boolean).forEach(v=>{const k=key(v);if(!seen.has(k))seen.set(k,v);});return [...seen.values()].sort((a,b)=>a.localeCompare(b,'pt-BR',{numeric:true}));}
  for(const [brand,models]of Object.entries(snapshot.vehicles)){
    const name=canonical('brand',brand);modelAliases[name]||=new Map();
    const simple=models.map(model=>{const base=baseModel(model,name);modelAliases[name].set(key(model),base);return base;});
    vehicles[name]=unique([...(vehicles[name]||[]),...simple]);
  }
  for(const [brand,models]of Object.entries(vehicles))modelNames[brand]=models;
  function cityInState(city,state){return cityKeys[key(state)]?.has(key(city))||false;}
  function suggestions(field,records,brand='',state=''){
    if(field==='city')return unique(state?(citiesByState[key(state)]||[]):Object.values(citiesByState).flat());
    const b=key(canonical('brand',brand));
    let base=field==='brand'?Object.keys(vehicles):field==='model'?(brand?(vehicles[canonical('brand',brand)]||[]):Object.values(vehicles).flat()):field==='fuel'?fuels:field==='color'?colors:[];
    const history=records.filter(r=>(field!=='model'||!b||key(canonical('brand',r.brand))===b)&&(field!=='city'||!state||key(r.state)===key(state))).map(r=>canonical(field,r[field],r.brand));
    return unique([...base,...history]);
  }
  function install(form,getRecords,onChange){
    const fields=['brand','model','fuel','color','city','power'];
    function update(){for(const field of fields){const input=form.elements.namedItem(field),id='suggest-'+field;let list=document.getElementById(id);if(!list){list=document.createElement('datalist');list.id=id;form.append(list);}input.setAttribute('list',id);input.setAttribute('autocomplete','off');list.replaceChildren();suggestions(field,getRecords(),form.elements.brand.value,form.elements.state.value).forEach(value=>{const o=document.createElement('option');o.value=value;list.append(o);});}}
    for(const field of fields){form.elements.namedItem(field).addEventListener('change',()=>{const input=form.elements.namedItem(field);input.value=canonical(field,input.value,form.elements.brand.value);if(field==='model'&&!form.elements.brand.value){const matches=Object.entries(vehicles).filter(([,models])=>models.some(m=>key(m)===key(input.value)));if(matches.length===1)form.elements.brand.value=matches[0][0];}update();onChange();});}
    form.elements.city.addEventListener('change',()=>{if(!form.elements.state.value){const matches=Object.entries(citiesByState).filter(([,cities])=>cities.some(c=>key(c)===key(form.elements.city.value)));if(matches.length===1)form.elements.state.value=matches[0][0];}update();onChange();});
    form.elements.brand.addEventListener('input',update);form.elements.state.addEventListener('change',update);update();return {update};
  }
  const api={vehicles,fuels,colors,citiesByState,cityInState,key,canonical,unique,suggestions,install};
  if(typeof module!=='undefined')module.exports=api;else root.VehicleCatalog=api;
})(typeof window!=='undefined'?window:globalThis);
