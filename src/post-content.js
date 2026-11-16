const e=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function postContent(post,images=[]){
 const own=images.filter(i=>i.post_id===post.id&&!i.excluded).sort((a,b)=>a.sort_order-b.sort_order||a.id-b.id),used=new Set();
 const figure=image=>{used.add(image.id);return `<figure class="post-photo"><img src="${e(image.storage_key)}" alt="${e(image.alt_text)}" width="${image.width||960}" height="${image.height||640}" loading="lazy" decoding="async"><figcaption>${image.sample?(image.storage_key.startsWith('/media/')?'AI 생성 샘플 이미지 · 실제 현장 사진이 아닙니다.':'샘플 게시글에 등록한 사진입니다.'):e(image.alt_text)}</figcaption></figure>`;};
 const body=post.content.map(paragraph=>String(paragraph).split(/(\[사진:\d+\])/g).map(part=>{
  const marker=part.match(/^\[사진:(\d+)\]$/);if(marker){const image=own.find(i=>i.id===Number(marker[1]));return image&&!used.has(image.id)?figure(image):'';}
  return part.trim()?`<p>${e(part.trim()).replace(/\n/g,'<br>')}</p>`:'';
 }).join('')).join('');
 return body+own.filter(i=>!used.has(i.id)).map(figure).join('');
}
