import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import * as mdi from '@mdi/js';

const html=readFileSync(new URL('../demo/current-weather.html',import.meta.url));
const bundlePath=new URL('../dist/niak-weather-card.js',import.meta.url);
const icons=JSON.stringify(mdi);
const server=createServer((req,res)=>{
  const path=new URL(req.url,'http://localhost').pathname;
  res.setHeader('Cache-Control','no-store');
  if(path==='/') {res.setHeader('Content-Type','text/html; charset=utf-8');res.end(html);}
  else if(path==='/card.js') {res.setHeader('Content-Type','text/javascript');res.end(readFileSync(bundlePath));}
  else if(path==='/icons.json') {res.setHeader('Content-Type','application/json');res.end(icons);}
  else {res.writeHead(404);res.end();}
});
const port=Number(process.argv[2] ?? 0);
if(!Number.isInteger(port) || port<0 || port>65535) throw new Error('Port invalide');
server.listen(port,'127.0.0.1',()=>console.log(`Aperçu Niak Weather : http://127.0.0.1:${server.address().port}`));
