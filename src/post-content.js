import {searchDescription} from './search-metadata.js';
const e=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function photoAlt(post,image){
 const content=post?.content||[],at=content.findIndex(part=>String(part).trim()==='[사진:'+image.id+']'),before=at>0?String(content[at-1]).trim():'';
 // The editable paragraph beside the photograph is the reviewed description.
 // Keep stored captions for legacy/unplaced photos, without changing their data.
 return before&&!/^## |\[사진:/.test(before)?searchDescription(before,160):image.alt_text;
}
function describedBesidePhoto(post,image){
 const at=(post.content||[]).findIndex(part=>String(part).trim()==='[사진:'+image.id+']');
 return at>0&&!!String(post.content[at-1]).trim()&&!/^## |\[사진:/.test(String(post.content[at-1]).trim());
}
export function inlineText(value){
 return String(value).split(/(\[[^\]\n]{1,100}\]\(https:\/\/[^\s)]{1,500}\))/g).map(part=>{
  const link=part.match(/^\[([^\]\n]+)\]\((https:\/\/[^\s)]+)\)$/);
  if(link){try{const url=new URL(link[2]);if(!url.username&&!url.password)return `<a href="${e(url.href)}" target="_blank" rel="noopener noreferrer ugc nofollow">${e(link[1])}</a>`;}catch{/* Render invalid links as text. */}}
  return e(part).replace(/\*\*([^*\n]{1,160})\*\*/g,'<strong>$1</strong>').replace(/\*\*/g,'').replace(/\n/g,'<br>');
 }).join('');
}
export const contentTextKey=value=>String(value||'').normalize('NFKC').replace(/[*#`]/g,'').replace(/\s+/g,'').trim();
export function postContent(post,images=[],{shownText=new Set()}={}){
 const own=images.filter(i=>i.post_id===post.id&&!i.excluded).sort((a,b)=>a.sort_order-b.sort_order||a.id-b.id),used=new Set();
 const figure=image=>{used.add(image.id);const alt=photoAlt(post,image),caption=image.sample?(image.storage_key.startsWith('/media/')?'AI 생성 샘플 이미지 · 실제 현장 사진이 아닙니다.':'샘플 게시글에 등록한 사진입니다.'):describedBesidePhoto(post,image)?'':alt;return `<figure class="post-photo"><img src="${e(image.storage_key)}" alt="${e(alt)}" width="${image.width||960}" height="${image.height||640}" loading="lazy" decoding="async">${caption?`<figcaption>${e(caption)}</figcaption>`:''}</figure>`;};
 const body=post.content.map(paragraph=>String(paragraph).split(/(\[사진:\d+\])/g).map(part=>{
  const marker=part.match(/^\[사진:(\d+)\]$/);if(marker){const image=own.find(i=>i.id===Number(marker[1]));return image&&!used.has(image.id)?figure(image):'';}
  const text=part.trim();if(!text)return '';
  if(!/^## /.test(text)){const key=contentTextKey(text);if(key.length>=24&&shownText.has(key))return '';if(key.length>=24)shownText.add(key);}
  return /^## [^\n]+$/.test(text)?`<h2>${inlineText(text.slice(3))}</h2>`:`<p>${inlineText(text)}</p>`;
 }).join('')).join('');
 return body+own.filter(i=>!used.has(i.id)).map(figure).join('');
}
