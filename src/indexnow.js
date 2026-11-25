import {siteOrigin} from './seo.js';
import {seoulDate} from './photos.js';
const endpoint='https://searchadvisor.naver.com/indexnow';
export const indexNowKey=env=>env.APP_ENV==='production'&&env.SEARCH_INDEXING==='enabled'&&/^[a-f0-9-]{8,128}$/i.test(env.INDEXNOW_KEY||'')?env.INDEXNOW_KEY:'';
export function indexNowProof(request,env){
 const key=indexNowKey(env),url=new URL(request.url);
 if(!key||url.origin!==siteOrigin||url.pathname!==`/${key}.txt`||url.search)return null;
 return new Response(request.method==='HEAD'?null:key,{headers:{'content-type':'text/plain; charset=utf-8','cache-control':'public, max-age=300','x-content-type-options':'nosniff','x-robots-tag':'noindex'}});
}
export async function notifyIndexNow(env,paths,fetcher=fetch){
 const key=indexNowKey(env);if(!key)return {state:'disabled'};
 const urlList=[...new Set(paths.map(path=>{try{const url=new URL(path,siteOrigin);return url.origin===siteOrigin&&!url.search&&!url.hash&&(url.pathname==='/'||url.pathname==='/about/'||/^\/[^/]+\/[^/]+\/[^/]+\/[^/]+\.html$/.test(url.pathname))?url.href:null;}catch{return null;}}).filter(Boolean))];
 if(!urlList.length||urlList.length>10000)return {state:'skipped'};
 try{
  const response=await fetcher(endpoint,{method:'POST',headers:{'content-type':'application/json; charset=utf-8'},body:JSON.stringify({host:new URL(siteOrigin).host,key,keyLocation:`${siteOrigin}/${key}.txt`,urlList}),signal:AbortSignal.timeout(5000),redirect:'error'});
  return {state:response.status===200?'accepted':response.status===202?'verification_pending':'rejected',status:response.status,count:urlList.length};
 }catch{return {state:'unavailable',count:urlList.length};}
}
export function scheduleIndexNow(ctx,env,db,postId){
 if(!ctx?.waitUntil||!indexNowKey(env))return;
 // Recheck the same public eligibility in the background; notification failures
 // must never turn an already committed publication into an editor error.
 const task=Promise.resolve().then(()=>db.prepare("SELECT u.path FROM post_urls u JOIN posts p ON p.id=u.post_id JOIN companies c ON c.id=p.company_id WHERE p.id=? AND p.status='PUBLISHED' AND p.sample=0 AND p.published_at<=? AND c.status='ACTIVE' AND c.sample=0").bind(postId,seoulDate()).first()).then(row=>row?notifyIndexNow(env,[row.path]):{state:'skipped'}).then(result=>{console.log('IndexNow notification',result.state,result.status||0,result.count||0);}).catch(()=>{console.log('IndexNow notification unavailable');});
 ctx.waitUntil(task);
}
