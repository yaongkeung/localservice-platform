import {test} from 'node:test';
import assert from 'node:assert/strict';
import worker from '../src/worker.js';
import {withRegionTitle} from '../src/post-title.js';
import {pageTitles} from '../src/page-titles.js';
import {publicDataset} from '../src/store.js';
import {sqliteDatabase,migrate} from '../scripts/sqlite.mjs';
import {seed} from '../scripts/seed.mjs';
test('legacy real post titles acquire their known locality without changing an existing locality or sample',()=>{
 const post={title:'유리 미닫이창과 방충망 사진',seo_title:'유리 미닫이창과 방충망 사진',search_region:'김포시',sample:false,public_path:'/keep.html'};
 const result=withRegionTitle(post);assert.equal(result.title,'김포시 유리 미닫이창과 방충망 사진');assert.equal(result.seo_title,result.title);assert.equal(result.public_path,post.public_path);assert.equal(post.title,'유리 미닫이창과 방충망 사진');
 assert.equal(withRegionTitle({...post,title:'김포시 창문 사진'}).title,'김포시 창문 사진');assert.equal(withRegionTitle({...post,sample:true}).title,post.title);
 assert.equal(withRegionTitle({title:'유리 사진'},{admin_code:'41570',name:'김포시'}).title,'김포시 유리 사진');assert.equal(withRegionTitle({title:'유리 사진'}).title,'유리 사진');
 assert.ok(Array.from(withRegionTitle({...post,title:'😀'.repeat(120)}).title).length<=120);assert.ok(!/[\ud800-\udbff]$/.test(withRegionTitle({...post,title:'😀'.repeat(120)}).title));
});
test('page title, headline, lists and RSS consistently include a legacy locality while all saved fields and URLs remain intact',async()=>{
 const DB=sqliteDatabase();try{
  await migrate(DB);await seed(DB);await DB.prepare('UPDATE companies SET sample=0 WHERE id=1').run();await DB.prepare('UPDATE posts SET sample=0 WHERE id=101').run();
  const original=await DB.prepare('SELECT * FROM posts WHERE id=101').first(),data=await publicDataset(DB),post=data.published.find(item=>item.id===101);assert.equal(post.title,'서울시 마포구 '+original.title);
  for(const path of ['/','/rss.xml','/company/1/']){const response=await worker.fetch(new Request('https://gongsa8282.xyz'+path),{DB});assert.equal(response.status,200);assert.ok((await response.text()).includes(post.title),path);}
  const titles=pageTitles(post,data.regions.find(r=>r.id===post.region_id),data.services.find(s=>s.id===post.service_id));
  const html=await(await worker.fetch(new Request('https://gongsa8282.xyz/post/101/'),{DB})).text();assert.ok(html.includes('<title>'+titles.search+' | 동네핀</title>'));assert.ok(html.includes('<h1 class="page-title">'+titles.heading+'</h1>'));assert.ok(html.includes('"headline":"'+titles.heading+'"'));assert.ok(html.includes('rel="canonical" href="https://gongsa8282.xyz/post/101/"'));
  assert.deepEqual(await DB.prepare('SELECT * FROM posts WHERE id=101').first(),original);
 }finally{DB.close();}
});
