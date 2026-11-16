export function titleFor(region,keyword){
 const prefix=[region,keyword].map(value=>String(value||'').trim()).filter(Boolean).join(' ');
 if(!region?.trim()||!keyword?.trim())return '';
 let suffix='상담 전 확인할 사항과 서비스 안내';
 if(/방충망/.test(keyword))suffix='창틀·망 상태 확인과 교체 상담 안내';
 else if(/샷시|샤시|창호/.test(keyword))suffix='개폐 상태와 창틀 점검, 상담 준비 안내';
 else if(/유리|도어/.test(keyword))suffix='설치 위치·크기 확인과 상담 안내';
 else if(/누수|배관/.test(keyword))suffix='증상 확인과 점검 상담 안내';
 else if(/전기|조명/.test(keyword))suffix='불편한 증상 확인과 점검 상담 안내';
 else if(/청소|에어컨/.test(keyword))suffix='대상과 관리 범위 확인, 상담 안내';
 return (prefix+' · '+suffix).slice(0,120);
}
export function editorClient(){
 for(const form of document.querySelectorAll('[data-simple-editor]')){
  const region=form.querySelector('[name=search_region]'),keyword=form.querySelector('[name=search_keyword]'),title=form.querySelector('[name=title]');
  if(!region||!keyword||!title)continue;
  const update=()=>{const value=titleFor(region.value,keyword.value);if(value)title.value=value;};
  region.addEventListener('input',update);region.addEventListener('change',update);keyword.addEventListener('input',update);
  const prefix=[region.value.trim(),keyword.value.trim()].join(' ');
  if(!title.value||region.value&&keyword.value&&!title.value.startsWith(prefix))update();
 }
}
