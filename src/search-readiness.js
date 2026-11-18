import {searchDescription} from './search-metadata.js';
import {postUrl} from './post-urls.js';
import {all,first} from './store.js';
import {page,e} from './admin-ui.js';
import {isAdmin} from './auth.js';
import {siteOrigin} from './seo.js';
import {seoulDate} from './photos.js';
import {waitingForPhotos} from './draft-state.js';
import {normalizePlaceUrl} from './place.js';
import {launchState} from './launch.js';

const labels={DRAFT:'작성 중',REVIEW:'작성 중',APPROVED:'작성 중',PUBLISHED:'발행 완료'};
const compact=value=>String(value||'').normalize('NFKC').replace(/\s+/g,'').toLowerCase();
export function inspectSearchPost(post){
 const content=Array.isArray(post.content)?post.content:JSON.parse(post.content),text=content.join('\n\n');
 const query=[post.search_region,post.search_keyword].filter(Boolean).join(' '),issues=[];
 if(!post.search_region||!post.search_keyword)issues.push('검색할 지역명·업무 키워드를 설정해 주세요.');
 else if(!compact(post.title).startsWith(compact(query))||!compact(post.seo_title||post.title).startsWith(compact(query)))issues.push('본문 제목과 검색용 제목이 지역명+업무 키워드로 시작하는지 확인해 주세요.');
 if(!(post.seo_description||post.summary||'').trim())issues.push('검색 설명에 사용할 요약이 없습니다.');
 if(waitingForPhotos({...post,content}))issues.push('사진으로 본문을 먼저 작성해 주세요.');
 if(!post.active_photos)issues.push('등록된 활성 사진이 없습니다.');
 if(post.generation_reviewed===0)issues.push('자동 작성한 사진·본문을 확인하고 저장해 주세요.');
 if(post.duplicate_text)issues.push('다른 글과 동일한 제목 또는 본문이 등록되어 있습니다.');
 if(post.duplicate_photo)issues.push('다른 글과 동일한 사진이 등록되어 있습니다.');
 let place=false;try{place=!!normalizePlaceUrl(post.naver_place_url);}catch{/* Invalid stored links are not presented as connected. */}
 return {query,issues,characters:text.replace(/\[사진:\d+\]/g,'').length,place,localIntro:content.some(part=>/^## .*(?:지역 소개|지역 안내|지역과 방문 상담 안내)$/.test(part)),faq:content.includes('## 자주 묻는 질문')};
}

const styles=`.search-summary{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;margin:24px 0}.search-summary article{background:#fff;border:1px solid #dce6eb;border-radius:12px;padding:20px}.search-summary strong{display:block;font-size:25px;margin-top:10px;color:#19364c}.search-info{border-left:4px solid #edb94d;background:#fff8e8;padding:18px;line-height:1.8}.search-meta{display:grid;grid-template-columns:120px minmax(0,1fr);gap:9px 16px;font-size:14px;line-height:1.8;margin:18px 0}.search-meta dt{color:#647887}.search-meta dd{margin:0;overflow-wrap:anywhere}.search-checks{display:flex;gap:8px;flex-wrap:wrap;margin:16px 0}.search-checks span{padding:6px 10px;border-radius:6px;background:#edf6f7;font-size:13px;color:#275f64}.search-issues{background:#fff8eb;padding:14px 14px 14px 34px;line-height:1.8;font-size:14px}.search-filter{margin:24px 0!important;display:flex;gap:12px;flex-wrap:wrap;align-items:end}.search-filter label{margin:0;min-width:180px;flex:1}.search-post{overflow-wrap:anywhere}.search-post h2{line-height:1.6}.search-next{line-height:1.9;padding-left:22px}.search-status{font-size:13px;color:#855f21;font-weight:700}.search-pages{display:flex;align-items:center;gap:18px;margin:24px 0;flex-wrap:wrap}@media(max-width:600px){.search-summary article{padding:14px}.search-summary strong{font-size:21px}.search-meta{grid-template-columns:1fr;gap:3px}.search-meta dd{margin-bottom:10px}.search-filter label{min-width:100%}}`;

export async function searchReadiness(request,env,user){
 if(!isAdmin(user))return page('관리자 전용','<p>관리자만 검색 준비 상태를 확인할 수 있습니다.</p>',user,403);
 if(!['GET','HEAD'].includes(request.method))return page('조회 전용','<p>검색 준비 화면은 조회만 가능합니다. 글 수정 화면에서 내용을 변경해 주세요.</p>',user,405);
 const url=new URL(request.url),db=env.DB,companyId=Number(url.searchParams.get('company'));
 const selected=Number.isSafeInteger(companyId)&&companyId>0?companyId:null;
 const status=labels[url.searchParams.get('status')]?url.searchParams.get('status'):'';
 const companies=await all(db,"SELECT id,name FROM companies WHERE status='ACTIVE' AND sample=0 ORDER BY name,id");
 const where="p.sample=0 AND c.sample=0 AND c.status='ACTIVE'"+(selected?' AND p.company_id=?':'')+(status?' AND p.status=?':'');
 const args=[...(selected?[selected]:[]),...(status?[status]:[])];
 const stats=await first(db,`SELECT COUNT(*) AS total,COALESCE(SUM(CASE WHEN p.status='PUBLISHED' AND p.published_at<=? THEN 1 ELSE 0 END),0) AS published FROM posts p JOIN companies c ON c.id=p.company_id WHERE ${where}`,seoulDate(),...args);
 const totalPages=Math.max(1,Math.ceil(stats.total/25)),requested=Number(url.searchParams.get('page'));
 const currentPage=Math.max(1,Math.min(totalPages,Number.isSafeInteger(requested)?requested:1));
 const posts=await all(db,`SELECT p.*,u.path AS public_path,c.name AS company_name,c.naver_place_url,
 (SELECT COUNT(*) FROM post_images i WHERE i.post_id=p.id AND i.excluded=0) AS active_photos,
 EXISTS(SELECT 1 FROM posts other WHERE other.id!=p.id AND ((p.title_hash IS NOT NULL AND other.title_hash=p.title_hash) OR (p.content_hash IS NOT NULL AND other.content_hash=p.content_hash))) AS duplicate_text,
 EXISTS(SELECT 1 FROM post_images a JOIN post_images b ON a.content_hash=b.content_hash WHERE a.post_id=p.id AND b.post_id!=p.id AND a.excluded=0 AND b.excluded=0 AND a.content_hash IS NOT NULL) AS duplicate_photo
 FROM posts p LEFT JOIN post_urls u ON u.post_id=p.id JOIN companies c ON c.id=p.company_id WHERE ${where} ORDER BY p.updated_at DESC,p.id DESC LIMIT 25 OFFSET ?`,...args,(currentPage-1)*25);
 const canonicalHost=url.origin===siteOrigin,launch=launchState(request,env),production=launch.production&&canonicalHost;
 const notice=env.APP_ENV==='staging'?'현재 시험 사이트는 검색 제외 상태입니다. 공개한 글도 네이버 노출 시험 대상이 아닙니다. 운영 주소 연결과 검색 수집 설정을 완료한 뒤 실제 검색결과를 확인해야 합니다.':production?(launch.indexing?'현재 운영 주소는 검색 수집을 허용하도록 설정했습니다. 실제 네이버 수집·색인·검색 노출은 서치어드바이저와 검색결과에서 별도로 확인해야 합니다.':'현재 운영 주소의 검색 수집은 대기 중입니다. 사이트 소유 확인 후 수집 설정을 활성화해야 합니다.'):'현재 개발·미리보기 주소입니다. 운영 주소 연결과 검색 수집 설정을 확인한 뒤 노출을 시험해야 합니다.';
 const pageLink=number=>{const params=new URLSearchParams();if(selected)params.set('company',String(selected));if(status)params.set('status',status);params.set('page',String(number));return '/admin/search-readiness/?'+params;};
 const cards=posts.map(post=>{
  const audit=inspectSearchPost(post),published=post.status==='PUBLISHED'&&post.published_at<=seoulDate();
  const searchLink=audit.query?`<a href="https://search.naver.com/search.naver?${e(new URLSearchParams({query:audit.query}).toString())}" target="_blank" rel="noopener noreferrer">네이버에서 검색어 확인 ↗<span class="sr-only"> (새 창)</span></a>`:'';
  return `<article class="cms-item search-post"><span class="cms-status ${post.status}">${labels[post.status]}</span><h2><a href="/admin/posts/${post.id}/">${e(post.title)}</a></h2><p class="cms-help">#${post.id} · ${e(post.company_name)}</p><dl class="search-meta"><dt>확인할 검색어</dt><dd>${e(audit.query)||'지역명·업무 키워드 미설정'}</dd><dt>검색용 제목</dt><dd>${e(post.seo_title||post.title)}</dd><dt>검색 설명</dt><dd>${e(searchDescription(post.seo_description||post.summary)||'미입력')}</dd><dt>운영용 글 주소${canonicalHost?'':' (예정)'}</dt><dd>${e(siteOrigin+postUrl(post))}</dd></dl><div class="search-checks"><span>본문 ${audit.characters.toLocaleString('ko-KR')}자</span><span>사진 ${post.active_photos}장</span><span>지역 소개 ${audit.localIntro?'있음':'확인 필요'}</span><span>FAQ ${audit.faq?'있음':'확인 필요'}</span><span>플레이스 ${audit.place?'연결됨':'미연결'}</span></div>${audit.issues.length?`<p class="search-status">확인할 항목 ${audit.issues.length}개</p><ul class="search-issues">${audit.issues.map(issue=>`<li>${e(issue)}</li>`).join('')}</ul>`:'<p class="cms-help">기본 입력 항목이 있습니다. 실제 사진·지역·업무 사실과 내용의 고유성을 미리보기에서 확인해 주세요.</p>'}<p class="cms-help">검색 노출: 미확인 · ${published?(production?'공개 글 — 실제 검색결과 확인 필요':'공개 글 — 운영 주소·수집 설정 확인 필요'):'작성 중인 글 — 내용 확인 후 발행 필요'}</p><div class="cms-actions"><a class="button" href="/admin/posts/${post.id}/preview/">글 미리보기</a>${published?`<a href="${postUrl(post)}" target="_blank" rel="noopener noreferrer">현재 공개 글 ↗<span class="sr-only"> (새 창)</span></a>`:''}${searchLink}<a href="/admin/companies/${post.company_id}/">업체·플레이스 수정</a></div></article>`;
 }).join('');
 return page('네이버 노출 준비',`<style>${styles}</style><h1>🔎 네이버 노출 준비</h1><p>지역명+업무 검색으로 확인할 글을 모았습니다. 샘플과 비활성 업체는 제외합니다.</p><p class="search-info">${notice}</p><section class="search-summary" aria-label="선택 범위의 글 현황"><article>등록 글<strong>${stats.total}건</strong></article><article>공개 글<strong>${stats.published}건</strong></article><article>실제 검색 노출<strong>미확인</strong></article></section><p class="cms-help">공개 글 수는 노출 수가 아닙니다. 본문 분량·사진 수·플레이스 연결은 구성 정보이며 검색 순위 점수가 아닙니다. 검색결과에서 같은 글 주소가 보이는지 직접 확인해야 합니다.</p><form class="search-filter" method="get" action="/admin/search-readiness/"><label>업체<select name="company"><option value="">전체 업체</option>${companies.map(company=>`<option value="${company.id}" ${selected===company.id?'selected':''}>${e(company.name)}</option>`).join('')}</select></label><label>게시 상태<select name="status"><option value="">모든 상태</option>${Object.entries(labels).map(([key,label])=>`<option value="${key}" ${key===status?'selected':''}>${label}</option>`).join('')}</select></label><button>확인</button></form><section class="cms-list" aria-label="검색 준비 글 목록">${cards||'<p class="empty">조건에 맞는 글이 없습니다. 실제 업체의 사진 포스팅을 작성해 주세요.</p>'}</section><nav class="search-pages" aria-label="글 페이지">${currentPage>1?`<a href="${e(pageLink(currentPage-1))}">← 이전</a>`:''}<span>${currentPage} / ${totalPages} 페이지 · 25개씩 표시</span>${currentPage<totalPages?`<a href="${e(pageLink(currentPage+1))}">다음 →</a>`:''}</nav><section class="panel"><h2>운영 주소에서 이어서 할 일</h2><ol class="search-next"><li>운영 주소 연결과 네이버 사이트 소유 확인</li><li>검색 수집 허용, 사이트맵·RSS 제출 상태 확인</li><li>목표 검색어로 검색하여 해당 글 주소와 확인 날짜·화면 기록</li><li>고객이 확인한 내용 기록 후 비용 협의</li></ol><p class="cms-help">수집 성공이나 site: 검색 결과만으로 목표 검색어 노출을 확정하지 않습니다. 이 화면은 실제 노출·고객 확인·결제 기록을 생성하지 않습니다.</p><div class="cms-actions"><a href="/robots.txt" target="_blank" rel="noopener noreferrer">현재 수집 안내 ↗</a><a href="/sitemap.xml" target="_blank" rel="noopener noreferrer">현재 사이트맵 ↗</a><a href="/rss.xml" target="_blank" rel="noopener noreferrer">현재 RSS ↗</a><a href="https://searchadvisor.naver.com/" target="_blank" rel="noopener noreferrer">네이버 서치어드바이저 ↗</a></div></section>`,user);
}
