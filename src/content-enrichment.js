import {regionalSection} from './local-context.js';
import {serviceSections,faqSections} from './service-content.js';
// Preserve authored/photo-specific paragraphs when upgrading an existing draft.
export function enrichExistingContent(post,company,region){
 const content=[...(Array.isArray(post.content)?post.content:JSON.parse(post.content))],code=region.admin_code||region.group_key;
 const local=regionalSection(post.search_region,code,post.search_keyword),service=serviceSections(post.search_keyword),faq=faqSections(post.search_keyword,company);
 const additions=[];if(!content.includes(local[0]))additions.push(...local);if(!content.includes(service[0]))additions.push(...service);
 content.splice(content[0]?.startsWith('## ')?2:0,0,...additions);
 if(!content.includes('## 사진으로 살펴보는 작업 대상')){const firstPhoto=content.findIndex(part=>/^\[사진:\d+\]$/.test(part));if(firstPhoto>0)content.splice(firstPhoto-1,0,'## 사진으로 살펴보는 작업 대상');}
 if(!content.includes(faq[0])){const closing=content.indexOf('## 상담 전에 알려주세요');content.splice(closing<0?content.length:closing,0,...faq);}
 const oldFooter=`**${post.search_keyword}** 상담은 ${company.name}에 문의하실 수 있습니다. 서비스 가능 지역: ${company.area||region.name}.`;
 return content.filter(part=>part!==oldFooter);
}
