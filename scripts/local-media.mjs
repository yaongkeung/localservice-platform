import {readFile} from 'node:fs/promises';
export const localMedia={async fetch(request){
  const name=new URL(request.url).pathname.slice('/media/'.length);
  if(!/^[a-z0-9-]+\.(?:jpg|png|woff2)$/.test(name)&&name!=='pretendard-ofl.txt')return new Response('Not found',{status:404});
  try{
    const bytes=await readFile(new URL('../public/media/'+name,import.meta.url));
    const type=name.endsWith('.woff2')?'font/woff2':name.endsWith('.txt')?'text/plain; charset=utf-8':name.endsWith('.png')?'image/png':'image/jpeg';
    return new Response(request.method==='HEAD'?null:bytes,{headers:{'content-type':type,'cache-control':'public, max-age=86400','x-content-type-options':'nosniff'}});
  }catch(error){if(error.code==='ENOENT')return new Response('Not found',{status:404});throw error;}
}};
