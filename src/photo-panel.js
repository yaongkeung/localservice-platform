import {csrf,e} from './admin-ui.js';
export function photoPanel(user,post,images=[],aiAvailable=false){
 if(!post.id)return '<p class="cms-help">다음 단계에서 사진을 첨부하면 본문이 자동으로 완성됩니다.</p>';
 const writable=post.status==='DRAFT',active=images.filter(image=>!image.excluded).sort((a,b)=>a.sort_order-b.sort_order||a.id-b.id),representative=active[0]?.id;
 const action=(image,op,label)=>`<form method="post" action="/admin/posts/${post.id}/photos/">${csrf(user)}<input type="hidden" name="version" value="${post.version}"><input type="hidden" name="image_id" value="${image.id}"><button class="secondary" name="action" value="${op}">${label}</button></form>`;
 const tiles=items=>items.map(image=>`<article><img src="${e(image.thumbnail_key||image.storage_key)}" alt="${e(image.alt_text)}" width="240" height="160" style="width:100%;height:130px;object-fit:cover;border-radius:8px"><p>${image.excluded?'제외됨':image.id===representative?'⭐ 대표 사진':'사진'} · ${e(image.alt_text)}</p>${writable?`<div class="cms-actions">${image.excluded?action(image,'restore','복원'):action(image,'representative','대표로')+action(image,'exclude','사진 제외')}</div>`:''}</article>`).join('');
 const generator=aiAvailable?` data-generate-url="/admin/posts/${post.id}/generate/" data-existing-photos="${active.length}"`:'';
 return `<section class="panel" id="post-photos" style="margin:24px 0"><h2>📸 사진 첨부</h2><p>사진을 등록하면 사진 설명과 본문을 자동으로 작성합니다.</p>
 ${writable?`<form method="post" action="/admin/posts/${post.id}/photos/" enctype="multipart/form-data" data-photo-upload${generator}>
  ${csrf(user)}<input type="hidden" name="version" value="${post.version}"><label>사진 선택<input type="file" name="photo" accept="image/jpeg,image/png" multiple ${active.length&&aiAvailable?'':'required'}></label>
  <p class="cms-help">JPG·PNG, 장당 20MB 이하 · 최대 8장. 다른 글에 사용한 사진은 업체명·전화번호·업무를 넣은 홍보 사진으로 자동 편집합니다. 같은 글에서 중복 선택한 사진은 한 장만 등록합니다.${active.length?' 등록된 사진 '+active.length+'장이 있습니다. 사진을 추가하지 않으면 이 사진으로 작성합니다.':''}</p>
  <button>${aiAvailable?'사진으로 포스팅 자동 완성':'사진 등록'}</button>${aiAvailable?`<button type="submit" class="secondary" data-use-existing-photos="1" ${active.length?'':'hidden'}>등록된 사진 ${active.length}장으로 글 작성</button><p class="cms-help">사진 선택은 기존 사진에 추가하는 기능입니다. 저장된 사진으로 다시 작성할 때는 ‘등록된 사진으로 글 작성’을 누르세요. 선택한 새 파일은 추가하지 않습니다.</p>`:''}<p role="status" aria-live="polite" class="cms-help"></p>
 </form>`:''}
 ${!aiAvailable&&writable?'<p class="cms-help">자동 작성 연결을 준비 중입니다. 사진은 저장할 수 있습니다.</p>':''}
 ${images.length?`<details><summary>등록한 사진 ${active.length}장 보기·관리</summary><div class="cms-photos">${tiles(active)}</div>${images.some(image=>image.excluded)?`<details><summary>제외한 사진 보기</summary><div class="cms-photos">${tiles(images.filter(image=>image.excluded))}</div></details>`:''}</details>`:''}
 </section>`;
}
