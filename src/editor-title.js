export function titleFor(region,keyword,related='',suffix=''){
 const prefix=[region,keyword,related&&related!==keyword?related:''].map(value=>String(value||'').trim()).filter(Boolean).join(' ');
 if(!region?.trim()||!keyword?.trim())return '';
 return (prefix+(suffix?' · '+suffix:'')).slice(0,120);
}
export function editorClient(){
 for(const form of document.querySelectorAll('[data-simple-editor]')){
  const company=form.querySelector('[name=company_id]'),phone=form.querySelector('[name=contact_phone]');
  if(company&&phone){let manual=false;phone.addEventListener('input',()=>{manual=!!phone.value;});company.addEventListener('change',()=>{if(!manual)phone.value=company.selectedOptions[0]?.dataset.phone||'';});}
  const companyName=form.querySelector('[data-selected-company]');if(company&&companyName)company.addEventListener('change',()=>{companyName.value=company.selectedOptions[0]?.dataset.companyName||'';});
  const region=form.querySelector('[name=search_region]'),keyword=form.querySelector('[name=search_keyword]'),title=form.querySelector('[name=title]'),related=form.querySelector('[data-related-keyword]');
  if(!region||!keyword||!title)continue;
  const update=()=>{const value=titleFor(region.value,keyword.value);if(value){title.value=value;if(related)related.value='';}};
  region.addEventListener('input',update);region.addEventListener('change',update);keyword.addEventListener('input',update);
  const prefix=[region.value.trim(),keyword.value.trim()].join(' ');
  if(!title.value||region.value&&keyword.value&&!title.value.startsWith(prefix))update();
 }
}
