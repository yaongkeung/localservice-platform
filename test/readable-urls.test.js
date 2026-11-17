import {test} from 'node:test';
import assert from 'node:assert/strict';
import worker from '../src/worker.js';
import {sqliteDatabase,migrate} from '../scripts/sqlite.mjs';
import {seed} from '../scripts/seed.mjs';
import {digest,randomToken} from '../src/auth.js';
import {postUrl,readablePostPaths,normalizedPath} from '../src/post-urls.js';
const origin='https://gongsa8282.xyz';
async function fixture(){
 const DB=sqliteDatabase();await migrate(DB);await seed(DB);
 const token=randomToken(),csrf=randomToken();await DB.prepare("INSERT INTO users(id,name,login_id,password_hash,role) VALUES(40,'URL test','url-test','unused','ADMIN')").run();await DB.prepare('INSERT INTO sessions(token_hash,user_id,csrf,expires_at) VALUES(?,?,?,?)').bind(await digest(token),40,csrf,Date.now()+600000).run();
 await DB.prepare('UPDATE companies SET sample=0 WHERE id IN (1,2)').run();
 const call=(path,form,method=form?'POST':'GET')=>worker.fetch(new Request(origin+path,{method,headers:{cookie:'ls_session='+token,...(form?{origin,'content-type':'application/x-www-form-urlencoded','x-editor-action':'1'}:{})},body:form?new URLSearchParams({...form,csrf}):undefined}),{DB});
 const values={company_id:1,region_id:2,service_id:1,post_type:'서비스안내',search_region:'마포구',search_keyword:'누수점검',title:'마포구 누수점검 사진 상담에 필요한 정보',summary:'사진과 현장 조건을 바탕으로 방문 상담에 필요한 사항을 안내합니다.',content:'사진에서 확인할 연결부와 벽면 주변의 상태를 정리하고 상담할 업무를 구분합니다. 물이 보이는 위치와 발생 시간을 기록하고 전체 사진과 가까운 사진을 준비해 전문가와 점검할 범위를 상담하세요.'};
 const row=id=>DB.prepare('SELECT * FROM posts WHERE id=?').bind(id).first(),url=async id=>(await DB.prepare('SELECT path FROM post_urls WHERE post_id=?').bind(id).first())?.path;
 const create=async overrides=>{const data={...values,...overrides},response=await call('/admin/posts/new/',data);assert.equal(response.status,303,await response.clone().text());return {id:Number(response.headers.get('location').split('/')[3]),data};};
 const publish=async item=>call('/admin/posts/'+item.id+'/',{...item.data,version:(await row(item.id)).version,confirm_publish:1});
 return {DB,call,values,row,url,create,publish};
}
test('readable paths use service, province and chosen locality, with a reserved collision suffix',()=>{
 const regions=[{id:8,name:'원당동',admin_code:'28290530'}],services=[{id:1,name:'배관·누수'}],post={id:120,region_id:8,service_id:1,search_region:'원당동',search_keyword:'옥상누수'};
 const paths=readablePostPaths(post,regions,services);assert.equal(decodeURIComponent(paths.base),'/배관/인천/원당동/원당동-옥상누수.html');assert.equal(decodeURIComponent(paths.collision),'/배관/인천/원당동/원당동-옥상누수--120.html');assert.equal(postUrl({...post,public_path:paths.base}),paths.base);
 assert.equal(normalizedPath(paths.base.toLowerCase()),paths.base);assert.equal(normalizedPath('/%broken'),null);
 const hostile=readablePostPaths({...post,search_region:'../원당동?x=<script>',search_keyword:'//옥상--누수#x'},regions,[{id:1,name:'admin'}]);assert.ok(hostile.base.startsWith('/'+encodeURIComponent('서비스-admin')+'/'));assert.doesNotMatch(decodeURIComponent(hostile.base),/[?<>#]|\.\./);assert.ok(!hostile.base.includes('--'));
 const eup=readablePostPaths({...post,search_region:'강내면'},regions,services);assert.match(decodeURIComponent(eup.base),/강내면\/강내면-/);
});
test('one canonical Korean URL appears in HTML, boards, metadata, sitemap and RSS; numeric GET/HEAD redirect once',async()=>{
 const f=await fixture();try{
  const item=await f.create(),response=await f.publish(item);assert.equal(response.status,200,await response.clone().text());const data=await response.json(),path=await f.url(item.id);assert.equal(data.publicUrl,path);assert.equal(decodeURIComponent(path),'/배관/서울/마포구/마포구-누수점검.html');
  for(const old of ['/post/'+item.id+'/','/post/'+item.id])for(const method of ['GET','HEAD']){const moved=await f.call(old,null,method);assert.equal(moved.status,301);assert.equal(moved.headers.get('location'),path);assert.equal(await moved.text(),'');}
  const page=await f.call(path);assert.equal(page.status,200);const html=await page.text();assert.ok(html.includes('rel="canonical" href="'+origin+path+'"'));assert.equal((html.match(/rel="canonical"/g)||[]).length,1);assert.ok(html.includes('property="og:url" content="'+origin+path+'"'));assert.match(html,/<body class="consultation-layout">/);
  const graph=JSON.parse(html.match(/application\/ld\+json">([\s\S]*?)<\/script>/)[1])['@graph'];assert.equal(graph.find(item=>item['@type']==='Article').mainEntityOfPage,origin+path);assert.equal(graph.find(item=>item['@type']==='BreadcrumbList').itemListElement.at(-1).item,origin+path);
  for(const surface of ['/','/service/plumbing/','/company/1/','/sitemap.xml','/rss.xml']){const text=await(await f.call(surface)).text();assert.ok(text.includes(path),surface);assert.ok(!text.includes('/post/'+item.id+'/'),surface);}
  const lower=await f.call(path.toLowerCase());assert.equal(lower.status,301);assert.equal(lower.headers.get('location'),path);assert.equal((await f.call(path+'?utm_source=test')).status,200);
  assert.equal((await f.call(path.replace('.html','-missing.html'))).status,404);assert.equal((await f.call('/%broken/x/y.html')).status,404);assert.equal((await f.call(path,null,'POST')).status,405);
 }finally{f.DB.close();}
});
test('withdrawn and inactive pages keep both addresses private; edit and republish never rename the URL',async()=>{
 const f=await fixture();try{
  const item=await f.create();assert.equal((await f.publish(item)).status,200);const path=await f.url(item.id),original=await f.row(item.id),savedUrl=await f.DB.prepare('SELECT * FROM post_urls WHERE post_id=?').bind(item.id).first();
  assert.equal((await f.call('/admin/posts/'+item.id+'/status/',{action:'withdraw',version:original.version})).status,200);for(const target of [path,'/post/'+item.id+'/'])assert.equal((await f.call(target)).status,404);
  const updated={...item,data:{...item.data,title:'마포구 배관누수 변경한 상담 안내',search_keyword:'배관누수',public_path:'/forged/path.html'}};assert.equal((await f.publish(updated)).status,200);assert.equal(await f.url(item.id),path);assert.equal((await f.row(item.id)).published_at,original.published_at);assert.deepEqual(await f.DB.prepare('SELECT * FROM post_urls WHERE post_id=?').bind(item.id).first(),savedUrl);
  await assert.rejects(f.DB.prepare("UPDATE post_urls SET path='/a/b/c.html' WHERE post_id=?").bind(item.id).run(),/immutable/);
  await f.DB.prepare("UPDATE companies SET status='DISABLED' WHERE id=1").run();for(const target of [path,'/post/'+item.id+'/'])assert.equal((await f.call(target)).status,404);
  assert.ok(!(await(await f.call('/sitemap.xml')).text()).includes(path));assert.ok(!(await(await f.call('/rss.xml')).text()).includes(path));
 }finally{f.DB.close();}
});
test('same locality and keyword can belong to different companies without overwriting either address',async()=>{
 const f=await fixture();try{
  const first=await f.create(),second=await f.create({company_id:2,title:'마포구 누수점검 두 번째 업체 안내',content:'방문 일정과 점검 견적의 포함 항목을 확인하는 안내입니다. 소유한 제품의 모델명과 사용 조건을 설명하고 관리실 출입 조건, 층간 연락과 진입 공간을 미리 정리하여 상담할 준비를 하세요.'});
  for(const result of await Promise.all([f.publish(first),f.publish(second)]))assert.equal(result.status,200,await result.clone().text());
  const paths=[await f.url(first.id),await f.url(second.id)];assert.notEqual(paths[0],paths[1]);assert.equal(paths.filter(path=>path.includes('--')).length,1);for(const path of paths)assert.equal((await f.call(path)).status,200);
  assert.equal((await f.DB.prepare('SELECT COUNT(*) n FROM post_urls').first()).n,2);
 }finally{f.DB.close();}
});
test('URL allocation failure rolls back publication, content, first-published marker and audit events',async()=>{
 const f=await fixture();try{
  const item=await f.create(),before=await f.row(item.id);f.DB.raw.exec("CREATE TRIGGER fail_url BEFORE INSERT ON post_urls BEGIN SELECT RAISE(ABORT,'simulated URL allocation failure'); END;");
  const result=await f.publish({...item,data:{...item.data,title:'실패 시 유지해야 하는 본문과 주소'}});assert.equal(result.status,409);assert.deepEqual(await f.row(item.id),before);assert.equal(await f.url(item.id),undefined);assert.equal((await f.DB.prepare('SELECT COUNT(*) n FROM post_events WHERE post_id=?').bind(item.id).first()).n,0);
 }finally{f.DB.close();}
});
