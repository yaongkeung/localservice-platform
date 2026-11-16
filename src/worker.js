import {storageReady,health} from './readiness.js';
import {companyGallery,companyPhotoResponse} from './company-photos.js';
import {displayPhone} from './companies.js';
import {descendantServiceIds} from './services.js';
import {sampleDataset,publicDataset} from './store.js';
import {cms} from './cms.js';
import {uploadedPhoto} from './uploads.js';
import {uploadClient} from './upload-client.js';
import {pageShell} from './public-shell.js';
import {siteOrigin,absolute,isoDate,sitemap,rss,robots} from './seo.js';
import {cmsRegionClient} from './cms-regions.js';
import {districtForPost, adminCodeForPost, provinceForPost} from './regions.js';
import {homePage, postKinds} from './home.js';
import {regionData} from './regions-data.js';
import {portalClient} from './client.js';
import {postImage} from './photos.js';
const origin=siteOrigin;
export const escapeHtml = value => String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const e=escapeHtml;
function render(url,data){
const {regions,services,companies,published,postImages:images}=data;
let breadcrumbItems=[];
const shell=options=>pageShell({...options,breadcrumbs:breadcrumbItems,image:options.image||(options.path==='/'?postImage(published.find(p=>postImage(p.id,images))?.id,images):undefined),sampleOnly:companies.every(c=>c.sample)&&published.every(p=>p.sample)});
const regionIds=region=>regions.filter(r=>r.id===region.id||r.slug.startsWith(region.slug+'/')).map(r=>r.id);
const region=p=>regions.find(r=>r.id===p.region_id);
const service=p=>services.find(s=>s.id===p.service_id);
const company=p=>companies.find(c=>c.id===p.company_id);
const postUrl=p=>`/post/${p.id}/`;
const regionUrl=r=>`/region/${r.slug}/`;
const serviceUrl=s=>`/service/${s.slug}/`;
const companyUrl=c=>`/company/${c.id}/`;
const link=(url,label,cls='')=>`<a class="${cls}" href="${e(url)}">${e(label)}</a>`;
function photoMarkup(post,mode='card'){
 const image=postImage(post.id,images);if(!image)return '';
 if(mode==='detail')return images.filter(i=>i.post_id===post.id).sort((a,b)=>a.sort_order-b.sort_order||a.id-b.id).map(image=>`<figure class="post-photo"><img src="${e(image.storage_key)}" alt="${e(image.alt_text)}" width="${image.width||960}" height="${image.height||640}" decoding="async"><figcaption>${image.sample?(image.storage_key.startsWith('/media/')?'AI 생성 샘플 이미지 · 실제 현장 사진이 아닙니다.':'샘플 게시글에 등록한 사진입니다.'):e(image.alt_text)}</figcaption></figure>`).join('');
 return `<a class="card-photo" href="${postUrl(post)}"><img src="${e(image.storage_key)}" alt="${e(image.alt_text)}" width="960" height="640" loading="lazy" decoding="async"></a>`;
}
function cards(list){return list.length?`<div class="grid">${list.map(p=>`<article class="card">${photoMarkup(p)}<span class="tag">${e(service(p).name)} · ${e(p.post_type)}</span><a href="${postUrl(p)}"><h3>${e(p.title)}</h3><p>${e(p.summary)}</p></a><div class="meta">${link(regionUrl(region(p)),region(p).name)} · ${link(companyUrl(company(p)),company(p).name)}<br><time datetime="${p.published_at}">${p.published_at}</time>${p.sample?' · 샘플':''}</div></article>`).join('')}</div>`:'<div class="empty"><h3>조건에 맞는 사례가 없습니다</h3><p>다른 지역이나 업종을 선택하거나 검색어를 줄여보세요.</p><a class="button" href="/">전체 사례 보기</a></div>';}
function phone(c){return c.phone?`<a class="button call" href="tel:${e(c.phone)}">전화 상담 · ${e(displayPhone(c.phone))}</a>`:'<span class="disabled" aria-disabled="true">전화 상담 · 연락처 준비 중</span><p class="muted">상담 연락처를 확인 중입니다.</p>';}
function crumbs(items){breadcrumbItems=[{name:'홈',url:'/'},...items.map(i=>({name:i.name,url:i.url||url.pathname}))];return `<nav class="crumb" aria-label="현재 위치">${link('/','홈')}${items.map(i=>` / ${i.url?link(i.url,i.name):`<span>${e(i.name)}</span>`}`).join('')}</nav>`;}

const path=url.pathname;const params=url.searchParams;
  if(path==='/') {
    let list=published;
    const r=regions.find(r=>r.slug===params.get('region'));
    const s=services.find(s=>s.slug===params.get('service'));
    const q=(params.get('q')||'').trim().slice(0,100);
    if(params.get('province'))list=list.filter(p=>provinceForPost(p,regions)===params.get('province'));
    if(params.get('district'))list=list.filter(p=>districtForPost(p,regions)===params.get('district'));
    if(params.get('dong'))list=list.filter(p=>adminCodeForPost(p,regions)===params.get('dong'));
    if(params.get('region'))list=r?list.filter(p=>regionIds(r).includes(p.region_id)):[];
    if(params.get('service'))list=s?list.filter(p=>descendantServiceIds(s,services).includes(p.service_id)):[];
    if(params.get('kind'))list=list.filter(p=>p.post_type===postKinds[params.get('kind')]);
    if(q)list=list.filter(p=>[p.title,p.summary,...p.content,company(p).name].join(' ').includes(q));
    return shell({title:'우리 동네 작업사례·서비스 게시판',description:'전국 지역과 업종별 작업사례, 서비스 안내, 작업팁과 업체 정보를 찾아보세요.',path:'/',noindex:!!url.search,params,body:homePage(params,list,data)});
  }
  const r=regions.find(r=>regionUrl(r)===path);const s=services.find(s=>serviceUrl(s)===path);if(r||s){const list=published.filter(p=>r?regionIds(r).includes(p.region_id):descendantServiceIds(s,services).includes(p.service_id));return shell({title:`${(r||s).name} 게시판`,description:`${(r||s).name}의 출장서비스 작업사례와 업체를 확인하세요.`,path,noindex:!list.length,body:`<div class="wrap">${crumbs([{name:(r||s).name+' 게시판'}])}<span class="eyebrow">${r?'LOCAL AREA':'SERVICE GUIDE'}</span><h1 class="page-title">${e((r||s).name)} ${r?'지역':'업종'} 게시판</h1><p class="muted">작업사례에서 과정과 업체 정보를 함께 확인하세요.</p><section class="section"><div class="chips">${(r?regions:services).map(x=>`<a class="chip" ${x.id===(r||s).id?'aria-current="page"':''} href="${r?regionUrl(x):serviceUrl(x)}">${e(x.name)}</a>`).join('')}</div></section><section class="section"><div class="section-head"><h2>작업사례와 안내</h2><span class="count">${list.every(p=>p.sample)?'샘플 ':''}${list.length}건</span></div>${cards(list)}</section></div>`});}
  const p=published.find(p=>postUrl(p)===path);if(p){const c=company(p);return shell({title:p.seo_title||p.title,description:p.seo_description||p.summary,path,image:postImage(p.id,images),schema:{'@context':'https://schema.org','@type':'Article',headline:p.title,description:p.summary,datePublished:p.published_at,dateModified:isoDate(p.updated_at||p.published_at),image:images.filter(i=>i.post_id===p.id).map(i=>absolute(i.storage_key)),mainEntityOfPage:origin+path,author:{'@type':'Organization',name:c.name,url:origin+companyUrl(c)}},body:`<div class="wrap">${crumbs([{name:region(p).name,url:regionUrl(region(p))},{name:p.title}])}<span class="tag">${e(service(p).name)} · ${p.sample?'샘플 ':''}${e(p.post_type)}</span><h1 class="page-title">${e(p.title)}</h1><p class="muted">${e(region(p).name)} · <time datetime="${p.published_at}">${p.published_at}</time></p><div class="detail"><article class="panel prose">${photoMarkup(p,'detail')}<strong>${e(p.summary)}</strong>${p.content.map(t=>`<p>${e(t)}</p>`).join('')}<hr>${p.sample?'<p class="muted">이 글은 기능 확인용 샘플이며 실제 시공 실적이 아닙니다.</p>':''}<div class="chips">${link(regionUrl(region(p)),region(p).name+' 사례','chip')}${link(serviceUrl(service(p)),service(p).name+' 사례','chip')}</div></article><aside class="panel aside"><span class="eyebrow">COMPANY</span><h2>${e(c.name)}</h2><p>${e(c.description)}</p><p class="muted">${e(c.area)}</p>${link(companyUrl(c),'업체 프로필 보기 ↗','all-link')}${phone(c)}</aside></div><section class="section"><div class="section-head"><h2>다른 작업 이야기</h2></div>${cards(published.filter(x=>x.id!==p.id))}</section></div>`});}
  const c=companies.find(c=>companyUrl(c)===path);if(c)return shell({title:c.name+' 업체 프로필',description:c.description,path,body:`<div class="wrap">${crumbs([{name:'업체 프로필'}])}<div class="detail"><section class="panel"><span class="tag">${c.sample?'샘플 업체':'업체 프로필'}</span><h1 class="page-title">${e(c.name)}</h1><p>${e(c.description)}</p><p><strong>서비스 지역</strong><br>${e(c.area)}</p><p><strong>상담 시간${c.sample?' (예시)':''}</strong><br>${e(c.hours||'전화로 문의해 주세요.')}</p></section><aside class="panel aside"><h2>작업 상담 안내</h2><p>증상과 현장 상황을 정리하면 상담에 도움이 됩니다.</p>${phone(c)}</aside></div>${companyGallery(c,data.companyImages)}<section class="section"><div class="section-head"><h2>이 업체의 작업 이야기</h2></div>${published.some(p=>p.company_id===c.id)?cards(published.filter(p=>p.company_id===c.id)):'<div class="empty"><h3>아직 등록된 작업사례가 없습니다</h3><p>서비스 내용과 작업 가능 여부는 업체에 문의해 주세요.</p></div>'}</section></div>`});
  return shell({title:'페이지를 찾을 수 없습니다',description:'주소를 확인하거나 메인에서 작업사례를 찾아보세요.',path,status:404,noindex:true,body:'<div class="wrap section"><h1>페이지를 찾을 수 없습니다</h1><p>주소가 변경되었거나 등록되지 않은 페이지입니다.</p><a class="button" href="/">메인으로 돌아가기</a></div>'});
}
async function handle(request,env={}){
  const url=new URL(request.url);
  if(url.pathname==='/healthz'){if(!['GET','HEAD'].includes(request.method))return new Response(null,{status:405});return health(request,env);}
  if(['staging','production'].includes(env.APP_ENV)&&!storageReady(env))return new Response('서비스 준비 중입니다.',{status:503,headers:{'cache-control':'no-store'}});
  if(url.pathname==='/admin'||url.pathname.startsWith('/admin/')){
    if(url.pathname==='/admin')return Response.redirect(url.origin+'/admin/',308);
    const response=await cms(request,env);return request.method==='HEAD'?new Response(null,{status:response.status,headers:response.headers}):response;
  }
  if(!['GET','HEAD'].includes(request.method))return new Response('Method not allowed',{status:405,headers:{Allow:'GET, HEAD'}});
  if(['/sitemap.xml','/rss.xml','/robots.txt'].includes(url.pathname)){
    const body=url.pathname==='/robots.txt'?robots():url.pathname==='/sitemap.xml'?sitemap(env.DB?await publicDataset(env.DB):sampleDataset()):rss(env.DB?await publicDataset(env.DB):sampleDataset());
    const type=url.pathname==='/robots.txt'?'text/plain':url.pathname==='/rss.xml'?'application/rss+xml':'application/xml';
    return new Response(request.method==='HEAD'?null:body,{headers:{'content-type':type+'; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'}});
  }
  if(url.pathname.startsWith('/company-photos/'))return companyPhotoResponse(request,env);
  if(url.pathname.startsWith('/uploads/'))return uploadedPhoto(request,env);
  if(url.pathname.startsWith('/media/')){
    if(!/^\/media\/[a-z0-9-]+\.(?:jpg|png)$/.test(url.pathname))return new Response('Not found',{status:404});
    return env.ASSETS?env.ASSETS.fetch(request):new Response('Image assets not configured',{status:503});
  }
  let body,type;
  if(url.pathname==='/assets/cms-regions.js'){body='('+cmsRegionClient.toString()+')();';type='text/javascript';}
  else if(url.pathname==='/assets/upload.js'){body='('+uploadClient.toString()+')();';type='text/javascript';}
  else if(url.pathname==='/assets/portal.js'){body='('+portalClient.toString()+')();';type='text/javascript';}
  else if(url.pathname==='/assets/regions.json'){body=JSON.stringify({provinces:regionData.provinces,districts:regionData.districts});type='application/json';}
  else if(/^\/assets\/regions\/\d{5}\.json$/.test(url.pathname)){
    const items=regionData.dongs[url.pathname.split('/').at(-1).slice(0,5)];
    if(!items)return new Response('Not found',{status:404});
    body=JSON.stringify(items);type='application/json';
  }
  if(type)return new Response(request.method==='HEAD'?null:body,{headers:{'content-type':type+'; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'}});
  if(!url.pathname.endsWith('/')&&!url.pathname.includes('.')){url.pathname+='/';return Response.redirect(url.href,308);}
  const response=render(url,env.DB?await publicDataset(env.DB):sampleDataset());
  return request.method==='HEAD'?new Response(null,{status:response.status,headers:response.headers}):response;
}
export default {async fetch(request,env={}){
 try{const response=await handle(request,env);if(env.APP_ENV!=='staging')return response;const headers=new Headers(response.headers);headers.set('x-robots-tag','noindex, nofollow');return new Response(response.body,{status:response.status,statusText:response.statusText,headers});}
 catch(error){const message=String(error?.message||''),category=/D1|database/i.test(message)?'database':/body|stream|formdata/i.test(message)?'request_stream':/memory|CPU|allocation|heap/i.test(message)?'resource':'other';console.error('Worker request failed',error?.name||'Error',category);return new Response('서비스 준비 중입니다. 잠시 후 다시 시도해 주세요.',{status:503,headers:{'cache-control':'no-store','x-robots-tag':'noindex, nofollow'}});}
}};
