import {test} from 'node:test';
import {readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import worker from '../src/worker.js';
import {sqliteDatabase,migrate} from '../scripts/sqlite.mjs';
import {seed} from '../scripts/seed.mjs';
import {digest,randomToken} from '../src/auth.js';
import {catalogBranch,registerRegion} from '../src/cms-regions.js';
import {regionData} from '../src/regions-data.js';
import {isoDate} from '../src/seo.js';
const origin='https://gongsa8282.xyz';
async function fixture(){
 const DB=sqliteDatabase();await migrate(DB);await seed(DB);const auth={};
 for(const [id,role] of [[1,'ADMIN'],[2,'EDITOR'],[3,'EDITOR']]){
  await DB.prepare('INSERT INTO users(id,name,login_id,password_hash,role) VALUES(?,?,?,?,?)').bind(id,'시험 사용자'+id,'test'+id,'not-a-login-password',role).run();
  const token=randomToken(),csrf=randomToken();await DB.prepare('INSERT INTO sessions(token_hash,user_id,csrf,expires_at) VALUES(?,?,?,?)').bind(await digest(token),id,csrf,Date.now()+3600000).run();auth[id]={cookie:'ls_session='+token,csrf};
 }
 await DB.prepare('INSERT INTO company_assignments(user_id,company_id) VALUES(2,1),(3,2)').run();
 const call=(path,{as,form,headers={},method=form?'POST':'GET'}={})=>worker.fetch(new Request(origin+path,{method,headers:{...(as?{cookie:auth[as].cookie}:{}),...(form?{origin,'content-type':'application/x-www-form-urlencoded'}:{}),...headers},body:form?new URLSearchParams({...form,...(as?{csrf:auth[as].csrf}:{})}):undefined}),{DB});
 const row=id=>DB.prepare('SELECT * FROM posts WHERE id=?').bind(id).first();
 const values=(override={})=>({title:'국내 지역 작업사례 '+randomToken().slice(0,8),summary:'전국 지역 선택과 재공개 기능을 점검하는 샘플 안내입니다.',content:'이 글은 지역 선택과 게시 상태 변경을 확인하기 위한 시험 콘텐츠입니다. 실제 작업 실적이 아니며, 작업 내용을 기록하고 검수한 뒤 공개하는 과정을 검증합니다. '+randomToken(),company_id:1,region_id:2,service_id:1,post_type:'작업사례',...override});
 const create=async(overrides={},as=2)=>{const response=await call('/admin/posts/new/',{as,form:values(overrides)});assert.equal(response.status,303,await response.clone().text());return Number(response.headers.get('location').split('/')[3]);};
 const transition=async(id,action,as=1,version)=>call('/admin/posts/'+id+'/status/',{as,form:{action,version:version??(await row(id)).version}});
 const publish=async id=>{for(const action of ['submit','approve','publish'])assert.equal((await transition(id,action)).status,303);};
 const save=async(id,overrides={},as=2)=>{const post=await row(id);return call('/admin/posts/'+id+'/',{as,form:values({...post,content:JSON.parse(post.content).join('\n\n'),...overrides})});};
 return {DB,call,row,create,transition,publish,save};
}
test('every catalog township validates under its true province and district, and mismatches are rejected',()=>{
 let total=0,eup=0,myeon=0;
 for(const district of regionData.districts)for(const dong of regionData.dongs[district.code]||[]){
  const branch=catalogBranch(district.province,district.code,dong.code);assert.equal(branch.at(-1).name,dong.name);total++;if(dong.name.endsWith('읍'))eup++;if(dong.name.endsWith('면'))myeon++;
 }
 assert.equal(total,3559);assert.ok(eup>200&&myeon>1000);
 assert.throws(()=>catalogBranch('26','11440','11440510'),/지역 선택/);assert.throws(()=>catalogBranch('11','','11440510'),/지역 선택/);assert.throws(()=>catalogBranch('invalid'),/지역 선택/);
});
test('national draft selection registers only its branch, preserves old URLs and composes with public filters',async()=>{
 const f=await fixture();try{
  const district=regionData.districts.find(d=>(regionData.dongs[d.code]||[]).some(r=>r.name.endsWith('면'))),dong=regionData.dongs[district.code].find(r=>r.name.endsWith('면'));
  const fields={region_mode:'catalog',province:district.province,district:district.code,dong:dong.code};
  const id=await f.create(fields),post=await f.row(id),r=await f.DB.prepare('SELECT * FROM regions WHERE id=?').bind(post.region_id).first();assert.equal(r.admin_code,dong.code);
  const count=(await f.DB.prepare('SELECT COUNT(*) AS n FROM regions').first()).n;assert.ok(count<=8);
  const same=await Promise.all([registerRegion(f.DB,new URLSearchParams(fields)),registerRegion(f.DB,new URLSearchParams(fields))]);assert.deepEqual(same,[r.id,r.id]);assert.equal((await f.DB.prepare('SELECT COUNT(*) AS n FROM regions').first()).n,count);
  assert.equal((await f.DB.prepare('SELECT slug FROM regions WHERE id=2').first()).slug,'seoul/mapo');
  assert.equal((await f.call('/?province='+district.province+'&district='+district.code+'&dong='+dong.code)).status,200);
  assert.ok(!(await(await f.call('/sitemap.xml')).text()).includes('/region/'+r.slug+'/'));
  await f.publish(id);
  const html=await(await f.call('/?province='+district.province+'&district='+district.code+'&dong='+dong.code)).text();assert.ok(html.includes(post.title));
  assert.ok((await(await f.call('/region/'+r.slug+'/')).text()).includes(post.title));assert.ok((await(await f.call('/sitemap.xml')).text()).includes('/region/'+r.slug+'/'));
  assert.equal((await f.call('/admin/posts/new/',{as:2,form:{title:'지역 오류 확인용 글입니다',summary:'선택 지역의 계층을 검증하기 위한 요약입니다.',content:'이 본문은 시도와 시군구가 맞지 않는 경우에 저장을 거부하는지 검증하기 위해 작성했습니다. 잘못된 조합을 임의로 다른 지역으로 바꾸어 저장하지 않습니다.',company_id:1,service_id:1,post_type:'작업사례',region_mode:'catalog',province:'26',district:'11440'}})).status,409);
 }finally{f.DB.close();}
});
test('withdrawing a post hides every public surface and snapshots the previous publication; editors cannot withdraw',async()=>{
 const f=await fixture();try{
  const id=await f.create();await f.publish(id);const old=await f.row(id);
  assert.equal((await f.transition(id,'withdraw',2)).status,403);
  assert.equal((await f.transition(id,'withdraw')).status,303);
  assert.equal((await f.call('/post/'+id+'/')).status,404);
  for(const path of ['/','/region/seoul/mapo/','/service/plumbing/','/company/1/','/sitemap.xml','/rss.xml']){const response=await f.call(path);assert.equal(response.headers.get('cache-control'),'no-store');assert.ok(!(await response.text()).includes('/post/'+id+'/'),path);}
  const snapshot=await f.DB.prepare('SELECT * FROM post_snapshots WHERE post_id=?').bind(id).first();assert.equal(snapshot.actor_id,1);assert.equal(JSON.parse(snapshot.snapshot).title,old.title);
  assert.ok((await(await f.call('/admin/posts/'+id+'/history/',{as:2})).text()).includes(old.title));assert.equal((await f.call('/admin/posts/'+id+'/history/',{as:3})).status,404);
  assert.equal((await f.transition(id,'withdraw',1,old.version)).status,409);assert.equal((await f.DB.prepare('SELECT COUNT(*) AS n FROM post_snapshots WHERE post_id=?').bind(id).first()).n,1);
 }finally{f.DB.close();}
});
test('edited posts keep their URL, first publication date and original contract usage even after the contract closes',async()=>{
 const f=await fixture();try{
  await f.DB.prepare("INSERT INTO contracts(company_id,package_name,contract_quantity,start_date,end_date) VALUES(1,'기존 계약',1,'2020-01-01','2030-12-31')").run();
  const id=await f.create({contract_id:1});await f.publish(id);const old=await f.row(id);assert.equal(old.published_once,1);
  await f.transition(id,'withdraw');await f.DB.prepare("UPDATE contracts SET status='CLOSED' WHERE id=1").run();
  assert.equal((await f.save(id,{title:'수정 검수 후 다시 공개한 작업 이야기'})).status,303);
  assert.equal((await f.call('/post/'+id+'/')).status,404);await f.publish(id);
  const post=await f.row(id);assert.equal(post.published_at,old.published_at);assert.equal((await f.DB.prepare('SELECT published_quantity FROM contracts WHERE id=1').first()).published_quantity,1);
  assert.match(await(await f.call('/post/'+id+'/')).text(),/수정 검수 후 다시 공개한 작업 이야기/);
  const rss=await(await f.call('/rss.xml')).text();assert.equal((rss.match(new RegExp('<guid isPermaLink="true">'+origin+'/post/'+id+'/</guid>','g'))||[]).length,1);
  await f.transition(id,'withdraw');assert.equal((await f.save(id,{company_id:2,contract_id:null},1)).status,409);
  await assert.rejects(f.DB.prepare('UPDATE posts SET company_id=2 WHERE id=?').bind(id).run(),/immutable/);
 }finally{f.DB.close();}
});
test('RSS, sitemap and robots use canonical URLs and exclude non-public or empty area/service content',async()=>{
 const f=await fixture();try{
  const id=await f.create({title:'수전 & 배관 <점검> "시험"'});await f.publish(id);
  const unpublished=await f.create();await f.DB.prepare("INSERT INTO services(name,slug) VALUES('빈 업종','empty-service')").run();
  const sitemap=await(await f.call('/sitemap.xml')).text();assert.match(sitemap,/<urlset xmlns="http:\/\/www.sitemaps.org\/schemas\/sitemap\/0.9">/);assert.ok(sitemap.includes(origin+'/post/'+id+'/'));assert.ok(!sitemap.includes('/post/'+unpublished+'/'));assert.ok(!sitemap.includes('empty-service'));assert.ok(!sitemap.includes('/admin/'));
  const response=await f.call('/rss.xml');assert.match(response.headers.get('content-type'),/application\/rss\+xml/);const feed=await response.text();assert.match(feed,/수전 &amp; 배관 &lt;점검&gt; &quot;시험&quot;/);assert.ok(!feed.includes('/post/'+unpublished+'/'));
  const html=await(await f.call('/post/'+id+'/')).text(),graph=JSON.parse(html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1])['@graph'];assert.equal(graph.find(n=>n['@type']==='Article').headline,'수전 & 배관 <점검> "시험"');
  const robots=await(await f.call('/robots.txt')).text();assert.match(robots,/Disallow: \/admin\//);assert.match(robots,/Sitemap: https:\/\/gongsa8282.xyz\/sitemap.xml/);assert.doesNotMatch(robots,/Disallow: \/uploads\//);
  for(const path of ['/sitemap.xml','/rss.xml','/robots.txt'])assert.equal(await(await f.call(path,{method:'HEAD'})).text(),'');
 }finally{f.DB.close();}
});
test('article metadata and breadcrumbs describe the visible post and its actual representative image',async()=>{
 const f=await fixture();try{
  const response=await f.call('/post/101/'),html=await response.text();assert.match(html,/<meta property="og:type" content="article">/);assert.match(html,/<meta property="og:image" content="https:\/\/gongsa8282.xyz\/media\/plumbing-cover.jpg">/);
  const graph=JSON.parse(html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1])['@graph'];
  const article=graph.find(n=>n['@type']==='Article'),crumb=graph.find(n=>n['@type']==='BreadcrumbList');assert.equal(article.mainEntityOfPage,origin+'/post/101/');assert.ok(article.dateModified);assert.deepEqual(article.image,[origin+'/media/plumbing-cover.jpg']);assert.equal(crumb.itemListElement.at(-1).item,origin+'/post/101/');assert.equal(crumb.itemListElement.at(-1).name,article.headline);
  const id=await f.create();await f.publish(id);assert.doesNotMatch(await(await f.call('/post/'+id+'/')).text(),/<meta property="og:image"/);
  assert.equal(isoDate('2026-11-15 01:23:45'),'2026-11-15T01:23:45.000Z');assert.equal(isoDate('bad-date'),null);
 }finally{f.DB.close();}
});
test('upgrading an existing published contract preserves content, snapshots and previously counted quantity',async()=>{
 const db=sqliteDatabase();try{
  db.raw.exec('CREATE TABLE d1_migrations(id INTEGER PRIMARY KEY,name TEXT UNIQUE,applied_at TEXT DEFAULT CURRENT_TIMESTAMP)');
  for(const name of ['0001_cms.sql','0002_management_media.sql','0003_company_contract_guard.sql']){db.raw.exec(await readFile(new URL('../migrations/'+name,import.meta.url),'utf8'));await db.prepare('INSERT INTO d1_migrations(name) VALUES(?)').bind(name).run();}
  db.raw.exec("INSERT INTO users(id,name,login_id,password_hash,role) VALUES(1,'기존 관리자','old-admin','unused','ADMIN'); INSERT INTO companies(id,name,description) VALUES(1,'기존 업체','기존에 등록된 업체'); INSERT INTO regions(id,level,name,slug) VALUES(1,1,'기존 지역','old-region'); INSERT INTO services(id,name,slug) VALUES(1,'기존 업종','old-service'); INSERT INTO contracts(id,company_id,package_name,contract_quantity,start_date,end_date) VALUES(1,1,'기존 1건 계약',1,'2020-01-01','2030-12-31'); INSERT INTO posts(id,company_id,writer_id,region_id,service_id,post_type,title,summary,content,title_hash,content_hash,contract_id,last_actor_id) VALUES(1,1,1,1,1,'작업사례','기존 공개 제목','보관할 기존 요약','[\"보관할 기존 본문\"]','old-title','old-content',1,1); UPDATE posts SET status='REVIEW',version=2 WHERE id=1; UPDATE posts SET status='APPROVED',version=3 WHERE id=1; UPDATE posts SET status='PUBLISHED',published_at='2026-11-01',version=4 WHERE id=1;");
  assert.equal((await db.prepare('SELECT published_quantity FROM contracts').first()).published_quantity,1);
  await migrate(db);assert.equal((await db.prepare('SELECT published_once FROM posts').first()).published_once,1);
  db.raw.exec("UPDATE posts SET status='DRAFT',version=5 WHERE id=1; UPDATE posts SET title='수정 후 공개 제목' WHERE id=1; UPDATE posts SET status='REVIEW',version=6 WHERE id=1; UPDATE posts SET status='APPROVED',version=7 WHERE id=1; UPDATE posts SET status='PUBLISHED',version=8 WHERE id=1;");
  assert.equal((await db.prepare('SELECT published_quantity FROM contracts').first()).published_quantity,1);
  const snapshot=JSON.parse((await db.prepare('SELECT snapshot FROM post_snapshots').first()).snapshot);assert.equal(snapshot.title,'기존 공개 제목');assert.deepEqual(snapshot.content,['보관할 기존 본문']);
 }finally{db.close();}
});
