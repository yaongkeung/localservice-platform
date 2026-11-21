import {test} from 'node:test';
import assert from 'node:assert/strict';
import worker from '../src/worker.js';
import {sqliteDatabase,migrate} from '../scripts/sqlite.mjs';
import {seed} from '../scripts/seed.mjs';
import {digest,randomToken} from '../src/auth.js';
const origin='https://gongsa8282.xyz';
async function fixture(){
 const DB=sqliteDatabase();await migrate(DB);await seed(DB);const auth={};
 for(const [id,role] of [[1,'ADMIN'],[2,'EDITOR']]){const token=randomToken(),csrf=randomToken();await DB.prepare('INSERT INTO users(id,name,login_id,password_hash,role) VALUES(?,?,?,?,?)').bind(id,'저장 공개 시험',role,'unused',role).run();await DB.prepare('INSERT INTO sessions(token_hash,user_id,csrf,expires_at) VALUES(?,?,?,?)').bind(await digest(token),id,csrf,Date.now()+600000).run();auth[id]={token,csrf};}
 await DB.prepare('INSERT INTO company_assignments(user_id,company_id) VALUES(2,1)').run();
 const call=(path,form,{as=1,json=true,csrf=true}={})=>worker.fetch(new Request(origin+path,{method:form?'POST':'GET',headers:{cookie:'ls_session='+auth[as].token,...(form?{origin,'content-type':'application/x-www-form-urlencoded'}:{}),...(json?{'x-editor-action':'1'}:{})},body:form?new URLSearchParams({...form,csrf:csrf?auth[as].csrf:'invalid'}):undefined}),{DB});
 const values={company_id:1,region_id:1,service_id:1,post_type:'서비스안내',title:'새롭게 작성한 전화 상담 안내 페이지',summary:'현재 상태와 사진을 확인하고 요청할 작업 범위를 정리하는 안내입니다.',content:'사진에 보이는 창틀과 문 주변 공간을 확인하는 안내입니다. 여는 방향과 사용할 목적, 운반할 공간과 층수를 함께 알려주시면 필요한 작업 범위를 상담하는 데 도움이 됩니다. 작업한 날짜나 비용을 추정하지 않고 업체에 문의할 내용을 준비해 주세요.'};
 const create=async extra=>{const response=await call('/admin/posts/new/',{...values,...extra});assert.equal(response.status,303);return Number(response.headers.get('location').split('/')[3]);};
 const row=id=>DB.prepare('SELECT * FROM posts WHERE id=?').bind(id).first();return {DB,call,values,create,row};
}

