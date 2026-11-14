import {services,companies,regions,published} from './data.js';
import {regionFilter} from './regions.js';
import {regionData} from './regions-data.js';
const e=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const postKinds={case:'작업사례',guide:'서비스안내',local:'지역정보',tip:'작업팁'};
const a=(url,label,cls='')=>`<a class="${cls}" href="${e(url)}">${e(label)}</a>`;
export function filterUrl(params,changes){const next=new URLSearchParams(params);for(const [key,value]of Object.entries(changes)){if(value)next.set(key,value);else next.delete(key);}return '/'+(next.size?'?'+next.toString():'')+'#cases';}
export function portalHeader(params=new URLSearchParams()){
  const nav=[['','전체 글'],...Object.entries(postKinds)];
  return `<header class="masthead"><div class="wrap header"><a class="brand" href="/">공사<span>8282</span><small>우리 동네 출장서비스 포털</small></a>
    <form class="header-search" action="/" method="get" role="search"><label class="sr-only" for="portal-q">게시글 검색</label><input id="portal-q" name="q" maxlength="100" value="${e(params.get('q')||'')}" placeholder="지역, 업종, 작업사례 검색">${[...params].filter(([key])=>['province','district','dong','region','service','kind'].includes(key)).map(([key,value])=>`<input type="hidden" name="${key}" value="${e(value)}">`).join('')}<button type="submit" aria-label="게시글 검색">검색</button></form>
    <span class="header-note">작업 경험으로 연결되는 우리 동네</span></div>
    <div class="nav-band"><nav class="wrap main-nav" aria-label="주 메뉴">${nav.map(([kind,name])=>`<a href="${e(filterUrl(params,{kind}))}" ${params.get('kind')===kind||(!kind&&!params.get('kind'))?'aria-current="page"':''}>${e(name)}</a>`).join('')}</nav></div></header>`;
}
function board(posts){
  if(!posts.length)return `<div class="empty"><h3>조건에 맞는 사례가 없습니다</h3><p>다른 지역·업종을 선택하거나 검색어를 줄여보세요.</p><a class="button" href="/#cases">전체 글 보기</a></div>`;
  return `<div class="post-board"><table><caption class="sr-only">게시글 목록: 번호, 제목, 지역, 업체, 등록일</caption><thead><tr><th scope="col">번호</th><th scope="col">제목</th><th scope="col">지역</th><th scope="col">업체</th><th scope="col">등록일</th></tr></thead><tbody>${[...posts].sort((a,b)=>b.published_at.localeCompare(a.published_at)).map(p=>{
    const service=services.find(s=>s.id===p.service_id),region=regions.find(r=>r.id===p.region_id),company=companies.find(c=>c.id===p.company_id);
    return `<tr><td class="post-number">${p.id}</td><td class="post-subject"><span class="board-category">${e(service.name)}</span>${a('/post/'+p.id+'/',p.title,'board-title')}<span class="post-kind">${e(p.post_type)}</span></td><td>${a('/region/'+region.slug+'/',region.name)}</td><td>${a('/company/'+company.id+'/',company.name)}</td><td><time datetime="${p.published_at}">${p.published_at.slice(5).replace('-','.')}</time></td></tr>`;
  }).join('')}</tbody></table></div>`;
}
export function homePage(params,posts){
  const kind=postKinds[params.get('kind')]||'전체 글';
  const province=regionData.provinces.find(p=>p.code===params.get('province'));
  const district=regionData.districts.find(d=>d.code===params.get('district'));
  const dong=(regionData.dongs[district?.code]||[]).find(d=>d.code===params.get('dong'));
  const place=[province?.name,district?.name,dong?.name].filter(Boolean).join(' ')||'전국';
  const quickProvinces=['11','26','27','28','41','43','48','50'].map(code=>regionData.provinces.find(p=>p.code===code)).filter(Boolean);
  return `<div class="wrap portal"><div class="portal-intro"><h1>우리 동네의 작업 이야기</h1><p>지역과 업종을 골라 필요한 정보를 찾아보세요.</p></div>
    <div class="portal-layout"><div class="portal-content">
      <section class="filter-panel" id="regions" aria-labelledby="region-heading"><div class="filter-heading"><h2 id="region-heading">지역별 찾기</h2><span>전국 시·도 · 시·군·구 · 읍·면·동</span></div>${regionFilter(params)}</section>
      <section class="board-section" id="cases" aria-labelledby="board-heading"><div class="board-heading"><div><span class="board-kicker">${e(place)}</span><h2 id="board-heading">${e(kind)}</h2></div><div class="board-summary"><span>최신순 · 샘플 ${posts.length}건</span>${params.size?a('/#cases','필터 초기화','reset-link'):''}</div></div>
        <nav class="service-tabs" aria-label="업종 필터">${[{slug:'',name:'전체 업종'},...services].map(s=>`<a href="${e(filterUrl(params,{service:s.slug}))}" ${params.get('service')===s.slug||(!s.slug&&!params.get('service'))?'aria-current="page"':''}>${e(s.name)}</a>`).join('')}</nav>
        <p class="board-notice"><span>안내</span>업체와 게시글은 기능 확인용 샘플입니다. 실제 상담 연결은 준비 중입니다.</p>${board(posts)}<div class="board-bottom"><span>제목을 누르면 작업 내용과 업체 정보를 확인할 수 있습니다.</span><span class="page-current" aria-label="현재 페이지 1">1</span></div>
      </section>
      <section class="latest-section" id="services" aria-labelledby="latest-heading"><div class="section-head"><h2 id="latest-heading">업종별 최근 글</h2><span class="count">관심 있는 분야부터 살펴보세요</span></div><div class="mini-boards">${services.map(s=>`<section class="mini-board"><div><h3>${e(s.name)}</h3>${a('/service/'+s.slug+'/','더보기 →','all-link')}</div><ul>${published.filter(p=>p.service_id===s.id).slice(0,3).map(p=>`<li>${a('/post/'+p.id+'/',p.title)}</li>`).join('')}</ul></section>`).join('')}</div></section>
    </div><aside class="portal-sidebar" aria-label="빠른 탐색">
      <section class="sidebar-panel"><div class="sidebar-heading"><h2>업종 게시판</h2><span class="accent-dot"></span></div><ul class="service-links">${services.map(s=>`<li>${a('/service/'+s.slug+'/',s.name+' →')}</li>`).join('')}</ul></section>
      <section class="sidebar-panel"><div class="sidebar-heading"><h2>지역 바로가기</h2><a href="#regions" class="all-link">전체</a></div><div class="region-shortcuts">${quickProvinces.map(p=>a(filterUrl(params,{province:p.code,district:'',dong:'',region:''}),p.name)).join('')}</div></section>
      <section class="sidebar-guide"><span class="guide-label">처음 오셨나요?</span><h2>작업 과정을 보면<br>선택이 쉬워집니다.</h2><p>작업사례와 업체의 서비스 지역을 확인해보세요.</p>${a('/post/101/','작업사례 읽어보기 →')}</section>
    </aside></div></div>`;
}
