import {css} from './styles.js';
let hash=2166136261;for(let i=0;i<css.length;i++)hash=Math.imul(hash^css.charCodeAt(i),16777619);
const version=(hash>>>0).toString(16);
export const publicStylePath='/assets/public.css?v='+version;
export function publicStyleResponse(request){
 const fresh=new URL(request.url).searchParams.get('v')===version;
 return new Response(request.method==='HEAD'?null:css,{headers:{'content-type':'text/css; charset=utf-8','cache-control':fresh?'public, max-age=31536000, immutable':'no-cache','x-content-type-options':'nosniff'}});
}
