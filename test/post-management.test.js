import {test} from 'node:test';
import assert from 'node:assert/strict';
import worker from '../src/worker.js';
import {sqliteDatabase,migrate} from '../scripts/sqlite.mjs';
import {seed} from '../scripts/seed.mjs';
import {randomToken,digest} from '../src/auth.js';
import {firstPageQuery,firstPageState} from '../src/search-checks.js';
const origin='https://gongsa8282.xyz';
async function fixture(){
 const DB=sqliteDatabase();await migrate(DB);await seed(DB);const auth={};
 for(const [id,role]of [[1,'ADMIN'],[2,'EDITOR']]){await DB.prepare('INSERT INTO users(id,name,login_id,password_hash,role) VALUES(?,?,?,?,?)').bind(id,'목록 시험 '+id,'post-list-'+id,'not-a-login',role).run();const token=randomToken(),csrf=randomToken();await DB.prepare('INSERT INTO sessions(token_hash,user_id,csrf,expires_at) VALUES(?,?,?,?)').bind(await digest(token),id,csrf,Date.now()+600000).run();auth[id]={cookie:'ls_session='+token,csrf};}
 await DB.prepare("UPDATE companies SET customer_name='양승철',sample=0 WHERE id=1").run();await DB.prepare("UPDATE companies SET customer_name='가고객',sample=0 WHERE id=2").run();
 await DB.prepare('INSERT INTO company_assignments(user_id,company_id) VALUES(2,1)').run();
 const call=(path,{as=1,form,csrf=true,originHeader=origin}={})=>{const data=form instanceof URLSearchParams?new URLSearchParams(form):form?new URLSearchParams(form):null;if(data&&as&&csrf)data.set('csrf',auth[as].csrf);return worker.fetch(new Request(origin+path,{method:data?'POST':'GET',headers:{...(as?{cookie:auth[as].cookie}:{}),...(data?{origin:originHeader,'content-type':'application/x-www-form-urlencoded'}:{})},body:data||undefined}),{DB});};
 const row=id=>DB.prepare('SELECT p.*,c.version AS company_version,u.path AS public_path FROM posts p JOIN companies c ON c.id=p.company_id LEFT JOIN post_urls u ON u.post_id=p.id WHERE p.id=?').bind(id).first();
 const manifest=async ids=>JSON.stringify(await Promise.all(ids.map(async id=>{const p=await row(id);return [p.id,p.version,p.company_version];})));
 const create=async(index=1,company=1)=>{const result=await call('/admin/posts/new/',{form:{company_id:String(company),region_id:'2',service_id:'1',post_type:'서비스안내',title:'고객별 게시글 목록 시험 '+index,summary:'서로 다른 사진을 설명하는 목록 동작 시험용 요약입니다.',content:'고객별 게시글 목록과 선택 및 삭제 복원을 확인하는 시험용 본문입니다. 글마다 식별되는 번호를 포함하고 실제 시공 사례로 사용하지 않습니다. '+index,search_region:'서울시 마포구 성산동',search_keyword:'보일러누수'}});assert.equal(result.status,303,await result.clone().text());return Number(result.headers.get('location').split('/')[3]);};
 const archive=async(ids,{restore=false,as=1,...extra}={})=>call('/admin/posts/'+(restore?'bulk-restore':'bulk-delete')+'/',{as,form:{manifest:await manifest(ids),confirmed:'1',...extra}});
 const publish=async id=>{let p=await row(id);const response=await call('/admin/posts/'+id+'/',{form:{company_id:p.company_id,region_id:p.region_id,service_id:p.service_id,post_type:p.post_type,title:p.title,summary:p.summary,content:JSON.parse(p.content).join('\n\n'),version:p.version,search_region:p.search_region,search_keyword:p.search_keyword,confirm_publish:'1'}});assert.equal(response.status,303,await response.clone().text());return row(id);};
 return {DB,auth,call,row,manifest,create,archive,publish};
}

