// Local-only server; never uploaded to Vercel.
const http=require('node:http'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
process.env.SESSION_SECRET ||= crypto.randomBytes(32).toString('hex');
const handler=require('./api/fichas');
const files={'/cash.js':'cash.js','/cash-data.js':'cash-data.js','/':'index.html','/index.html':'index.html','/app.js':'app.js','/parser.js':'parser.js','/catalog-data.js':'catalog-data.js','/catalog.js':'catalog.js','/analysis.js':'analysis.js','/dashboard.js':'dashboard.js','/style.css':'style.css','/theme.css':'theme.css','/supervisao-simbolo.png':'supervisao-simbolo.png','/fichario-vermelho.svg':'fichario-vermelho.svg','/unidade-logo.jpg':'unidade-logo.jpg'};
http.createServer(async(req,res)=>{
  const route=new URL(req.url,'http://localhost').pathname;
  if(route==='/api/fichas'){try{await handler(req,res);}catch{res.writeHead(500);res.end('Erro interno.');}return;}
  if(!files[route]){res.writeHead(404);res.end();return;}
  res.setHeader('Content-Type',files[route].endsWith('.png')?'image/png':files[route].endsWith('.svg')?'image/svg+xml':files[route].endsWith('.jpg')?'image/jpeg':files[route].endsWith('.js')?'text/javascript; charset=utf-8':files[route].endsWith('.css')?'text/css; charset=utf-8':'text/html; charset=utf-8');
  res.setHeader('Cache-Control','no-store');res.end(fs.readFileSync(path.join(__dirname,'public',files[route])));
}).listen(Number(process.env.PORT)||4176,'127.0.0.1',()=>console.log('SuperVisão web: http://127.0.0.1:4176'));

