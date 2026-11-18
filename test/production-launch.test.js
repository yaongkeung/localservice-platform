import {test} from 'node:test';
import assert from 'node:assert/strict';
import worker from '../src/worker.js';
import {sqliteDatabase,migrate} from '../scripts/sqlite.mjs';
import {seed} from '../scripts/seed.mjs';
import {localMedia} from '../scripts/local-media.mjs';
import {launchState} from '../src/launch.js';
import {productionErrors} from '../scripts/production-check.mjs';
const canonical='https://gongsa8282.xyz',verification='a'.repeat(40);
async function fixture(){
 const DB=sqliteDatabase();await migrate(DB);await seed(DB);
 await DB.prepare('UPDATE companies SET sample=0 WHERE id=1').run();await DB.prepare('UPDATE posts SET sample=0 WHERE id=101').run();
 const env={DB,APP_ENV:'production',PHOTOS:{get(){},put(){}},ASSETS:localMedia,NAVER_SITE_VERIFICATION:verification};
 const call=(path='/',overrides={},origin=canonical)=>worker.fetch(new Request(origin+path),{...env,...overrides});
 return {DB,call};
}
test('production indexing requires the explicit flag and canonical origin; staging stays excluded even with the flag',async()=>{
 const f=await fixture();try{
  let response=await f.call();assert.equal(response.status,200);assert.match(response.headers.get('x-robots-tag'),/noindex/);assert.match(await response.text(),/content="noindex,follow"/);assert.match(await(await f.call('/robots.txt')).text(),/Disallow: \/\n$/);
  response=await f.call('/',{SEARCH_INDEXING:'enabled'});assert.equal(response.headers.get('x-robots-tag'),null);assert.match(await response.text(),/content="index,follow,max-image-preview:large"/);assert.match(await(await f.call('/robots.txt',{SEARCH_INDEXING:'enabled'})).text(),/Disallow: \/admin\//);
  response=await f.call('/',{SEARCH_INDEXING:'enabled'},'https://localservice-platform-production.example.workers.dev');assert.match(response.headers.get('x-robots-tag'),/noindex/);assert.match(await(await f.call('/robots.txt',{SEARCH_INDEXING:'enabled'},'https://other.example')).text(),/Disallow: \/\n$/);
  response=await f.call('/',{APP_ENV:'staging',SEARCH_INDEXING:'enabled'});assert.match(response.headers.get('x-robots-tag'),/noindex/);assert.match(await response.text(),/content="noindex,follow"/);
 }finally{f.DB.close();}
});
test('production pages, feeds and sitemap exclude samples and serve the Naver verification in the home head only',async()=>{
 const f=await fixture();try{
  const html=await(await f.call()).text();assert.ok(html.includes('/post/101/'));assert.ok(!html.includes('/post/102/'));assert.ok(!html.includes('/media/plumbing-cover.jpg'));assert.ok(!html.includes('개발 미리보기'));assert.match(html,new RegExp('<head>[\\s\\S]*<meta name="naver-site-verification" content="'+verification+'">[\\s\\S]*</head>'));
  for(const path of ['/sitemap.xml','/rss.xml']){const output=await(await f.call(path)).text();assert.ok(output.includes('/post/101/'));assert.ok(!output.includes('/post/102/'));assert.ok(!output.includes('/region/seoul/gangnam/'));}
  assert.equal((await f.call('/post/102/')).status,404);assert.equal((await f.call('/company/2/')).status,404);assert.equal((await f.call('/post/101/')).status,200);
  assert.ok(!(await(await f.call('/post/101/')).text()).includes('naver-site-verification'));
  assert.ok(!(await(await f.call('/',{NAVER_SITE_VERIFICATION:'\"><script>bad()</script>'})).text()).includes('naver-site-verification'));
 }finally{f.DB.close();}
});
test('production preflight keeps the old worker, staging storage and unintended domains out of the deployment',()=>{
 const staging={account_id:'a'.repeat(32),d1_databases:[{binding:'DB',database_id:'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'}],r2_buckets:[{binding:'PHOTOS',bucket_name:'localservice-platform-staging-photos'}]};
 const config={name:'localservice-platform-production',account_id:staging.account_id,vars:{APP_ENV:'production',SEARCH_INDEXING:'disabled',NAVER_SITE_VERIFICATION:verification},workers_dev:true,preview_urls:false,assets:{binding:'ASSETS',directory:'./public',run_worker_first:true},d1_databases:[{binding:'DB',database_name:'localservice-platform-production-db',database_id:'11111111-2222-3333-4444-555555555555'}],r2_buckets:[{binding:'PHOTOS',bucket_name:'localservice-platform-production-photos'}]};
 assert.deepEqual(productionErrors(config,staging),[]);assert.ok(productionErrors({...config,name:'gongsa8282'},staging).length);assert.ok(productionErrors({...config,d1_databases:staging.d1_databases},staging).length);assert.ok(productionErrors({...config,r2_buckets:staging.r2_buckets},staging).length);
 const connected={...config,workers_dev:false,routes:[{pattern:'gongsa8282.xyz',custom_domain:true},{pattern:'www.gongsa8282.xyz',custom_domain:true}]};assert.deepEqual(productionErrors(connected,staging,'connect'),[]);assert.ok(productionErrors(connected,staging,'index').length);assert.deepEqual(productionErrors({...connected,vars:{...config.vars,SEARCH_INDEXING:'enabled'}},staging,'index'),[]);
 assert.ok(productionErrors({...connected,routes:[{pattern:'other.example',custom_domain:true}]},staging,'connect').length);assert.ok(productionErrors(connected,staging,'prepare').length);assert.equal(launchState({url:canonical},{APP_ENV:'production'}).indexing,false);
});
test('production redirects HTTP and www to one HTTPS origin without dropping the article path or query',async()=>{
 const f=await fixture();try{for(const host of ['http://gongsa8282.xyz','https://www.gongsa8282.xyz']){const response=await f.call('/post/101/?from=shared',{},host);assert.equal(response.status,308);assert.equal(response.headers.get('location'),canonical+'/post/101/?from=shared');}}finally{f.DB.close();}
});
test('after cutover, old staging management links point to production and stale forms cannot modify the copied source',async()=>{
 const f=await fixture();try{
  const env={APP_ENV:'staging',CMS_READ_ONLY:'true'},response=await f.call('/admin/posts/101/preview/?proof=1',env,'https://trial.example');assert.equal(response.status,302);assert.equal(response.headers.get('location'),canonical+'/admin/posts/101/preview/?proof=1');
  const before=await f.DB.prepare('SELECT version,content_hash FROM posts WHERE id=101').first();
  const rejected=await worker.fetch(new Request('https://trial.example/admin/posts/101/',{method:'POST',body:'content=stale+form'}),{DB:f.DB,APP_ENV:'staging',CMS_READ_ONLY:'true',PHOTOS:{get(){},put(){}},ASSETS:localMedia});assert.equal(rejected.status,409);assert.match(await rejected.text(),/운영 관리 화면/);assert.deepEqual(await f.DB.prepare('SELECT version,content_hash FROM posts WHERE id=101').first(),before);
 }finally{f.DB.close();}
});

test('Google ownership tag is confined to the canonical production home and coexists with Naver verification',async()=>{
 const f=await fixture(),google='g'.repeat(42)+'_';try{
  const options={GOOGLE_SITE_VERIFICATION:google,SEARCH_INDEXING:'enabled'},html=await(await f.call('/',options)).text();assert.match(html,new RegExp('<head>[\\s\\S]*<meta name="google-site-verification" content="'+google+'">[\\s\\S]*</head>'));assert.ok(html.indexOf('google-site-verification')<2000);assert.equal((html.match(/name="google-site-verification"/g)||[]).length,1);assert.ok(html.includes('name="naver-site-verification" content="'+verification+'"'));
  for(const path of ['/post/101/','/company/1/','/rss.xml','/sitemap.xml'])assert.ok(!(await(await f.call(path,options)).text()).includes('google-site-verification'));
  for(const options of [{GOOGLE_SITE_VERIFICATION:'\"><script>bad()</script>'},{GOOGLE_SITE_VERIFICATION:'x'.repeat(201)},{GOOGLE_SITE_VERIFICATION:google,APP_ENV:'staging'}])assert.ok(!(await(await f.call('/',options)).text()).includes('google-site-verification'));
  assert.ok(!(await(await f.call('/',{GOOGLE_SITE_VERIFICATION:google},'https://preview.example')).text()).includes('google-site-verification'));
 }finally{f.DB.close();}
});
