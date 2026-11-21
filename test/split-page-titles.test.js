import {test} from 'node:test';import assert from 'node:assert/strict';
import {pageTitles} from '../src/page-titles.js';import {titleFor} from '../src/editor-title.js';import worker from '../src/worker.js';
import {sqliteDatabase,migrate} from '../scripts/sqlite.mjs';import {seed} from '../scripts/seed.mjs';import {withRegionTitle} from '../src/post-title.js';
const post={id:101,sample:false,search_region:'서울시 은평구 불광동',search_keyword:'강화유리 유리가게 유리집',related_keyword:'강화도어',page_copy:JSON.stringify({version:1,related_keyword:'강화도어',title_suffix:'유리문 프레임과 개폐 방식 상담'}),title:'서울시 은평구 불광동 강화유리 유리가게 유리집 강화도어 · 유리문 프레임과 개폐 방식 상담'};
test('an existing article gets the reference-style short heading and descriptive title without editing its stored data',()=>{
 const before=structuredClone(post),titles=pageTitles(post);assert.equal(titles.heading,'불광동 강화유리');assert.equal(titles.search,'서울시 은평구 불광동 강화유리 | 강화도어 · 유리문 프레임과 개폐 방식 상담');assert.notEqual(titles.heading,titles.search);assert.deepEqual(post,before);
 assert.equal(pageTitles({...post,search_region:'세종시 연기면'}).heading,'연기면 강화유리');
 assert.equal(pageTitles({...post,search_region:'김포시',search_keyword:'유리'}).heading,'김포시 유리');
 const legacy=pageTitles({title:'김포시 유리 미닫이창과 방충망 사진 안내',search_region:'',search_keyword:''},{name:'김포시'},{name:'유리·창호'});assert.equal(legacy.heading,'김포시 유리');assert.equal(legacy.search,'김포시 유리 | 미닫이창과 방충망 사진 안내');
 assert.equal(pageTitles({...post,title:'서울시 은평구 불광동 강화유리'}).search,'서울시 은평구 불광동 강화유리 | 강화도어 · 유리문 프레임과 개폐 방식 상담');
});
test('new automatic search titles use a pipe; edited descriptions and explicit SEO overrides survive',()=>{
 const title=titleFor(post.search_region,post.search_keyword,'강화도어','프레임과 문 여닫힘 확인');assert.match(title,/강화유리 \| 강화도어/);assert.equal(pageTitles({...post,title}).search,title);
 const edited=post.search_region+' 강화유리 | 직접 수정한 문틀 교체 범위 설명';assert.equal(pageTitles({...post,title:edited}).search,edited);
 assert.equal(pageTitles({...post,seo_title:'불광동 강화유리 | 별도로 확인한 검색 제목'}).search,'불광동 강화유리 | 별도로 확인한 검색 제목');
 assert.equal(pageTitles({title:'원래 작성한 제목',sample:true}).heading,'원래 작성한 제목');
});
test('public HTML, OG, article schema and the short H1 agree for a real saved article; URLs and stored title are preserved',async()=>{
 const DB=sqliteDatabase();await migrate(DB);await seed(DB);try{
 await DB.prepare('UPDATE companies SET sample=0 WHERE id=1').run();await DB.prepare('UPDATE posts SET sample=0,title=?,search_region=?,search_keyword=?,related_keyword=?,page_copy=? WHERE id=101').bind(post.title,post.search_region,post.search_keyword,post.related_keyword,post.page_copy).run();
 const before=await DB.prepare('SELECT * FROM posts WHERE id=101').first(),response=await worker.fetch(new Request('https://gongsa8282.xyz/post/101/'),{DB}),html=await response.text(),titles=pageTitles(withRegionTitle(before));assert.equal(response.status,200);
 assert.ok(html.includes('<h1 class="page-title">불광동 강화유리</h1>'));assert.ok(html.includes('<title>'+titles.search+' | 동네핀</title>'));assert.ok(html.includes('property="og:title" content="'+titles.search+'"'));
 const nodes=JSON.parse(html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1])['@graph'],article=nodes.find(n=>n['@type']==='Article');assert.equal(article.headline,titles.heading);assert.equal(article.name,titles.search);
 assert.equal((html.match(/<h1\b/g)||[]).length,1);assert.equal((html.match(/<title\b/g)||[]).length,1);assert.ok(html.includes('rel="canonical" href="https://gongsa8282.xyz/post/101/"'));assert.deepEqual(await DB.prepare('SELECT * FROM posts WHERE id=101').first(),before);
 }finally{DB.close();}
});
