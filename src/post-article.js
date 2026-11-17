import {consultationPage} from './consultation-page.js';
import {pagePhone,prettyPhone} from './page-contact.js';
import {placeCard} from './place.js';
const e=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function postArticle(post,images,company={},manage=false,context={}){
 const phone=prettyPhone(pagePhone(post,company));
 const info=company.id?`<section class="post-company-info" id="company-contact"><h2>업체 및 네이버플레이스 정보</h2><p class="contact-company-name">${e(company.name)}</p>${company.description?`<p>${e(company.description)}</p>`:''}<dl class="contact-facts">${phone?`<div class="contact-fact-phone"><dt>☎ 상담 전화</dt><dd><a href="tel:${e(pagePhone(post,company))}">${e(phone)}</a></dd></div>`:''}${company.area?`<div><dt>📍 서비스 지역</dt><dd>${e(company.area)}</dd></div>`:''}${company.hours?`<div><dt>◷ 상담 시간</dt><dd>${e(company.hours)}</dd></div>`:''}</dl>${placeCard(company)}${manage?`<p><a href="/admin/companies/${company.id}/">업체·네이버플레이스 정보 등록 또는 수정 →</a></p>`:''}</section>`:'';
 return consultationPage(post,images,company,info,context);
}
