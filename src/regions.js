import {regionData} from './regions-data.js';
const e=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const adminCodeForPost=(post,regions)=>regions.find(r=>r.id===post.region_id)?.admin_code;
export const districtForPost=(post,regions)=>{const code=adminCodeForPost(post,regions);return code?.length>=5?code.slice(0,5):undefined;};
export const provinceForPost=(post,regions)=>{let region=regions.find(r=>r.id===post.region_id);while(region){if(region.admin_code)return region.admin_code.slice(0,2);region=regions.find(r=>r.id===region.parent_id);}};
export function regionFilter(params){
  const district=regionData.districts.find(d=>d.code===params.get('district'));
  const province=regionData.provinces.find(p=>p.code===(params.get('province')||district?.province));
  const selectedDistrict=district?.province===province?.code?district?.code:'';
  const districts=regionData.districts.filter(d=>d.province===province?.code);
  const dongs=regionData.dongs[selectedDistrict]||[];
  const option=(item,selected)=>`<option value="${item.code}" ${item.code===selected?'selected':''}>${e(item.name)}</option>`;
  return `<form class="region-filter" id="region-filter" action="/" method="get" aria-label="지역 필터">
    ${['q','kind','service'].filter(key=>params.get(key)).map(key=>`<input type="hidden" name="${key}" value="${e(params.get(key))}">`).join('')}
    <label>시·도<select name="province" id="province-select"><option value="">전국 전체</option>${regionData.provinces.map(p=>option(p,province?.code)).join('')}</select></label>
    <label>시·군·구<select name="district" id="district-select" ${province?'':'disabled'}><option value="">전체 시·군·구</option>${districts.map(d=>option(d,selectedDistrict)).join('')}</select></label>
    <label>읍·면·동<select name="dong" id="dong-select" ${selectedDistrict?'':'disabled'}><option value="">전체 읍·면·동</option>${dongs.map(d=>option(d,params.get('dong'))).join('')}</select></label>
    <button type="submit">지역 적용</button><p class="filter-status" id="filter-status" role="status"></p>
  </form>`;
}
