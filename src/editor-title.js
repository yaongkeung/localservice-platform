import {primaryWorkKeyword} from './work-keyword.js';
export function titleFor(region,keyword,related='',suffix=''){
 const main=primaryWorkKeyword(keyword),extra=primaryWorkKeyword(related),key=value=>value.replace(/[^\p{L}\p{N}]/gu,'');
 const prefix=[region,main].map(value=>String(value||'').trim()).filter(Boolean).join(' ');
 const relatedTopic=extra&&!key(main).includes(key(extra))&&!/^(유리집|유리가게|전문업체|업체)$/.test(extra)?extra:'';
 if(!region?.trim()||!keyword?.trim())return '';
 // An editorial readability target, not a search-engine character threshold.
 const detail=[relatedTopic,String(suffix||'').trim()].filter(Boolean).join(' · '),budget=Math.max(0,56-prefix.length-3),words=detail.split(/\s+/),kept=[];
 for(const word of words){if([...kept,word].join(' ').length>budget)break;kept.push(word);}
 const ending=kept.join(' ').replace(/[\s·|]+$/,'');return (prefix+(ending?' | '+ending:'')).slice(0,120);
}
export function editorClient(){
 for(const form of document.querySelectorAll('[data-simple-editor]')){
  const company=form.querySelector('[name=company_id]'),phone=form.querySelector('[name=contact_phone]');
  if(company&&phone){let manual=false;phone.addEventListener('input',()=>{manual=!!phone.value;});company.addEventListener('change',()=>{if(!manual)phone.value=company.selectedOptions[0]?.dataset.phone||'';});}
  const companyName=form.querySelector('[data-selected-company]');if(company&&companyName)company.addEventListener('change',()=>{companyName.value=company.selectedOptions[0]?.dataset.companyName||'';});
  const region=form.querySelector('[name=search_region]'),keyword=form.querySelector('[name=search_keyword]'),title=form.querySelector('[name=title]'),related=form.querySelector('[data-related-keyword]');
  if(!region||!keyword||!title)continue;
  const heading=form.querySelector('[data-page-heading]'),update=()=>{const value=titleFor(region.value,keyword.value);if(value){title.value=value;if(related)related.value='';}if(heading)heading.value=region.value.trim()&&keyword.value.trim()?region.value.trim().split(/\s+/).at(-1)+' '+primaryWorkKeyword(keyword.value):'';};
  region.addEventListener('input',update);region.addEventListener('change',update);keyword.addEventListener('input',update);
  const prefix=titleFor(region.value,keyword.value);
  if(!title.value||region.value&&keyword.value&&!title.value.startsWith(prefix))update();
 }
}
