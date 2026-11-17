import {randomSample} from './random-selection.js';
import {postImage,seoulDate} from './photos.js';
function companyCover(company,posts,images){
 const active=images.filter(image=>!image.excluded&&!image.sample);
 const post=[...posts].filter(post=>post.company_id===company.id&&post.status==='PUBLISHED'&&!post.sample&&post.published_at<=seoulDate()&&postImage(post.id,active)).sort((a,b)=>b.published_at.localeCompare(a.published_at)||b.id-a.id)[0],image=post&&postImage(post.id,active);
 return image?`<a class="company-cover" href="/post/${post.id}/" aria-label="${e(post.title)}"><img src="${e(image.storage_key)}" alt="${e(image.alt_text)}" width="${image.width||960}" height="${image.height||640}" loading="lazy" decoding="async"></a>`:`<a class="company-cover company-cover-empty" href="/company/${company.id}/" aria-label="${e(company.name)} 업체 프로필"><span aria-hidden="true">📷</span><span>사진 준비 중</span></a>`;
}

const e=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const displayPhone=phone=>String(phone||'').replace(/^(010)(\d{4})(\d{4})$/,'$1-$2-$3');
export function registeredCompanies(companies,params=new URLSearchParams(),posts=[],images=[],random=Math.random){
 const query=(params.get('q')||'').trim().slice(0,100).normalize('NFKC').replace(/\s+/g,'').toLowerCase();
 const eligible=companies.filter(c=>!c.sample&&(!c.status||c.status==='ACTIVE')).filter(c=>!query||[c.name,c.description,c.area].join(' ').normalize('NFKC').replace(/\s+/g,'').toLowerCase().includes(query));
 const rows=eligible.length>10?randomSample(eligible,10,random):eligible;
 if(!rows.length)return '';
 return `<section class="company-directory" id="companies" aria-labelledby="companies-heading"><div class="section-head"><h2 id="companies-heading"><span aria-hidden="true">🏪</span> 등록 업체 안내</h2><span class="count">업체별 서비스 지역을 확인해 주세요</span></div><div class="registered-companies">${rows.map(c=>`<article class="registered-company">${companyCover(c,posts,images)}<span class="tag">업체 소개</span><h3><a href="/company/${c.id}/">${e(c.name)}</a></h3><p class="company-area"><span aria-hidden="true">📍</span> ${e(c.area)}</p><p class="company-summary">${e(c.description)}</p><div class="company-contact"><a class="all-link" href="/company/${c.id}/">업체 프로필 보기 ↗</a>${c.phone?`<a class="button call" href="tel:${e(c.phone)}">전화 상담 · ${e(displayPhone(c.phone))}</a>`:'<span class="muted">상담 연락처 준비 중</span>'}</div></article>`).join('')}</div></section>`;
}
