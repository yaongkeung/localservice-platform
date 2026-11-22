import {cleanEditorialText} from './editorial-text.js';
import {primaryWorkKeyword} from './work-keyword.js';
import {editorialBlocks} from './content-comparison.js';
const text=(value,min,max)=>{if(typeof value==='string')value=cleanEditorialText(value);if(typeof value!=='string'||value.trim().length<min||value.length>max||/https?:|\[사진:|<\/?[a-z]|[\r\n]/i.test(value))throw Error('자동 작성의 제목·구성 문구를 확인하지 못했습니다. 사진과 업무를 확인하고 다시 시도해 주세요.');return value.trim();};
export function validatePageCopy(raw){
 if(!raw||typeof raw!=='object')throw Error('자동 작성의 제목·구성 문구가 없습니다. 다시 시도해 주세요.');
 const copy={version:1,related_keyword:text(raw.related_keyword,2,40),title_suffix:text(raw.title_suffix,6,55)};
 if(!/^[가-힣a-zA-Z0-9· .()-]+$/.test(copy.related_keyword))throw Error('자동 작성의 연관 키워드를 확인해 주세요.');
 if(/^(수리|시공|설치|점검|상담|서비스|업체|안내|전문업체)$/.test(copy.related_keyword))throw Error('자동 작성의 연관 키워드가 너무 일반적입니다. 구체적인 업무 키워드를 확인해 주세요.');
 for(const key of ['hero_heading','services_heading','opening_heading','local_heading','photos_heading','faq_heading','closing_heading','steps_heading'])copy[key]=text(raw[key],5,85);
 if(Object.values(copy).some(value=>typeof value==='string'&&/사진으로 먼저 만나|어떤 내용을 상담할까요|상담 내용을 정리하는 방법|증상 확인과 점검 상담 안내/.test(value)))throw Error('자동 작성에 고정 안내 문구가 반복됐습니다. 사진에 맞게 다시 작성해 주세요.');
 for(const key of ['services_intro','local_intro','closing'])copy[key]=text(raw[key],35,750);
 if(new Set([copy.services_intro,copy.local_intro,copy.closing].map(value=>value.replace(/\s+/g,''))).size<3)throw Error('자동 작성의 도입·지역·마무리 문단이 반복됩니다. 사진별 내용을 다시 확인해 주세요.');
 if(!Array.isArray(raw.steps)||raw.steps.length!==4)throw Error('자동 작성의 업무별 진행 순서를 확인하지 못했습니다.');
 copy.steps=raw.steps.map(step=>({title:text(step.title,3,55),text:text(step.text,25,350)}));return copy;
}
export function pageCopy(post){try{const copy=typeof post.page_copy==='string'?JSON.parse(post.page_copy):post.page_copy;return copy?.version===1?validatePageCopy(copy):null;}catch{return null;}}
export const pageCopyKeys=['related_keyword','title_suffix','hero_heading','services_heading','services_intro','opening_heading','local_heading','local_intro','photos_heading','faq_heading','closing_heading','closing','steps_heading'];
export function relatedCandidates(keyword,company){
 keyword=primaryWorkKeyword(keyword);
 const families=[/유리|창호|샷시|샤시|방충망|방범창|도어|힌지|방화문/,/누수|배관|보일러|난방|온수|하수구|막힘|방수|수전/,/에어컨|냉방|세척|청소/,/컴퓨터|데이터|복구|기기/,/자동차|차량|썬팅|중고차|렌트카|폐차/],family=families.find(pattern=>pattern.test(keyword));
 const normal=value=>String(value).replace(/[^\p{L}\p{N}]/gu,'').toLowerCase(),main=normal(keyword);
 const tokens=String(company.description||'').split(/[\s,·/|()]+/).filter(token=>/^[가-힣a-zA-Z0-9]{3,16}$/.test(token)&&/(유리|창호|샷시|방충망|도어|교체|탐지|누수|막힘|수리|설치|방수|점검|세척|청소|복구|썬팅|폐차|가구|배달|철거|이사|용달|인쇄|간판)$/.test(token));
 const spaces=['화장실','욕실','옥상','외벽','하수구','변기','보일러'];
 return [...new Set(tokens)].filter(token=>!main.includes(normal(token))&&(!family||family.test(token))&&(!/누수|막힘/.test(keyword)||!spaces.some(space=>token.includes(space)&&!keyword.includes(space)))).slice(0,12);
}
export function repeatedPageCopy(copy,previous,region='',keyword=''){
 const normalize=(value,region,keyword,related)=>{const compact=text=>String(text||'').normalize('NFKC').replace(/[^\p{L}\p{N}]/gu,'');let text=compact(value);for(const label of [region,...String(region||'').split(/\s+/),keyword,related].filter(Boolean).map(compact).sort((a,b)=>b.length-a.length))text=text.split(label).join('');return text;};
 const repeated=[];
 for(const item of previous){const other=pageCopy(item);if(!other)continue;for(const key of pageCopyKeys.filter(k=>k!=='related_keyword')){const a=normalize(copy[key],region,keyword,copy.related_keyword),b=normalize(other[key],item.search_region,item.search_keyword,other.related_keyword);if(a.length>=(key.endsWith('_heading')?2:8)&&a===b)repeated.push(key);}}
 return [...new Set(repeated)];
}
// These two legacy fields are stored for compatibility but never displayed.
// Keep the complete comparison for diagnostics; gate only visible material.
export function repeatedPublishedCopy(copy,previous,region='',keyword=''){
 return repeatedPageCopy(copy,previous,region,keyword).filter(key=>!['hero_heading','services_intro'].includes(key));
}
export function repeatedParagraphs(candidate,previous,verified=[]){
 const blocks=value=>{const labels=[value.search_region,value.search_keyword,value.related_keyword].filter(Boolean).flatMap(label=>[label,...label.split(/\s+/)]).sort((a,b)=>b.length-a.length);return editorialBlocks(value).filter(part=>!verified.includes(part)&&!/^출처:|^지역 자료:|\[사진:\d+\]/.test(part)).map(part=>{let text=String(part).normalize('NFKC');for(const label of labels)text=text.split(label).join('');return text.replace(/https?:\/\/\S+/g,'').replace(/[^\p{L}\p{N}]/gu,'');}).filter(text=>text.length>=40);};
 const prior=new Set(previous.flatMap(blocks));return blocks(candidate).filter(text=>prior.has(text)).length;
}
