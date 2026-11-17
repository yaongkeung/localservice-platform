import {e} from './admin-ui.js';
export function customerSelect(companies,post={}){
 const selected=companies.find(company=>company.id===Number(post.company_id));
 const sorted=[...companies].sort((a,b)=>(a.customer_name||'힣').localeCompare(b.customer_name||'힣','ko')||a.name.localeCompare(b.name,'ko')||a.id-b.id);
 return `${post.published_once?`<input type="hidden" name="company_id" value="${post.company_id}">`:''}<label>고객 선택<select name="company_id" required ${post.published_once?'disabled':''}><option value="">고객 선택</option>${sorted.map(company=>`<option value="${company.id}" data-company-name="${e(company.name)}" data-phone="${e(company.phone_verified?company.phone||'':'')}" ${company.id===Number(post.company_id)?'selected':''}>${e(company.customer_name||'고객명 미등록')} · ${e(company.name)} (#${company.id})</option>`).join('')}</select></label><label>업체명<input data-selected-company value="${e(selected?.name||'')}" readonly placeholder="고객을 선택하면 자동으로 연결됩니다"></label>`;
}
