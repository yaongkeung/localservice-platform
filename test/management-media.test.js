import {fetchCanonical} from './fetch-canonical.js';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import worker from '../src/worker.js';
import {sqliteDatabase,migrate} from '../scripts/sqlite.mjs';
import {seed} from '../scripts/seed.mjs';
import {digest,randomToken} from '../src/auth.js';
import {seoulDate} from '../src/photos.js';
import {postContent} from '../src/post-content.js';
import {processPhoto} from '../src/image-processing.js';
import {preparePhoto} from '../scripts/prepare-photo.mjs';
import jpeg from 'jpeg-js';
const origin='https://gongsa8282.xyz';
async function fixture(){
 const DB=sqliteDatabase();await migrate(DB);await seed(DB);const objects=new Map();
 const PHOTOS={async put(key,value){objects.set(key,new Uint8Array(value));return {key};},async get(key){const body=objects.get(key);return body?{body}:null;},async delete(keys){for(const key of typeof keys==='string'?[keys]:keys)objects.delete(key);}};
 const auth={};for(const [id,role] of [[1,'ADMIN'],[2,'EDITOR'],[3,'EDITOR']]){
  await DB.prepare('INSERT INTO users(id,name,login_id,password_hash,role) VALUES(?,?,?,?,?)').bind(id,'시험 사용자'+id,'test'+id,'unused-for-test',role).run();
  const token=randomToken(),csrf=randomToken();await DB.prepare('INSERT INTO sessions(token_hash,user_id,csrf,expires_at) VALUES(?,?,?,?)').bind(await digest(token),id,csrf,Date.now()+3600000).run();auth[id]={cookie:'ls_session='+token,csrf};
 }
 await DB.prepare('INSERT INTO company_assignments(user_id,company_id) VALUES(2,1),(3,2)').run();
 const call=(path,{as,form,body,headers={},method=form||body?'POST':'GET'}={})=>fetchCanonical(new Request(origin+path,{method,headers:{...(as?{cookie:auth[as].cookie}:{}),...((form||body)?{origin}:{}),...(form?{'content-type':'application/x-www-form-urlencoded'}:{}),...headers},body:form?new URLSearchParams({...form,...(as?{csrf:auth[as].csrf}:{})}):body}),{DB,PHOTOS});
 const create=async(overrides={},as=2)=>{const response=await call('/admin/posts/new/',{as,form:{title:'시험용 작업 내용 '+randomToken().slice(0,8),summary:'공개 흐름과 사진을 검증하는 테스트용 작업 내용입니다.',content:'관리 화면에서 저장한 고유한 작업 과정입니다. 수전 주변을 살펴보고 물기를 정리한 후 점검할 부분을 확인했습니다. 실제 작업 실적을 나타내는 글이 아니며 자동 검증을 위해 작성했습니다. '+randomToken(),company_id:1,region_id:2,service_id:1,post_type:'작업사례',...overrides}});assert.equal(response.status,303,await response.clone().text());return Number(response.headers.get('location').split('/')[3]);};
 const row=id=>DB.prepare('SELECT * FROM posts WHERE id=?').bind(id).first();
 const transition=async(id,action,as=1)=>call(`/admin/posts/${id}/status/`,{as,form:{action,version:(await row(id)).version}});
 const upload=async(id,bytes,as=2,extra={})=>{let thumb;try{thumb=preparePhoto(bytes).thumb;}catch{thumb=bytes;}const body=new FormData();body.set('thumbnail',new Blob([thumb],{type:'image/jpeg'}),'preview.jpg');body.set('photo',new Blob([bytes],{type:'image/jpeg'}),'untrusted-name.jpg');body.set('alt_text','샘플 연결부 점검 사진');body.set('csrf',auth[as].csrf);body.set('version',String((await row(id)).version));for(const [k,v]of Object.entries(extra))body.set(k,v);return call(`/admin/posts/${id}/photos/`,{as,body});};
 const changePhoto=async(id,image,action,as=2,version)=>call(`/admin/posts/${id}/photos/`,{as,form:{image_id:image,action,version:version??(await row(id)).version}});
 return {DB,objects,PHOTOS,auth,call,create,row,transition,upload,changePhoto};
}
const photo=()=>readFile(new URL('../public/media/plumbing-cover.jpg',import.meta.url));
const company={customer_name:'시험 고객명',name:'시험 설비 업체',description:'자동 검증을 위해 등록한 출장 설비 업체입니다.',area:'서울 마포구',hours:'평일 09:00~18:00',phone:'',status:'ACTIVE',sample:'1'};

