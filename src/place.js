const e=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function normalizePlaceUrl(value){
 const raw=String(value||'').trim();if(!raw)return null;
 const invalid=()=>{throw Error('네이버플레이스 주소는 네이버 공유 링크 또는 업체의 HTTPS 플레이스 주소를 입력해 주세요.');};
 if(raw.length>500||!/^https:\/\//i.test(raw)||/[\u0000-\u0020\u007f]/.test(raw))invalid();
 let url;try{url=new URL(raw);}catch{invalid();}
 if(url.protocol!=='https:'||url.username||url.password||url.port)invalid();
 if(url.hostname==='naver.me'){
  if(!/^\/[a-z0-9]{4,32}\/?$/i.test(url.pathname)||url.search||url.hash)invalid();
  return 'https://naver.me/'+url.pathname.split('/')[1];
 }
 if(url.hostname==='map.naver.com'){
  const match=url.pathname.match(/^\/(?:p|v5)\/entry\/place\/(\d+)\/?$/);if(!match)invalid();return 'https://map.naver.com/p/entry/place/'+match[1];
 }
 if(['m.place.naver.com','pcmap.place.naver.com','place.naver.com'].includes(url.hostname)){
  const match=url.pathname.match(/^\/([a-z][a-z0-9-]{0,39})\/(\d+)(?:\/(?:home|information|photo|review(?:\/visitor)?))?\/?$/);if(!match)invalid();return url.origin+'/'+match[1]+'/'+match[2]+'/home';
 }
 invalid();
}
export function placeCard(company){
 let url;try{url=normalizePlaceUrl(company.naver_place_url);}catch{return '';}
 if(!url)return '';
 return `<section class="place-card" id="place-info" aria-label="네이버플레이스 업체 정보"><div class="place-heading"><span class="place-mark" aria-hidden="true">N</span><div><span class="place-label">네이버플레이스</span><h3>${e(company.naver_place_name||company.name)}</h3></div></div>${company.naver_place_address||company.naver_place_hours?`<dl>${company.naver_place_address?`<div><dt>등록 주소</dt><dd>${e(company.naver_place_address)}</dd></div>`:''}${company.naver_place_hours?`<div><dt>영업 안내</dt><dd>${e(company.naver_place_hours)}</dd></div>`:''}</dl>`:''}<p>업체 위치·영업시간·후기는 네이버플레이스에서 확인해 주세요.</p><a class="place-link" href="${e(url)}" target="_blank" rel="noopener noreferrer nofollow">네이버플레이스에서 업체 정보 보기 ↗<span class="sr-only"> (새 창)</span></a></section>`;
}
