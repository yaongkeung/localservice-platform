const contentOf=post=>Array.isArray(post.content)?post.content:JSON.parse(post.content||'[]');
function shingles(post){
 let text=contentOf(post).join(' ').normalize('NFKC').toLowerCase();
 // Compare substance after removing the target labels, not only exact hashes.
 for(const label of [post.search_region,post.search_keyword])if(label)text=text.split(label.normalize('NFKC').toLowerCase()).join(' ');
 text=text.replace(/\[사진:\d+\]/g,'').replace(/https?:\/\/\S+/g,'').replace(/[^\p{L}\p{N}]/gu,'');
 const result=new Set();for(let i=0;i<=text.length-12;i++)result.add(text.slice(i,i+12));return result;
}
export function similarContent(post,others){
 const source=shingles(post);if(source.size<80)return [];
 return others.filter(other=>other.id!==post.id&&other.company_id===post.company_id).map(other=>{
  const target=shingles(other);let common=0;for(const value of source)if(target.has(value))common++;
  return {id:other.id,similarity:common/(source.size+target.size-common||1)};
 }).filter(item=>item.similarity>=0.82).sort((a,b)=>b.similarity-a.similarity);
}
