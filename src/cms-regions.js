import {townshipOptions,townshipGroups,groupForCode,townshipName} from './township-groups.js';
import {regionData} from './regions-data.js';
import {first,run} from './store.js';
import {e} from './admin-ui.js';
export function catalogBranch(provinceCode,districtCode='',dongCode=''){
 const province=regionData.provinces.find(p=>p.code===provinceCode);
 const district=districtCode?regionData.districts.find(d=>d.code===districtCode&&d.province===provinceCode):null;
 const dong=dongCode?(regionData.dongs[districtCode]||[]).find(d=>d.code===dongCode)||townshipGroups(districtCode).find(d=>d.code===dongCode):null;
 if(!province||districtCode&&!district||dongCode&&(!district||!dong))throw Error('지역 선택을 확인해 주세요. 시·도부터 다시 선택해 주세요.');
 return [province,district,dong].filter(Boolean);
}
export async function registerRegion(db,form){
 const branch=catalogBranch(form.get('province')||'',form.get('district')||'',form.get('dong')||'');
 let parent=null;
 for(let level=0;level<branch.length;level++){
  const item=branch[level],grouped=item.code.includes(':');let row=await first(db,grouped?'SELECT * FROM regions WHERE group_key=?':'SELECT * FROM regions WHERE admin_code=?',item.code);
  if(!row){
   const slug=parent?parent.slug+'/'+(grouped?'town-'+encodeURIComponent(item.name):item.code):'kr/'+item.code;
   await run(db,'INSERT INTO regions(parent_id,level,name,slug,admin_code,group_key) VALUES(?,?,?,?,?,?) ON CONFLICT DO NOTHING',parent?.id||null,level+1,item.name,slug,grouped?null:item.code,grouped?item.code:null);
   row=await first(db,grouped?'SELECT * FROM regions WHERE group_key=?':'SELECT * FROM regions WHERE admin_code=?',item.code);
  }
  if(row.parent_id!==(parent?.id||null))throw Error('지역 계층을 확인해 주세요. 등록된 지역 정보와 일치하지 않습니다.');
  parent=row;
 }
 return parent.id;
}
export function cmsRegionPicker(post,regions){
 const previous=regions.find(r=>r.id===Number(post.region_id)),code=previous?.group_key||previous?.admin_code||'';
 const mode=post.region_mode||(post.id?'keep':'catalog');
 const province=post.province??code.slice(0,2),district=post.district??(code.length>=5?code.slice(0,5):''),dong=post.dong??(code.length>=8?(groupForCode(code)?.code||code):'');
 const options=(items,value)=>items.map(item=>`<option value="${item.code}" ${item.code===value?'selected':''}>${e(item.name)}</option>`).join('');
 return `<fieldset class="full" data-cms-regions><legend>📍 작업 지역</legend><input type="hidden" name="region_id" value="${Number(post.region_id)||''}"><label>지역 설정<select name="region_mode" data-region-mode>${post.id?`<option value="keep" ${mode==='keep'?'selected':''}>기존 지역 유지 · ${e(townshipName(previous?.name||'등록 지역'))}</option>`:''}<option value="catalog" ${mode==='catalog'?'selected':''}>전국 지역에서 선택</option></select></label><div class="cms-grid"><label>시·도<select name="province" data-cms-province ${mode==='keep'?'disabled':''}><option value="">시·도 선택</option>${options(regionData.provinces,province)}</select></label><label>시·군·구<select name="district" data-cms-district ${mode==='keep'?'disabled':''}><option value="">선택한 시·도 전체</option>${options(regionData.districts.filter(d=>d.province===province),district)}</select></label><label>읍·면·동<select name="dong" data-cms-dong ${mode==='keep'?'disabled':''}><option value="">선택한 시·군·구 전체</option>${options(townshipOptions(district),dong)}</select></label></div><p class="cms-help" role="status" data-region-status>읍·면·동까지 선택하거나, 해당 지역 전체 범위로 등록할 수 있습니다.</p><noscript><p>새 하위 지역 목록 선택에는 JavaScript가 필요합니다. 기존 지역 유지와 표시된 목록은 그대로 사용할 수 있습니다.</p></noscript></fieldset>`;
}
export function cmsRegionClient(){
 for(const group of document.querySelectorAll('[data-cms-regions]')){
  const mode=group.querySelector('[data-region-mode]'),province=group.querySelector('[data-cms-province]'),district=group.querySelector('[data-cms-district]'),dong=group.querySelector('[data-cms-dong]'),message=group.querySelector('[data-region-status]');
  let revision=0;
  const clear=(select,label)=>{select.replaceChildren(new Option(label,''));};
  const fill=(select,rows)=>{for(const row of rows)select.append(new Option(row.name,row.code));};
  const enabled=()=>{for(const select of [province,district,dong])select.disabled=mode.value==='keep';};
  const applyName=()=>{const input=group.closest('form')?.querySelector('[name=search_region]'),select=dong.value?dong:district.value?district:province;if(input&&select.value){input.value=select.selectedOptions[0].textContent;input.dispatchEvent(new Event('input',{bubbles:true}));}};
  dong.addEventListener('change',applyName);
  mode.addEventListener('change',()=>{revision++;enabled();message.textContent='지역을 확인한 뒤 초안을 저장해 주세요.';});
  province.addEventListener('change',async()=>{
   const current=++revision;clear(district,'선택한 시·도 전체');clear(dong,'선택한 시·군·구 전체');enabled();if(!province.value)return;
   message.textContent='시·군·구 목록을 불러오고 있습니다…';
   try{const response=await fetch('/assets/regions.json');if(!response.ok)throw Error();const data=await response.json();if(current!==revision)return;fill(district,data.districts.filter(d=>d.province===province.value));message.textContent='시·군·구를 선택해 주세요. 전체 범위로도 등록할 수 있습니다.';}catch{if(current===revision)message.textContent='지역 목록을 불러오지 못했습니다. 시·도를 다시 선택해 주세요.';}
  });
  district.addEventListener('change',async()=>{
   const current=++revision;clear(dong,'선택한 시·군·구 전체');enabled();if(!district.value)return;
   message.textContent='읍·면·동 목록을 불러오고 있습니다…';
   try{const response=await fetch('/assets/regions/'+encodeURIComponent(district.value)+'.json');if(!response.ok)throw Error();const rows=await response.json();if(current!==revision)return;fill(dong,rows);message.textContent='읍·면·동을 선택해 주세요. 전체 범위로도 등록할 수 있습니다.';}catch{if(current===revision)message.textContent='지역 목록을 불러오지 못했습니다. 시·군·구를 다시 선택해 주세요.';}
  });
 }
}