test('post table is customer-first, numbered, searchable and paginated; editor scope is retained',async()=>{
 const f=await fixture();try{
  for(let i=0;i<53;i++)await f.create(i,1);await f.create(90,2);
  let html=await(await f.call('/admin/')).text();assert.match(html,/<th scope="col">고객명 · 업체<\/th><th scope="col">순번/);assert.equal((html.match(/class="post-number"/g)||[]).length,50);assert.ok(html.indexOf('class="post-customer"><a href="/admin/?customer=%EA%B0%80')<html.indexOf('class="post-customer"><a href="/admin/?customer=%EC%96%91'));
  html=await(await f.call('/admin/?customer=양승철&page=2')).text();assert.match(html,/class="post-number">51</);assert.match(html,/이 고객 게시글 전체 삭제 \(54건\)/);assert.doesNotMatch(html,/고객별 게시글 목록 시험 90/);
  html=await(await f.call('/admin/?q=가고객')).text();assert.match(html,/고객별 게시글 목록 시험 90/);assert.doesNotMatch(html,/고객별 게시글 목록 시험 52/);
  html=await(await f.call('/admin/',{as:2})).text();assert.doesNotMatch(html,/고객별 게시글 목록 시험 90|선택한 글 삭제|customer-delete/);assert.equal((await f.call('/admin/?view=deleted',{as:2})).status,403);
 }finally{f.DB.close();}
});

