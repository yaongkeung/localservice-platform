import {first,all} from './store.js';
import {page,csrf,e,redirect} from './admin-ui.js';
import {isAdmin} from './auth.js';
import {postUrl} from './post-urls.js';
import {seoulDate} from './photos.js';
import {townshipName} from './township-groups.js';

export function firstPageQuery(post){
 const parts=String(post.search_region||'').trim().split(/\s+/),last=parts.at(-1)||'',region=/(?:동(?:\d+가)?|읍|면)$/.test(last)?last:post.region_name||'';
 if(!/(?:동(?:\d+가)?|읍|면)$/.test(region)||!String(post.search_keyword||'').trim())return '';
 return townshipName(region)+' '+String(post.search_keyword).trim();
}
export const naverSearchUrl=query=>'https://search.naver.com/search.naver?'+new URLSearchParams({query});
export function firstPageState(post,check,now=Date.now()){
 const query=firstPageQuery(post);
 if(!query)return {label:'동·키워드 설정 필요',tone:'unknown'};
 if(!check)return {label:'미확인',tone:'unknown'};
 const savedDate=String(check.checked_at||'').replace(' ','T'),date=Date.parse(savedDate+(/Z$|[+-]\d{2}:\d{2}$/.test(savedDate)?'':'Z')),stamp=Number.isFinite(date)?new Intl.DateTimeFormat('ko-KR',{timeZone:'Asia/Seoul',month:'2-digit',day:'2-digit'}).format(date):'';
 if(check.post_version!==post.version||check.query!==query||check.public_path!==postUrl(post))return {label:'내용 변경 · 재확인',tone:'stale',stamp};
 if(!Number.isFinite(date)||now-date>7*86400000)return {label:'지난 확인 · 재확인',tone:'stale',stamp};
 return {label:check.result==='FOUND'?'1페이지 확인':check.result==='NOT_FOUND'?'1페이지 미노출':'확인 실패',tone:check.result==='FOUND'?'found':check.result==='NOT_FOUND'?'missing':'unknown',stamp};
}
export async function searchCheckPage(db,user,url,form,id){
 if(!isAdmin(user))return page('권한 없음','<h1>관리자만 확인 결과를 기록할 수 있습니다.</h1>',user,403);
 const post=await first(db,`SELECT p.*,u.path AS public_path,r.name AS region_name,c.name AS company_name,c.customer_name,c.status AS company_status,c.sample AS company_sample FROM posts p JOIN companies c ON c.id=p.company_id JOIN regions r ON r.id=p.region_id LEFT JOIN post_urls u ON u.post_id=p.id WHERE p.id=? AND p.deleted_at IS NULL`,id);
 if(!post)return page('게시글 없음','<h1>게시글을 찾을 수 없습니다.</h1>',user,404);
 const query=firstPageQuery(post),eligible=!!query&&post.status==='PUBLISHED'&&post.published_at<=seoulDate()&&post.company_status==='ACTIVE'&&!post.sample&&!post.company_sample;
 let error='';if(form)try{
  if(!eligible)throw Error('공개된 실제 업체 글과 읍·면·동·대표 업무 키워드를 먼저 확인해 주세요.');
  const result=form.get('result'),device=form.get('device'),note=(form.get('note')||'').trim();
  if(!['FOUND','NOT_FOUND','FAILED'].includes(result)||!['PC','MOBILE'].includes(device)||note.length>500||form.get('confirmed')!=='1')throw Error('검색 결과와 확인 항목을 선택해 주세요.');
  if(Number(form.get('version'))!==post.version)throw Error('글이 변경됐습니다. 새 내용을 기준으로 다시 검색해 주세요.');
  const saved=await db.prepare(`INSERT INTO post_search_checks(post_id,user_id,post_version,query,public_path,result,device,note)
   SELECT p.id,?,p.version,?,?,?,?,? FROM posts p JOIN companies c ON c.id=p.company_id WHERE p.id=? AND p.version=? AND p.deleted_at IS NULL AND p.status='PUBLISHED' AND p.published_at<=? AND p.sample=0 AND c.status='ACTIVE' AND c.sample=0
   AND EXISTS(SELECT 1 FROM users WHERE id=? AND status='ACTIVE' AND role=? AND credential_version=?)`).bind(user.id,query,postUrl(post),result,device,note,id,post.version,seoulDate(),user.id,user.role,user.credential_version).run();
  if(!saved.meta.changes)throw Error('글 또는 접근 권한이 변경됐습니다. 다시 확인해 주세요.');
  return redirect('/admin/?notice=search-checked');
 }catch(err){error=/^(공개된|검색 결과|글이|글 또는)/.test(err.message)?err.message:'확인 결과를 저장하지 못했습니다. 다시 열어 주세요.';}
 const checks=await all(db,'SELECT * FROM post_search_checks WHERE post_id=? ORDER BY id DESC LIMIT 10',id),current=firstPageState(post,checks[0]);
 return page('네이버 1페이지 확인',`<style>.post-confirm-check input[type=checkbox]{display:inline-block;width:17px;height:17px;margin:0 8px 0 0;vertical-align:middle}</style><a href="/admin/">← 게시글 목록</a><h1>네이버 1페이지 확인</h1><section class="panel"><h2>${e(post.customer_name||'고객명 미등록')} · ${e(post.company_name)}</h2><p>${e(post.title)}</p><p><strong>확인 검색어: ${e(query||'읍·면·동과 대표 업무 키워드 설정 필요')}</strong></p><p>네이버 <strong>통합검색 첫 번째 결과 페이지</strong>에서 아래 게시글 주소가 나타나는지 확인합니다. 지도·블로그·다른 업체의 글이 보이는 것은 이 글의 노출로 세지 않습니다.</p><p class="cms-help">현재 저장 상태: ${e(current.label)} ${e(current.stamp||'')} · 직접 확인 기록이며 네이버가 제공한 순위 인증이 아닙니다.</p><div class="cms-actions">${query?`<a class="button" href="${e(naverSearchUrl(query))}" target="_blank" rel="noopener noreferrer">네이버에서 검색 ↗</a>`:''}<a href="${e(postUrl(post))}" target="_blank" rel="noopener noreferrer">확인할 공개 글 ↗</a><a href="/admin/posts/${id}/">글 수정</a></div><p class="cms-help">확인할 주소: ${e(postUrl(post))}</p>${error?`<p class="cms-error" role="alert">${e(error)}</p>`:''}${eligible?`<form method="post" data-post-operation>${csrf(user)}<input type="hidden" name="version" value="${post.version}"><label>첫 페이지 확인 결과<select name="result" required><option value="">선택해 주세요</option><option value="FOUND">이 글 주소가 첫 페이지에 있음</option><option value="NOT_FOUND">첫 페이지에서 이 글 주소를 찾지 못함</option><option value="FAILED">접속 오류·보안문자 등으로 확인하지 못함</option></select></label><label>확인한 화면<select name="device"><option value="PC">PC</option><option value="MOBILE">모바일</option></select></label><label>메모 (선택)<input name="note" maxlength="500" placeholder="예: 웹사이트 영역에서 주소 확인"></label><label class="post-confirm-check"><input type="checkbox" name="confirmed" value="1" required>위 검색어로 실제 결과 화면과 해당 글 주소를 확인한 상태를 기록합니다.</label><button>확인 결과 저장</button></form>`:'<p class="cms-note">공개한 실제 업체 글에 읍·면·동과 대표 키워드를 설정하면 확인 결과를 기록할 수 있습니다.</p>'}</section><section class="panel" style="margin-top:18px"><h2>최근 확인 기록</h2><p class="cms-help">내용이 바뀌거나 확인 후 7일이 지나면 목록에서 재확인을 안내합니다. 7일은 이 관리 화면의 운영 기준이며 검색엔진의 기준이 아닙니다.</p>${checks.map(check=>`<p>${e(new Intl.DateTimeFormat('ko-KR',{timeZone:'Asia/Seoul',dateStyle:'medium',timeStyle:'short'}).format(new Date(check.checked_at.replace(' ','T')+'Z')))} (한국시간) · ${e(check.device)} · ${{FOUND:'첫 페이지에서 확인',NOT_FOUND:'첫 페이지에서 찾지 못함',FAILED:'확인 실패'}[check.result]} · ${e(check.query)}${check.note?`<br>${e(check.note)}`:''}</p>`).join('')||'<p>아직 확인한 기록이 없습니다.</p>'}</section>`,user,error?409:200);
}
