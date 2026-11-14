import {readFile} from 'node:fs/promises';
export const localMedia={async fetch(request){
  const name=new URL(request.url).pathname.slice('/media/'.length);
  if(!/^[a-z0-9-]+\.jpg$/.test(name))return new Response('Not found',{status:404});
  try{
    const bytes=await readFile(new URL('../public/media/'+name,import.meta.url));
    return new Response(request.method==='HEAD'?null:bytes,{headers:{'content-type':'image/jpeg','cache-control':'public, max-age=86400','x-content-type-options':'nosniff'}});
  }catch(error){if(error.code==='ENOENT')return new Response('Not found',{status:404});throw error;}
}};
