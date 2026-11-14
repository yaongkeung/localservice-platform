import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve,sep,basename} from 'node:path';
import worker from '../src/worker.js';
import {sqliteDatabase,migrate} from '../scripts/sqlite.mjs';
import {seed} from '../scripts/seed.mjs';
import {hashPassword,digest} from '../src/auth.js';
const origin='https://gongsa8282.xyz';
const password='test-only-very-long-generated-style-key-'.repeat(2);
async function fixture(path){
 const DB=sqliteDatabase(path);await migrate(DB);await seed(DB);
 for(const [id,role] of [[1,'ADMIN'],[2,'EDITOR'],[3,'EDITOR']])await DB.prepare('INSERT INTO users(id,name,login_id,password_hash,role) VALUES(?,?,?,?,?)').bind(id,'사용자 '+id,'user'+id,await hashPassword(password),role).run();
 await DB.prepare('INSERT INTO company_assignments(user_id,company_id) VALUES(2,1),(3,2)').run();
 const call=(path,{form,cookie,headers={},method=form?'POST':'GET'}={})=>worker.fetch(new Request(origin+path,{method,headers:{...(form?{'content-type':'application/x-www-form-urlencoded',origin}:{}),...(cookie?{cookie}:{}),...headers},body:form?new URLSearchParams(form):undefined}),{DB});
 const signIn=async(id=1)=>{const res=await call('/admin/login/',{form:{login_id:'user'+id,password}});assert.equal(res.status,303);const cookie=res.headers.get('set-cookie').split(';')[0];const html=await(await call('/admin/posts/new/',{cookie})).text();return {cookie,csrf:html.match(/name="csrf" value="([a-f0-9]+)"/)[1]};};
 return {DB,call,signIn};
}
const values=(overrides={})=>({title:'새로운 주방 연결부 점검과 안전한 관리',summary:'연결부와 바닥 상태를 순서대로 확인하는 점검 이야기입니다.',content:'주방 연결부 주변의 수분 상태를 확인하고 바닥을 건조한 뒤 증상과 발생 시간을 기록했습니다. 무리하게 분리하지 않고 전문 업체에 점검을 의뢰하는 과정을 정리한 테스트용 글입니다.',company_id:'1',region_id:'2',service_id:'1',post_type:'작업사례',...overrides});
async function create(f,auth,overrides={}){const res=await f.call('/admin/posts/new/',{cookie:auth.cookie,form:{csrf:auth.csrf,...values(overrides)}});assert.equal(res.status,303,await res.clone().text());return Number(res.headers.get('location').split('/')[3]);}
const status=async(f,auth,id,action,version)=>f.call(`/admin/posts/${id}/status/`,{cookie:auth.cookie,form:{csrf:auth.csrf,action,version}});
test('CMS requires login, prevents CSRF, marks private responses no-store and expires sessions',async()=>{
 const f=await fixture();try{
  assert.equal((await f.call('/admin/')).headers.get('location'),'/admin/login/');
  assert.equal((await f.call('/admin/login/',{form:{login_id:'user1',password:'wrong'}})).status,401);
  assert.equal((await f.call('/admin/login/',{form:{login_id:'user1',password},headers:{origin:'https://attacker.example'}})).status,403);
  const auth=await f.signIn();const privatePage=await f.call('/admin/',{cookie:auth.cookie});assert.equal(privatePage.headers.get('cache-control'),'no-store');assert.match(privatePage.headers.get('x-robots-tag'),/noindex/);
  assert.equal((await f.call('/admin/posts/new/',{cookie:auth.cookie,form:values()})).status,403);
  assert.equal((await f.call('/admin/posts/new/',{cookie:auth.cookie,form:{...values(),csrf:auth.csrf},headers:{origin:'https://attacker.example'}})).status,403);
  await f.DB.prepare('UPDATE sessions SET expires_at=0').run();assert.equal((await f.call('/admin/',{cookie:auth.cookie})).status,303);
 }finally{f.DB.close();}
});
test('draft, review and approval stay private; publication updates every public surface and logs transitions',async()=>{
 const f=await fixture();try{
  const editor=await f.signIn(2),admin=await f.signIn(1),id=await create(f,editor);
  const exists=async()=>{for(const url of ['/', '/region/seoul/mapo/','/service/plumbing/','/company/1/'])assert.ok((await(await f.call(url)).text()).includes(values().title),url);};
  const privatePost=async()=>{assert.equal((await f.call('/post/'+id+'/')).status,404);for(const url of ['/', '/region/seoul/mapo/','/service/plumbing/','/company/1/'])assert.ok(!(await(await f.call(url)).text()).includes(values().title),url);};
  await privatePost();
  assert.equal((await status(f,editor,id,'publish',1)).status,409);
  assert.equal((await status(f,editor,id,'submit',1)).status,303);await privatePost();
  assert.equal((await status(f,editor,id,'approve',2)).status,403);
  assert.equal((await status(f,admin,id,'approve',2)).status,303);await privatePost();
  assert.equal((await status(f,admin,id,'publish',3)).status,303);assert.equal((await f.call('/post/'+id+'/')).status,200);await exists();
  const events=(await f.DB.prepare('SELECT from_status,to_status FROM post_events WHERE post_id=? ORDER BY id').bind(id).all()).results;
  assert.deepEqual(events.map(x=>[x.from_status,x.to_status]),[['DRAFT','REVIEW'],['REVIEW','APPROVED'],['APPROVED','PUBLISHED']]);
  assert.equal((await status(f,admin,id,'publish',3)).status,409);assert.equal((await f.DB.prepare('SELECT COUNT(*) AS n FROM post_events WHERE post_id=?').bind(id).first()).n,3);
 }finally{f.DB.close();}
});
test('editors only see assigned companies and their own posts; disabled users cannot keep sessions',async()=>{
 const f=await fixture();try{
  const a=await f.signIn(2),b=await f.signIn(3),id=await create(f,a);
  assert.equal((await f.call('/admin/posts/'+id+'/',{cookie:b.cookie})).status,404);
  assert.doesNotMatch(await(await f.call('/admin/',{cookie:b.cookie})).text(),new RegExp(values().title));
  assert.equal((await f.call('/admin/posts/new/',{cookie:a.cookie,form:{csrf:a.csrf,...values({company_id:'2'})}})).status,409);
  await f.DB.prepare("UPDATE users SET status='DISABLED' WHERE id=2").run();assert.equal((await f.call('/admin/',{cookie:a.cookie})).status,303);
 }finally{f.DB.close();}
});
test('validation, escaped input, duplicate checks and optimistic updates protect content',async()=>{
 const f=await fixture();try{
  const auth=await f.signIn();
  assert.equal((await f.call('/admin/posts/new/',{cookie:auth.cookie,form:{csrf:auth.csrf,...values({title:'짧음'})}})).status,409);
  const id=await create(f,auth,{title:'<script>alert(1)</script> 점검 사례'});
  const escaped=await(await f.call('/admin/posts/'+id+'/',{cookie:auth.cookie})).text();assert.doesNotMatch(escaped,/<script>alert/);assert.match(escaped,/&lt;script&gt;/);
  const updated=await f.call(`/admin/posts/${id}/`,{cookie:auth.cookie,form:{csrf:auth.csrf,version:1,...values()}});assert.equal(updated.status,303);
  assert.equal((await f.call(`/admin/posts/${id}/`,{cookie:auth.cookie,form:{csrf:auth.csrf,version:1,...values({title:'이전 화면에서 덮어쓰려고 하는 제목'})}})).status,409);
  const dup=await create(f,auth);assert.equal((await status(f,auth,dup,'submit',1)).status,409);
  await f.DB.prepare('DELETE FROM posts WHERE id=?').bind(dup).run();
  assert.equal((await status(f,auth,id,'submit',2)).status,303);
  assert.equal((await status(f,auth,id,'return',3)).status,303);
  assert.equal((await f.DB.prepare('SELECT status,version FROM posts WHERE id=?').bind(id).first()).status,'DRAFT');
 }finally{f.DB.close();}
});
test('database triggers block workflow bypass and concurrent duplicate publications',async()=>{
 const f=await fixture();try{
  const auth=await f.signIn(),id=await create(f,auth);
  await assert.rejects(f.DB.prepare("UPDATE posts SET status='PUBLISHED',published_at='2026-11-14',last_actor_id=1 WHERE id=?").bind(id).run(),/Invalid post status transition/);
  await f.DB.prepare("UPDATE posts SET status='REVIEW',last_actor_id=1 WHERE id=?").bind(id).run();await f.DB.prepare("UPDATE posts SET status='APPROVED',last_actor_id=1 WHERE id=?").bind(id).run();
  await f.DB.prepare('UPDATE posts SET title_hash=(SELECT title_hash FROM posts WHERE id=101) WHERE id=?').bind(id).run();
  await assert.rejects(f.DB.prepare("UPDATE posts SET status='PUBLISHED',published_at='2026-11-14' WHERE id=?").bind(id).run(),/UNIQUE/);
 }finally{f.DB.close();}
});
test('login attempts are limited, logout revokes session, and session tokens are hashed in storage',async()=>{
 const f=await fixture();try{
  const auth=await f.signIn();const row=await f.DB.prepare('SELECT token_hash FROM sessions').first();assert.equal(row.token_hash,await digest(auth.cookie.split('=')[1]));
  const logout=await f.call('/admin/logout/',{cookie:auth.cookie,form:{csrf:auth.csrf}});assert.equal(logout.status,303);assert.match(logout.headers.get('set-cookie'),/Max-Age=0/);assert.equal((await f.call('/admin/',{cookie:auth.cookie})).status,303);
  for(let i=0;i<9;i++)assert.equal((await f.call('/admin/login/',{form:{login_id:'user1',password:'bad'}})).status,401);
  assert.equal((await f.call('/admin/login/',{form:{login_id:'user1',password}})).status,401);
 }finally{f.DB.close();}
});
test('migrations are repeatable and saved drafts persist after database restart',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'localservice-cms-'));const path=join(dir,'test.sqlite');let db;
 try{
  const f=await fixture(path);db=f.DB;const auth=await f.signIn(),id=await create(f,auth);db.close();db=null;
  db=sqliteDatabase(path);await migrate(db);await seed(db);
  assert.equal((await db.prepare('SELECT title FROM posts WHERE id=?').bind(id).first()).title,values().title);
  assert.equal((await db.prepare('SELECT COUNT(*) AS n FROM posts').first()).n,4);
  assert.equal((await db.prepare('SELECT COUNT(*) AS n FROM d1_migrations').first()).n,1);
 }finally{db?.close();assert.ok(resolve(dir).startsWith(resolve(tmpdir())+sep)&&basename(dir).startsWith('localservice-cms-'));await rm(dir,{recursive:true,force:true});}
});
test('missing DB does not expose a login bypass; production admin requires HTTPS',async()=>{
 assert.equal((await worker.fetch(new Request(origin+'/admin/'))).status,503);
 const f=await fixture();try{assert.equal((await worker.fetch(new Request('http://example.com/admin/'),{DB:f.DB})).status,403);}finally{f.DB.close();}
});
