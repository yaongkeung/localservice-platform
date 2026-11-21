import {postUrl} from './post-urls.js';
import {populatedServices} from './public-catalog.js';
import {descendantServiceIds,sortServices} from './services.js';
import {registeredCompanies} from './companies.js';
import {brandMark,siteName} from './brand.js';
import {sampleDataset} from './store.js';
import {regionFilter} from './regions.js';
import {groupForCode} from './township-groups.js';
import {regionData} from './regions-data.js';
import {postImage,randomHighlights,seoulDate} from './photos.js';
const e=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const postKinds={case:'작업사례',guide:'서비스안내',local:'지역정보',tip:'작업팁'};
const a=(url,label,cls='')=>`<a class="${cls}" href="${e(url)}">${e(label)}</a>`;
const icon=(symbol,tone='sky')=>`<span class="color-icon tone-${tone}" aria-hidden="true">${symbol}</span>`;
function serviceLinks(services,parent=null){return `<ul class="${parent===null?'service-links':'sub-service-links'}">${services.filter(s=>(s.parent_id||null)===parent).map(s=>{const label=`${icon(s.icon,s.tone)}<span>${e(s.name)}</span>`;return `<li>${services.some(child=>child.parent_id===s.id)?`<details class="service-group"><summary>${label}</summary><a class="all-link" href="/service/${s.slug}/">${e(s.name)} 전체 보기 →</a>${serviceLinks(services,s.id)}</details>`:`<a href="/service/${s.slug}/">${label}<span class="service-arrow" aria-hidden="true">→</span></a>`}</li>`;}).join('')}</ul>`;}
function allServiceLinks(services){
 if(services.length<=16)return serviceLinks(services);
 const list=rows=>`<ul class="service-links">${rows.map(service=>`<li><a href="/service/${e(service.slug)}/">${icon(service.icon,service.tone)}<span>${e(service.name)}</span><span class="service-arrow" aria-hidden="true">→</span></a></li>`).join('')}</ul>`;
 return `<p class="industry-order">가나다순 · 전체 ${services.length}개</p>${list(services.slice(0,8))}<details class="industry-more"><summary>업종 더보기 · 나머지 ${services.length-8}개</summary>${list(services.slice(8))}</details>`;
}
export function serviceFilter(services,params){
 if(services.length<=16)return `<nav class="service-tabs" aria-label="업종 필터">${[{slug:'',name:'전체 업종',icon:'✨',tone:'lilac'},...services].map(service=>`<a href="${e(filterUrl(params,{service:service.slug}))}" ${params.get('service')===service.slug||(!service.slug&&!params.get('service'))?'aria-current="page"':''}>${icon(service.icon,service.tone)}${e(service.name)}</a>`).join('')}</nav>`;
 return `<form class="service-picker" action="/" method="get" aria-label="업종 필터"><label for="service-select">업종 선택 · 가나다순<select id="service-select" name="service"><option value="">전체 업종 (${services.length}개)</option>${services.map(service=>`<option value="${e(service.slug)}" ${params.get('service')===service.slug?'selected':''}>${e(service.name)}</option>`).join('')}</select></label>${[...params].filter(([key])=>['province','district','dong','region','kind','q'].includes(key)).map(([key,value])=>`<input type="hidden" name="${key}" value="${e(value)}">`).join('')}<button>업종 적용</button></form>`;
}
export function filterUrl(params,changes){const next=new URLSearchParams(params);if(Object.keys(changes).some(key=>key!=='page'))next.delete('page');for(const [key,value]of Object.entries(changes)){if(value)next.set(key,value);else next.delete(key);}return '/'+(next.size?'?'+next.toString():'')+'#cases';}
export function portalHeader(params=new URLSearchParams()){
  const nav=[['','전체 글'],...Object.entries(postKinds)];
  const navIcons={'':'🗂️',case:'🔧',guide:'📌',local:'📍',tip:'💡'};
  return `<header class="masthead"><div class="wrap header" data-nosnippet>${brandMark()}
    <form class="header-search" action="/" method="get" role="search"><label class="sr-only" for="portal-q">게시글 검색</label><input id="portal-q" name="q" maxlength="100" value="${e(params.get('q')||'')}" placeholder="지역, 업종, 작업사례 검색">${[...params].filter(([key])=>['province','district','dong','region','service','kind'].includes(key)).map(([key,value])=>`<input type="hidden" name="${key}" value="${e(value)}">`).join('')}<button type="submit" aria-label="게시글 검색">검색</button></form>
    <span class="header-note"><span aria-hidden="true">✨</span> 작업 경험으로 연결되는 우리 동네</span></div>
    <div class="nav-band" data-nosnippet><nav class="wrap main-nav" aria-label="주 메뉴">${nav.map(([kind,name])=>`<a href="${e(filterUrl(params,{kind}))}" ${params.get('kind')===kind||(!kind&&!params.get('kind'))?'aria-current="page"':''}><span class="nav-emoji" aria-hidden="true">${navIcons[kind]}</span>${e(name)}</a>`).join('')}</nav></div></header>`;
}
function photoStrip(data){
  const {published,services,postImages:images}=data;
  const day=seoulDate(),picks=randomHighlights(data.companies,published,services,images,6,Math.random,day);
  if(!picks.length)return '';
  return `<section class="photo-highlights" aria-labelledby="photo-heading"><div class="photo-heading"><h2 id="photo-heading">${icon('📸','lilac')}오늘의 업종 한 컷</h2><span class="photo-date">${e(day.slice(5).replace('-','.'))} <span>${picks.every(p=>p.image.sample)?'· 샘플 이미지':''}</span></span></div><div class="photo-strip">${picks.map(({service,post,image},i)=>`<a class="photo-pick tone-${service.tone}" href="${postUrl(post)}"><div class="pick-photo"><img src="${e(image.storage_key)}" srcset="${e(image.thumbnail_key)} 180w, ${e(image.storage_key)} 960w" sizes="(max-width:760px) 58vw, 260px" alt="${e(image.alt_text)}" width="960" height="640" decoding="async" ${i?'loading="lazy"':'fetchpriority="high"'}><span class="pick-service"><span aria-hidden="true">${service.icon}</span> ${e(service.name)}</span>${image.sample?'<span class="pick-sample">샘플</span>':''}</div><div class="pick-caption"><strong>${e(post.title)}</strong><span>작업 이야기 보기 <span aria-hidden="true">↗</span></span></div></a>`).join('')}</div></section>`;
}
function board(posts,data){
  const {postImages:images}=data;
  if(!posts.length)return `<div class="empty"><h3>조건에 맞는 사례가 없습니다</h3><p>다른 지역·업종을 선택하거나 검색어를 줄여보세요.</p><a class="button" href="/#cases">전체 글 보기</a></div>`;
  return `<div class="post-board"><table><caption class="sr-only">게시글 목록: 번호, 사진과 제목, 등록일</caption><thead><tr><th scope="col">번호</th><th scope="col">사진과 제목</th><th scope="col">등록일</th></tr></thead><tbody>${[...posts].sort((a,b)=>b.published_at.localeCompare(a.published_at)).map(p=>{
    const image=postImage(p.id,images);
    const thumbnail=image?`<a class="post-thumb" href="${postUrl(p)}" aria-label="${e(p.title)} 사진으로 보기"><img src="${e(image.thumbnail_key)}" alt="${e(image.alt_text)}" width="40" height="40" loading="lazy" decoding="async"></a>`:'<span class="post-thumb thumb-empty" aria-hidden="true">📷</span>';
    return `<tr><td class="post-number">${p.id}</td><td class="post-subject"><div class="post-preview">${thumbnail}<div class="post-copy">${a(postUrl(p),p.title,'board-title')}</div></div></td><td class="post-date"><time datetime="${p.published_at}">${p.published_at.slice(5,10).replace('-','.')}</time></td></tr>`;
  }).join('')}</tbody></table></div>`;
}
export function homePage(params,posts,data=sampleDataset()){
  const services=sortServices(data.services),{published}=data;
  const pageSize=20,pageCount=Math.max(1,Math.ceil(posts.length/pageSize)),currentPage=Math.min(pageCount,Math.max(1,Number.parseInt(params.get('page'),10)||1)),pagePosts=[...posts].sort((a,b)=>b.published_at.localeCompare(a.published_at)).slice((currentPage-1)*pageSize,currentPage*pageSize);
  const firstPage=Math.max(1,Math.min(currentPage-2,pageCount-4)),pageNumbers=Array.from({length:Math.min(5,pageCount)},(_,i)=>firstPage+i);
  const pageLink=(number,label)=>`<a href="${e(filterUrl(params,{page:number===1?'':String(number)}))}" aria-label="${number}페이지">${label}</a>`;
  const pager=`<nav class="board-pagination" aria-label="게시글 페이지">${currentPage>1?pageLink(currentPage-1,'이전'):''}${pageNumbers.map(number=>number===currentPage?`<span class="page-current" aria-current="page">${number}</span>`:pageLink(number,number)).join('')}${currentPage<pageCount?pageLink(currentPage+1,'다음'):''}</nav>`;
  const kind=postKinds[params.get('kind')]||'전체 글';
  const province=regionData.provinces.find(p=>p.code===params.get('province'));
  const district=regionData.districts.find(d=>d.code===params.get('district'));
  const dong=groupForCode(params.get('dong'));
  const place=[province?.name,district?.name,dong?.name].filter(Boolean).join(' ')||'전국';
  const quickProvinces=['11','26','27','28','41','43','48','50'].map(code=>regionData.provinces.find(p=>p.code===code)).filter(Boolean);
  return `<div class="wrap portal"><div class="portal-intro">${icon('👋','lilac')}<div><h1>우리 동네의 작업 이야기</h1><p>지역과 업종을 골라 필요한 정보를 찾아보세요.</p></div><span class="intro-flower" aria-hidden="true">✦</span></div>
    <div class="portal-layout"><div class="portal-content">
      ${registeredCompanies(data.companies,params,data.published,data.postImages)}
      ${photoStrip(data)}
      <section class="board-section" id="cases" aria-labelledby="board-heading"><div class="board-heading"><div><span class="board-kicker">${e(place)}</span><h2 id="board-heading">${e(kind)}</h2></div><div class="board-summary"><span>최신순 · ${posts.length&&posts.every(p=>p.sample)?'샘플 ':''}${posts.length}건</span>${params.size?a('/#cases','필터 초기화','reset-link'):''}</div></div>
        ${serviceFilter(services,params)}
        <p class="board-notice"><span>안내</span>${published.length&&published.every(p=>p.sample)?'아래 게시글·사진은 샘플이며 실제 작업 실적이 아닙니다.':'글의 작업 내용과 업체 정보를 확인한 후 상담해 주세요.'}</p>${board(pagePosts,data)}<div class="board-bottom"><span>사진이나 제목을 누르면 자세히 볼 수 있습니다.</span>${pager}</div>
      </section>
      <section class="latest-section" id="services" aria-labelledby="latest-heading"><div class="section-head"><h2 id="latest-heading">업종별 최근 글</h2><span class="count">관심 있는 분야부터 살펴보세요</span></div><div class="mini-boards">${services.filter(s=>!s.parent_id&&published.some(post=>descendantServiceIds(s,services).includes(post.service_id))).map(s=>`<section class="mini-board tone-${s.tone}"><div><h3>${icon(s.icon,s.tone)}${e(s.name)}</h3>${a('/service/'+s.slug+'/','더보기 →','all-link')}</div><ul>${published.filter(p=>descendantServiceIds(s,services).includes(p.service_id)).slice(0,3).map(p=>`<li>${a(postUrl(p),p.title)}</li>`).join('')}</ul></section>`).join('')||'<p class="cms-help">아직 등록된 글이 없습니다.</p>'}</div></section>
    </div><aside class="portal-sidebar" aria-label="빠른 탐색">
      <section class="sidebar-guide expert-guide" aria-labelledby="expert-guide-heading"><div class="expert-portrait"><img src="/media/expert-mascot.png" alt="" width="1254" height="1254" loading="lazy" decoding="async"><a class="expert-admin-entry" href="/admin/login/" aria-label="관리자 로그인" rel="nofollow"></a></div><div class="expert-guide-copy"><span class="guide-label">${siteName}의 동네 안내</span><h2 id="expert-guide-heading">필요한 순간,<br> 가까운 전문가를 찾아보세요.</h2><p>작업 이야기부터 살펴보고<br> 우리 동네 업체를 만나보세요.</p>${a('/#cases','작업사례 둘러보기 →')}</div></section>
      <section class="sidebar-panel"><div class="sidebar-heading"><h2>${icon('🧰','lilac')}업종 게시판</h2><span class="accent-dot"></span></div>${allServiceLinks(populatedServices(services,published))}<p class="cms-help">글이 등록된 업종입니다. 전체 업종은 위 선택창에서 찾을 수 있습니다.</p></section>
      <section class="sidebar-panel"><div class="sidebar-heading"><h2>${icon('🧭','mint')}지역 바로가기</h2><a href="#regions" class="all-link">전체</a></div><div class="region-shortcuts">${quickProvinces.map(p=>a(filterUrl(params,{province:p.code,district:'',dong:'',region:''}),p.name)).join('')}</div></section>
      <section class="sidebar-panel region-finder" id="regions" aria-label="지역 상세 찾기" data-nosnippet><details id="region-details" ${province||district||dong||params.get('region')?'open':''}><summary><span class="region-finder-symbol" aria-hidden="true">⌖</span><span class="region-finder-copy"><strong>지역 상세 찾기</strong><span>${e(place)}<span class="region-finder-hint"> · 시·도부터 동네까지</span></span></span><span class="region-finder-chevron" aria-hidden="true"></span></summary><div class="region-finder-body">${regionFilter(params)}</div></details></section>
    </aside></div></div>`;
}
