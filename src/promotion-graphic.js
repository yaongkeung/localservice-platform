import {pagePhone,prettyPhone} from './page-contact.js';
const e=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const families=[
 ['plumbing',/누수|하수구|배관|보일러|난방|방수|설비|수전|변기|닥트/,0,'보이는 상태부터 필요한 작업 범위까지'],
 ['glass',/유리|샷시|샤시|창호|방충망|방범창|도어|힌지|방화문|자동문/,1,'유리·문·창틀, 필요한 부분을 상담하세요'],
 ['aircon',/에어컨|냉방/,2,'설치 환경과 사용 중 불편을 함께 상담하세요'],
 ['electrical',/전기|조명|소방/,3,'사용 환경과 점검할 부분을 알려주세요'],
 ['delivery',/생수|배달|퀵서비스/,12,'물품과 전달 장소를 먼저 알려주세요'],
 ['automotive',/자동차|중고차|렌트카|썬팅|밧데리|배터리|폐차|차량/,8,'차량 상태와 필요한 서비스를 상담하세요'],
 ['construction',/포크레인|철거|폐기물|고물상|재활용|스카이차|사다리차|인테리어|도배|마루|칸막이/,9,'현장 접근 조건과 필요한 범위를 상담하세요'],
 ['signage',/간판/,10,'설치 위치와 원하는 구성을 알려주세요'],
 ['fabric',/쇼파|소파|천갈이|커튼|솜틀|헌옷/,11,'크기와 소재, 바꾸고 싶은 부분을 상담하세요'],
 ['care',/간병|돌봄/,13,'필요한 돌봄 범위와 일정을 먼저 상담하세요'],
 ['locksmith',/열쇠|도어락/,14,'문과 잠금장치 상태를 먼저 알려주세요'],
 ['printing',/인쇄/,15,'수량과 사용 목적에 맞춰 상담하세요'],
 ['moving',/이사|이삿짐|용달|가구|중고가전|골동품|유품정리/,4,'물품과 이동 조건에 맞춰 상담하세요'],
 ['computer',/컴퓨터|데이터|복구/,5,'기기 상태와 필요한 작업을 알려주세요'],
 ['cleaning',/청소|세척/,6,'공간과 필요한 청소 범위를 상담하세요']
];
export function promotionFamily(keyword=''){
 const entry=families.find(([name,pattern])=>name==='automotive'&&pattern.test(keyword))||families.find(([,pattern])=>pattern.test(keyword));
 return entry?{name:entry[0],tile:entry[2],message:entry[3]}:{name:'consultation',tile:7,message:'필요한 서비스와 일정을 편하게 상담하세요'};
}
export function has24HourConsultation(hours=''){
 return /(?:^|[\s·,])24\s*(?:시간|시|h)(?:\s*(?:상담|영업|운영))?(?:$|[\s·,])/i.test(hours)&&!/(아[니닌님닙]|불가|제외|않|이전|이후|예약)/.test(hours);
}
function lines(value,limit,count){
 const chars=Array.from(String(value||'').replace(/\s+/g,' ').trim()),out=[];
 while(chars.length&&out.length<count){let take=Math.min(limit,chars.length);if(chars.length>limit){const space=chars.slice(0,limit+1).lastIndexOf(' ');if(space>=limit/2)take=space;}out.push(chars.splice(0,take).join('').trim());while(chars[0]===' ')chars.shift();}
 if(chars.length)out[out.length-1]=out.at(-1).slice(0,-1)+'…';return out;
}
const textLines=(value,x,y,limit,count,size,fill,weight=600)=>lines(value,limit,count).map((line,i)=>`<text x="${x}" y="${y+i*(size+10)}" fill="${fill}" font-size="${size}" font-weight="${weight}">${e(line)}</text>`).join('');
export function promotionGraphic(post,company,region,keyword){
 const family=promotionFamily(keyword),tile=family.tile%8,col=tile%4,row=Math.floor(tile/4),asset=family.tile<8?'service-workers-a.jpg':'service-workers-b.jpg',phone=pagePhone(post,company),display=prettyPhone(phone),aroundClock=has24HourConsultation(company.hours),badge=aroundClock?'24시 상담':'상담 안내',clip='promotion-photo-'+(Number(post.id)||0);
 return `<svg class="contact-graphic" data-promotion-family="${family.name}" viewBox="0 0 900 660" font-family="Malgun Gothic,Arial,sans-serif" role="img" aria-label="${e([region,keyword,display,badge,'AI 제작 홍보 이미지'].filter(Boolean).join(' · '))}" xmlns="http://www.w3.org/2000/svg"><rect width="900" height="660" rx="22" fill="#143d4c"/><defs><clipPath id="${clip}"><rect x="360" width="540" height="500"/></clipPath></defs><g clip-path="url(#${clip})"><image href="/media/${asset}" x="${360-col*540}" y="${-row*500}" width="2160" height="1000" preserveAspectRatio="none"/></g><path d="M0 0H410L350 500H0Z" fill="#143d4c"/><text x="38" y="48" fill="#9ce4d5" font-size="18" font-weight="650">동네핀 · 가까운 전문가 상담</text>${textLines(region||'우리 동네',38,105,16,2,25,'#b8e6df')}${textLines(keyword||'서비스',38,205,10,3,46,'#ffffff',750)}${textLines(family.message,38,390,17,2,21,'#d5ebe7',450)}<rect x="38" y="446" width="156" height="36" rx="18" fill="#d7f4b2"/><text x="116" y="471" text-anchor="middle" fill="#173f3b" font-size="21" font-weight="700">${badge}</text><rect x="0" y="500" width="900" height="160" fill="#f5faf8"/><text x="38" y="539" fill="#44655e" font-size="21" font-weight="500">전화로 필요한 작업을 상담하세요</text><text x="38" y="605" fill="#b34136" font-size="${display.length>14?48:60}" font-weight="800">${e(display||'업체 연락처 확인 중')}</text>${textLines(company.name||'등록 업체',38,640,48,1,17,'#4a655e',450)}</svg>`;
}
