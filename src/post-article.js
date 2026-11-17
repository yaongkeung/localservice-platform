import {postContent} from './post-content.js';
import {placeCard} from './place.js';
const e=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function postArticle(post,images,company={},manage=false){
 const phone=company.phone&&Number(company.phone_verified)===1?String(company.phone).replace(/^(\d{3})(\d{4})(\d{4})$/,'$1-$2-$3'):'';
 const info=company.id?`<section class="post-company-info"><h2>업체 및 네이버플레이스 정보</h2><p><strong>${e(company.name)}</strong></p>${company.description?`<p>${e(company.description)}</p>`:''}<dl>${phone?`<div><dt>상담 전화</dt><dd><a href="tel:${e(company.phone)}">${e(phone)}</a></dd></div>`:''}${company.area?`<div><dt>등록된 서비스 지역</dt><dd>${e(company.area)}</dd></div>`:''}${company.hours?`<div><dt>상담 시간</dt><dd>${e(company.hours)}</dd></div>`:''}</dl>${placeCard(company)}${manage?`<p><a href="/admin/companies/${company.id}/">업체·네이버플레이스 정보 등록 또는 수정 →</a></p>`:''}</section>`:'';
 return postContent(post,images)+info;
}
