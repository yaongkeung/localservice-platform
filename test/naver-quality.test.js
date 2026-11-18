import {test} from 'node:test';
import assert from 'node:assert/strict';
import worker from '../src/worker.js';
import {sqliteDatabase,migrate} from '../scripts/sqlite.mjs';
import {seed} from '../scripts/seed.mjs';
import {repeatedContentWarnings} from '../src/content-quality.js';
import {inspectSearchPost} from '../src/search-readiness.js';
import {populatedServices} from '../src/public-catalog.js';
import {consultationPage} from '../src/consultation-page.js';
import {windowCopy} from './page-copy-fixture.js';
import {simplePostForm} from '../src/editor-values.js';
import {postContent,photoAlt} from '../src/post-content.js';

test('empty boards return 404 and public board navigation only links to populated boards',async()=>{
 const DB=sqliteDatabase();await migrate(DB);await seed(DB);
 try{
  await DB.prepare("INSERT INTO services(name,slug,description) VALUES('게시글 없는 업종','empty-board','아직 글 없음')").run();
  await DB.prepare("INSERT INTO regions(name,slug,level) VALUES('게시글 없는 지역','empty-area',1)").run();
  const get=path=>worker.fetch(new Request('https://gongsa8282.xyz'+path),{DB});
  for(const path of ['/','/region/seoul/','/service/plumbing/']){
   const response=await get(path);assert.equal(response.status,200);const html=await response.text();
   assert.doesNotMatch(html,/href="\/(?:service\/empty-board|region\/empty-area)\//);
   assert.equal((html.match(/<h1\b/g)||[]).length,1);
   if(path==='/')assert.ok(html.includes('value="empty-board"')||html.includes('service=empty-board')); // Remains available to editors/filters.
   else assert.match(html,/"name":"동네핀","item":"https:\/\/gongsa8282.xyz\/"/);
  }
  for(const path of ['/service/empty-board/','/region/empty-area/']){
   const response=await get(path);assert.equal(response.status,404);assert.match(await response.text(),/noindex,follow/);
  }
 }finally{DB.close();}
});

test('a child service publication makes its parent board discoverable',()=>{
 const services=[{id:1,parent_id:null},{id:2,parent_id:1},{id:3,parent_id:null}];
 assert.deepEqual(populatedServices(services,[{service_id:2}]).map(s=>s.id),[1,2]);
});

test('editorial repetition warnings compare substance without treating shared labels or photographs as a penalty',()=>{
 const common=['같은 동네에서도 건물의 출입 조건과 작업할 위치가 다르므로 방문 전에 관리 담당자에게 필요한 준비와 허용 범위를 확인해 주세요.','전체 사진과 가까운 사진을 함께 준비하고 필요한 업무와 확인한 증상, 방문 가능한 시간을 구분하여 업체에 전달하면 상담에 도움이 됩니다.'];
 const base={id:1,company_id:5,search_region:'청천동',search_keyword:'옥상누수',title:'청천동 옥상누수',summary:'상담',content:common,active_photos:2},other={...base,id:2,search_region:'삼산동',search_keyword:'보일러누수',title:'삼산동 보일러누수'};
 assert.equal(repeatedContentWarnings(base,[other]).length,1);
 assert.match(inspectSearchPost(base,[other]).issues.join(' '),/#2 글.*문단 2개/);
 assert.deepEqual(repeatedContentWarnings(base,[{...other,company_id:9}]),[]);
 assert.deepEqual(repeatedContentWarnings(base,[{...other,content:['서로 다른 사진과 업무 사실을 직접 작성한 문서입니다.']}]),[]);
 assert.deepEqual(repeatedContentWarnings(base,[other],common),[]);
});

test('public hero uses reviewed title/body summary instead of independent inferred diagnosis copy',()=>{
 const html=consultationPage({id:9,title:'용인시 강화유리 창문 크기 확인',search_region:'용인시',search_keyword:'강화유리',summary:'사진에서 확인한 창문을 상담합니다.',content:['사진에서 확인한 창문입니다.'],page_copy:{...windowCopy,hero_heading:'확인되지 않은 진단 결론',services_intro:'사진만으로 원인을 파악한 것처럼 보이는 잘못된 안내 문단입니다.'}},[],{id:4,name:'유리 업체'},'');
 assert.match(html,/사진에서 확인한 창문을 상담합니다/);assert.doesNotMatch(html,/확인되지 않은 진단 결론|사진만으로 원인을 파악/);
});

test('a corrected area preserves an explicitly written matching photo-specific title',()=>{
 const post={company_id:5,service_id:1,search_region:'청천동',search_keyword:'옥상누수',content:['기존 내용']},data={companies:[{id:5,name:'업체'}],services:[{id:1,name:'배관·누수'}]},title='인천 부평구 청천동 옥상누수 · 밸브와 노출관 사진 점검';
 const form=new URLSearchParams({company_id:'5',search_region:'인천 부평구 청천동',search_keyword:'옥상누수',title,content:'사진에 보이는 대상을 확인하고 상담합니다.'});
 assert.equal(simplePostForm(form,data,post).get('title'),title);
 form.set('title','다른 지역의 오래된 제목');assert.equal(simplePostForm(form,data,post).get('title'),'인천 부평구 청천동 옥상누수');
});

test('editing the photo paragraph also corrects public alt text and caption without rewriting the original record',()=>{
 const image={id:1,post_id:5,storage_key:'/uploads/5/photo.jpg',alt_text:'누수 원인을 진단했습니다.'},post={id:5,content:['붉은 손잡이가 있는 **금속 밸브**와 표면 변색이 보입니다.','[사진:1]']},original=structuredClone(image);
 const html=postContent(post,[image]);assert.match(html,/alt="붉은 손잡이가 있는 금속 밸브와 표면 변색이 보입니다\."/);assert.doesNotMatch(html,/진단했습니다/);assert.deepEqual(image,original);
 assert.equal(photoAlt({content:[]},image),image.alt_text);
});
