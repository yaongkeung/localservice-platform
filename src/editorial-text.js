// Remove generation scaffolding, not real measurements, prices or work dates.
export function cleanEditorialText(value){
 return String(value??'').replace(/[\u200b\u2060\ufeff]/gu,'').replace(/[（(]\s*\d+\s*[~～–—-]\s*\d+\s*(?:자|(?:Korean\s+)?chars?|characters?)\s*[)）]/gi,'').replace(/[ \t]+([.,!?。！？])/g,'$1').replace(/[ \t]{2,}/g,' ').replace(/[ \t]+$/gm,'').trim();
}
export function cleanEditorialFields(value){
 if(typeof value==='string')return cleanEditorialText(value);
 if(Array.isArray(value))return value.map(cleanEditorialFields);
 if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).map(([key,item])=>[key,cleanEditorialFields(item)]));
 return value;
}
export function hasEditorialArtifacts(value){
 if(typeof value==='string')return cleanEditorialText(value)!==value.trim().replace(/[ \t]{2,}/g,' ').replace(/[ \t]+$/gm,'').replace(/[ \t]+([.,!?。！？])/g,'$1');
 if(Array.isArray(value))return value.some(hasEditorialArtifacts);
 return !!value&&typeof value==='object'&&Object.values(value).some(hasEditorialArtifacts);
}
export function workNotesField(value='',escape=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))){
 return `<label class="full">실제 작업 메모 (선택)<textarea name="work_notes" maxlength="2000" rows="3" placeholder="예: 요청은 문 닫힘 불편 확인. 현장에서 확인한 내용과 실제 조치·결과가 있으면 적어 주세요.">${escape(value)}</textarea><span class="cms-help">아는 사실만 적어 주세요. 자동 본문에 참고하며, 메모 원문은 공개하지 않습니다. 고객 개인정보는 넣지 마세요. 비워 두면 사진을 바탕으로 서비스 안내를 작성합니다.</span></label>`;
}