test('compact company lists lead with customer names, sort naturally and preserve search over 50-row pages',async()=>{
 const f=await fixture();try{
  for(let i=55;i>=1;i--)await f.DB.prepare('INSERT INTO companies(name,customer_name,description) VALUES(?,?,?)').bind('카탈로그 업체 '+i,'카탈로그 고객 '+i,'목록 페이지 검증용 업체입니다.').run();
  const html=await(await f.call('/admin/companies/?q=카탈로그',{as:1})).text(),body=html.match(/<tbody>([\s\S]*?)<\/tbody>/)[1];assert.equal((body.match(/<tr>/g)||[]).length,50);assert.ok(body.indexOf('카탈로그 고객 1<')<body.indexOf('카탈로그 고객 2<'));assert.match(body,/<td class="catalog-customer">[\s\S]*?카탈로그 고객 1<\/a><\/td><td class="catalog-name">카탈로그 업체 1/);assert.match(html,/q=.*page=2/);
  const second=await(await f.call('/admin/companies/?q=카탈로그&page=2',{as:1})).text();assert.equal((second.match(/<tbody>([\s\S]*?)<\/tbody>/)[1].match(/<tr>/g)||[]).length,5);assert.match(second,/카탈로그 고객 55/);assert.doesNotMatch(second,/카탈로그 고객 1<\/a>/);
  await f.DB.prepare("UPDATE companies SET phone='01012345678' WHERE customer_name='카탈로그 고객 1'").run();const phoneResult=await(await f.call('/admin/companies/?q=010-1234-5678',{as:1})).text();assert.equal((phoneResult.match(/<tbody>([\s\S]*?)<\/tbody>/)[1].match(/<tr>/g)||[]).length,1);assert.match(phoneResult,/카탈로그 고객 1<\/a>/);
 }finally{f.DB.close();}
});

test('company deletion is confirmed, authenticated and reversible without changing posts, URLs or photo objects',async()=>{
 const f=await fixture();try{
  const id=await f.create();await f.upload(id,await photo());for(const action of ['submit','approve','publish'])assert.equal((await f.transition(id,action)).status,303);
  const before=await f.row(id),images=(await f.DB.prepare('SELECT * FROM post_images WHERE post_id=?').bind(id).all()).results,urls=(await f.DB.prepare('SELECT * FROM post_urls').all()).results,objects=[...f.objects.keys()],c=await f.DB.prepare('SELECT * FROM companies WHERE id=1').first(),path='/admin/companies/1/delete/';
  assert.equal((await f.call(path,{as:1})).status,200);assert.equal((await f.DB.prepare('SELECT deleted_at FROM companies WHERE id=1').first()).deleted_at,null);
  assert.equal((await f.call(path,{as:2,form:{version:c.version,confirmed:'1'}})).status,403);assert.equal((await f.call(path,{as:1,form:{version:c.version}})).status,409);
  assert.equal((await f.call(path,{as:1,body:new URLSearchParams({csrf:'wrong',version:c.version,confirmed:'1'}),headers:{'content-type':'application/x-www-form-urlencoded'}})).status,403);
  assert.equal((await f.call(path,{as:1,form:{version:c.version,confirmed:'1'}})).status,303);
  const deleted=await f.DB.prepare('SELECT * FROM companies WHERE id=1').first();assert.ok(deleted.deleted_at);assert.equal(deleted.status,'DISABLED');assert.equal((await f.call('/post/'+id+'/')).status,404);assert.deepEqual(await f.row(id),before);assert.deepEqual((await f.DB.prepare('SELECT * FROM post_images WHERE post_id=?').bind(id).all()).results,images);assert.deepEqual((await f.DB.prepare('SELECT * FROM post_urls').all()).results,urls);assert.deepEqual([...f.objects.keys()],objects);
  assert.doesNotMatch(await(await f.call('/admin/compose/',{as:1})).text(),/<option value="1" data-company-name/);assert.equal((await f.call('/admin/companies/1/',{as:1})).status,409);assert.equal((await f.call(path,{as:1,form:{version:c.version,confirmed:'1'}})).status,404);
  const event=await f.DB.prepare('SELECT * FROM catalog_events').first();assert.equal(event.user_id,1);assert.equal(event.action,'DELETE');assert.equal(JSON.parse(event.snapshot).name,c.name);
  assert.equal((await f.call('/admin/companies/1/restore/',{as:1,form:{version:c.version,confirmed:'1'}})).status,409);assert.equal((await f.call('/admin/companies/1/restore/',{as:1,form:{version:deleted.version,confirmed:'1'}})).status,303);
  const restored=await f.DB.prepare('SELECT * FROM companies WHERE id=1').first();assert.equal(restored.deleted_at,null);assert.equal(restored.status,'DISABLED');assert.equal((await f.call('/post/'+id+'/')).status,404);
  assert.equal((await f.call('/admin/companies/1/',{as:1,form:{name:c.name,description:c.description,area:c.area,hours:c.hours,phone:'',customer_name:c.customer_name,status:'ACTIVE',sample:'1',version:restored.version}})).status,303);assert.equal((await f.call('/post/'+id+'/')).status,200);assert.deepEqual(await f.row(id),before);
 }finally{f.DB.close();}
});