test('authoring has one confirm-and-publish action and no review, contract or worker controls',async()=>{
 const f=await fixture();try{
  const id=await f.create(),post=await f.row(id),response=await f.call('/admin/posts/'+id+'/',{...f.values,version:post.version});assert.equal(response.status,200);const saved=await response.json();assert.equal(saved.status,'DRAFT');assert.equal(saved.version,post.version+1);assert.equal((await f.call('/post/'+id+'/')).status,404);
  const html=await(await f.call('/admin/posts/'+id+'/',null,{json:false})).text();assert.match(html,/name="confirm_publish"/);assert.match(html,/고객 선택/);assert.doesNotMatch(html,/초안으로 저장|검수 요청|승인 완료|href="\/admin\/(?:contracts|users)\//);assert.match(html,/\/assets\/cms-actions.js/);
  const companyForm=await(await f.call('/admin/companies/new/',null,{json:false})).text();assert.doesNotMatch(companyForm,/<input[^>]*name="sample"[^>]*checked/);assert.match(companyForm,/name="customer_name"/);
  const published=await f.call('/admin/posts/'+id+'/',{...f.values,version:saved.version,confirm_publish:1},{json:false});assert.equal(published.status,303);assert.match(published.headers.get('location'),/published=1/);assert.equal((await f.row(id)).status,'PUBLISHED');
 }finally{f.DB.close();}
});
test('confirmation publishes a real page directly without a contract, blocks CSRF, unauthorized editors and stale duplicate clicks',async()=>{
 const f=await fixture();try{
  await f.DB.prepare('UPDATE companies SET sample=0 WHERE id=1').run();const id=await f.create(),form={...f.values,version:1,confirm_publish:1};
  await f.DB.prepare('UPDATE posts SET writer_id=2,generation_reviewed=0 WHERE id=?').bind(id).run();assert.equal((await f.call('/admin/posts/'+id+'/',form,{csrf:false})).status,403);assert.equal((await f.call('/admin/posts/'+id+'/',form,{as:2})).status,403);assert.equal((await f.row(id)).version,1);
  const response=await f.call('/admin/posts/'+id+'/',form);assert.equal(response.status,200,await response.clone().text());const result=await response.json();assert.equal(result.status,'PUBLISHED');assert.equal(result.visible,true);assert.equal(result.version,3);assert.equal((await f.call(result.publicUrl)).status,200);assert.match(await(await f.call('/')).text(),/새롭게 작성한 전화 상담/);
  assert.deepEqual((await f.DB.prepare('SELECT from_status,to_status FROM post_events WHERE post_id=? ORDER BY id').bind(id).all()).results.map(row=>({...row})),[{from_status:'DRAFT',to_status:'PUBLISHED'}]);assert.equal((await f.row(id)).contract_id,null);assert.equal((await f.row(id)).generation_reviewed,1);
  assert.equal((await f.call('/admin/posts/'+id+'/',form)).status,409);assert.equal((await f.DB.prepare('SELECT COUNT(*) n FROM post_events WHERE post_id=?').bind(id).first()).n,1);
 }finally{f.DB.close();}
});
test('a publication database failure rolls back changed content and events atomically',async()=>{
 const f=await fixture();try{
  await f.DB.prepare('UPDATE companies SET sample=0 WHERE id=1').run();const id=await f.create(),before=await f.row(id);
  f.DB.raw.exec("CREATE TRIGGER simulated_publish_failure BEFORE UPDATE OF status ON posts WHEN NEW.id="+id+" AND NEW.status='PUBLISHED' BEGIN SELECT RAISE(ABORT,'simulated storage failure'); END;");
  const response=await f.call('/admin/posts/'+id+'/',{...f.values,version:before.version,confirm_publish:1,title:'저장되지 않아야 하는 변경 제목'});assert.equal(response.status,409);assert.deepEqual(await f.row(id),before);assert.equal((await f.DB.prepare('SELECT COUNT(*) n FROM post_events WHERE post_id=?').bind(id).first()).n,0);assert.equal((await f.call('/post/'+id+'/')).status,404);
 }finally{f.DB.close();}
});
test('editing and republishing retains URL, original publication date, historic contract counts and snapshot',async()=>{
 const f=await fixture();try{
  await f.DB.prepare('UPDATE companies SET sample=0 WHERE id=1').run();await f.DB.prepare("INSERT INTO contracts(id,company_id,package_name,contract_quantity,published_quantity,status) VALUES(80,1,'historical full contract',1,1,'CLOSED')").run();const contract=await f.DB.prepare('SELECT * FROM contracts WHERE id=80').first();
  const id=await f.create(),published=await f.call('/admin/posts/'+id+'/',{...f.values,confirm_publish:1,version:1});assert.equal((await published.json()).visible,true);const original=await f.row(id);
  assert.equal((await f.call('/admin/posts/'+id+'/status/',{action:'withdraw',version:original.version})).status,200);assert.equal((await f.call('/post/'+id+'/')).status,404);
  const existing=await f.row(id),again=await f.call('/admin/posts/'+id+'/',{...f.values,title:'수정해서 다시 발행한 전화 상담 안내',confirm_publish:1,version:existing.version});assert.equal(again.status,200);assert.equal((await again.json()).visible,true);assert.equal((await f.row(id)).published_at,original.published_at);assert.deepEqual(await f.DB.prepare('SELECT * FROM contracts WHERE id=80').first(),contract);assert.equal((await f.DB.prepare('SELECT COUNT(*) n FROM post_snapshots WHERE post_id=?').bind(id).first()).n,1);
 }finally{f.DB.close();}
});
