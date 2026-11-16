import {page,csrf,e} from './admin-ui.js';
import {isAdmin} from './auth.js';
import {cmsRegionPicker} from './cms-regions.js';
import {photoPanel} from './uploads.js';
import {assistantPanel} from './draft-assistant.js';
import {postContent} from './post-content.js';
export function editPage(user,data,post={},message='',status=200){
 const editable=!post.id||post.status==='DRAFT',content=Array.isArray(post.content)?post.content.join('\n\n'):post.content;
 const labels={DRAFT:'초안',REVIEW:'검수 대기',APPROVED:'승인 완료',PUBLISHED:'공개 중'};
 const transition=(action,label)=>`<form method="post" action="/admin/posts/${post.id}/status/">${csrf(user)}<input type="hidden" name="version" value="${post.version}"><input type="hidden" name="action" value="${action}"><button ${action==='return'?'class="secondary"':''}>${label}</button></form>`;
 const fields=editable?`<form method="post" action="/admin/posts/${post.id?post.id+'/':'new/'}" data-simple-editor>
  ${csrf(user)}<input type="hidden" name="simple_editor" value="1"><input type="hidden" name="version" value="${post.version||0}">
  ${post.published_once?`<input type="hidden" name="company_id" value="${post.company_id}">`:''}
  <section class="panel cms-grid">
   <label class="full">업체<select name="company_id" required ${post.published_once?'disabled':''}><option value="">업체 선택</option>${data.companies.map(company=>`<option value="${company.id}" ${company.id===Number(post.company_id)?'selected':''}>${e(company.name)}</option>`).join('')}</select></label>
   ${cmsRegionPicker(post,data.regions)}
   <label>제목에 쓸 지역명<input name="search_region" value="${e(post.search_region)}" placeholder="예: 응암동" minlength="2" maxlength="40" required></label>
   <label>대표 업무 키워드<input name="search_keyword" value="${e(post.search_keyword)}" placeholder="예: 유리시공" minlength="2" maxlength="40" required></label>
   <label class="full">제목<input name="title" value="${e(post.title)}" minlength="5" maxlength="120" required><span class="cms-help">지역명과 업무 키워드를 입력하면 제목이 자동으로 완성됩니다. 필요한 문구는 수정할 수 있습니다.</span></label>
   <label class="full">본문<textarea name="content" minlength="50" maxlength="20000" required>${e(content)}</textarea><span class="cms-help">사진으로 작성한 내용을 확인하고 수정하세요.</span></label>
   ${post.generation_reviewed===0?'<label class="full"><input style="width:auto;display:inline" type="checkbox" name="generation_reviewed" value="1"> 사진과 내용이 맞는지 확인했습니다.</label>':''}
  </section><div class="cms-actions"><button>💾 저장</button>${post.id?`<a href="/admin/posts/${post.id}/preview/">미리보기</a>`:''}</div>
 </form>`:`<article class="panel prose"><h2>${e(post.title)}</h2>${postContent(post,data.images||[])}</article>`;
 return page(post.id?'글 수정':'새 글 쓰기',`<a href="/admin/">← 글 목록</a><h1>${post.id?'글 수정':'새 글 쓰기'}</h1>${post.status?`<span class="cms-status ${post.status}">${labels[post.status]}</span>`:''}${message?`<p class="cms-error" role="alert">${e(message)}</p>`:''}<p class="cms-help">${post.sample?'샘플 글입니다. ':''}저장한 글은 검수 후 공개됩니다.</p>
 ${fields}${photoPanel(user,post,data.images||[],data.aiAvailable)}${assistantPanel(user,post,data.aiAvailable)}
 <div class="cms-actions">${post.id&&post.status==='DRAFT'?transition('submit','검수 요청'):''}${isAdmin(user)&&post.status==='REVIEW'?transition('approve','승인')+transition('return','수정 요청'):''}${isAdmin(user)&&post.status==='APPROVED'?transition('publish','공개')+transition('return','수정하기'):''}${post.status==='PUBLISHED'?`<a class="button" href="/post/${post.id}/">공개 글 보기 ↗</a>${isAdmin(user)?transition('withdraw','공개 해제하고 수정'):''}`:''}</div>
 ${post.id?`<details class="cms-history"><summary>이전 내용 보기</summary><p><a href="/admin/posts/${post.id}/history/">이전 공개 내용</a> · <a href="/admin/posts/${post.id}/generations/">자동 작성 전 내용</a></p></details>`:''}`,user,status);
}