test('unused services can be deleted and restored while retaining their identity and blocking reuse while deleted',async()=>{
 const f=await fixture();try{
  assert.equal((await f.call('/admin/services/new/',{as:1,form:{name:'카탈로그 삭제 검증'}})).status,303);let service=await f.DB.prepare("SELECT * FROM services WHERE name='카탈로그 삭제 검증'").first();const path='/admin/services/'+service.id+'/';
  assert.equal((await f.call(path+'delete/',{as:1,form:{version:service.version,confirmed:'1'}})).status,303);assert.equal((await f.call('/service/'+service.slug+'/')).status,404);assert.doesNotMatch(await(await f.call('/admin/compose/',{as:1})).text(),new RegExp('<option value="'+service.id+'">카탈로그'));
  assert.equal((await f.call('/admin/services/new/',{as:1,form:{name:service.name}})).status,409);const id=await f.create();await assert.rejects(()=>f.DB.prepare('UPDATE posts SET service_id=? WHERE id=?').bind(service.id,id).run(),/Service is archived/);
  service=await f.DB.prepare('SELECT * FROM services WHERE id=?').bind(service.id).first();assert.equal((await f.call(path+'restore/',{as:1,form:{version:service.version,confirmed:'1'}})).status,303);const restored=await f.DB.prepare('SELECT * FROM services WHERE id=?').bind(service.id).first();assert.equal(restored.deleted_at,null);assert.equal(restored.slug,service.slug);assert.equal((await f.call('/service/'+service.slug+'/')).status,200);
 }finally{f.DB.close();}
});

test('used services and active children prevent deletion, and a deleted parent must be restored first',async()=>{
 const f=await fixture();try{
  const used=await f.DB.prepare('SELECT * FROM services WHERE id=1').first();assert.equal((await f.call('/admin/services/1/delete/',{as:1,form:{version:used.version,confirmed:'1'}})).status,409);assert.equal((await f.DB.prepare('SELECT deleted_at FROM services WHERE id=1').first()).deleted_at,null);
  await f.call('/admin/services/new/',{as:1,form:{name:'부모 업종 검증'}});let parent=await f.DB.prepare("SELECT * FROM services WHERE name='부모 업종 검증'").first();await f.call('/admin/services/new/',{as:1,form:{name:'자식 업종 검증',parent_id:parent.id}});let child=await f.DB.prepare("SELECT * FROM services WHERE name='자식 업종 검증'").first();
  const act=(row,action)=>f.call('/admin/services/'+row.id+'/'+action+'/',{as:1,form:{version:row.version,confirmed:'1'}});
  assert.equal((await act(parent,'delete')).status,409);assert.equal((await act(child,'delete')).status,303);assert.equal((await act(parent,'delete')).status,303);child=await f.DB.prepare('SELECT * FROM services WHERE id=?').bind(child.id).first();assert.equal((await act(child,'restore')).status,409);
  parent=await f.DB.prepare('SELECT * FROM services WHERE id=?').bind(parent.id).first();assert.equal((await act(parent,'restore')).status,303);assert.equal((await act(child,'restore')).status,303);
 }finally{f.DB.close();}
});

test('catalog mutation rechecks the active actor inside its atomic batch',async()=>{
 const f=await fixture();try{
  const before=await f.DB.prepare('SELECT * FROM companies WHERE id=1').first(),original=f.DB.batch;
  f.DB.batch=async statements=>{await f.DB.prepare("UPDATE users SET status='DISABLED' WHERE id=1").run();return original(statements);};
  assert.equal((await f.call('/admin/companies/1/delete/',{as:1,form:{version:before.version,confirmed:'1'}})).status,409);assert.deepEqual(await f.DB.prepare('SELECT * FROM companies WHERE id=1').first(),before);assert.equal((await f.DB.prepare('SELECT COUNT(*) AS n FROM catalog_events').first()).n,0);
 }finally{f.DB.close();}
});

test('service usage appearing after confirmation is checked atomically and failed mutations roll back audit events',async()=>{
 const f=await fixture();try{
  await f.call('/admin/services/new/',{as:1,form:{name:'경합 검증 업종'}});const service=await f.DB.prepare("SELECT * FROM services WHERE name='경합 검증 업종'").first(),id=await f.create(),original=f.DB.batch;
  f.DB.batch=async statements=>{await f.DB.prepare('UPDATE posts SET service_id=? WHERE id=?').bind(service.id,id).run();return original(statements);};
  assert.equal((await f.call('/admin/services/'+service.id+'/delete/',{as:1,form:{version:service.version,confirmed:'1'}})).status,409);assert.equal((await f.DB.prepare('SELECT deleted_at FROM services WHERE id=?').bind(service.id).first()).deleted_at,null);assert.equal((await f.DB.prepare('SELECT COUNT(*) AS n FROM catalog_events').first()).n,0);
  f.DB.batch=statements=>original([...statements,f.DB.prepare("UPDATE companies SET status='ACTIVE' WHERE id=1")]);const companyRow=await f.DB.prepare('SELECT * FROM companies WHERE id=1').first();assert.equal((await f.call('/admin/companies/1/delete/',{as:1,form:{version:companyRow.version,confirmed:'1'}})).status,409);assert.deepEqual(await f.DB.prepare('SELECT * FROM companies WHERE id=1').first(),companyRow);assert.equal((await f.DB.prepare('SELECT COUNT(*) AS n FROM catalog_events').first()).n,0);
 }finally{f.DB.close();}
});

