import {postUrl} from './post-urls.js';
import {customerSelect} from './customer-select.js';
import {phoneField} from './page-contact.js';
import {page,csrf,e} from './admin-ui.js';
import {isAdmin} from './auth.js';
import {cmsRegionPicker} from './cms-regions.js';
import {photoPanel} from './uploads.js';
import {initialDraftText,waitingForPhotos} from './draft-state.js';
import {postArticle} from './post-article.js';
import {titleRegionForCode} from './title-region.js';
import {withRegionTitle} from './post-title.js';
import {workNotesField} from './editorial-text.js';
import {pageTitles} from './page-titles.js';
export function editPage(user,data,post={},message='',status=200){
 post=withRegionTitle(post,data.regions.find(region=>region.id===Number(post.region_id)));
 const titles=pageTitles(post,data.regions.find(region=>region.id===Number(post.region_id)),data.services.find(service=>service.id===Number(post.service_id)));
 const editable=!post.id||post.status==='DRAFT',content=Array.isArray(post.content)?post.content.join('\n\n'):post.content;
 const selectedRegion=data.regions.find(item=>item.id===Number(post.region_id)),qualifiedRegion=titleRegionForCode(selectedRegion?.group_key||selectedRegion?.admin_code);
 const inputRegion=post.search_region&&!post.search_region.includes(' ')&&qualifiedRegion?.split(' ').at(-1)===post.search_region?qualifiedRegion:post.search_region;
 const ready=!!post.id&&!waitingForPhotos(post),company=data.companies.find(item=>item.id===Number(post.company_id))||{};
 const view={...post,content:Array.isArray(post.content)?post.content:String(post.content||'').split(/\n\s*\n/).filter(Boolean)};
 const sample=!!company.sample||!!post.sample;
 const visibility=post.status==='PUBLISHED'?sample?`<div class="cms-visibility"><strong>시험용으로 발행되었습니다.</strong> 시험용 업체·글은 메인에서 제외됩니다. <a href="/admin/companies/${post.company_id}/">업체 설정 →</a></div>`:`<div class="cms-success" role="status"><strong>발행 완료! 메인에 표시되고 있습니다.</strong><br><a href="${postUrl(post)}">발행한 글 보기 →</a> · <a href="/#cases">메인에서 확인 →</a></div>`:`<p class="cms-note">${sample?'시험용 글 · 메인 제외':'고객 선택 → 글·사진 작성 → 확인하고 발행'}<br>자동 작성한 사진 설명과 내용을 확인한 뒤 ‘확인하고 발행’을 누르면 바로 공개됩니다.</p>`;
 const transition=(action,label)=>`<form method="post" action="/admin/posts/${post.id}/status/" data-status-action>${csrf(user)}<input type="hidden" name="version" value="${post.version}"><input type="hidden" name="action" value="${action}"><button>${label}</button></form>`;
 const fields=editable?`<form id="post-editor" method="post" action="/admin/posts/${post.id?post.id+'/':'new/'}" data-simple-editor data-region-autofilled="${inputRegion!==post.search_region?'1':'0'}" ${post.id?`data-post-id="${post.id}"`:''}>
 ${csrf(user)}<input type="hidden" name="simple_editor" value="1">${!post.id?'<input type="hidden" name="action" value="prepare">':''}<input type="hidden" name="version" value="${post.version||0}">
 <section class="panel cms-grid">${customerSelect(data.companies,post)}${phoneField(post,company)}${cmsRegionPicker(post,data.regions)}
 <label>제목에 쓸 지역명<input name="search_region" value="${e(inputRegion)}" placeholder="예: 서울시 은평구 응암동" minlength="2" maxlength="40" required></label>
 <label>대표 업무 키워드<input name="search_keyword" value="${e(post.search_keyword)}" placeholder="예: 유리시공" minlength="2" maxlength="40" required></label>
 <label class="full">자동 연관 키워드<input data-related-keyword value="${e(post.related_keyword)}" placeholder="사진 분석 후 자동 추천" readonly></label>
 <label class="full">화면 제목 (자동)<input data-page-heading value="${e(titles.heading)}" readonly><span class="cms-help">페이지의 큰 제목은 읍·면·동과 대표 업무로 간단하게 표시합니다.</span></label>
 <label class="full">검색용 제목<input name="title" value="${e(titles.search)}" minlength="5" maxlength="120" required><span class="cms-help">전체 지역명과 대표 업무 뒤에 | 구분자로 이 글의 설명을 붙입니다. 검색결과의 최종 표시는 검색엔진이 결정합니다.</span></label>
 ${workNotesField(post.work_notes||'',e)}
 ${!ready?`<input type="hidden" name="content" value="${e(content||initialDraftText)}">`:''}</section>
 ${!post.id?'<div class="cms-actions"><button>사진 첨부로 이동 →</button></div>':''}</form>`:`<article class="panel prose"><h2>${e(titles.heading)}</h2><p class="cms-help">검색용 제목: ${e(titles.search)}</p>${postArticle(view,data.images||[],company,isAdmin(user))}</article>`;
 return page(post.id?'글 확인·수정':'새 글 쓰기',`<a href="/admin/">← 글 목록</a><h1>${post.id?'글 확인·수정':'새 글 쓰기'}</h1>${post.status?`<span class="cms-status ${post.status}">${post.status==='PUBLISHED'?'발행 완료':'작성 중'}</span>`:''}${message?`<p class="${status>=400?'cms-error':'cms-success'}" role="${status>=400?'alert':'status'}">${e(message)}</p>`:''}${post.id?visibility:''}
 ${fields}${editable?photoPanel(user,post,data.images||[],data.aiAvailable):''}
 ${editable&&ready?`<section class="panel" id="generated-post" style="margin:24px 0"><h2>완성된 페이지 확인</h2><article class="prose">${postArticle(view,data.images||[],company,isAdmin(user))}</article><details><summary>내용 수정이 필요한 경우</summary><label>본문 수정<textarea name="content" form="post-editor" minlength="50" maxlength="20000" required>${e(content)}</textarea></label></details><div class="cms-actions">${isAdmin(user)?`<button form="post-editor" name="confirm_publish" value="1">${sample?'확인하고 시험용 발행':'확인하고 발행'}</button>`:'<button form="post-editor">내용 저장</button>'}<a href="/admin/posts/${post.id}/preview/">미리보기</a></div><p class="cms-help">${sample?'시험용 글은 발행해도 메인에서 제외됩니다.':'사진과 업무 내용이 맞는지 확인한 뒤 발행하세요. 발행하면 메인·지역·업종 게시판에 바로 표시됩니다.'}</p></section>`:''}
 <div class="cms-actions">${post.status==='PUBLISHED'?`<a class="button" href="${postUrl(post)}">발행한 글 보기 ↗</a>${isAdmin(user)?transition('withdraw','수정하기'):''}`:''}${isAdmin(user)&&['REVIEW','APPROVED'].includes(post.status)?transition('return','수정하고 발행하기'):''}</div>
 ${post.status==='PUBLISHED'&&isAdmin(user)?'<p class="cms-help">수정하기를 누르면 수정하는 동안 글이 비공개로 전환됩니다. 변경 후 ‘확인하고 발행’을 누르면 다시 표시됩니다.</p>':''}
 ${post.id?`<details class="cms-history"><summary>이전 내용 보기</summary><p><a href="/admin/posts/${post.id}/history/">이전 공개 내용</a> · <a href="/admin/posts/${post.id}/generations/">자동 작성 전 내용</a></p></details>`:''}`,user,status);
}
