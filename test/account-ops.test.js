import {test} from 'node:test';
import assert from 'node:assert/strict';
import {sqliteDatabase,migrate} from '../scripts/sqlite.mjs';
import {seed} from '../scripts/seed.mjs';
import worker from '../src/worker.js';
import {hashPassword,digest,randomToken,consumeAttempt} from '../src/auth.js';
import {rotateCredential} from '../src/account.js';
import {deploymentErrors,readDeployment} from '../scripts/deploy-check.mjs';
import {currentMigration} from '../src/readiness.js';
import {localMedia} from '../scripts/local-media.mjs';
import {readdir} from 'node:fs/promises';
const origin='https://gongsa8282.xyz',password='test-only-password-for-account-verification';
async function fixture(){
 const DB=sqliteDatabase();await migrate(DB);await seed(DB);
 for(const [id,role] of [[1,'SUPER_ADMIN'],[2,'EDITOR'],[3,'EDITOR']])await DB.prepare('INSERT INTO users(id,name,login_id,password_hash,role) VALUES(?,?,?,?,?)').bind(id,'시험 사용자'+id,'user'+id,await hashPassword(password),role).run();
 await DB.prepare('INSERT INTO company_assignments(user_id,company_id) VALUES(2,1),(3,2)').run();
 const call=(path,{cookie,form,headers={},env={},method=form?'POST':'GET'}={})=>worker.fetch(new Request(origin+path,{method,headers:{...(cookie?{cookie}:{}),...(form?{origin,'content-type':'application/x-www-form-urlencoded'}:{}),...headers},body:form?new URLSearchParams(form):undefined}),{DB,...env});
 const signin=async(id=1,key=password)=>{const response=await call('/admin/login/',{form:{login_id:'user'+id,password:key}});assert.equal(response.status,303);const cookie=response.headers.get('set-cookie').split(';')[0],html=await(await call('/admin/account/',{cookie})).text();return {cookie,csrf:html.match(/name="csrf" value="([a-f0-9]+)"/)[1]};};
 return {DB,call,signin};
}
test('changing a password reauthenticates, never echoes secrets, revokes every session and logs metadata only',async()=>{
 const f=await fixture();try{
  const a=await f.signin(2),b=await f.signin(2),next='new-account-password-12345';
  const bad=await f.call('/admin/account/',{cookie:a.cookie,form:{csrf:a.csrf,current_password:'wrong-current',new_password:next,confirm_password:next}});assert.equal(bad.status,409);assert.ok(!(await bad.text()).includes('wrong-current'));
  assert.equal((await f.call('/admin/account/',{cookie:a.cookie,form:{current_password:password,new_password:next,confirm_password:next}})).status,403);
  const response=await f.call('/admin/account/',{cookie:a.cookie,form:{csrf:a.csrf,current_password:password,new_password:next,confirm_password:next}});assert.equal(response.status,200);assert.ok(!(await response.text()).includes(next));
  for(const auth of [a,b])assert.equal((await f.call('/admin/',{cookie:auth.cookie})).status,303);
  assert.equal((await f.call('/admin/login/',{form:{login_id:'user2',password}})).status,401);await f.signin(2,next);
  const event=await f.DB.prepare('SELECT * FROM credential_events').first();assert.equal(event.action,'CHANGE');assert.ok(!JSON.stringify(event).includes(next));
 }finally{f.DB.close();}
});
test('only a reauthenticated admin can reset an active editor; temporary credentials force a password change',async()=>{
 const f=await fixture();try{
  const admin=await f.signin(),editor=await f.signin(2),form={csrf:admin.csrf,current_password:password,version:1};
  assert.equal((await f.call('/admin/users/2/reset-password/',{cookie:editor.cookie,form:{...form,csrf:editor.csrf}})).status,403);
  assert.equal((await f.call('/admin/users/1/reset-password/',{cookie:admin.cookie,form})).status,404);
  assert.equal((await f.call('/admin/users/2/reset-password/',{cookie:admin.cookie,form:{...form,current_password:'bad'}})).status,409);
  const response=await f.call('/admin/users/2/reset-password/',{cookie:admin.cookie,form});assert.equal(response.status,200);assert.equal(response.headers.get('cache-control'),'no-store');const html=await response.text(),key=html.match(/<code[^>]*>([a-f0-9]{64})<\/code>/)[1];
  assert.equal((await f.call('/admin/',{cookie:editor.cookie})).status,303);
  const temp=await f.signin(2,key);assert.equal((await f.call('/admin/',{cookie:temp.cookie})).headers.get('location'),'/admin/account/');
  assert.equal((await f.call('/admin/posts/new/',{cookie:temp.cookie,form:{csrf:temp.csrf}})).status,403);
  const next='changed-by-worker-password-123';assert.equal((await f.call('/admin/account/',{cookie:temp.cookie,form:{csrf:temp.csrf,current_password:key,new_password:next,confirm_password:next}})).status,200);
  const final=await f.signin(2,next);assert.equal((await f.call('/admin/',{cookie:final.cookie})).status,200);
  assert.equal((await f.DB.prepare('SELECT must_change_password FROM users WHERE id=2').first()).must_change_password,0);
 }finally{f.DB.close();}
});
test('credential versions defeat in-flight login races and stale resets cannot rotate credentials again',async()=>{
 const f=await fixture();try{
  const admin=await f.signin(),token=randomToken();await f.DB.prepare('INSERT INTO sessions(token_hash,user_id,csrf,expires_at,credential_version) VALUES(?,?,?,?,1)').bind(await digest(token),2,randomToken(),Date.now()+60000).run();
  assert.equal((await f.call('/admin/users/2/reset-password/',{cookie:admin.cookie,form:{csrf:admin.csrf,current_password:password,version:1}})).status,200);
  // This models a login which verified the old hash just before the reset but inserted its session later.
  await f.DB.prepare('INSERT INTO sessions(token_hash,user_id,csrf,expires_at,credential_version) VALUES(?,?,?,?,1)').bind(await digest(token),2,randomToken(),Date.now()+60000).run();
  assert.equal((await f.call('/admin/',{cookie:'ls_session='+token})).status,303);
  assert.equal((await f.call('/admin/users/2/reset-password/',{cookie:admin.cookie,form:{csrf:admin.csrf,current_password:password,version:1}})).status,409);
  assert.equal((await f.DB.prepare('SELECT credential_version FROM users WHERE id=2').first()).credential_version,2);
  const actor=await f.DB.prepare('SELECT * FROM users WHERE id=1').first(),target=await f.DB.prepare('SELECT * FROM users WHERE id=2').first();await f.DB.prepare('UPDATE users SET credential_version=credential_version+1 WHERE id=1').run();
  await assert.rejects(rotateCredential(f.DB,target,actor,randomToken(),'RESET',true),/계정/);assert.equal((await f.DB.prepare('SELECT credential_version FROM users WHERE id=2').first()).credential_version,2);
 }finally{f.DB.close();}
});
test('attempt limits are atomic and local recovery revokes old sessions without changing account privileges',async()=>{
 const f=await fixture();try{
  const attempts=await Promise.all(Array.from({length:30},()=>consumeAttempt(f.DB,'parallel-check',5)));assert.equal(attempts.filter(Boolean).length,5);
  const auth=await f.signin(),user=await f.DB.prepare('SELECT * FROM users WHERE id=1').first();await rotateCredential(f.DB,user,user,randomToken(),'RECOVER',true);
  assert.equal((await f.call('/admin/',{cookie:auth.cookie})).status,303);const updated=await f.DB.prepare('SELECT role,must_change_password FROM users WHERE id=1').first();assert.equal(updated.role,'SUPER_ADMIN');assert.equal(updated.must_change_password,1);
 }finally{f.DB.close();}
});
test('production fails closed without storage; health checks migration readiness without exposing identifiers',async()=>{
 const f=await fixture();try{
  assert.equal((await f.call('/',{env:{APP_ENV:'production'}})).status,503);
  const noStorage=await f.call('/healthz');assert.equal(noStorage.status,503);assert.deepEqual(await noStorage.json(),{status:'not_ready'});
  const PHOTOS={get(){},put(){}},env={APP_ENV:'staging',PHOTOS,ASSETS:localMedia};
  const ready=await f.call('/healthz',{env});assert.equal(ready.status,200);assert.deepEqual(await ready.json(),{status:'ok'});
  assert.match((await f.call('/',{env})).headers.get('x-robots-tag'),/noindex/);
  await f.DB.prepare('DELETE FROM d1_migrations WHERE name=?').bind(currentMigration).run();assert.equal((await f.call('/healthz',{env})).status,503);
  assert.equal(currentMigration,(await readdir('migrations')).filter(n=>n.endsWith('.sql')).sort().at(-1));
 }finally{f.DB.close();}
});
test('staging preflight rejects placeholders, old project names and existing domain routes',()=>{
 const config={name:'localservice-platform-staging',account_id:'a'.repeat(32),vars:{APP_ENV:'staging'},workers_dev:true,assets:{binding:'ASSETS',directory:'./public',run_worker_first:true},d1_databases:[{binding:'DB',database_name:'localservice-platform-staging-db',database_id:'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'}],r2_buckets:[{binding:'PHOTOS',bucket_name:'localservice-platform-staging-photos'}]};
 assert.deepEqual(deploymentErrors(config),[]);assert.ok(deploymentErrors({...config,name:'localsite-platform'}).length);assert.ok(deploymentErrors({...config,routes:['gongsa8282.xyz/*']}).length);assert.ok(deploymentErrors(readDeployment('wrangler.staging.example.jsonc')).length>=3);
});
