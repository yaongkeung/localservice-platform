import {test} from 'node:test';
import assert from 'node:assert/strict';
import worker from '../src/worker.js';
import {companies} from '../src/data.js';
import {localAssets} from '../scripts/local-assets.mjs';
const get=(path,method='GET')=>worker.fetch(new Request('https://gongsa8282.xyz'+path,{method}),{ASSETS:localAssets});
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
 assert.equal(data.provinces.length,16);assert.equal(data.districts.length,256);
 const yangcheon=await(await get('/maps/district/11470.json')).json();assert.ok(yangcheon.areas.some(d=>d.name==='목1동'));
 for(const province of data.provinces){assert.match(province.path,/^M/);assert.doesNotMatch(province.path,/NaN|Infinity/);}
 const script=await get('/assets/portal.js');assert.match(script.headers.get('content-type'),/javascript/);assert.match(await script.text(),/chooseProvince/);
 assert.equal(await(await get('/assets/portal.js','HEAD')).text(),'');
 const home=await get('/');assert.match(home.headers.get('content-security-policy'),/script-src 'self'/);
 const html=await home.text();assert.match(html,/class="post-board"/);assert.ok(html.indexOf('id="region-map"')<html.indexOf('class="post-board"'));assert.match(html,/2026-10-01/);
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
test('nationwide assets are complete, WGS84 and include towns, townships and dong labels',async()=>{
 const index=await(await get('/assets/boundaries.json')).json();
 const features=(await(await get('/maps/provinces.json')).json()).features;
 assert.equal(features.length,index.provinces.length);
 let leaves=0,towns=0,townships=0,dongs=0;
 const seen=new Set();
 for(const province of index.provinces){
  const data=await(await get('/maps/province/'+province.code+'.json')).json();
  assert.equal(data.areas.length,index.districts.filter(d=>d.province===province.code).length);
  features.push(...data.features);
  for(const district of data.areas){
   const local=await(await get('/maps/district/'+district.code+'.json')).json();
   assert.equal(local.areas.length,local.features.length);features.push(...local.features);leaves+=local.areas.length;
   for(const area of local.areas){assert.ok(!seen.has(area.code));seen.add(area.code);assert.ok(area.code.startsWith(district.code));assert.equal(area.label.length,2);towns+=Number(/읍$/.test(area.name));townships+=Number(/면$/.test(area.name));dongs+=Number(/동$/.test(area.name));}
  }
 }
 assert.equal(leaves,3559);assert.ok(towns>200&&townships>1000&&dongs>2000);
 for(const feature of features){
  assert.equal(feature.properties.label.length,2);
  const polygons=feature.geometry.type==='Polygon'?[feature.geometry.coordinates]:feature.geometry.coordinates;
  for(const polygon of polygons)for(const ring of polygon){assert.ok(ring.length>=4);assert.deepEqual(ring[0],ring.at(-1));for(const [lon,lat]of ring){assert.ok(lon>123&&lon<133);assert.ok(lat>32&&lat<40);}}
 }
});
test('province filters include child regions without fabricating district assignments',async()=>{
 const html=await(await get('/?province=11')).text();assert.match(html,/샘플 2건/);
 const gyeonggi=await(await get('/?province=41')).text();assert.match(gyeonggi,/샘플 1건/);
 const mismatch=await(await get('/?province=41&district=11440')).text();assert.match(mismatch,/조건에 맞는 사례가 없습니다/);
 const rural=await(await get('/?province=41&district=41820')).text();assert.match(rural,/조건에 맞는 사례가 없습니다/);
 assert.equal((await get('/maps/district/99999.json')).status,404);
 assert.equal((await get('/maps/../src/data.js')).status,404);
 assert.equal(await(await get('/maps/provinces.json','HEAD')).text(),'');
});
test('HTTP map endpoints are allowed only for loopback development',async()=>{
 for(const host of ['localhost','127.0.0.1']){
  const res=await worker.fetch(new Request('http://'+host+':8787/'));
  assert.match(res.headers.get('content-security-policy'),/http:\/\/oapi\.map\.naver\.com/);
 }
 for(const url of ['https://gongsa8282.xyz/','http://gongsa8282.xyz/','https://localhost/']){
  const res=await worker.fetch(new Request(url));
  assert.doesNotMatch(res.headers.get('content-security-policy'),/http:\/\//);
 }
});
