import http from 'node:http';
import worker from '../src/worker.js';
import {localMedia} from './local-media.mjs';
const server=http.createServer(async(req,res)=>{
  try {const response=await worker.fetch(new Request(`http://localhost:8787${req.url}`,{method:req.method}),{ASSETS:localMedia});res.writeHead(response.status,Object.fromEntries(response.headers));res.end(Buffer.from(await response.arrayBuffer()));}
  catch {res.writeHead(500);res.end('Server error');}
});
server.listen(8787,'127.0.0.1',()=>console.log('Preview: http://localhost:8787'));
