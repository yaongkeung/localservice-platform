import {phoneField} from './page-contact.js';
import {page,csrf,e} from './admin-ui.js';
import {isAdmin} from './auth.js';
import {cmsRegionPicker} from './cms-regions.js';
import {photoPanel} from './uploads.js';
import {initialDraftText,waitingForPhotos} from './draft-state.js';
import {postArticle} from './post-article.js';
export function editPage(user,data,post={},message='',status=200){
 const editable=!post.id||post.status==='DRAFT',content=Array.isArray(post.content)?post.content.join('\n\n'):post.content;
 const ready=!waitingForPhotos(post),company=data.companies.find(item=>item.id===Number(post.company_id))||{};
 const view={...post,content:Array.isArray(post.content)?post.content:String(post.content||'').split(/\n\s*\n/).filter(Boolean)};
 const sample=!!company.sample||!!post.sample;
 const needsContract=isAdmin(user)&&post.id&&post.status==='DRAFT'&&!company.sample&&!post.contract_id&&!post.published_once;
 const visibility=post.status==='PUBLISHED'?sample?`<div class="cms-visibility"><strong>공개 단계 완료 · 메인에서는 제외</strong><br>시험용 업체 또는 시험용 글로 표시되어 있습니다. <a href="/admin/companies/${post.company_id}/">업체 설정 확인 →</a></div>`:`<div class="cms-success" role="status"><strong>메인에 공개 중입니다.</strong><br><a href="/post/${post.id}/">공개된 글 보기 →</a> · <a href="/#cases">메인에서 확인 →</a></div>`:`<p class="cms-note"><strong>${sample?'시험용 글 · 메인 제외':'현재 비공개입니다.'}</strong> 초안 저장만으로는 메인에 나오지 않습니다.${isAdmin(user)?sample?' 시험용 글은 공개 단계로 진행해도 메인에서 제외됩니다.':post.status==='DRAFT'?' 내용을 확인한 뒤 ‘확인하고 메인에 공개’를 누르세요.':post.status==='REVIEW'?' 검수 내용을 확인하고 승인한 뒤 메인에 공개할 수 있습니다.':' 승인된 내용을 메인에 공개할 수 있습니다.':' 검수 요청 후 관리자가 승인·공개하면 메인에 표시됩니다.'}</p>`;
 const labels={DRAFT:'초안',REVIEW:'검수 대기',APPROVED:'승인 완료',PUBLISHED:'공개 중'};
 const transition=(action,label)=>`<form method="post" action="/admin/posts/${post.id}/status/" data-status-action>${csrf(user)}<input type="hidden" name="version" value="${post.version}"><input type="hidden" name="action" value="${action}"><button ${action==='return'?'class="secondary"':''}>${label}</button></form>`;
 const fields=editable?`<form id="post-editor" method="post" action="/admin/posts/${post.id?post.id+'/':'new/'}" data-simple-editor ${post.id?`data-post-id="${post.id}"`:""}>
  ${csrf(user)}<input type="hidden" name="simple_editor" value="1">${!post.id?'<input type="hidden" name="action" value="prepare">':''}<input type="hidden" name="version" value="${post.version||0}">
  ${post.published_once?`<input type="hidden" name="company_id" value="${post.company_id}">`:''}
  <section class="panel cms-grid">
   <label class="full">업체<select name="company_id" required ${post.published_once?'disabled':''}><option value="">업체 선택</option>${data.companies.map(company=>`<option value="${company.id}" data-phone="${e(company.phone_verified?company.phone||'':'')}" ${company.id===Number(post.company_id)?'selected':''}>${e(company.name)}</option>`).join('')}</select></label>
   ${phoneField(post,company)}
   ${cmsRegionPicker(post,data.regions)}
   <label>제목에 쓸 지역명<input name="search_region" value="${e(post.search_region)}" placeholder="예: 응암동" minlength="2" maxlength="40" required></label>
   <label>대표 업무 키워드<input name="search_keyword" value="${e(post.search_keyword)}" placeholder="예: 유리시공" minlength="2" maxlength="40" required></label>
   <label class="full">제목<input name="title" value="${e(post.title)}" minlength="5" maxlength="120" required><span class="cms-help">지역명과 업무 키워드를 입력하면 제목이 자동으로 완성됩니다. 필요한 문구는 수정할 수 있습니다.</span></label>
   ${!ready?`<input type="hidden" name="content" value="${e(content||initialDraftText)}">`:''}
  </section>${!post.id?'<div class="cms-actions"><button>사진 첨부로 이동 →</button></div>':'<noscript><button>기본 정보 저장</button></noscript>'}
 </form>`:`<article class="panel prose"><h2>${e(post.title)}</h2>${postArticle(view,data.images||[],company,isAdmin(user))}</article>`;
 return page(post.id?'글 수정':'새 글 쓰기',`<a href="/admin/">← 글 목록</a><h1>${post.id?'글 수정':'새 글 쓰기'}</h1>${post.status?`<span class="cms-status ${post.status}">${labels[post.status]}</span>`:''}${message?`<p class="${status>=400?'cms-error':'cms-success'}" role="${status>=400?'alert':'status'}">${e(message)}</p>`:''}${post.id?visibility:''}${needsContract?`<p class="cms-visibility">이 업체의 첫 공개에 사용할 계약이 아직 없습니다. 초안은 저장할 수 있으며 공개 전 <a href="/admin/contracts/new/">업체 계약을 등록</a>해 주세요.</p>`:''}
 ${fields}${editable?photoPanel(user,post,data.images||[],data.aiAvailable):''}
 ${editable&&ready?`<section class="panel" id="generated-post" style="margin:24px 0"><h2>자동 완성된 상담 페이지</h2><article class="prose">${postArticle(view,data.images||[],company,isAdmin(user))}</article><details><summary>내용 수정이 필요한 경우</summary><label>본문 수정<textarea name="content" form="post-editor" minlength="50" maxlength="20000" required>${e(content)}</textarea></label></details>${post.generation_reviewed===0?'<label><input style="width:auto;display:inline" type="checkbox" name="generation_reviewed" form="post-editor" value="1"> 사진과 내용이 맞는지 확인했습니다.</label>':''}<div class="cms-actions"><button form="post-editor" class="secondary">초안으로 저장</button>${isAdmin(user)?`<button form="post-editor" name="publish_now" value="1">${sample?'확인하고 시험용으로 공개':'확인하고 메인에 공개'}</button>`:''}<a href="/admin/posts/${post.id}/preview/">미리보기</a></div><p class="cms-help">초안 저장은 비공개로 보관합니다. ${sample?'시험용 글은 공개해도 메인에서 제외됩니다.':'메인 공개는 저장·검수·승인·공개를 한 번에 처리하며 중복·계약·잔여 수량 조건을 확인합니다.'}</p></section>`:''}
 <div class="cms-actions">${post.id&&post.status==='DRAFT'&&ready?transition('submit','검수 요청'):''}${isAdmin(user)&&post.status==='REVIEW'?transition('approve','승인')+transition('return','수정 요청'):''}${isAdmin(user)&&post.status==='APPROVED'?transition('publish',sample?'시험용으로 공개':'메인에 공개')+transition('return','수정하기'):''}${post.status==='PUBLISHED'?`<a class="button" href="/post/${post.id}/">공개 글 보기 ↗</a>${isAdmin(user)?transition('withdraw','공개 해제하고 수정'):''}`:''}</div>
 ${post.id?`<details class="cms-history"><summary>이전 내용 보기</summary><p><a href="/admin/posts/${post.id}/history/">이전 공개 내용</a> · <a href="/admin/posts/${post.id}/generations/">자동 작성 전 내용</a></p></details>`:''}`,user,status);
}
