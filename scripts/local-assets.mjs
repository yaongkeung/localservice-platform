import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const root=fileURLToPath(new URL('../public/',import.meta.url));
export const localAssets={async fetch(request){
  let file;
  try{file=path.resolve(root,'.'+decodeURIComponent(new URL(request.url).pathname));}catch{return new Response('Invalid asset path',{status:400});}
  if(!file.startsWith(root))return new Response('Not found',{status:404});
  try{
    const bytes=await readFile(file);
    return new Response(request.method==='HEAD'?null:bytes,{headers:{'content-type':file.endsWith('.json')?'application/json; charset=utf-8':'text/plain; charset=utf-8','cache-control':'public, max-age=3600','x-content-type-options':'nosniff'}});
  }catch(error){if(error.code==='ENOENT')return new Response('Not found',{status:404});throw error;}
}};
