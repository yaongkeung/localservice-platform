import {matchesTownship} from './township-groups.js';
import {descendantServiceIds} from './services.js';

export const boardPageSize=20;
export function regionPostIds(region,regions){
 return regions.filter(child=>child.id===region.id||child.slug.startsWith(region.slug+'/')||region.group_key&&matchesTownship(child.group_key||child.admin_code,region.group_key)).map(child=>child.id);
}
// Consolidate only collections containing exactly the same public articles.
// Keep region and service intent separate; never canonicalize an article to a list.
export function collectionIndex(data){
 const result=new Map();
 for(const [kind,rows] of [['region',data.regions],['service',data.services]]){
  const groups=new Map();
  for(const row of rows){
   const ids=kind==='region'?regionPostIds(row,data.regions):descendantServiceIds(row,data.services);
   const posts=data.published.filter(post=>ids.includes(kind==='region'?post.region_id:post.service_id));
   const path=`/${kind}/${row.slug}/`,key=posts.map(post=>post.id).sort((a,b)=>a-b).join(',');
   const item={path,posts,canonical:path};result.set(path,item);
   if(!posts.length)continue;
   if(!groups.has(key))groups.set(key,[]);groups.get(key).push({item,row});
  }
  for(const group of groups.values()){
   const depth=row=>kind==='region'?row.slug.split('/').length:Number(row.level)||serviceDepth(row,rows);
   // The most specific populated board is the useful entry point when a parent
   // currently adds no articles. A different set of articles always keeps its URL.
   group.sort((a,b)=>depth(b.row)-depth(a.row)||a.item.path.localeCompare(b.item.path));
   for(const {item} of group)item.canonical=group[0].item.path;
  }
 }
 return result;
}
function serviceDepth(row,rows){let depth=1;const seen=new Set([row.id]);while(row.parent_id){row=rows.find(parent=>parent.id===row.parent_id);if(!row||seen.has(row.id))break;seen.add(row.id);depth++;}return depth;}

export function homeIndex(url,total){
 const filtered=[...url.searchParams.keys()].some(key=>key!=='page');
 const pages=Math.max(1,Math.ceil(total/boardPageSize));
 const raw=url.searchParams.get('page'),valid=/^\d+$/.test(raw||'')&&Number(raw)>0;
 const page=valid?Math.min(pages,Number(raw)):1,path=page===1?'/':`/?page=${page}`;
 return {page,path,noindex:filtered,redirect:!filtered&&url.search!==new URL(path,url).search?path:null};
}