test('JPEG sanitation preserves pixels, removes metadata and trailing payloads, and requires a matching thumbnail',async()=>{
 const original=await photo(),pair=preparePhoto(original),privateText=Buffer.from('PRIVATE-GPS-COMMENT'),metadata=Buffer.concat([Buffer.from([255,225,0,privateText.length+6,255,217]),privateText,Buffer.from([0,0])]);
 const supplied=Buffer.concat([original.subarray(0,2),metadata,original.subarray(2),Buffer.from('TRAILING-PRIVATE-PAYLOAD')]);
 const cleaned=processPhoto(supplied,pair.thumb);
 assert.deepEqual(jpeg.decode(cleaned.cover).data,jpeg.decode(original).data);
 assert.ok(!Buffer.from(cleaned.cover).includes(privateText));assert.ok(!Buffer.from(cleaned.cover).includes(Buffer.from('TRAILING-PRIVATE-PAYLOAD')));
 assert.throws(()=>processPhoto(original),/사진/);assert.throws(()=>processPhoto(original,original),/사진/);assert.throws(()=>processPhoto(original.subarray(0,-2),pair.thumb),/사진/);
 const invalid=Buffer.from(original),marker=invalid.indexOf(Buffer.from([255,219]));assert.ok(marker>=0);invalid[marker+2]=0;invalid[marker+3]=2;assert.throws(()=>processPhoto(invalid,pair.thumb),/사진/);
});
test('company management validates confirmed phones, reflects edits and hides inactive companies',async()=>{
 const f=await fixture();try{
  assert.equal((await f.call('/admin/companies/',{as:2})).status,403);
  assert.equal((await f.call('/admin/companies/new/',{as:1,form:{...company,phone:'010-0000-0000'}})).status,409);
  assert.equal((await f.call('/admin/companies/new/',{as:1,form:{...company,phone:'010-0000-0000',phone_verified:'1'}})).status,303);
  const c=await f.DB.prepare('SELECT * FROM companies ORDER BY id DESC LIMIT 1').first();assert.equal(c.phone,'01000000000');
  assert.match(await(await f.call('/company/'+c.id+'/')).text(),/href="tel:01000000000"/);
  assert.equal((await f.call('/admin/companies/'+c.id+'/',{as:1,form:{...company,status:'DISABLED',version:c.version}})).status,303);
  assert.equal((await f.call('/company/'+c.id+'/')).status,404);
  assert.equal((await f.call('/admin/companies/'+c.id+'/',{as:1,form:{...company,version:c.version}})).status,409);
 }finally{f.DB.close();}
});
test('a real company without posts is discoverable with a verified phone, keyword search and no invented work',async()=>{
 const f=await fixture();try{
  const details={...company,name:'긴상호의유리창호방범창방충망전문업체',description:'유리와 창호, 방범창과 방충망 관련 상담을 제공합니다.',area:'김포 북변동·사우동·운양동, 한강신도시',hours:'',phone:'010-0000-0000',phone_verified:'1',sample:''};
  assert.equal((await f.call('/admin/companies/new/',{as:1,form:details})).status,303);
  const c=await f.DB.prepare('SELECT * FROM companies ORDER BY id DESC LIMIT 1').first();
  const path='/company/'+c.id+'/';
  const home=await(await f.call('/')).text();assert.match(home,/등록 업체 안내/);assert.ok(home.includes('href="'+path+'"'));assert.match(home,/href="tel:01000000000"/);assert.match(home,/010-0000-0000/);assert.doesNotMatch(home,/모든 업체와 작업사례는 샘플/);
  const profile=await(await f.call(path)).text();assert.match(profile,/아직 등록된 작업사례가 없습니다/);assert.match(profile,/전화로 문의해 주세요/);assert.match(profile,/김포 북변동/);
  assert.equal((await f.DB.prepare('SELECT count(*) n FROM posts WHERE company_id=?').bind(c.id).first()).n,0);
  assert.equal((await f.DB.prepare('SELECT count(*) n FROM contracts WHERE company_id=?').bind(c.id).first()).n,0);
  assert.ok((await(await f.call('/?q='+encodeURIComponent('한강 신도시'))).text()).includes('href="'+path+'"'));
  assert.ok(!(await(await f.call('/?q='+encodeURIComponent('에어컨'))).text()).includes('href="'+path+'"'));
  await f.DB.prepare('UPDATE companies SET phone_verified=0 WHERE id=?').bind(c.id).run();assert.doesNotMatch(await(await f.call('/')).text(),/href="tel:/);
  await f.DB.prepare("UPDATE companies SET status='DISABLED' WHERE id=?").bind(c.id).run();assert.ok(!(await(await f.call('/')).text()).includes('href="'+path+'"'));assert.equal((await f.call(path)).status,404);
 }finally{f.DB.close();}
});
test('blog body keeps authored text/photo order, escapes text and cannot embed another post or excluded photo',()=>{
 const images=[{id:1,post_id:1,storage_key:'/uploads/one.jpg',alt_text:'첫 사진',sort_order:0},{id:2,post_id:1,storage_key:'/uploads/two.jpg',alt_text:'둘째 사진',sort_order:1},{id:3,post_id:1,storage_key:'/uploads/hidden.jpg',excluded:1},{id:99,post_id:2,storage_key:'/uploads/foreign.jpg'}];
 const html=postContent({id:1,content:['시작 설명','[사진:2]','중간 설명','[사진:1]','마무리 설명','[사진:2]','[사진:3]','[사진:99]','<script>alert(1)</script>']},images);
 assert.ok(html.indexOf('시작 설명')<html.indexOf('src="/uploads/two.jpg"'));assert.ok(html.indexOf('src="/uploads/two.jpg"')<html.indexOf('중간 설명'));assert.ok(html.indexOf('중간 설명')<html.indexOf('src="/uploads/one.jpg"'));assert.ok(html.indexOf('src="/uploads/one.jpg"')<html.indexOf('마무리 설명'));
 assert.equal((html.match(/<figure/g)||[]).length,2);assert.doesNotMatch(html,/foreign\.jpg|hidden\.jpg|\[사진:|<script>/);assert.match(html,/&lt;script&gt;/);
 assert.equal((postContent({id:1,content:['기존 글 본문']},images).match(/<figure/g)||[]).length,2);
});
test('imported photos belong to one blog post across boards and profile, and legacy URLs obey post privacy',async()=>{
 const f=await fixture();try{
  const id=await f.create({post_type:'서비스안내'});assert.equal((await f.upload(id,await photo())).status,303);
  const image=await f.DB.prepare('SELECT * FROM post_images WHERE post_id=?').bind(id).first(),token='c'.repeat(64),cover='/company-photos/1/'+token+'-cover.jpg',thumb='/company-photos/1/'+token+'-thumb.jpg';
  f.objects.set('company-1/'+token+'-cover.jpg',f.objects.get(image.storage_key.slice('/uploads/'.length)));f.objects.set('company-1/'+token+'-thumb.jpg',f.objects.get(image.thumbnail_key.slice('/uploads/'.length)));
  await f.DB.prepare('UPDATE post_images SET storage_key=?,thumbnail_key=? WHERE id=?').bind(cover,thumb,image.id).run();await f.DB.prepare('INSERT INTO company_images(company_id,storage_key,thumbnail_key,alt_text,content_hash,width,height,excluded) VALUES(1,?,?,?,?,960,640,1)').bind(cover,thumb,'이전 사진 정보',image.content_hash).run();
  assert.equal((await f.call(cover)).status,404);assert.equal((await f.call(cover,{as:2})).status,200);assert.equal((await f.call(cover,{as:3})).status,404);
  const post=await f.row(id),content='사진을 보기 전에 안내하는 설명입니다. 사진과 본문을 한 포스팅 안에서 원하는 순서로 배치하는 서비스 안내 글입니다.\n\n[사진:'+image.id+']\n\n사진 아래에 상담 안내를 이어서 작성합니다.';
  assert.equal((await f.call('/admin/posts/'+id+'/',{as:2,form:{...post,content,contract_id:''}})).status,303);
  const preview=await f.call('/admin/posts/'+id+'/preview/',{as:2});assert.equal(preview.status,200);assert.match(preview.headers.get('cache-control'),/no-store/);assert.ok((await preview.text()).includes(cover));assert.equal((await f.call('/admin/posts/'+id+'/preview/',{as:3})).status,404);assert.equal((await f.call('/admin/posts/'+id+'/preview/')).status,303);
  for(const action of ['submit','approve','publish'])assert.equal((await f.transition(id,action)).status,303);
  const html=await(await f.call('/post/'+id+'/')).text(),article=html.match(/<article class="panel prose consultation-article">([\s\S]*?)<\/article>/)[1];assert.ok(article.indexOf('사진을 보기 전에')<article.indexOf('<figure'));assert.ok(article.indexOf('<figure')<article.indexOf('사진 아래에'));assert.equal((await f.call(cover)).status,200);
  for(const path of ['/','/service/plumbing/','/company/1/'])assert.ok((await(await f.call(path)).text()).includes((await f.DB.prepare('SELECT path FROM post_urls WHERE post_id=?').bind(id).first()).path));
  const profile=await(await f.call('/company/1/')).text();assert.doesNotMatch(profile,/업체 제공 사진|company-gallery/);assert.match(profile,/이 업체의 포스팅/);
  assert.equal((await f.transition(id,'withdraw')).status,303);assert.equal((await f.call(cover)).status,404);
 }finally{f.DB.close();}
});
test('one company place record is reflected in its posts and profile without overwriting phones or post content',async()=>{
 const f=await fixture();try{
  const values={...company,phone:'010-0000-0000',phone_verified:'1',naver_place_url:'https://naver.me/Test1234',naver_place_name:'플레이스 등록명 <시험>',naver_place_address:'시험 도로 1',naver_place_hours:'상담 시간 확인'};
  assert.equal((await f.call('/admin/companies/new/',{as:1,form:{...values,naver_place_url:'https://naver.me.evil.example/Test1234'}})).status,409);
  assert.equal((await f.call('/admin/companies/new/',{as:1,form:values})).status,303);let c=await f.DB.prepare('SELECT * FROM companies ORDER BY id DESC LIMIT 1').first();const id=await f.create({company_id:c.id,post_type:'서비스안내'},1);
  for(const path of ['/admin/posts/'+id+'/','/admin/posts/'+id+'/preview/']){const html=await(await f.call(path,{as:1})).text();assert.match(html,/href="https:\/\/naver\.me\/Test1234"/);assert.equal((html.match(/id="place-info"/g)||[]).length,1);assert.match(html,/시험 도로 1/);}
  for(const action of ['submit','approve','publish'])assert.equal((await f.transition(id,action)).status,303);const original=(await f.row(id)).content;
  for(const path of ['/post/'+id+'/','/company/'+c.id+'/']){const html=await(await f.call(path)).text();assert.match(html,/href="https:\/\/naver\.me\/Test1234"/);assert.match(html,/플레이스 등록명 &lt;시험&gt;/);assert.match(html,/시험 도로 1/);assert.match(html,/href="tel:01000000000"/);assert.doesNotMatch(html,/<iframe/);}
  const edit=await(await f.call('/admin/companies/'+c.id+'/',{as:1})).text();assert.match(edit,/name="naver_place_url"/);
  // A form opened before these optional fields existed must not silently erase them.
  assert.equal((await f.call('/admin/companies/'+c.id+'/',{as:1,form:{...company,phone:values.phone,phone_verified:'1',version:c.version}})).status,303);c=await f.DB.prepare('SELECT * FROM companies WHERE id=?').bind(c.id).first();assert.equal(c.naver_place_url,values.naver_place_url);assert.equal(c.phone,'01000000000');assert.equal((await f.row(id)).content,original);
  assert.equal((await f.call('/admin/companies/'+c.id+'/',{as:1,form:{...values,naver_place_url:'',version:c.version}})).status,303);assert.doesNotMatch(await(await f.call('/post/'+id+'/')).text(),/class="place-card"/);
 }finally{f.DB.close();}
});
test('new industries and sub-industries join public navigation; slugs are stable and cycles rejected',async()=>{
 const f=await fixture();try{
  const service={name:'창호 수리',slug:'window-repair',description:'창문과 창호 관리',icon:'🪟',tone:'mint',parent_id:1};
  assert.equal((await f.call('/admin/services/new/',{as:1,form:service})).status,303);
  const s=await f.DB.prepare('SELECT * FROM services WHERE slug=?').bind(service.slug).first();
  assert.match(await(await f.call('/')).text(),/창호 수리/);assert.match(await(await f.call('/service/window-repair/')).text(),/noindex,follow/);
  const id=await f.create({service_id:s.id});for(const action of ['submit','approve','publish'])assert.equal((await f.transition(id,action)).status,303);
  const title=(await f.row(id)).title;assert.ok((await(await f.call('/?service=plumbing')).text()).includes(title));assert.ok((await(await f.call('/service/plumbing/')).text()).includes(title));
  assert.equal((await f.call('/admin/services/'+s.id+'/',{as:1,form:{...service,slug:'changed',version:1}})).status,303);
  assert.equal((await f.DB.prepare('SELECT slug FROM services WHERE id=?').bind(s.id).first()).slug,'window-repair');
  assert.equal((await f.call('/admin/services/1/',{as:1,form:{name:'배관·누수',description:'업종 설명',slug:'plumbing',icon:'🔧',tone:'sky',parent_id:s.id,version:1}})).status,409);
 }finally{f.DB.close();}
});
test('worker creation and assignments are restricted and stale assignment edits cannot overwrite permissions',async()=>{
 const f=await fixture();try{
  assert.equal((await f.call('/admin/users/new/',{as:2})).status,403);
  const result=await f.call('/admin/users/new/',{as:1,form:{name:'새 시험 작업자',login_id:'new-editor',status:'ACTIVE',company_ids:1}});assert.equal(result.status,200);assert.equal(result.headers.get('cache-control'),'no-store');assert.match(await result.text(),/한 번만 표시/);
  const user=await f.DB.prepare('SELECT * FROM users WHERE login_id=?').bind('new-editor').first();assert.equal(user.role,'EDITOR');assert.match(user.password_hash,/^pbkdf2:/);
  assert.equal((await f.DB.prepare('SELECT company_id FROM company_assignments WHERE user_id=?').bind(user.id).first()).company_id,1);
  const edit={name:'변경 작업자',login_id:'ignored-change',status:'ACTIVE',company_ids:2,version:user.version};
  assert.equal((await f.call('/admin/users/'+user.id+'/',{as:1,form:edit})).status,303);
  assert.equal((await f.call('/admin/users/'+user.id+'/',{as:1,form:{...edit,company_ids:3}})).status,409);
  assert.equal((await f.DB.prepare('SELECT company_id FROM company_assignments WHERE user_id=?').bind(user.id).first()).company_id,2);
  assert.equal((await f.call('/admin/users/1/',{as:1})).status,404);
 }finally{f.DB.close();}
});
test('historical contract quantities and expiry never limit new real publications',async()=>{
 const f=await fixture();try{
  await f.DB.prepare("UPDATE companies SET sample=0 WHERE id=1").run();
  await f.DB.prepare("INSERT INTO contracts(id,company_id,package_name,contract_quantity,published_quantity,start_date,end_date,status) VALUES(80,1,'historical closed full contract',1,1,'2020-01-01','2020-12-31','CLOSED')").run();
  const before=await f.DB.prepare('SELECT * FROM contracts WHERE id=80').first();
  for(let i=0;i<2;i++){const id=await f.create({contract_id:80},1),post=await f.row(id);assert.equal(post.contract_id,null);const response=await f.call('/admin/posts/'+id+'/',{as:1,form:{...post,content:JSON.parse(post.content).join('\n\n'),confirm_publish:1}});assert.equal(response.status,303,await response.clone().text());assert.equal((await f.call('/post/'+id+'/')).status,200);}
  assert.deepEqual(await f.DB.prepare('SELECT * FROM contracts WHERE id=80').first(),before);
 }finally{f.DB.close();}
});

test('photo limit and reversible exclusion are enforced transactionally on upload and restore',async()=>{
 const f=await fixture();try{
  const id=await f.create();
  const image=n=>{const data=new Uint8Array(8*8*4);for(let i=0;i<data.length;i+=4){data[i]=n*25;data[i+1]=80;data[i+2]=100;data[i+3]=255;}return jpeg.encode({data,width:8,height:8},90).data;};
  for(let i=0;i<8;i++)assert.equal((await f.upload(id,image(i))).status,303);
  assert.equal((await f.upload(id,image(8))).status,409);
  const first=await f.DB.prepare('SELECT id FROM post_images WHERE post_id=? ORDER BY id LIMIT 1').bind(id).first();
  assert.equal((await f.changePhoto(id,first.id,'exclude')).status,303);assert.equal((await f.upload(id,image(8))).status,303);
  assert.equal((await f.changePhoto(id,first.id,'restore')).status,409);
  assert.equal((await f.DB.prepare('SELECT COUNT(*) AS n FROM post_images WHERE post_id=? AND excluded=0').bind(id).first()).n,8);
 }finally{f.DB.close();}
});
test('upload sanitizes JPEG containers, strips metadata and keeps drafts private; publication exposes only active images',async()=>{
 const f=await fixture();try{
  const id=await f.create(),bytes=await photo(),metadata=new TextEncoder().encode('Exif\0\0PRIVATE-GPS-TEST'),segment=new Uint8Array(metadata.length+4),payload=new Uint8Array(bytes.length+segment.length);
  segment.set([255,225,(metadata.length+2)>>8,(metadata.length+2)&255]);segment.set(metadata,4);payload.set(bytes.subarray(0,2));payload.set(segment,2);payload.set(bytes.subarray(2),segment.length+2);
  assert.equal((await f.upload(id,payload)).status,303);
  const image=await f.DB.prepare('SELECT * FROM post_images WHERE post_id=?').bind(id).first();assert.equal(f.objects.size,2);assert.match(image.content_hash,/^[a-f0-9]{64}$/);
  assert.ok(!Buffer.from(f.objects.get(image.storage_key.slice('/uploads/'.length))).includes(Buffer.from('PRIVATE-GPS-TEST')));
  assert.equal((await f.call(image.storage_key)).status,404);assert.equal((await f.call(image.storage_key,{as:3})).status,404);assert.equal((await f.call(image.storage_key,{as:2})).status,200);
  assert.equal((await f.call(image.storage_key,{as:2,method:'HEAD'})).status,200);
  for(const action of ['submit','approve','publish'])assert.equal((await f.transition(id,action)).status,303);
  assert.equal((await f.call(image.storage_key)).status,200);assert.equal((await f.call(image.storage_key)).headers.get('content-type'),'image/jpeg');
  assert.ok((await(await f.call('/')).text()).includes(image.thumbnail_key));const detail=await(await f.call('/post/'+id+'/')).text();assert.ok(detail.includes(image.storage_key));assert.doesNotMatch(detail,/AI 생성 샘플 이미지/);
  assert.equal((await f.upload(id,bytes)).status,409);
  assert.equal((await f.transition(id,'withdraw')).status,303);assert.equal((await f.call(image.storage_key)).status,404);assert.equal((await f.call('/post/'+id+'/')).status,404);
 }finally{f.DB.close();}
});
test('representative choice, reversible exclusion and photo duplicate checks preserve a single thumbnail source',async()=>{
 const f=await fixture();try{
  const id=await f.create();assert.equal((await f.upload(id,await photo())).status,303);
  assert.equal((await f.upload(id,await readFile(new URL('../public/media/cleaning-cover.jpg',import.meta.url)))).status,303);
  let images=(await f.DB.prepare('SELECT * FROM post_images WHERE post_id=? ORDER BY sort_order,id').bind(id).all()).results;
  assert.equal((await f.changePhoto(id,images[1].id,'representative')).status,303);
  assert.equal((await f.changePhoto(id,images[1].id,'exclude')).status,303);
  assert.equal((await f.changePhoto(id,images[1].id,'restore')).status,303);
  const second=await f.create();assert.equal((await f.upload(second,await photo())).status,409);
  assert.equal((await f.changePhoto(id,images[1].id,'exclude',2,1)).status,409);
  for(const action of ['submit','approve','publish'])assert.equal((await f.transition(id,action)).status,303);
  const html=await(await f.call('/')).text();assert.ok(html.includes('src="'+images[1].thumbnail_key+'"'));
  const detail=await(await f.call('/post/'+id+'/')).text();for(const image of images)assert.ok(detail.includes('src="'+image.storage_key+'"'));
 }finally{f.DB.close();}
});
test('invalid uploads, missing CSRF, wrong ownership and races never leave exposed media rows',async()=>{
 const f=await fixture();try{
  const id=await f.create();assert.equal((await f.upload(id,new TextEncoder().encode('<svg onload="alert(1)">'))).status,409);
  assert.equal((await f.upload(id,await photo(),3)).status,404);
  assert.equal((await f.upload(id,await photo(),2,{csrf:'wrong'})).status,403);
  const original=f.PHOTOS.put;let bumped=false;f.PHOTOS.put=async(k,v)=>{await original(k,v);if(!bumped){bumped=true;await f.DB.prepare('UPDATE posts SET version=version+1 WHERE id=?').bind(id).run();}};
  assert.equal((await f.upload(id,await photo())).status,409);assert.equal(f.objects.size,0);assert.equal((await f.DB.prepare('SELECT COUNT(*) AS n FROM post_images WHERE post_id=?').bind(id).first()).n,0);
  assert.equal((await f.call('/uploads/1/not-a-key.jpg')).status,404);
 }finally{f.DB.close();}
});
test('JPEG validation bounds oversized images and image responses revoke access when the company is disabled',async()=>{
 assert.throws(()=>processPhoto(new Uint8Array([255,216,255,0])),/사진/);
 const oversized=new Uint8Array(await photo());let found=false;for(let i=0;i<oversized.length-8;i++)if(oversized[i]===255&&[192,193,194].includes(oversized[i+1])){oversized[i+5]=255;oversized[i+6]=255;oversized[i+7]=255;oversized[i+8]=255;found=true;break;}assert.ok(found);
 assert.throws(()=>processPhoto(oversized),/사진/);
 const f=await fixture();try{
  const id=await f.create();await f.upload(id,await photo());const image=await f.DB.prepare('SELECT * FROM post_images WHERE post_id=?').bind(id).first();for(const action of ['submit','approve','publish'])await f.transition(id,action);
  await f.DB.prepare("UPDATE companies SET status='DISABLED' WHERE id=1").run();assert.equal((await f.call(image.storage_key)).status,404);assert.equal((await f.call('/post/'+id+'/')).status,404);assert.equal((await f.call(image.storage_key)).headers.get('cache-control'),'no-store');
 }finally{f.DB.close();}
});

test('private customer labels select the correct company and never enter public pages or feeds',async()=>{
 const f=await fixture();try{
  const details={...company,customer_name:'PRIVATE-CUSTOMER-<김사장>',name:'서로 비슷한 유리 업체',sample:'',phone:'010-0000-0000',phone_verified:'1'};
  assert.equal((await f.call('/admin/companies/new/',{as:1,form:{...details,customer_name:''}})).status,409);
  assert.equal((await f.call('/admin/companies/new/',{as:1,form:{...details,customer_name:'가'.repeat(81)}})).status,409);
  assert.equal((await f.call('/admin/companies/new/',{as:1,form:details})).status,303);
  const c=await f.DB.prepare('SELECT * FROM companies ORDER BY id DESC LIMIT 1').first();assert.equal(c.customer_name,details.customer_name);
  const compose=await(await f.call('/admin/compose/',{as:1})).text();assert.match(compose,/PRIVATE-CUSTOMER-&lt;김사장&gt;/);assert.ok(compose.includes('value="'+c.id+'" data-company-name="'+details.name+'"'));assert.match(compose,/data-selected-company/);
  const legacy={...details,version:c.version};delete legacy.customer_name;assert.equal((await f.call('/admin/companies/'+c.id+'/',{as:1,form:legacy})).status,303);assert.equal((await f.DB.prepare('SELECT customer_name FROM companies WHERE id=?').bind(c.id).first()).customer_name,details.customer_name);
  const id=await f.create({company_id:c.id},1),post=await f.row(id);assert.equal((await f.call('/admin/posts/'+id+'/',{as:1,form:{...post,content:JSON.parse(post.content).join('\n\n'),confirm_publish:1}})).status,303);
  for(const path of ['/','/company/'+c.id+'/','/post/'+id+'/','/rss.xml','/sitemap.xml'])assert.doesNotMatch(await(await f.call(path)).text(),/PRIVATE-CUSTOMER|customer_name/);
 }finally{f.DB.close();}
});
