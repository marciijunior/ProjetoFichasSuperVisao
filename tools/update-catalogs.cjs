// Public catalog snapshot. No client records, prices or access keys are transmitted.
const fs=require('node:fs'),path=require('node:path');
const dir=path.resolve(__dirname,'../tmp/catalogos');fs.mkdirSync(dir,{recursive:true});
async function get(url,file){
 const target=path.join(dir,file);if(fs.existsSync(target))return JSON.parse(fs.readFileSync(target));
 const response=await fetch(url,{signal:AbortSignal.timeout(30000)});
 if(!response.ok)throw Error('Catálogo indisponível: HTTP '+response.status);
 const data=await response.json();fs.writeFileSync(target,JSON.stringify(data));return data;
}
(async()=>{
 const cities=await get('https://servicodados.ibge.gov.br/api/v1/localidades/municipios','municipios.json');
 const brands=await get('https://parallelum.com.br/fipe/api/v1/carros/marcas','marcas.json');
 const rename={'GM - Chevrolet':'Chevrolet','VW - VolksWagen':'Volkswagen','Caoa Chery':'CAOA Chery','Caoa Chery/Chery':'CAOA Chery','Citroën':'Citroën','Citroen':'Citroën','Mercedes-Benz':'Mercedes-Benz','Land Rover':'Land Rover'};
 const vehicles={},citiesByState={};
 for(const city of cities){const uf=city['regiao-imediata']?.['regiao-intermediaria']?.UF?.sigla||city.microrregiao?.mesorregiao?.UF?.sigla;if(!uf)throw Error('Município sem UF: '+city.id);(citiesByState[uf]||=[]).push(city.nome);}
 let index=0;async function worker(){while(index<brands.length){const brand=brands[index++];const data=await get('https://parallelum.com.br/fipe/api/v1/carros/marcas/'+encodeURIComponent(brand.codigo)+'/modelos','modelos-'+brand.codigo+'.json');if(!Array.isArray(data.modelos))throw Error('Modelos inválidos');const name=rename[brand.nome]||brand.nome;vehicles[name]=[...(vehicles[name]||[]),...data.modelos.map(x=>x.nome.trim()).filter(x=>x&&x.length<=100)];}}
 await Promise.all([worker(),worker(),worker()]);
 for(const values of Object.values(citiesByState))values.sort((a,b)=>a.localeCompare(b,'pt-BR'));
 const result={updatedAt:new Date().toISOString(),sources:{cities:'https://servicodados.ibge.gov.br/api/v1/localidades/municipios',vehicles:'https://deividfortuna.github.io/fipe/'},citiesByState,vehicles};
 if(Object.keys(citiesByState).length!==27||cities.length<5500)throw Error('Catálogo de municípios incompleto');
 const source='// Public catalog snapshot. See web/README.md for sources.\n(function(root){const data='+JSON.stringify(result)+';if(typeof module!=="undefined")module.exports=data;else root.SuperVisaoCatalogData=data;})(typeof window!=="undefined"?window:globalThis);\n';
 fs.writeFileSync(path.resolve(__dirname,'../web/public/catalog-data.js'),source);
 console.log(JSON.stringify({states:Object.keys(citiesByState).length,cities:cities.length,carBrands:Object.keys(vehicles).length,models:Object.values(vehicles).reduce((n,a)=>n+a.length,0)}));
})().catch(e=>{console.error(e.message);process.exitCode=1;});
