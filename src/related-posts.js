// Every candidate comes from the same permission-filtered public dataset as the
// article. Newer relevant articles get links instead of repeatedly linking the
// first three database rows for a company.
export function relatedPosts(post,posts,limit=3){
 const score=item=>Number(item.company_id===post.company_id)*4+Number(item.service_id===post.service_id)*2+Number(item.region_id===post.region_id);
 return posts.filter(item=>item.id!==post.id&&(!item.status||item.status==='PUBLISHED')&&score(item)>0)
  .sort((a,b)=>score(b)-score(a)||String(b.published_at||'').localeCompare(String(a.published_at||''))||b.id-a.id).slice(0,limit);
}
