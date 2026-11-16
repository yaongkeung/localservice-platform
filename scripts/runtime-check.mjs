import assert from 'node:assert/strict';
import {readFile,readdir,mkdir,mkdtemp,rm} from 'node:fs/promises';
import {resolve,join,dirname,basename} from 'node:path';
import {Miniflare,convertV4MiniflareOptions} from 'miniflare';
import {unstable_splitSqlQuery} from 'wrangler';
import {seed} from './seed.mjs';
import {hashPassword,randomToken} from '../src/auth.js';
import {localMedia} from './local-media.mjs';
import {preparePhoto} from './prepare-photo.mjs';
const root=resolve('.local');await mkdir(root,{recursive:true});const directory=await mkdtemp(join(root,'runtime-'));
const origin='https://gongsa8282.xyz',password=randomToken(),options=convertV4MiniflareOptions({modules:true,scriptPath:resolve('.local/worker-build/worker.js'),compatibilityDate:'2026-11-13',cf:false,bindings:{APP_ENV:'staging'},host:'127.0.0.1',port:0,d1Databases:{DB:'localservice-runtime-db'},r2Buckets:['PHOTOS'],resourcePersistencePath:directory,serviceBindings:{ASSETS:request=>localMedia.fetch(request)}});
let mf,checks=0;
try{
 mf=new Miniflare(options);await mf.ready;let DB=await mf.getD1Database('DB');
 await DB.prepare('CREATE TABLE d1_migrations(id INTEGER PRIMARY KEY,name TEXT UNIQUE,applied_at TEXT DEFAULT CURRENT_TIMESTAMP)').run();
 for(const name of (await readdir('migrations')).filter(n=>n.endsWith('.sql')).sort()){
  const statements=unstable_splitSqlQuery((await readFile('migrations/'+name,'utf8')).replace(/\r\n/g,'\n')).filter(sql=>!/^\s*PRAGMA\s+foreign_keys\s*=/i.test(sql));
  await DB.batch([...statements.map(sql=>DB.prepare(sql)),DB.prepare('INSERT INTO d1_migrations(name) VALUES(?)').bind(name)]);
 }
 assert.equal((await mf.dispatchFetch(origin+'/healthz',{redirect:'manual'})).status,200);checks++;
 await seed(DB);await DB.prepare("INSERT INTO users(id,name,login_id,password_hash,role) VALUES(1,'실행 시험 관리자','runtime-admin',?,'ADMIN')").bind(await hashPassword(password)).run();
 await DB.prepare("INSERT INTO contracts(id,company_id,package_name,contract_quantity,start_date,end_date) VALUES(1,1,'Runtime single post',1,'2020-01-01','2030-12-31')").run();
 const call=(path,{cookie,form,body,headers={},method=form||body?'POST':'GET'}={})=>mf.dispatchFetch(origin+path,{method,redirect:'manual',headers:{...(cookie?{cookie}:{}),...((form||body)?{origin}:{}),...(form?{'content-type':'application/x-www-form-urlencoded'}:{}),...headers},body:form?new URLSearchParams(form).toString():body});
 let response=await call('/admin/login/',{form:{login_id:'runtime-admin',password}});assert.equal(response.status,303,'Expected a successful redirect');checks++;const cookie=response.headers.get('set-cookie').split(';')[0];assert.match(response.headers.get('set-cookie'),/Secure/);
 const createHtml=await(await call('/admin/posts/new/',{cookie})).text(),csrf=createHtml.match(/name="csrf" value="([a-f0-9]+)"/)[1];
 const values={csrf,company_id:1,contract_id:1,service_id:1,region_mode:'catalog',province:'43',district:'43113',dong:'43113310',post_type:'작업사례',title:'Workers 실행 환경에서 검증한 샘플 글',summary:'D1과 R2를 실제 Workers 엔진에서 연결해 검증하는 샘플입니다.',content:'실제 Workers 실행 엔진에서 지역 선택과 글 저장, 사진 등록과 검수 및 공개를 확인합니다. 이 내용은 실적이 아닌 실행 환경 검증을 위해 작성한 샘플 콘텐츠입니다.'};
 response=await call('/admin/posts/new/',{cookie,form:values});assert.equal(response.status,303,await response.clone().text());const id=Number(response.headers.get('location').split('/')[3]);checks++;
 const post=()=>DB.prepare('SELECT * FROM posts WHERE id=?').bind(id).first();
 const pair=preparePhoto(await readFile('public/media/plumbing-cover.jpg')),form=new FormData();form.set('thumbnail',new Blob([pair.thumb],{type:'image/jpeg'}),'preview.jpg');form.set('photo',new Blob([pair.cover],{type:'image/jpeg'}),'photo.jpg');form.set('alt_text','실행 환경 시험용 배관 사진');form.set('csrf',csrf);form.set('version',String((await post()).version));
 const encoded=new Request(origin,{method:'POST',body:form}),started=performance.now();
 response=await call('/admin/posts/'+id+'/photos/',{cookie,body:await encoded.arrayBuffer(),headers:{'content-type':encoded.headers.get('content-type')}});assert.equal(response.status,303,await response.clone().text());checks++;const uploadMs=Math.round(performance.now()-started);
 const image=await DB.prepare('SELECT * FROM post_images WHERE post_id=?').bind(id).first();assert.equal((await call(image.storage_key)).status,404);assert.equal((await call(image.storage_key,{cookie})).status,200);checks++;
 const companyForm=new FormData();for(const [key,value] of Object.entries({csrf,version:'1',alt_text:'Workers 업체 사진 시험'}))companyForm.set(key,value);companyForm.set('photo',new Blob([pair.cover]),'company.jpg');companyForm.set('thumbnail',new Blob([pair.thumb]),'company-thumb.jpg');
 const companyEncoded=new Request(origin,{method:'POST',body:companyForm});response=await call('/admin/companies/1/photos/',{cookie,body:await companyEncoded.arrayBuffer(),headers:{'content-type':companyEncoded.headers.get('content-type')}});assert.equal(response.status,303,await response.clone().text());checks++;
 const companyImage=await DB.prepare('SELECT * FROM company_images WHERE company_id=1').first();assert.equal((await call(companyImage.storage_key)).status,200);assert.ok((await(await call('/company/1/')).text()).includes(companyImage.storage_key));checks++;
 const transition=async action=>{const response=await call('/admin/posts/'+id+'/status/',{cookie,form:{csrf,action,version:(await post()).version}});assert.equal(response.status,303,await response.clone().text());};
 for(const action of ['submit','approve','publish'])await transition(action);assert.equal((await DB.prepare('SELECT published_quantity FROM contracts WHERE id=1').first()).published_quantity,1);checks++;
 assert.equal((await call('/post/'+id+'/')).status,200);assert.equal((await call(image.storage_key)).status,200);assert.ok((await(await call('/rss.xml')).text()).includes('/post/'+id+'/'));checks++;
 await transition('withdraw');assert.equal((await call(image.storage_key)).status,404);assert.equal((await DB.prepare('SELECT COUNT(*) AS n FROM post_snapshots WHERE post_id=?').bind(id).first()).n,1);checks++;
 for(const action of ['submit','approve','publish'])await transition(action);checks++;
 response=await call('/admin/posts/new/',{cookie,form:{...values,title:values.title+' (capacity test)',content:values.content+' 두 번째 게시 수량을 확인합니다.'}});assert.equal(response.status,303);const blockedId=Number(response.headers.get('location').split('/')[3]);
 for(const action of ['submit','approve','publish']){const row=await DB.prepare('SELECT version FROM posts WHERE id=?').bind(blockedId).first();const result=await call('/admin/posts/'+blockedId+'/status/',{cookie,form:{csrf,action,version:row.version}});assert.equal(result.status,action==='publish'?409:303);}checks++;
 response=await call('/admin/account/',{cookie,form:{csrf,current_password:password,new_password:'runtime-new-'+randomToken(),confirm_password:'mismatch'}});assert.equal(response.status,409);checks++;
 const nextPassword='runtime-new-'+randomToken();response=await call('/admin/account/',{cookie,form:{csrf,current_password:password,new_password:nextPassword,confirm_password:nextPassword}});assert.equal(response.status,200);assert.equal((await call('/admin/',{cookie})).status,303);checks++;
 await mf.dispose();mf=new Miniflare(options);await mf.ready;DB=await mf.getD1Database('DB');assert.equal((await call('/post/'+id+'/')).status,200);assert.equal((await call(image.storage_key)).status,200);assert.equal((await call(companyImage.storage_key)).status,200);assert.equal((await DB.prepare('SELECT credential_version FROM users WHERE id=1').first()).credential_version,2);checks++;
 assert.equal((await call('/media/plumbing-cover.jpg')).status,200);checks++;
 console.log(JSON.stringify({runtime:'workerd',checks,uploadRoundTripMs:uploadMs,persistentD1:true,persistentR2:true,secretsLogged:false}));
}finally{
 await mf?.dispose();assert.equal(dirname(resolve(directory)),root);assert.ok(basename(directory).startsWith('runtime-'));await rm(directory,{recursive:true,force:true,maxRetries:5,retryDelay:100});
}
