import {titleFor} from './editor-title.js';
import {titleRegionForCode} from './title-region.js';
import {primaryWorkKeyword} from './work-keyword.js';
const normal=value=>String(value||'').normalize('NFKC').replace(/[^\p{L}\p{N}]/gu,'').replace(/샤시/g,'샷시').replace(/쇼파/g,'소파').replace(/밧데리/g,'배터리').replace(/렌터카/g,'렌트카').replace(/닥트/g,'덕트').toLowerCase();
export function serviceForKeyword(keyword,services,current,company={}){
 const score=(service,text)=>{
  const name=normal(service.name);let result=name&&text.includes(name)?100+name.length:0;
  for(const token of service.name.split(/[·\s/]+/)){const part=normal(token);if(part.length>=2&&text.includes(part))result=Math.max(result,part.length);}
  return result;
 };
 const text=normal(primaryWorkKeyword(keyword)),ranked=services.map(service=>({service,score:score(service,text)})).sort((a,b)=>b.score-a.score);
 if(ranked[0]?.score)return ranked[0].service.id;
 if(services.some(service=>service.id===current))return current;
 const hint=normal(company.name+' '+company.description),hinted=services.map(service=>({service,score:score(service,hint)})).sort((a,b)=>b.score-a.score);
 return hinted[0]?.score?hinted[0].service.id:services.find(service=>!service.parent_id)?.id||services[0]?.id;
}
export function simplePostForm(form,data,post={}){
 const companyId=Number(form.get('company_id')),company=data.companies.find(item=>item.id===companyId)||{};
 let region=String(form.get('search_region')||'').trim();const keyword=String(form.get('search_keyword')||'').trim();
 if(form.get('region_mode')==='catalog'){const formatted=titleRegionForCode(form.get('dong')||form.get('district')||form.get('province'));if(formatted&&(!region||region===formatted.split(' ').at(-1))){region=formatted;form.set('search_region',region);}}
 if(!region||!keyword)throw Error('지역명과 대표 업무 키워드를 입력해 주세요.');
 const sameCompany=companyId===post.company_id;
 form.set('service_id',String(serviceForKeyword(keyword,data.services,sameCompany?post.service_id:null,company)||''));
 form.set('post_type',post.post_type||'서비스안내');
 // Historical references remain attached; new publications do not use contracts.
 form.set('contract_id',String(sameCompany?post.contract_id||'':''));
 const targetChanged=region!==post.search_region||keyword!==post.search_keyword;
 const title=String(form.get('title')||'').trim(),prefix=titleFor(region,keyword);
 // A writer may supply a photo-specific ending while correcting the area.
 if(!title||targetChanged&&!title.startsWith(prefix))form.set('title',prefix);
 const content=String(form.get('content')||'');
 const text=content.split(/\n\s*\n/).map(part=>part.replace(/\[사진:\d+\]/g,'').replace(/^## .*$/gm,'').replace(/[*#]/g,'').replace(/\s+/g,' ').trim()).find(part=>part.length>=10)||'';
 const unchanged=content===(Array.isArray(post.content)?post.content.join('\n\n'):post.content);
 form.set('summary',!targetChanged&&unchanged&&post.summary?post.summary:text.length>=10?text.slice(0,240):`${region} ${keyword} 상담을 위한 서비스 안내입니다. 사진과 함께 확인할 사항을 살펴보세요.`);
 return form;
}
