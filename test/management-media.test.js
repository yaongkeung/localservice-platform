import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import worker from '../src/worker.js';
import {sqliteDatabase,migrate} from '../scripts/sqlite.mjs';
import {seed} from '../scripts/seed.mjs';
import {digest,randomToken} from '../src/auth.js';
import {seoulDate} from '../src/photos.js';
import {processPhoto} from '../src/image-processing.js';
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
 const call=(path,{as,form,body,headers={},method=form||body?'POST':'GET'}={})=>worker.fetch(new Request(origin+path,{method,headers:{...(as?{cookie:auth[as].cookie}:{}),...((form||body)?{origin}:{}),...(form?{'content-type':'application/x-www-form-urlencoded'}:{}),...headers},body:form?new URLSearchParams({...form,...(as?{csrf:auth[as].csrf}:{})}):body}),{DB,PHOTOS});
 const create=async(overrides={},as=2)=>{const response=await call('/admin/posts/new/',{as,form:{title:'시험용 작업 내용 '+randomToken().slice(0,8),summary:'공개 흐름과 사진을 검증하는 테스트용 작업 내용입니다.',content:'관리 화면에서 저장한 고유한 작업 과정입니다. 수전 주변을 살펴보고 물기를 정리한 후 점검할 부분을 확인했습니다. 실제 작업 실적을 나타내는 글이 아니며 자동 검증을 위해 작성했습니다. '+randomToken(),company_id:1,region_id:2,service_id:1,post_type:'작업사례',...overrides}});assert.equal(response.status,303,await response.clone().text());return Number(response.headers.get('location').split('/')[3]);};
 const row=id=>DB.prepare('SELECT * FROM posts WHERE id=?').bind(id).first();
 const transition=async(id,action,as=1)=>call(`/admin/posts/${id}/status/`,{as,form:{action,version:(await row(id)).version}});
 const upload=async(id,bytes,as=2,extra={})=>{const body=new FormData();body.set('photo',new Blob([bytes],{type:'image/jpeg'}),'untrusted-name.jpg');body.set('alt_text','샘플 연결부 점검 사진');body.set('csrf',auth[as].csrf);body.set('version',String((await row(id)).version));for(const [k,v]of Object.entries(extra))body.set(k,v);return call(`/admin/posts/${id}/photos/`,{as,body});};
 const changePhoto=async(id,image,action,as=2,version)=>call(`/admin/posts/${id}/photos/`,{as,form:{image_id:image,action,version:version??(await row(id)).version}});
 return {DB,objects,PHOTOS,auth,call,create,row,transition,upload,changePhoto};
}
const photo=()=>readFile(new URL('../public/media/plumbing-cover.jpg',import.meta.url));
const company={name:'시험 설비 업체',description:'자동 검증을 위해 등록한 출장 설비 업체입니다.',area:'서울 마포구',hours:'평일 09:00~18:00',phone:'',status:'ACTIVE',sample:'1'};
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
test('contracts count publication once and atomically stop excess or expired publication',async()=>{
 const f=await fixture();try{
  const values={company_id:1,package_name:'시험 1건 계약',contract_quantity:1,price:10000,start_date:'2026-01-01',end_date:'2030-12-31',status:'ACTIVE'};
  assert.equal((await f.call('/admin/contracts/new/',{as:1,form:values})).status,303);
  const c=await f.DB.prepare('SELECT * FROM contracts').first(),a=await f.create({contract_id:c.id}),b=await f.create({contract_id:c.id});
  for(const id of [a,b])for(const action of ['submit','approve'])assert.equal((await f.transition(id,action)).status,303);
  assert.equal((await f.DB.prepare('SELECT published_quantity FROM contracts').first()).published_quantity,0);
  const results=await Promise.all([f.transition(a,'publish'),f.transition(b,'publish')]);assert.deepEqual(results.map(r=>r.status).sort(),[303,409]);
  assert.equal((await f.DB.prepare('SELECT published_quantity FROM contracts').first()).published_quantity,1);
  assert.equal((await f.call('/admin/contracts/'+c.id+'/',{as:1,form:{...values,contract_quantity:0,version:2}})).status,409);
  assert.equal((await f.call('/admin/contracts/new/',{as:1,form:{...values,start_date:'2026-02-30'}})).status,409);
  const id=await f.create();await f.DB.prepare('UPDATE companies SET sample=0 WHERE id=1').run();for(const action of ['submit','approve'])assert.equal((await f.transition(id,action)).status,303);assert.equal((await f.transition(id,'publish')).status,409);
  await f.DB.prepare("UPDATE contracts SET contract_quantity=10,start_date='2020-01-01',end_date='2020-12-31' WHERE id=?").bind(c.id).run();
  const expired=await f.create({contract_id:c.id});for(const action of ['submit','approve'])assert.equal((await f.transition(expired,action)).status,303);assert.equal((await f.transition(expired,'publish')).status,409);
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
test('upload re-encodes pixels, strips metadata and keeps drafts private; publication exposes only active images',async()=>{
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
test('decoder bounds oversized images and image responses revoke access when the company is disabled',async()=>{
 assert.throws(()=>processPhoto(new Uint8Array([255,216,255,0])),/사진/);
 const oversized=new Uint8Array(await photo());let found=false;for(let i=0;i<oversized.length-8;i++)if(oversized[i]===255&&[192,193,194].includes(oversized[i+1])){oversized[i+5]=255;oversized[i+6]=255;oversized[i+7]=255;oversized[i+8]=255;found=true;break;}assert.ok(found);
 assert.throws(()=>processPhoto(oversized),/사진/);
 const f=await fixture();try{
  const id=await f.create();await f.upload(id,await photo());const image=await f.DB.prepare('SELECT * FROM post_images WHERE post_id=?').bind(id).first();for(const action of ['submit','approve','publish'])await f.transition(id,action);
  await f.DB.prepare("UPDATE companies SET status='DISABLED' WHERE id=1").run();assert.equal((await f.call(image.storage_key)).status,404);assert.equal((await f.call('/post/'+id+'/')).status,404);assert.equal((await f.call(image.storage_key)).headers.get('cache-control'),'no-store');
 }finally{f.DB.close();}
});
