import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {searchDescription} from '../src/search-metadata.js';
import {pageShell} from '../src/public-shell.js';
import {inlineText} from '../src/post-content.js';
import {placeCard} from '../src/place.js';
import worker from '../src/worker.js';
import {localMedia} from '../scripts/local-media.mjs';
const graph=html=>JSON.parse(html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1])['@graph'];
test('snippets are plain, bounded and do not repeat whole sentences or truncate unicode pairs',()=>{
 assert.equal(searchDescription('## 안내 **업무** [사진:12] [자료](https://example.com) 확인. 안내 업무 자료 확인. 두번째 문장. 세번째.'),'안내 업무 자료 확인. 두번째 문장.');
 const text=searchDescription('사우동 강화유리 상담 '+('설치 위치를 확인하세요 😀 '.repeat(50)));assert.ok(Array.from(text).length<=180);assert.ok(!/[\ud800-\udbff]$/.test(text));assert.ok(text.endsWith('…'));
});
test('visible metadata and article schema agree; hostile input cannot break JSON or HTML',async()=>{
 const html=await pageShell({title:'지역 <업무>',description:'<b>사진 설명</b> '+('확인할 내용 '.repeat(80)),path:'/a/b/c/d.html',body:'<h1>지역 업무</h1>',schema:{'@type':'Article',headline:'</script><script>bad()</script>',description:'old',author:{'@type':'Organization',name:'등록 업체'}}}).text();
 const nodes=graph(html),article=nodes.find(n=>n['@type']==='Article');assert.equal(article.description,searchDescription('<b>사진 설명</b> '+('확인할 내용 '.repeat(80))));assert.equal(article.publisher['@id'],'https://gongsa8282.xyz/#organization');assert.equal(article.inLanguage,'ko-KR');assert.ok(!nodes.some(n=>n['@type']==='WebSite'));assert.doesNotMatch(html,/<script>bad/);assert.match(html,/max-image-preview:large/);assert.match(html,/<meta name="description" content="사진 설명/);
});
test('brand, favicon, publisher and about page have crawlable canonical representations',async()=>{
 const home=await(await worker.fetch(new Request('https://gongsa8282.xyz/'),{ASSETS:localMedia})).text(),nodes=graph(home);assert.match(home,/<title>동네핀 \|/);assert.equal((home.match(/rel="icon"/g)||[]).length,1);assert.ok(nodes.some(n=>n['@type']==='WebSite'&&n.name==='동네핀'));const logo=nodes.find(n=>n['@type']==='Organization').logo;assert.equal(logo.width,192);
 const icon=await worker.fetch(new Request(logo.url),{ASSETS:localMedia}),bytes=Buffer.from(await icon.arrayBuffer());assert.equal(icon.status,200);assert.equal(bytes.readUInt32BE(16),192);assert.equal(bytes.readUInt32BE(20),192);assert.deepEqual(bytes,await readFile('public/media/dongnepin-symbol.png'));
 const about=await(await worker.fetch(new Request('https://gongsa8282.xyz/about/'))).text();assert.match(about,/자동 작성 기능/);assert.match(about,/운영자가 사진·지역·업무 사실을 확인/);assert.ok(graph(about).some(n=>n['@type']==='WebPage'));assert.doesNotMatch(about,/FAQPage|HowTo/);
 const sitemap=await(await worker.fetch(new Request('https://gongsa8282.xyz/sitemap.xml'))).text();assert.match(sitemap,/<loc>https:\/\/gongsa8282.xyz\/about\/<\/loc>/);
});
test('provider and supplied content links do not pass paid or untrusted ranking credit',()=>{
 assert.match(inlineText('[제공 자료](https://example.com)'),/rel="noopener noreferrer ugc nofollow"/);assert.match(placeCard({name:'업체',naver_place_url:'https://naver.me/abcd1234'}),/rel="noopener noreferrer nofollow"/);
});
