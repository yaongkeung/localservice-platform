import http from 'node:http';
import worker from '../src/worker.js';
import {localAssets} from './local-assets.mjs';
import {existsSync} from 'node:fs';
if(existsSync('.dev.vars')) process.loadEnvFile('.dev.vars');
const env={NAVER_MAP_CLIENT_ID:process.env.NAVER_MAP_CLIENT_ID,ASSETS:localAssets};
const server=http.createServer(async(req,res)=>{
  try {const response=await worker.fetch(new Request(`http://localhost:8787${req.url}`,{method:req.method}),env);res.writeHead(response.status,Object.fromEntries(response.headers));res.end(Buffer.from(await response.arrayBuffer()));}
  catch {res.writeHead(500);res.end('Server error');}
});
server.listen(8787,'127.0.0.1',()=>console.log('Preview: http://localhost:8787'));
