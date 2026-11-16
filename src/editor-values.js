import {titleFor} from './editor-title.js';
import {seoulDate} from './photos.js';
const normal=value=>String(value||'').normalize('NFKC').replace(/[^\p{L}\p{N}]/gu,'').replace(/샤시/g,'샷시').toLowerCase();
export function serviceForKeyword(keyword,services,current,company={}){
 const score=(service,text)=>{
  const name=normal(service.name);let result=name&&text.includes(name)?100+name.length:0;
  for(const token of service.name.split(/[·\s/]+/)){const part=normal(token);if(part.length>=2&&text.includes(part))result=Math.max(result,part.length);}
  return result;
 };
 const text=normal(keyword),ranked=services.map(service=>({service,score:score(service,text)})).sort((a,b)=>b.score-a.score);
 if(ranked[0]?.score)return ranked[0].service.id;
 if(services.some(service=>service.id===current))return current;
 const hint=normal(company.name+' '+company.description),hinted=services.map(service=>({service,score:score(service,hint)})).sort((a,b)=>b.score-a.score);
 return hinted[0]?.score?hinted[0].service.id:services.find(service=>!service.parent_id)?.id||services[0]?.id;
}
export function simplePostForm(form,data,post={}){
 const companyId=Number(form.get('company_id')),company=data.companies.find(item=>item.id===companyId)||{};
 const region=String(form.get('search_region')||'').trim(),keyword=String(form.get('search_keyword')||'').trim();
 if(!region||!keyword)throw Error('지역명과 대표 업무 키워드를 입력해 주세요.');
 const sameCompany=companyId===post.company_id;
 form.set('service_id',String(serviceForKeyword(keyword,data.services,sameCompany?post.service_id:null,company)||''));
 form.set('post_type',post.post_type||'서비스안내');
 let contractId=sameCompany?post.contract_id:null;
 if(!contractId){const today=seoulDate();contractId=data.contracts.filter(item=>item.company_id===companyId&&item.status==='ACTIVE'&&item.published_quantity<item.contract_quantity&&(!item.start_date||item.start_date<=today)&&(!item.end_date||item.end_date>=today)).sort((a,b)=>String(a.end_date||'9999').localeCompare(String(b.end_date||'9999'))||a.id-b.id)[0]?.id;}
 form.set('contract_id',String(contractId||''));
 const targetChanged=region!==post.search_region||keyword!==post.search_keyword;
 if(targetChanged||!form.get('title'))form.set('title',titleFor(region,keyword));
 const text=String(form.get('content')||'').replace(/\[사진:\d+\]/g,'').replace(/^## .*$/gm,'').replace(/[*#]/g,'').replace(/\s+/g,' ').trim();
 form.set('summary',text.length>=10?text.slice(0,240):`${region} ${keyword} 상담을 위한 서비스 안내입니다. 사진과 함께 확인할 사항을 살펴보세요.`);
 return form;
}
