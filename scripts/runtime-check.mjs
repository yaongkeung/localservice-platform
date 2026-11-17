import assert from 'node:assert/strict';
import {readFile,readdir,mkdir,mkdtemp,rm} from 'node:fs/promises';
import {resolve,join,dirname,basename} from 'node:path';
import {Miniflare,convertV4MiniflareOptions} from 'miniflare';
import {unstable_splitSqlQuery} from 'wrangler';
import {seed} from './seed.mjs';
import {hashPassword,randomToken} from '../src/auth.js';
import {localMedia} from './local-media.mjs';
import {preparePhoto} from './prepare-photo.mjs';
import {runInNewContext} from 'node:vm';
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
 // Execute bundled browser scripts, including nested handlers. Source imports and
 // HTTP status checks alone miss build-time helper dependencies in serialized code.
 for(const path of ['/assets/upload.js','/assets/cms-regions.js','/assets/editor.js']){
  const select={value:'catalog',addEventListener(){},replaceChildren(){},append(){}};
  const group={querySelector:()=>select};
  const document={addEventListener(){},querySelector:()=>null,querySelectorAll:selector=>selector==='[data-cms-regions]'?[group]:[]};
  const source=await(await mf.dispatchFetch(origin+path)).text();runInNewContext(source,{document,URLSearchParams,Option:function(){}},{timeout:1000});checks++;
 }
 await seed(DB);await DB.prepare("INSERT INTO users(id,name,login_id,password_hash,role) VALUES(1,'실행 시험 관리자','runtime-admin',?,'ADMIN')").bind(await hashPassword(password)).run();
 await DB.prepare("INSERT INTO contracts(id,company_id,package_name,contract_quantity,start_date,end_date) VALUES(1,1,'Runtime single post',1,'2020-01-01','2030-12-31')").run();
 const call=(path,{cookie,form,body,headers={},method=form||body?'POST':'GET'}={})=>mf.dispatchFetch(origin+path,{method,redirect:'manual',headers:{...(cookie?{cookie}:{}),...((form||body)?{origin}:{}),...(form?{'content-type':'application/x-www-form-urlencoded'}:{}),...headers},body:form?new URLSearchParams(form).toString():body});
 let response=await call('/admin/login/',{form:{login_id:'runtime-admin',password}});assert.equal(response.status,303,'Expected a successful redirect');checks++;const cookie=response.headers.get('set-cookie').split(';')[0];assert.match(response.headers.get('set-cookie'),/Secure/);
 response=await call('/admin/search-readiness/',{cookie});assert.equal(response.status,200);assert.match(await response.text(),/시험 사이트는 검색 제외/);checks++;
 const createHtml=await(await call('/admin/posts/new/',{cookie})).text(),csrf=createHtml.match(/name="csrf" value="([a-f0-9]+)"/)[1];
 const companyRow=await DB.prepare('SELECT * FROM companies WHERE id=1').first();response=await call('/admin/companies/1/',{cookie,form:{...companyRow,csrf,customer_reviews:JSON.parse(companyRow.customer_reviews||'[]').join('\n\n'),reviews_confirmed:companyRow.reviews_confirmed?'1':'',phone:companyRow.phone||'',sample:companyRow.sample?'1':'',naver_place_url:'https://naver.me/Test1234',naver_place_name:'실행 시험 업체',naver_place_address:'시험용 주소',naver_place_hours:'전화로 확인'}});assert.equal(response.status,303,await response.clone().text());checks++;
 const values={csrf,company_id:1,contract_id:1,service_id:1,region_mode:'catalog',province:'43',district:'43113',dong:'43113310',post_type:'작업사례',title:'Workers 실행 환경에서 검증한 샘플 글',summary:'D1과 R2를 실제 Workers 엔진에서 연결해 검증하는 샘플입니다.',content:'실제 Workers 실행 엔진에서 지역 선택과 글 저장, 사진 등록과 검수 및 공개를 확인합니다. 이 내용은 실적이 아닌 실행 환경 검증을 위해 작성한 샘플 콘텐츠입니다.'};
 response=await call('/admin/posts/new/',{cookie,form:values});assert.equal(response.status,303,await response.clone().text());const id=Number(response.headers.get('location').split('/')[3]);checks++;
 const post=()=>DB.prepare('SELECT * FROM posts WHERE id=?').bind(id).first();
 const pair=preparePhoto(await readFile('public/media/plumbing-cover.jpg')),form=new FormData();form.set('thumbnail',new Blob([pair.thumb],{type:'image/jpeg'}),'preview.jpg');form.set('photo',new Blob([pair.cover],{type:'image/jpeg'}),'photo.jpg');form.set('alt_text','실행 환경 시험용 배관 사진');form.set('csrf',csrf);form.set('version',String((await post()).version));
 const encoded=new Request(origin,{method:'POST',body:form}),started=performance.now();
 response=await call('/admin/posts/'+id+'/photos/',{cookie,body:await encoded.arrayBuffer(),headers:{'content-type':encoded.headers.get('content-type')}});assert.equal(response.status,303,await response.clone().text());checks++;const uploadMs=Math.round(performance.now()-started);
 const image=await DB.prepare('SELECT * FROM post_images WHERE post_id=?').bind(id).first();assert.equal((await call(image.storage_key)).status,404);assert.equal((await call(image.storage_key,{cookie})).status,200);checks++;
 const inlineContent='사진 앞에 배치하는 서비스 설명입니다. 실제 작업 실적을 꾸며 쓰지 않고 사진에서 보이는 내용을 설명합니다.\n\n[사진:'+image.id+']\n\n사진 다음에는 상담 안내와 추가 설명을 이어서 작성합니다.';
 response=await call('/admin/posts/'+id+'/',{cookie,form:{...values,content:inlineContent,version:(await post()).version}});assert.equal(response.status,303,await response.clone().text());checks++;
 assert.ok((await(await call('/admin/posts/'+id+'/',{cookie})).text()).includes('id="post-photos"'));checks++;
 const transition=async action=>{const response=await call('/admin/posts/'+id+'/status/',{cookie,form:{csrf,action,version:(await post()).version}});assert.equal(response.status,303,await response.clone().text());};
 for(const action of ['submit','approve','publish'])await transition(action);assert.equal((await DB.prepare('SELECT published_quantity FROM contracts WHERE id=1').first()).published_quantity,1);checks++;
 assert.equal((await call('/post/'+id+'/')).status,200);const publicHtml=await(await call('/post/'+id+'/')).text();assert.ok(publicHtml.indexOf('사진 앞에 배치')<publicHtml.indexOf('class="post-photo"'));assert.ok(publicHtml.indexOf('class="post-photo"')<publicHtml.indexOf('사진 다음에는'));assert.ok(!publicHtml.includes('[사진:'));assert.ok(publicHtml.includes('href="https://naver.me/Test1234"'));assert.ok(publicHtml.includes('실행 시험 업체'));assert.equal((await call(image.storage_key)).status,200);assert.ok((await(await call('/rss.xml')).text()).includes('/post/'+id+'/'));checks++;
 await transition('withdraw');assert.equal((await call(image.storage_key)).status,404);assert.equal((await DB.prepare('SELECT COUNT(*) AS n FROM post_snapshots WHERE post_id=?').bind(id).first()).n,1);checks++;
 for(const action of ['submit','approve','publish'])await transition(action);checks++;
 response=await call('/admin/posts/new/',{cookie,form:{...values,title:values.title+' (capacity test)',content:values.content+' 두 번째 게시 수량을 확인합니다.'}});assert.equal(response.status,303);const blockedId=Number(response.headers.get('location').split('/')[3]);
 for(const action of ['submit','approve','publish']){const row=await DB.prepare('SELECT version FROM posts WHERE id=?').bind(blockedId).first();const result=await call('/admin/posts/'+blockedId+'/status/',{cookie,form:{csrf,action,version:row.version}});assert.equal(result.status,action==='publish'?409:303);}checks++;
 response=await call('/admin/account/',{cookie,form:{csrf,current_password:password,new_password:'runtime-new-'+randomToken(),confirm_password:'mismatch'}});assert.equal(response.status,409);checks++;
 const nextPassword='runtime-new-'+randomToken();response=await call('/admin/account/',{cookie,form:{csrf,current_password:password,new_password:nextPassword,confirm_password:nextPassword}});assert.equal(response.status,200);assert.equal((await call('/admin/',{cookie})).status,303);checks++;
 await mf.dispose();mf=new Miniflare(options);await mf.ready;DB=await mf.getD1Database('DB');assert.equal((await call('/post/'+id+'/')).status,200);assert.equal((await call(image.storage_key)).status,200);assert.equal((await DB.prepare('SELECT credential_version FROM users WHERE id=1').first()).credential_version,2);checks++;
 assert.equal((await call('/media/plumbing-cover.jpg')).status,200);checks++;
 console.log(JSON.stringify({runtime:'workerd',checks,uploadRoundTripMs:uploadMs,persistentD1:true,persistentR2:true,secretsLogged:false}));
}finally{
 await mf?.dispose();assert.equal(dirname(resolve(directory)),root);assert.ok(basename(directory).startsWith('runtime-'));await rm(directory,{recursive:true,force:true,maxRetries:5,retryDelay:100});
}
