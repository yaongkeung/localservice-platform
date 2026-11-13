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
