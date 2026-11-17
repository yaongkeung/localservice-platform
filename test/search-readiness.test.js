import {test} from 'node:test';
import assert from 'node:assert/strict';
import worker from '../src/worker.js';
import {sqliteDatabase,migrate} from '../scripts/sqlite.mjs';
import {seed} from '../scripts/seed.mjs';
import {digest,randomToken} from '../src/auth.js';
import {inspectSearchPost} from '../src/search-readiness.js';
const origin='https://preview.example';
async function fixture(){
 const DB=sqliteDatabase();await migrate(DB);await seed(DB);const auth={};
 for(const [id,role] of [[1,'ADMIN'],[2,'EDITOR']]){
  await DB.prepare('INSERT INTO users(id,name,login_id,password_hash,role) VALUES(?,?,?,?,?)').bind(id,'시험 사용자'+id,'test'+id,'not-a-login-password',role).run();
  const token=randomToken(),csrf=randomToken();await DB.prepare('INSERT INTO sessions(token_hash,user_id,csrf,expires_at) VALUES(?,?,?,?)').bind(await digest(token),id,csrf,Date.now()+3600000).run();auth[id]={cookie:'ls_session='+token,csrf};
 }
 await DB.prepare('UPDATE companies SET sample=0 WHERE id=1').run();await DB.prepare('UPDATE posts SET sample=0 WHERE id=101').run();
 const call=(path='/admin/search-readiness/',{as=1,form,env={},method=form?'POST':'GET'}={})=>worker.fetch(new Request(origin+path,{method,headers:{...(as?{cookie:auth[as].cookie}:{}),...(form?{origin,'content-type':'application/x-www-form-urlencoded'}:{})},body:form?new URLSearchParams({csrf:auth[as].csrf,...form}):undefined}),{DB,...env});
 const create=async i=>DB.prepare("INSERT INTO posts(company_id,region_id,service_id,post_type,title,summary,content,search_region,search_keyword,sample,title_hash,content_hash) VALUES(1,2,1,'서비스안내',?,'상담 내용을 정리한 고유한 요약입니다.',?,'마포구','배관 점검',0,?,?)").bind('마포구 배관 점검 · 확인 안내 '+i,JSON.stringify(['## 마포구 지역과 방문 상담 안내','고유한 실제 자료를 확인해 작성해야 할 서비스 안내입니다. '+i]),'unique-title-'+i,'unique-body-'+i).run();
 return {DB,call,create};
}
test('search readiness is private, administrator-only, read-only and never reports publication as measured exposure',async()=>{
 const f=await fixture();try{
  assert.equal((await f.call(undefined,{as:null})).status,303);assert.equal((await f.call(undefined,{as:2})).status,403);assert.equal((await f.call(undefined,{form:{}})).status,405);
  const response=await f.call();assert.equal(response.status,200);assert.equal(response.headers.get('cache-control'),'no-store');assert.match(response.headers.get('x-robots-tag'),/noindex/);
  const html=await response.text();assert.match(html,/실제 검색 노출<strong>미확인/);assert.match(html,/공개 글<strong>1건/);assert.match(html,/개발·미리보기 주소/);assert.match(html,/운영용 글 주소 \(예정\)/);assert.match(html,/https:\/\/gongsa8282.xyz\/post\/101\//);assert.ok(!html.includes('/admin/posts/102/'));assert.match(html,/지역명·업무 키워드를 설정/);
  const staged=await f.call(undefined,{env:{APP_ENV:'staging',PHOTOS:{get(){},put(){}},ASSETS:{fetch(){}}}});assert.match(await staged.text(),/시험 사이트는 검색 제외/);
  const post=await f.DB.prepare('SELECT title FROM posts WHERE id=101').first();assert.equal(post.title,'싱크대 아래 물 고임, 연결 부위부터 점검했어요');
 }finally{f.DB.close();}
});
test('readiness catches effective title mismatch, missing/reused photos and unreviewed copy without assigning an SEO score',()=>{
 const post={id:8,title:'응암동 강화유리 · 상담 안내',content:['## 응암동 지역 소개','사진 설명을 바탕으로 확인한 정보입니다.','## 자주 묻는 질문'],summary:'강화유리 상담 준비를 위한 안내입니다.',search_region:'응암동',search_keyword:'강화유리',active_photos:2,generation_reviewed:1,naver_place_url:'https://naver.me/Test1234'};
 const valid=inspectSearchPost(post);assert.deepEqual(valid.issues,[]);assert.equal(valid.query,'응암동 강화유리');assert.ok(valid.place&&valid.localIntro&&valid.faq);
 const problem=inspectSearchPost({...post,seo_title:'다른 검색용 제목',active_photos:0,generation_reviewed:0,duplicate_photo:1,duplicate_text:1,naver_place_url:'javascript:alert(1)'});assert.equal(problem.issues.length,5);assert.equal(problem.place,false);
 assert.match(problem.issues.join(' '),/검색용 제목/);assert.match(problem.issues.join(' '),/동일한 사진/);
});
test('readiness filters and paginates real posts, and safely renders stored markup and encoded Naver search queries',async()=>{
 const f=await fixture();try{
  for(let i=0;i<27;i++)await f.create(i);
  let html=await(await f.call('/admin/search-readiness/?company=1&status=DRAFT')).text();assert.match(html,/등록 글<strong>27건/);assert.equal((html.match(/class="cms-item search-post"/g)||[]).length,25);assert.match(html,/company=1&amp;status=DRAFT&amp;page=2/);
  html=await(await f.call('/admin/search-readiness/?company=1&status=DRAFT&page=2')).text();assert.equal((html.match(/class="cms-item search-post"/g)||[]).length,2);
  assert.match(html,/https:\/\/search.naver.com\/search.naver\?query=%EB%A7%88%ED%8F%AC%EA%B5%AC\+%EB%B0%B0%EA%B4%80\+%EC%A0%90%EA%B2%80/);
  await f.DB.prepare("UPDATE posts SET title='<img src=x onerror=alert(1)>',seo_description='<script>bad()</script>' WHERE id=101").run();
  html=await(await f.call('/admin/search-readiness/?status=PUBLISHED')).text();assert.ok(html.includes('&lt;img src=x onerror=alert(1)&gt;'));assert.doesNotMatch(html,/<img src=x|<script>bad/);
  await f.DB.prepare("UPDATE companies SET status='DISABLED' WHERE id=1").run();html=await(await f.call()).text();assert.match(html,/등록 글<strong>0건/);assert.match(html,/조건에 맞는 글이 없습니다/);
 }finally{f.DB.close();}
});
