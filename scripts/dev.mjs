import http from 'node:http';
import worker from '../src/worker.js';
import {localMedia} from './local-media.mjs';
import {localDatabase} from './local-db.mjs';
const DB=await localDatabase();
const server=http.createServer(async(req,res)=>{
  if(!['localhost:8787','127.0.0.1:8787'].includes(req.headers.host)){res.writeHead(403);res.end('Invalid host');return;}
  try {
    const chunks=[];let length=0;for await(const chunk of req){length+=chunk.length;if(length>64000){res.writeHead(413);res.end('Request too large');return;}chunks.push(chunk);}
    const init={method:req.method,headers:req.headers};if(!['GET','HEAD'].includes(req.method))init.body=Buffer.concat(chunks);
    const response=await worker.fetch(new Request(`http://${req.headers.host}${req.url}`,init),{ASSETS:localMedia,DB});res.writeHead(response.status,Object.fromEntries(response.headers));res.end(Buffer.from(await response.arrayBuffer()));
  }
  catch {res.writeHead(500);res.end('Server error');}
});
server.listen(8787,'127.0.0.1',()=>console.log('Preview: http://localhost:8787'));
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>server.close(()=>{DB.close();process.exit(0);}));
