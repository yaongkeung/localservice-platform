import {services,companies,regions,published} from './data.js';
import {regionFilter} from './regions.js';
import {regionData} from './regions-data.js';
import {postImage,dailyHighlights,seoulDate} from './photos.js';
const e=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const postKinds={case:'작업사례',guide:'서비스안내',local:'지역정보',tip:'작업팁'};
const a=(url,label,cls='')=>`<a class="${cls}" href="${e(url)}">${e(label)}</a>`;
const icon=(symbol,tone='sky')=>`<span class="color-icon tone-${tone}" aria-hidden="true">${symbol}</span>`;
export function filterUrl(params,changes){const next=new URLSearchParams(params);for(const [key,value]of Object.entries(changes)){if(value)next.set(key,value);else next.delete(key);}return '/'+(next.size?'?'+next.toString():'')+'#cases';}
export function portalHeader(params=new URLSearchParams()){
  const nav=[['','전체 글'],...Object.entries(postKinds)];
  const navIcons={'':'🗂️',case:'🔧',guide:'📌',local:'📍',tip:'💡'};
  return `<header class="masthead"><div class="wrap header"><a class="brand" href="/">공사<span>8282</span><small>우리 동네 출장서비스 포털</small></a>
    <form class="header-search" action="/" method="get" role="search"><label class="sr-only" for="portal-q">게시글 검색</label><input id="portal-q" name="q" maxlength="100" value="${e(params.get('q')||'')}" placeholder="지역, 업종, 작업사례 검색">${[...params].filter(([key])=>['province','district','dong','region','service','kind'].includes(key)).map(([key,value])=>`<input type="hidden" name="${key}" value="${e(value)}">`).join('')}<button type="submit" aria-label="게시글 검색">검색</button></form>
    <span class="header-note"><span aria-hidden="true">✨</span> 작업 경험으로 연결되는 우리 동네</span></div>
    <div class="nav-band"><nav class="wrap main-nav" aria-label="주 메뉴">${nav.map(([kind,name])=>`<a href="${e(filterUrl(params,{kind}))}" ${params.get('kind')===kind||(!kind&&!params.get('kind'))?'aria-current="page"':''}><span class="nav-emoji" aria-hidden="true">${navIcons[kind]}</span>${e(name)}</a>`).join('')}</nav></div></header>`;
}
function photoStrip(){
  const day=seoulDate(),picks=dailyHighlights(day);
  if(!picks.length)return '';
  return `<section class="photo-highlights" aria-labelledby="photo-heading"><div class="photo-heading"><h2 id="photo-heading">${icon('📸','lilac')}오늘의 업종 한 컷</h2><span class="photo-date">${e(day.slice(5).replace('-','.'))} <span>· 샘플 이미지</span></span></div><div class="photo-strip">${picks.map(({service,post,image},i)=>`<a class="photo-pick tone-${service.tone}" href="/post/${post.id}/"><div class="pick-photo"><img src="${e(image.storage_key)}" srcset="${e(image.thumbnail_key)} 180w, ${e(image.storage_key)} 960w" sizes="(max-width:760px) 58vw, 260px" alt="${e(image.alt_text)}" width="960" height="640" decoding="async" ${i?'loading="lazy"':'fetchpriority="high"'}><span class="pick-service"><span aria-hidden="true">${service.icon}</span> ${e(service.name)}</span><span class="pick-sample">샘플</span></div><div class="pick-caption"><strong>${e(post.title)}</strong><span>작업 이야기 보기 <span aria-hidden="true">↗</span></span></div></a>`).join('')}</div></section>`;
}
function board(posts){
  if(!posts.length)return `<div class="empty"><h3>조건에 맞는 사례가 없습니다</h3><p>다른 지역·업종을 선택하거나 검색어를 줄여보세요.</p><a class="button" href="/#cases">전체 글 보기</a></div>`;
  return `<div class="post-board"><table><caption class="sr-only">게시글 목록: 번호, 제목, 지역, 업체, 등록일</caption><thead><tr><th scope="col">번호</th><th scope="col">제목</th><th scope="col">지역</th><th scope="col">업체</th><th scope="col">등록일</th></tr></thead><tbody>${[...posts].sort((a,b)=>b.published_at.localeCompare(a.published_at)).map(p=>{
    const service=services.find(s=>s.id===p.service_id),region=regions.find(r=>r.id===p.region_id),company=companies.find(c=>c.id===p.company_id);
    const image=postImage(p.id);
    const thumbnail=image?`<a class="post-thumb" href="/post/${p.id}/" aria-label="${e(p.title)} 사진으로 보기"><img src="${e(image.thumbnail_key)}" alt="${e(image.alt_text)}" width="90" height="60" loading="lazy" decoding="async"></a>`:'<span class="post-thumb thumb-empty" aria-hidden="true">📷</span>';
    return `<tr><td class="post-number">${p.id}</td><td class="post-subject"><div class="post-preview">${thumbnail}<div class="post-copy"><span class="board-category tone-${service.tone}"><span aria-hidden="true">${service.icon}</span> ${e(service.name)}</span>${a('/post/'+p.id+'/',p.title,'board-title')}<span class="post-kind">${e(p.post_type)}</span></div></div></td><td>${a('/region/'+region.slug+'/',region.name)}</td><td>${a('/company/'+company.id+'/',company.name)}</td><td><time datetime="${p.published_at}">${p.published_at.slice(5).replace('-','.')}</time></td></tr>`;
  }).join('')}</tbody></table></div>`;
}
export function homePage(params,posts){
  const kind=postKinds[params.get('kind')]||'전체 글';
  const province=regionData.provinces.find(p=>p.code===params.get('province'));
  const district=regionData.districts.find(d=>d.code===params.get('district'));
  const dong=(regionData.dongs[district?.code]||[]).find(d=>d.code===params.get('dong'));
  const place=[province?.name,district?.name,dong?.name].filter(Boolean).join(' ')||'전국';
  const quickProvinces=['11','26','27','28','41','43','48','50'].map(code=>regionData.provinces.find(p=>p.code===code)).filter(Boolean);
  return `<div class="wrap portal"><div class="portal-intro">${icon('👋','lilac')}<div><h1>우리 동네의 작업 이야기</h1><p>지역과 업종을 골라 필요한 정보를 찾아보세요.</p></div><span class="intro-flower" aria-hidden="true">✦</span></div>
    <div class="portal-layout"><div class="portal-content">
      <section class="filter-panel" id="regions" aria-labelledby="region-heading"><div class="filter-heading"><h2 id="region-heading">${icon('📍','peach')}지역별 찾기</h2><span>전국 시·도 · 시·군·구 · 읍·면·동</span></div>${regionFilter(params)}</section>
      ${photoStrip()}
      <section class="board-section" id="cases" aria-labelledby="board-heading"><div class="board-heading"><div><span class="board-kicker">${e(place)}</span><h2 id="board-heading">${e(kind)}</h2></div><div class="board-summary"><span>최신순 · 샘플 ${posts.length}건</span>${params.size?a('/#cases','필터 초기화','reset-link'):''}</div></div>
        <nav class="service-tabs" aria-label="업종 필터">${[{slug:'',name:'전체 업종',icon:'✨',tone:'lilac'},...services].map(s=>`<a href="${e(filterUrl(params,{service:s.slug}))}" ${params.get('service')===s.slug||(!s.slug&&!params.get('service'))?'aria-current="page"':''}>${icon(s.icon,s.tone)}${e(s.name)}</a>`).join('')}</nav>
        <p class="board-notice"><span>안내</span>업체·게시글·사진은 샘플입니다. 실제 상담 연결은 준비 중입니다.</p>${board(posts)}<div class="board-bottom"><span>사진이나 제목을 누르면 작업 내용과 업체 정보를 볼 수 있습니다.</span><span class="page-current" aria-label="현재 페이지 1">1</span></div>
      </section>
      <section class="latest-section" id="services" aria-labelledby="latest-heading"><div class="section-head"><h2 id="latest-heading">업종별 최근 글</h2><span class="count">관심 있는 분야부터 살펴보세요</span></div><div class="mini-boards">${services.map(s=>`<section class="mini-board tone-${s.tone}"><div><h3>${icon(s.icon,s.tone)}${e(s.name)}</h3>${a('/service/'+s.slug+'/','더보기 →','all-link')}</div><ul>${published.filter(p=>p.service_id===s.id).slice(0,3).map(p=>`<li>${a('/post/'+p.id+'/',p.title)}</li>`).join('')}</ul></section>`).join('')}</div></section>
    </div><aside class="portal-sidebar" aria-label="빠른 탐색">
      <section class="sidebar-panel"><div class="sidebar-heading"><h2>${icon('🧰','lilac')}업종 게시판</h2><span class="accent-dot"></span></div><ul class="service-links">${services.map(s=>`<li><a href="/service/${s.slug}/">${icon(s.icon,s.tone)}<span>${e(s.name)}</span><span class="service-arrow" aria-hidden="true">→</span></a></li>`).join('')}</ul></section>
      <section class="sidebar-panel"><div class="sidebar-heading"><h2>${icon('🧭','mint')}지역 바로가기</h2><a href="#regions" class="all-link">전체</a></div><div class="region-shortcuts">${quickProvinces.map(p=>a(filterUrl(params,{province:p.code,district:'',dong:'',region:''}),p.name)).join('')}</div></section>
      <section class="sidebar-guide"><span class="guide-label">처음 오셨나요?</span><span class="guide-spark" aria-hidden="true">🌈</span><h2>작업 과정을 보면<br>선택이 쉬워집니다.</h2><p>작업사례와 업체의 서비스 지역을 확인해보세요.</p>${a('/post/101/','작업사례 읽어보기 →')}</section>
    </aside></div></div>`;
}
