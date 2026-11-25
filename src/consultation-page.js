import {postUrl} from './post-urls.js';
import {inlineText,postContent,contentTextKey} from './post-content.js';
import {promotionGraphic} from './promotion-graphic.js';
import {servicePlan,consultationSteps} from './service-plan.js';
import {pagePhone,prettyPhone} from './page-contact.js';
import {pageCopy} from './page-copy.js';
import {searchDescription} from './search-metadata.js';
import {primaryWorkKeyword} from './work-keyword.js';
import {relatedPosts} from './related-posts.js';
const e=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function contentSections(post){
 const sections=[];for(const part of post.content||[]){if(/^## [^\n]+$/.test(part))sections.push({title:part.slice(3),content:[]});else{if(!sections.length)sections.push({title:'서비스 안내',content:[]});sections.at(-1).content.push(part);}}return sections;
}
export function confirmedReviews(company){
 if(Number(company.reviews_confirmed)!==1)return [];
 try{const reviews=JSON.parse(company.customer_reviews||'[]');return Array.isArray(reviews)?reviews.filter(text=>typeof text==='string'&&text.trim()).slice(0,6):[];}catch{return [];}
}
export const contactGraphic=promotionGraphic;
export function consultationPage(post,images,company,info,context={}){
 const region=post.search_region||context.region?.name||'',keyword=primaryWorkKeyword(post.search_keyword||context.service?.name||'서비스'),phone=pagePhone(post,company),display=prettyPhone(phone),own=images.filter(image=>image.post_id===post.id&&!image.excluded),reviews=confirmedReviews(company);
 const call=(label,cls='')=>phone?`<a class="${cls}" href="tel:${e(phone)}">${cls==='consultation-call'?`<span class="consultation-call-icon" aria-hidden="true">☎</span><span class="consultation-call-copy">${label}</span><span class="consultation-call-arrow" aria-hidden="true">↗</span>`:label}</a>`:'<span class="contact-unavailable">상담 연락처 준비 중</span>';
 const rendered=new Set();
 const copy=pageCopy(post),sections=contentSections(post);
 const detailSection=sections.find(section=>section.title===(copy?.services_heading||keyword+' 상담에서 확인할 내용')&&section.content.filter(value=>/^\*\*[^*]+\*\*\s*—/.test(value)).length===3);
 const details=detailSection?detailSection.content.map(value=>String(value).match(/^\*\*([^*]+)\*\*\s*—\s*([\s\S]+)$/)).filter(Boolean).map(match=>[match[1],match[2]]):servicePlan(keyword);
 const shownText=new Set([contentTextKey(searchDescription(post.summary||company.description,200)),...details.map(([,text])=>contentTextKey(text))]);
 const chapters=sections.filter(section=>section!==detailSection).map((section,index)=>{const html=postContent({...post,content:section.content},own.filter(image=>{if(rendered.has(image.id)||!section.content.some(value=>String(value).includes('[사진:'+image.id+']')))return false;rendered.add(image.id);return true;}),{shownText});return {section,index,html,photo:section.content.some(value=>/\[사진:\d+\]/.test(value))};}).filter(chapter=>chapter.html);
 const photoChapters=chapters.filter(chapter=>chapter.photo),otherChapters=chapters.filter(chapter=>!chapter.photo);
 const chapterHtml=({section,index,html,photo},number)=>`<section class="landing-chapter ${photo?'landing-photo-chapter':''}" id="page-section-${post.id}-${index}"><div class="landing-section-title"><span>${String(number).padStart(2,'0')}</span><h2>${inlineText(section.title)}</h2></div>${html}</section>`;
 const photoBody=photoChapters.map((chapter,i)=>chapterHtml(chapter,i+1)).join(''),body=otherChapters.map((chapter,i)=>chapterHtml(chapter,i+photoChapters.length+1)).join('');
 // Legacy authored articles can have unplaced images. Render each remaining one once.
 const referenced=new Set((post.content||[]).flatMap(value=>[...String(value).matchAll(/\[사진:(\d+)\]/g)].map(match=>Number(match[1])))),unplaced=own.filter(image=>!referenced.has(image.id));
 const photos=unplaced.length?`<section class="landing-chapter" id="provided-photos-${post.id}"><h2>업체 제공 사진</h2>${postContent({...post,content:[]},unplaced)}</section>`:'';
 const related=relatedPosts(post,context.related||[]);
 return `<div class="consultation-page ${phone?'has-page-phone':''}">
 <section class="consultation-hero"><div><p class="consultation-kicker"><span>📍</span> ${e(region||'등록 업체')} · ${e(keyword)} 상담</p><h2>${e(region)}<br><strong>${e(keyword)}</strong></h2><p class="consultation-intro">${inlineText(searchDescription(post.summary||company.description,200))}</p><p class="consultation-provider">${e(company.name)}</p>${call(`<span>전화 상담하기</span><strong>${e(display)}</strong>`,'consultation-call')}<p class="consultation-hours">${e(company.hours||'방문 가능 시간과 지역은 전화로 확인해 주세요.')}</p></div>${context.feed?'':`<div class="consultation-art"><figure class="promotion-image">${phone?`<a href="tel:${e(phone)}" aria-label="${e(display)} 전화 상담">${promotionGraphic(post,company,region,keyword)}</a>`:promotionGraphic(post,company,region,keyword)}<figcaption>AI 제작 홍보 이미지 · 실제 작업자·현장 사진이 아닙니다.</figcaption></figure></div>`}</section>
 <nav class="consultation-nav" aria-label="페이지 내용"><a href="#service-details-${post.id}">업무 안내</a><a href="#page-content-${post.id}">지역·사진 이야기</a><a href="#consultation-steps-${post.id}">진행 순서</a>${reviews.length?`<a href="#customer-reviews-${post.id}">고객 후기</a>`:''}<a href="#page-company-${post.id}">업체·플레이스</a></nav>
 <div class="landing-content" id="page-content-${post.id}">${photoBody}${photos}</div>
 <section class="landing-chapter" id="service-details-${post.id}"><p class="landing-eyebrow">SERVICE DETAILS</p><h2>${e(copy?.services_heading||keyword+' 세부 업무')}</h2><div class="landing-service-grid">${details.map(([title,text],i)=>`<div class="landing-service-card"><span class="landing-card-icon" aria-hidden="true">${['🔎','🛠️','📋'][i%3]}</span><h3>${inlineText(title)}</h3><p>${inlineText(text)}</p></div>`).join('')}</div></section>
 <div class="landing-content">${body}</div>
 <section class="consultation-mid-cta"><div><span>궁금한 부분을 편하게 물어보세요</span><h2>${e(region)} ${e(keyword)} 상담</h2><p>사진과 요청 사항을 준비하면 상담 내용을 더 구체적으로 전달할 수 있습니다.</p></div>${call(`<span>전화로 문의하기</span><strong>${e(display)}</strong>`,'consultation-call')}</section>
 <section class="landing-chapter" id="consultation-steps-${post.id}"><p class="landing-eyebrow">HOW TO START</p><h2>${e(copy?.steps_heading||'상담부터 진행까지')}</h2><p class="landing-lead">업무에 따라 필요한 절차가 달라집니다. 실제 일정과 진행 방법은 업체에 확인해 주세요.</p><ol class="consultation-steps">${(copy?copy.steps.map(step=>[step.title,step.text]):consultationSteps).map(([title,text],i)=>`<li><span>${i+1}</span><div><h3>${inlineText(title)}</h3><p>${inlineText(text)}</p></div></li>`).join('')}</ol></section>
 ${reviews.length?`<section class="landing-chapter" id="customer-reviews-${post.id}"><p class="landing-eyebrow">CUSTOMER VOICES</p><h2>고객 후기</h2><p class="landing-lead">업체가 출처와 게시 가능 여부를 확인해 제공한 후기입니다.</p><div class="landing-review-grid">${reviews.map(text=>`<blockquote><span aria-hidden="true">“</span><p>${e(text)}</p></blockquote>`).join('')}</div>${/^https:\/\/[^@\s]+$/.test(company.review_source_url||'')?`<a class="all-link" href="${e(company.review_source_url)}" target="_blank" rel="noopener noreferrer ugc nofollow">후기 출처 보기 ↗</a>`:''}</section>`:''}
 ${related.length?`<section class="landing-chapter"><h2>관련된 작업 이야기</h2><div class="landing-related">${related.map(item=>{const image=images.find(image=>image.post_id===item.id&&!image.excluded);return `<a href="${postUrl(item)}">${image?`<img src="${e(image.thumbnail_key||image.storage_key)}" alt="${e(image.alt_text)}" loading="lazy" width="320" height="210">`:''}<h3>${e(item.title)}</h3><p>${e(item.summary)}</p></a>`;}).join('')}</div></section>`:''}
 <div id="page-company-${post.id}" class="landing-chapter">${info}</div>
 ${phone?`<div class="page-call-bar"><span>${e(region)} ${e(keyword)}</span>${call(`전화 상담 <strong>${e(display)}</strong>`,'page-call-button')}</div>`:''}</div>`;
}
