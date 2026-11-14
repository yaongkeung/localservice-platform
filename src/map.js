import {mapIndex} from './map-index.js';
const e=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const adminCodeForPost=(post,regions)=>regions.find(r=>r.id===post.region_id)?.admin_code;
export const districtForPost=(post,regions)=>{const code=adminCodeForPost(post,regions);return code?.length>=5?code.slice(0,5):undefined;};
export const provinceForPost=(post,regions)=>{
  let region=regions.find(r=>r.id===post.region_id);
  while(region){if(region.admin_code)return region.admin_code.slice(0,2);region=regions.find(r=>r.id===region.parent_id);}
};
export function mapSection(params){
  const district=mapIndex.districts.find(d=>d.code===params.get('district'));
  const province=mapIndex.provinces.find(p=>p.code===(params.get('province')||district?.province));
  const groups=mapIndex.districts.filter(d=>d.province===province?.code);
  return `<section class="section" id="region-map" aria-labelledby="map-heading" data-province-initial="${province?.code||''}" data-district-initial="${district&&province&&district.province===province.code?district.code:''}">
    <div class="section-head"><div><span class="eyebrow">EXPLORE YOUR NEIGHBORHOOD</span><h2 id="map-heading">전국 지도에서 우리 동네를 찾아보세요</h2></div><span class="count">시·도 → 시·군·구 → 읍·면·동</span></div>
    <div class="map-layout"><div class="map-overview"><div class="map-toolbar"><strong id="map-area-title">전국</strong><span>지역을 눌러 자세히 살펴보세요</span></div>
      <p id="map-status" class="muted" role="status">시·도부터 선택하면 시·군·구와 읍·면·동을 볼 수 있습니다.</p>
      <div id="naver-map" class="naver-map" aria-label="네이버 전국 행정구역 선택 지도" hidden></div>
      <div class="map-actions"><button type="button" id="map-back" class="map-reset" hidden>상위 지역 보기</button><button type="button" id="map-reset" class="map-reset" hidden>전국 전체 보기</button></div>
      <svg class="area-map" viewBox="0 0 600 600" role="group" aria-label="전국 시·도 선택 지도">${mapIndex.provinces.map(p=>`<g><path d="${p.path}" data-province="${p.code}" class="district-shape" role="button" tabindex="0" aria-label="${e(p.name)} 선택" fill-rule="evenodd"><title>${e(p.name)}</title></path><text x="${p.label[0]}" y="${p.label[1]}" class="svg-area-label">${e(p.name)}</text></g>`).join('')}</svg>
      <div class="map-legend"><i></i> 청록색 경계 · 투명하게 표시 <span>지도 확대 시 더 많은 지역 이름이 보입니다</span></div></div>
    <aside class="map-detail"><div class="map-detail-top"><span class="tag">우리 동네 자세히 보기</span><h3 id="district-title">${e(province?.name||'전국')}</h3><p id="map-hint" class="muted" aria-live="polite">시·도와 시·군·구를 선택해 주세요.</p></div>
      <svg class="dong-map" viewBox="0 0 600 600" role="group" aria-label="선택 지역의 경계와 이름"></svg>
      <div class="map-selectors"><label class="province-field">시·도 선택<select id="province-select"><option value="">전국 전체</option>${mapIndex.provinces.map(p=>`<option value="${p.code}" ${province?.code===p.code?'selected':''}>${e(p.name)}</option>`).join('')}</select></label><label>시·군·구 선택<select id="district-select" ${province?'':'disabled'}><option value="">시·군·구 전체</option>${groups.map(d=>`<option value="${d.code}" ${d.code===district?.code?'selected':''}>${e(d.name)}</option>`).join('')}</select></label><label>읍·면·동 선택<select id="dong-select" disabled><option value="">읍·면·동 전체</option></select></label></div>
      <a class="button map-apply" id="map-apply" href="/#cases">${e(province?.name||'전국')} 글 보기</a><p class="muted">이름이 겹치는 곳은 지도를 확대해 주세요. 글이 없는 지역은 빈 결과로 안내합니다.</p>
    </aside></div>
    <p class="map-credit">경계 기준 ${mapIndex.date} · 원자료 <a href="https://sgis.kostat.go.kr" target="_blank" rel="noopener">SGIS</a>(공공누리 제1유형), 가공 <a href="${mapIndex.sourceUrl}" target="_blank" rel="noopener">vuski/admdongkor</a> · <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener">CC BY 4.0</a> · 표시용 단순화·라벨 추가. 법적 경계 확인용이 아닙니다.</p>
    <noscript><p>지도 선택에는 JavaScript가 필요합니다. 상단 지역 검색과 게시글의 지역 링크도 이용할 수 있습니다.</p></noscript>
  </section>`;
}
