import {companyCover} from './company-photos.js';
const e=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const displayPhone=phone=>String(phone||'').replace(/^(010)(\d{4})(\d{4})$/,'$1-$2-$3');
export function registeredCompanies(companies,params=new URLSearchParams(),images=[]){
 const query=(params.get('q')||'').trim().slice(0,100).normalize('NFKC').replace(/\s+/g,'').toLowerCase();
 const rows=companies.filter(c=>!c.sample&&(!c.status||c.status==='ACTIVE')).filter(c=>!query||[c.name,c.description,c.area].join(' ').normalize('NFKC').replace(/\s+/g,'').toLowerCase().includes(query));
 if(!rows.length)return '';
 return `<section class="company-directory" id="companies" aria-labelledby="companies-heading"><div class="section-head"><h2 id="companies-heading"><span aria-hidden="true">🏪</span> 등록 업체 안내</h2><span class="count">업체별 서비스 지역을 확인해 주세요</span></div><div class="registered-companies">${rows.map(c=>`<article class="registered-company">${companyCover(c,images)}<span class="tag">업체 소개</span><h3><a href="/company/${c.id}/">${e(c.name)}</a></h3><p class="company-area"><span aria-hidden="true">📍</span> ${e(c.area)}</p><p class="company-summary">${e(c.description)}</p><div class="company-contact"><a class="all-link" href="/company/${c.id}/">업체 프로필 보기 ↗</a>${c.phone?`<a class="button call" href="tel:${e(c.phone)}">전화 상담 · ${e(displayPhone(c.phone))}</a>`:'<span class="muted">상담 연락처 준비 중</span>'}</div></article>`).join('')}</div></section>`;
}
