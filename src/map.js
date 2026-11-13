import {boundaries} from './boundaries.js';
export const adminCodeForPost = (post, regions) => regions.find(r=>r.id===post.region_id)?.admin_code;
export const districtForPost = (post, regions) => {
  const code=adminCodeForPost(post, regions);
  return code?.length>=5?code.slice(0,5):undefined;
};
export function mapSection(params) {
  const district=boundaries.districts.find(d=>d.code===params.get('district')) || boundaries.districts.find(d=>d.code==='11470');
  return `<section class="section" id="region-map" aria-labelledby="map-heading">
    <div class="section-head"><div><span class="eyebrow">EXPLORE YOUR NEIGHBORHOOD</span><h2 id="map-heading">지도에서 우리 동네를 찾아보세요</h2></div><span class="count">서울 · 구 → 행정동</span></div>
    <div class="map-layout"><div class="map-overview"><div class="map-toolbar"><strong>서울특별시</strong><span>구에 마우스를 올리거나 눌러보세요</span></div>
      <svg class="area-map" viewBox="0 0 600 600" role="group" aria-label="서울 25개 구 선택 지도">${boundaries.districts.map(d=>`<path d="${d.path}" data-district="${d.code}" class="district-shape ${d.code===district.code?'active':''}" role="button" tabindex="0" aria-label="${d.name} 동별 지도 보기" aria-pressed="${d.code===district.code}" fill-rule="evenodd"><title>${d.name}</title></path>`).join('')}</svg>
      <div class="map-legend"><i></i> 선택한 구 <span>키보드 Tab·Enter로도 선택할 수 있습니다</span></div></div>
    <aside class="map-detail"><div class="map-detail-top"><span class="tag">동별 자세히 보기</span><h3 id="district-title">${district.name}</h3><p id="map-hint" class="muted" aria-live="polite">동에 마우스를 올리면 해당 경계가 강조됩니다.</p></div>
      <svg class="dong-map" viewBox="0 0 600 600" role="group" aria-label="${district.name} 행정동 선택 지도">${district.dongs.map(d=>`<path d="${d.path}" data-dong="${d.code}" role="button" tabindex="0" aria-label="${d.name} 선택" aria-pressed="false" fill-rule="evenodd"><title>${d.name}</title></path>`).join('')}</svg>
      <div class="map-selectors"><label>구 선택<select id="district-select">${boundaries.districts.map(d=>`<option value="${d.code}" ${d.code===district.code?'selected':''}>${d.name}</option>`).join('')}</select></label><label>행정동 선택<select id="dong-select"><option value="">구 전체</option>${district.dongs.map(d=>`<option value="${d.code}">${d.name}</option>`).join('')}</select></label></div>
      <a class="button map-apply" id="map-apply" href="/?district=${district.code}#cases">${district.name} 글 보기</a><p class="muted">등록된 글이 없는 동네는 빈 결과로 안내합니다.</p>
    </aside></div>
    <p class="map-credit">경계 출처: <a href="${boundaries.sourceUrl}" target="_blank" rel="noopener">서울특별시·서울신용보증재단</a> · 공공누리 제1유형 · 원본 파일 2023.10.31. · 표시용 경계 단순화 · 현재 행정구역과 다를 수 있습니다.</p>
    <noscript><p>지도 선택에는 JavaScript가 필요합니다. 아래 지역 링크나 상단 검색을 이용할 수 있습니다.</p></noscript>
  </section>`;
}
