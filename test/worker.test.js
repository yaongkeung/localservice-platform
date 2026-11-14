import {test} from 'node:test';
import assert from 'node:assert/strict';
import worker from '../src/worker.js';
import {companies} from '../src/data.js';
const get=(path,method='GET')=>worker.fetch(new Request('https://gongsa8282.xyz'+path,{method}));
const boardHtml=html=>html.match(/<div class="post-board">[\s\S]*?<\/table><\/div>/)?.[0]||'';
test('all internal links resolve, pages contain HTML and a canonical',async()=>{
 const queue=['/'];const seen=new Set();
 while(queue.length){const path=queue.shift();const key=path.split('?')[0];if(seen.has(key))continue;seen.add(key);const res=await get(path);assert.equal(res.status,200,path);const html=await res.text();assert.match(html,/<html lang="ko">/);assert.equal((html.match(/rel="canonical"/g)||[]).length,1);for(const [,href]of html.matchAll(/href="(\/[^"#]*)(?:#[^"]*)?"/g)){if(!seen.has(href.split('?')[0]))queue.push(href.replaceAll('&amp;','&'));}}
 assert.ok(seen.has('/post/101/'));assert.ok(seen.has('/company/1/'));assert.ok(seen.has('/region/seoul/mapo/'));assert.ok(seen.has('/service/plumbing/'));
});
test('region hierarchy, service and query combine correctly',async()=>{
 const html=await(await get('/?region=seoul&service=plumbing&q=싱크대')).text();assert.match(html,/샘플 1건/);assert.match(boardHtml(html),/href="\/post\/101\/"/);assert.doesNotMatch(boardHtml(html),/href="\/post\/102\/"/);
 const empty=await(await get('/?region=gyeonggi&service=electrical')).text();assert.match(empty,/조건에 맞는 사례가 없습니다/);
});
test('untrusted search text is escaped and search is noindex',async()=>{const html=await(await get('/?q=%22%3E%3Cscript%3E')).text();assert.doesNotMatch(html,/<script>/);assert.match(html,/&quot;&gt;&lt;script&gt;/);assert.match(html,/noindex,follow/);});
test('unknown pages return 404, path normalizes, methods are restricted',async()=>{assert.equal((await get('/post/999/')).status,404);assert.equal((await get('/post/101')).status,308);assert.equal((await get('/','POST')).status,405);assert.equal(await(await get('/','HEAD')).text(),'');});
test('sample companies never dial a fabricated number',async()=>{const html=await(await get('/company/1/')).text();assert.match(html,/전화 상담/);assert.match(html,/aria-disabled="true"/);assert.doesNotMatch(html,/href="tel:/);});
test('a registered phone renders a working tel CTA on profile and article',async()=>{
 const old=companies[0].phone;
 try {companies[0].phone='+82-10-0000-0000';for(const path of ['/company/1/','/post/101/']){const html=await(await get(path)).text();assert.match(html,/href="tel:\+82-10-0000-0000"/);}}
 finally {companies[0].phone=old;}
});
test('map district filter returns only assigned posts; unassigned dongs stay empty',async()=>{
 const html=await(await get('/?district=11440')).text();
 assert.match(html,/샘플 1건/);assert.match(boardHtml(html),/href="\/post\/101\/"/);assert.doesNotMatch(boardHtml(html),/href="\/post\/102\/"/);
 for(const query of ['district=11470&dong=11470510','district=11440&dong=11470510','district=not-a-code']) {
   const empty=await(await get('/?'+query)).text();assert.match(empty,/조건에 맞는 사례가 없습니다/);
 }
});
test('board home has no map, credentials endpoint, SDK permissions or geometry',async()=>{
 const response=await get('/');const html=await response.text();
 assert.match(html,/class="post-board"/);assert.match(html,/aria-label="지역 필터"/);assert.match(html,/업종 게시판/);
 assert.doesNotMatch(html,/naver|region-map|<svg|class="hero"|map-config/i);
 assert.doesNotMatch(response.headers.get('content-security-policy'),/naver|pstatic|http:/);
 const js=await(await get('/assets/portal.js')).text();assert.doesNotMatch(js,/naver|ncpKeyId|map-config|geometry/);
 assert.equal((await get('/assets/map-config.json')).status,404);assert.equal((await get('/maps/provinces.json')).status,404);
});
test('national dropdowns contain every coded township with no geometric payload',async()=>{
 const index=await(await get('/assets/regions.json')).json();assert.equal(index.provinces.length,16);assert.equal(index.districts.length,256);
 let total=0,towns=0,townships=0,dongs=0;const seen=new Set();
 for(const district of index.districts){
  const response=await get('/assets/regions/'+district.code+'.json');assert.equal(response.status,200);
  const items=await response.json();total+=items.length;
  for(const item of items){assert.deepEqual(Object.keys(item).sort(),['code','name']);assert.ok(item.code.startsWith(district.code));assert.ok(!seen.has(item.code));seen.add(item.code);towns+=Number(/읍$/.test(item.name));townships+=Number(/면$/.test(item.name));dongs+=Number(/동$/.test(item.name));}
 }
 assert.equal(total,3559);assert.ok(towns>200&&townships>1000&&dongs>2000);
 assert.equal((await get('/assets/regions/99999.json')).status,404);
 assert.equal(await(await get('/assets/regions/11470.json','HEAD')).text(),'');
 const selected=await(await get('/?province=41&district=41820&dong=41820250')).text();assert.match(selected,/<option value="41820250" selected>가평읍<\/option>/);
});
test('post type, service, region and keyword filters compose correctly',async()=>{
 const cases=await(await get('/?kind=case')).text();assert.match(cases,/샘플 2건/);
 const tips=await(await get('/?province=11&service=electrical&kind=tip&q=조명')).text();assert.match(tips,/샘플 1건/);assert.match(boardHtml(tips),/href="\/post\/102\/"/);assert.doesNotMatch(boardHtml(tips),/href="\/post\/101\/"/);
 const guide=await(await get('/?kind=guide')).text();assert.match(guide,/조건에 맞는 사례가 없습니다/);
 assert.match(tips,/name="kind" value="tip"/);assert.match(tips,/name="service" value="electrical"/);
});
test('province filters include child regions without fabricating district assignments',async()=>{
 const html=await(await get('/?province=11')).text();assert.match(html,/샘플 2건/);
 const gyeonggi=await(await get('/?province=41')).text();assert.match(gyeonggi,/샘플 1건/);
 const mismatch=await(await get('/?province=41&district=11440')).text();assert.match(mismatch,/조건에 맞는 사례가 없습니다/);
 const rural=await(await get('/?province=41&district=41820')).text();assert.match(rural,/조건에 맞는 사례가 없습니다/);
 assert.equal((await get('/assets/regions/99999.json')).status,404);
 assert.equal((await get('/maps/../src/data.js')).status,404);
 assert.equal(await(await get('/assets/regions.json','HEAD')).text(),'');
});