test('post list defaults to newest creation, ignores edits/customer order and removes the Naver column and filters',async()=>{
 const f=await fixture();try{
  const old=await f.create(501,2),recent=await f.create(502,1);
  await f.DB.prepare("UPDATE posts SET created_at='2026-11-23 10:00:00',updated_at='2026-11-26 10:00:00' WHERE id=?").bind(old).run();
  await f.DB.prepare("UPDATE posts SET created_at='2026-11-25 10:00:00',updated_at='2026-11-25 10:00:00' WHERE id=?").bind(recent).run();
  const html=await(await f.call('/admin/?exposure=found')).text(),body=html.match(/<tbody>([\s\S]*?)<\/tbody>/)[1];
  assert.ok(body.indexOf('목록 시험 502')<body.indexOf('목록 시험 501'));assert.match(html,/최신 작성순/);
  assert.doesNotMatch(html,/네이버 1페이지|네이버 확인 상태|name="exposure"|확인 결과 기록|1페이지 확인/);
  assert.match(html,/-webkit-line-clamp:2/);assert.match(body,/#\d+ · 2026-11-25/);
 }finally{f.DB.close();}
});

test('delete confirmation is read-only; archive hides HTML, feeds and anonymous photos, preserving original URLs, content and history',async()=>{
 const f=await fixture();try{
  const id=await f.create(1),publicPost=await f.publish(id),before=await f.row(id),image='/uploads/'+id+'/'+'a'.repeat(64)+'-cover.jpg';
  // Stored photograph is a test fixture, not a production upload.
  await f.DB.prepare('INSERT INTO post_images(post_id,storage_key,alt_text) VALUES(?,?,?)').bind(id,image,'사진 시험').run();
  assert.equal((await f.call('/admin/posts/'+id+'/delete/')).status,200);assert.equal((await f.row(id)).deleted_at,null);
  const response=await f.archive([id]);assert.equal(response.status,303,await response.clone().text());let p=await f.row(id);assert.ok(p.deleted_at);assert.equal(p.status,'DRAFT');assert.equal(p.title,before.title);assert.equal(p.content,before.content);assert.equal(p.public_path,publicPost.public_path);
  assert.equal((await f.call(p.public_path,{as:null})).status,404);assert.equal((await f.call('/post/'+id+'/',{as:null})).status,404);assert.equal((await f.call(image,{as:null})).status,404);for(const path of ['/sitemap.xml','/rss.xml'])assert.ok(!(await(await f.call(path,{as:null})).text()).includes(encodeURI(p.public_path)));
  assert.equal((await f.call('/admin/posts/'+id+'/')).status,404);assert.equal((await f.call('/admin/posts/'+id+'/status/',{form:{version:p.version,action:'publish'}})).status,404);assert.equal((await f.call('/admin/posts/'+id+'/generate/',{form:{version:p.version}})).status,404);
  assert.equal((await f.DB.prepare('SELECT COUNT(*) n FROM post_snapshots WHERE post_id=?').bind(id).first()).n,1);assert.equal((await f.DB.prepare('SELECT COUNT(*) n FROM post_images WHERE post_id=?').bind(id).first()).n,1);
  await assert.rejects(()=>f.DB.prepare("UPDATE posts SET title='삭제 상태 수정' WHERE id=?").bind(id).run(),/Restore archived/);
  await assert.rejects(()=>f.DB.prepare("UPDATE post_images SET alt_text='삭제 상태 수정' WHERE post_id=?").bind(id).run(),/archived/);
  assert.equal((await f.archive([id],{restore:true})).status,303);p=await f.row(id);assert.equal(p.deleted_at,null);assert.equal(p.status,'DRAFT');assert.equal((await f.call(p.public_path,{as:null})).status,404);const republished=await f.publish(id);assert.equal(republished.public_path,before.public_path);assert.equal(republished.published_at,before.published_at);
 }finally{f.DB.close();}
});

test('customer-wide delete includes all that exact customer’s companies and pages, with recoverable batch and no effect on other customers',async()=>{
 const f=await fixture();try{
  await f.DB.prepare("UPDATE companies SET customer_name='양승철' WHERE id=3").run();
  for(let i=0;i<55;i++)await f.create(100+i,i===54?3:1);const other=await f.create(900,2);
  let html=await(await f.call('/admin/posts/customer-delete/?customer=양승철')).text();assert.match(html,/57개 게시글 삭제/);assert.match(html,/맑은 공간 케어/);assert.doesNotMatch(html,/목록 시험 900/);
  const pairs=(await f.DB.prepare("SELECT p.id,p.version,c.version AS cv FROM posts p JOIN companies c ON c.id=p.company_id WHERE c.customer_name='양승철'").all()).results.map(p=>[p.id,p.version,p.cv]);
  const response=await f.call('/admin/posts/customer-delete/',{form:{customer:'양승철',manifest:JSON.stringify(pairs),confirmed:'1'}});assert.equal(response.status,303,await response.clone().text());assert.equal((await f.DB.prepare('SELECT COUNT(*) n FROM posts WHERE deleted_at IS NOT NULL').first()).n,57);assert.equal((await f.row(other)).deleted_at,null);
  const operation=new URL(response.headers.get('location'),origin).searchParams.get('operation');html=await(await f.call('/admin/posts/batch/'+operation+'/restore/')).text();assert.match(html,/57개 게시글 복원/);
  const restoreManifest=(await f.DB.prepare('SELECT p.id,p.version,c.version AS cv FROM posts p JOIN companies c ON c.id=p.company_id WHERE p.deleted_operation_id=?').bind(operation).all()).results.map(p=>[p.id,p.version,p.cv]);
  assert.equal((await f.call('/admin/posts/batch/'+operation+'/restore/',{form:{manifest:JSON.stringify(restoreManifest),confirmed:'1'}})).status,303);assert.equal((await f.DB.prepare('SELECT COUNT(*) n FROM posts WHERE deleted_at IS NOT NULL').first()).n,0);
 }finally{f.DB.close();}
});

test('archive rejects forged customer membership, stale selection, duplicate IDs, CSRF and non-admin actors',async()=>{
 const f=await fixture();try{
  const a=await f.create(1,1),b=await f.create(2,2),saved=await f.manifest([a]);
  assert.equal((await f.call('/admin/posts/bulk-delete/',{as:2,form:{manifest:saved,confirmed:'1'}})).status,403);assert.equal((await f.call('/admin/posts/bulk-delete/',{csrf:false,form:{manifest:saved,confirmed:'1'}})).status,403);
  assert.equal((await f.call('/admin/posts/customer-delete/',{form:{customer:'양승철',manifest:await f.manifest([b]),confirmed:'1'}})).status,409);
  assert.equal((await f.call('/admin/posts/'+a+'/delete/',{form:{manifest:await f.manifest([b]),confirmed:'1'}})).status,409);
  assert.equal((await f.call('/admin/posts/bulk-delete/',{form:{manifest:JSON.stringify([...JSON.parse(saved),...JSON.parse(saved)]),confirmed:'1'}})).status,409);
  await f.DB.prepare('UPDATE posts SET version=version+1 WHERE id=?').bind(a).run();assert.equal((await f.call('/admin/posts/bulk-delete/',{form:{manifest:saved,confirmed:'1'}})).status,409);assert.equal((await f.DB.prepare('SELECT COUNT(*) n FROM post_archive_batches').first()).n,0);
 }finally{f.DB.close();}
});

test('archive rechecks actor, post and company versions atomically; partial batch failures roll back all changes',async()=>{
 for(const race of ['actor','post','company','write','partial']){
  const f=await fixture();try{
   const a=await f.create(1),b=await f.create(2),manifest=await f.manifest([a,b]),batch=f.DB.batch;
   f.DB.batch=async statements=>{if(race==='actor')await f.DB.prepare("UPDATE users SET status='DISABLED' WHERE id=1").run();else if(race==='post')await f.DB.prepare('UPDATE posts SET version=version+1 WHERE id=?').bind(a).run();else if(race==='company')await f.DB.prepare('UPDATE companies SET version=version+1 WHERE id=1').run();else if(race==='partial')f.DB.raw.exec(`CREATE TRIGGER skip_archive BEFORE UPDATE OF deleted_at ON posts WHEN OLD.id=${b} BEGIN SELECT RAISE(IGNORE); END;`);else f.DB.raw.exec("CREATE TRIGGER fail_archive BEFORE UPDATE OF deleted_at ON posts BEGIN SELECT RAISE(ABORT,'test failure'); END;");return batch(statements);};
   assert.equal((await f.call('/admin/posts/bulk-delete/',{form:{manifest,confirmed:'1'}})).status,409,race);for(const id of [a,b])assert.equal((await f.row(id)).deleted_at,null,race);assert.equal((await f.DB.prepare('SELECT COUNT(*) n FROM post_archive_batches').first()).n,0,race);assert.equal((await f.DB.prepare('SELECT COUNT(*) n FROM post_archive_events').first()).n,0,race);
  }finally{f.DB.close();}
 }
});

test('first-page query uses only township and main keyword, with dated manual evidence that expires or becomes stale on edit',()=>{
 const p={id:120,version:5,public_path:'/배관/인천/송도동/송도동-보일러누수.html',search_region:'인천 연수구 송도동',search_keyword:'보일러누수',region_name:'송도동'};
 assert.equal(firstPageQuery(p),'송도동 보일러누수');assert.equal(firstPageQuery({...p,search_region:'전남 강진군 마량면'}),'마량면 보일러누수');assert.equal(firstPageQuery({...p,search_region:'김포시',region_name:'김포시'}),'');
 const now=Date.now(),check={post_version:5,query:'송도동 보일러누수',public_path:p.public_path,result:'FOUND',checked_at:new Date(now).toISOString()};assert.equal(firstPageState(p,check,now).tone,'found');assert.equal(firstPageState({...p,version:6},check,now).tone,'stale');assert.equal(firstPageState(p,check,now+8*86400000).tone,'stale');assert.equal(firstPageState(p,null).label,'미확인');assert.equal(firstPageState(p,{...check,result:'NOT_FOUND'},now).tone,'missing');
});

test('manual result recording is authenticated, version-bound, separate from publication and safely rendered',async()=>{
 const f=await fixture();try{
  const id=await f.create(1),p=await f.publish(id),path='/admin/posts/'+id+'/search-check/';
  assert.equal((await f.call(path,{as:2})).status,403);assert.equal((await f.call(path,{csrf:false,form:{version:p.version,result:'FOUND',device:'PC',confirmed:'1'}})).status,403);
  const saved=await f.call(path,{form:{version:p.version,result:'FOUND',device:'PC',confirmed:'1',note:'<script>not executable</script>'}});assert.equal(saved.status,303,await saved.clone().text());assert.equal((await f.row(id)).version,p.version);
  let html=await(await f.call('/admin/?customer=양승철')).text();assert.doesNotMatch(html,/1페이지 확인|확인 결과 기록/);html=await(await f.call(path)).text();assert.ok(html.includes('&lt;script&gt;not executable&lt;/script&gt;'));assert.doesNotMatch(html,/<script>not executable/);
  assert.equal((await f.call(path,{form:{version:p.version-1,result:'FOUND',device:'PC',confirmed:'1'}})).status,409);assert.equal((await f.DB.prepare('SELECT COUNT(*) n FROM post_search_checks').first()).n,1);
  await f.archive([id]);assert.equal((await f.call(path)).status,404);assert.equal((await f.DB.prepare('SELECT COUNT(*) n FROM post_search_checks').first()).n,1);
 }finally{f.DB.close();}
});
