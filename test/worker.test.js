import {test} from 'node:test';
import assert from 'node:assert/strict';
import worker from '../src/worker.js';
import {companies} from '../src/data.js';
const get=(path,method='GET')=>worker.fetch(new Request('https://gongsa8282.xyz'+path,{method}));
test('all internal links resolve, pages contain HTML and a canonical',async()=>{
 const queue=['/'];const seen=new Set();
 while(queue.length){const path=queue.shift();if(seen.has(path))continue;seen.add(path);const res=await get(path);assert.equal(res.status,200,path);const html=await res.text();assert.match(html,/<html lang="ko">/);assert.equal((html.match(/rel="canonical"/g)||[]).length,1);for(const [,href]of html.matchAll(/href="(\/[^"#]*)(?:#[^"]*)?"/g)){if(!seen.has(href))queue.push(href);}}
 assert.ok(seen.has('/post/101/'));assert.ok(seen.has('/company/1/'));assert.ok(seen.has('/region/seoul/mapo/'));assert.ok(seen.has('/service/plumbing/'));
});
test('region hierarchy, service and query combine correctly',async()=>{
 const html=await(await get('/?region=seoul&service=plumbing&q=싱크대')).text();assert.match(html,/샘플 1건/);assert.match(html,/href="\/post\/101\/"/);assert.doesNotMatch(html,/href="\/post\/102\/"/);
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
 assert.match(html,/샘플 1건/);assert.match(html,/href="\/post\/101\/"/);assert.doesNotMatch(html,/href="\/post\/102\/"/);
 for(const query of ['district=11470&dong=11470510','district=11440&dong=11470510','district=not-a-code']) {
   const empty=await(await get('/?'+query)).text();assert.match(empty,/조건에 맞는 사례가 없습니다/);
 }
});
test('map assets expose attributed real boundary shapes and a same-origin client',async()=>{
 const res=await get('/assets/boundaries.json');assert.equal(res.status,200);const data=await res.json();
 assert.equal(data.districts.length,25);assert.equal(data.districts.reduce((n,d)=>n+d.dongs.length,0),425);
 const yangcheon=data.districts.find(d=>d.name==='양천구');assert.ok(yangcheon.dongs.some(d=>d.name==='목1동'));
 for(const gu of data.districts){assert.match(gu.path,/^M/);assert.doesNotMatch(gu.path,/NaN|Infinity/);assert.ok(gu.dongs.every(d=>d.code.startsWith(gu.code)));}
 const script=await get('/assets/portal.js');assert.match(script.headers.get('content-type'),/javascript/);assert.match(await script.text(),/pointerover/);
 assert.equal(await(await get('/assets/portal.js','HEAD')).text(),'');
 const home=await get('/');assert.match(home.headers.get('content-security-policy'),/script-src 'self'/);
 const html=await home.text();assert.match(html,/class="post-board"/);assert.ok(html.indexOf('id="region-map"')<html.indexOf('class="post-board"'));assert.match(html,/2023.10.31/);
});
test('Naver runtime config exposes only the client ID and is never cached',async()=>{
 const url='https://gongsa8282.xyz/assets/map-config.json';
 const res=await worker.fetch(new Request(url),{NAVER_MAP_CLIENT_ID:'test-client-id',NAVER_MAP_CLIENT_SECRET:'do-not-expose'});
 assert.equal(res.headers.get('cache-control'),'no-store');
 assert.deepEqual(await res.json(),{clientId:'test-client-id'});
 const empty=await worker.fetch(new Request(url));assert.deepEqual(await empty.json(),{clientId:null});
 const invalid=await worker.fetch(new Request(url),{NAVER_MAP_CLIENT_ID:'"><script>'});assert.deepEqual(await invalid.json(),{clientId:null});
 const head=await worker.fetch(new Request(url,{method:'HEAD'}),{NAVER_MAP_CLIENT_ID:'test-client-id'});assert.equal(await head.text(),'');
});
test('Naver geometry is WGS84, closed, finite and covers every gu/dong',async()=>{
 const geo=await(await get('/assets/map-geometry.json')).json();
 assert.equal(geo.features.filter(f=>f.properties.level==='district').length,25);
 assert.equal(geo.features.filter(f=>f.properties.level==='dong').length,425);
 for(const feature of geo.features) {
  assert.equal(feature.geometry.type,'MultiPolygon');
  for(const polygon of feature.geometry.coordinates) for(const ring of polygon) {
   assert.ok(ring.length>=4);assert.deepEqual(ring[0],ring.at(-1));
   for(const [lon,lat] of ring) {assert.ok(lon>126&&lon<128);assert.ok(lat>37&&lat<38);}
  }
 }
});
