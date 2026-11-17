import {test} from 'node:test';
import assert from 'node:assert/strict';
import worker from '../src/worker.js';
import {sqliteDatabase,migrate} from '../scripts/sqlite.mjs';
import {seed} from '../scripts/seed.mjs';
import {digest,randomToken} from '../src/auth.js';
import {sortServices,normalServiceName} from '../src/services.js';
import {initialServiceCatalog,catalogAdditions} from '../src/service-catalog.js';
import {serviceForKeyword} from '../src/editor-values.js';
const origin='https://gongsa8282.xyz';
async function fixture(){
 const DB=sqliteDatabase();await migrate(DB);await seed(DB);const auth={};
 for(const [id,role] of [[1,'ADMIN'],[2,'EDITOR']]){await DB.prepare('INSERT INTO users(id,name,login_id,password_hash,role) VALUES(?,?,?,?,?)').bind(id,'업종 시험'+id,'catalog-test'+id,'not-a-login-password',role).run();const token=randomToken(),csrf=randomToken();await DB.prepare('INSERT INTO sessions(token_hash,user_id,csrf,expires_at) VALUES(?,?,?,?)').bind(await digest(token),id,csrf,Date.now()+600000).run();auth[id]={cookie:'ls_session='+token,csrf};}
 const call=(path,{as=1,form,csrf=true}={})=>worker.fetch(new Request(origin+path,{method:form?'POST':'GET',headers:{...(as?{cookie:auth[as].cookie}:{}),...(form?{origin,'content-type':'application/x-www-form-urlencoded'}:{})},body:form?new URLSearchParams({...form,...(as&&csrf?{csrf:auth[as].csrf}:{})}):undefined}),{DB});
 const rows=async()=> (await DB.prepare('SELECT * FROM services').all()).results;
 return {DB,call,rows};
}
test('name-only service creation is protected, rejects duplicates and keeps its generated URL on rename',async()=>{
 const f=await fixture();try{
  assert.equal((await f.call('/admin/services/new/',{as:null})).status,303);assert.equal((await f.call('/admin/services/new/',{as:2,form:{name:'시험 간판'}})).status,403);assert.equal((await f.call('/admin/services/new/',{form:{name:'시험 간판'},csrf:false})).status,403);
  const html=await(await f.call('/admin/services/new/')).text();assert.match(html,/업종명만 입력하고 저장/);assert.match(html,/<details class="full"><summary>추가 설정/);assert.doesNotMatch(html,/name="slug"[^>]*required/);
  assert.equal((await f.call('/admin/services/new/',{form:{name:'데이터복구'}})).status,303);const row=(await f.rows()).find(item=>item.name==='데이터복구');assert.match(row.slug,/^service-[a-f0-9]{12}$/);
  assert.equal((await f.call('/admin/services/new/',{form:{name:'데이터 복구'}})).status,409);
  assert.equal((await f.call('/admin/services/'+row.id+'/',{form:{name:'컴퓨터 데이터복구',slug:'changed',version:row.version}})).status,303);const updated=(await f.rows()).find(item=>item.id===row.id);assert.equal(updated.slug,row.slug);assert.equal(updated.icon,row.icon);
  const race=await Promise.all([f.call('/admin/services/new/',{form:{name:'추가 시험업종'}}),f.call('/admin/services/new/',{form:{name:'추가 시험업종'}})]);assert.deepEqual(race.map(response=>response.status).sort(),[303,409]);
 }finally{f.DB.close();}
});
test('all 56 requested labels are supported without replacing existing service IDs, slugs or hierarchy',()=>{
 const existing=[{id:1,name:'배관·누수',slug:'plumbing'},{id:3,name:'에어컨·청소',slug:'cleaning'},{id:4,name:'유리·창호',slug:'glass-windows'},{id:11,parent_id:4,name:'샷시',slug:'window-frames'}],before=structuredClone(existing),additions=catalogAdditions(existing);
 assert.equal(initialServiceCatalog.length,56);assert.equal(additions.length,55);assert.deepEqual(existing,before);assert.equal(additions.some(service=>service.name==='샷시'),false);assert.equal(additions.find(service=>service.name==='에어컨설치').parent_id,3);
 const complete=[...existing,...additions.map((service,index)=>({...service,id:100+index}))];assert.deepEqual(catalogAdditions(complete),[]);
 for(const entry of initialServiceCatalog){const actual=complete.find(service=>normalServiceName(service.name)===normalServiceName(entry.name));assert.ok(actual,entry.name);assert.equal(serviceForKeyword(entry.name,complete),actual.id,entry.name);}
 for(const [alias,name] of [['렌터카','렌트카'],['소파천갈이','쇼파천갈이'],['자동차배터리','자동차밧데리'],['덕트','닥트']])assert.equal(serviceForKeyword(alias,complete),complete.find(service=>service.name===name).id,alias);
 const ordered=sortServices(complete);assert.equal(ordered[0].name,'간병인');assert.equal(ordered.at(-1).name,'흥신소');assert.ok(ordered.findIndex(service=>service.name==='간병인')<ordered.findIndex(service=>service.name==='간판'));
});
test('large catalogues use a Korean-sorted selector and expandable links; empty categories stay out of the sitemap',async()=>{
 const f=await fixture();try{
  const beforePosts=(await f.DB.prepare('SELECT COUNT(*) n FROM posts').first()).n,additions=catalogAdditions(await f.rows());
  for(const row of additions)await f.DB.prepare('INSERT INTO services(name,slug,icon,tone,parent_id,description) VALUES(?,?,?,?,?,?)').bind(row.name,row.slug,row.icon,row.tone,row.parent_id,row.description).run();
  const html=await(await f.call('/?province=11&q=glass')).text(),options=html.match(/<select id="service-select"[^>]*>([\s\S]*?)<\/select>/)[1],names=[...options.matchAll(/<option value="[^"]+"[^>]*>([^<]+)<\/option>/g)].map(match=>match[1]);
  assert.deepEqual(names,sortServices(await f.rows()).map(row=>row.name));assert.match(html,/name="province" value="11"/);assert.match(html,/name="q" value="glass"/);assert.match(html,/업종 더보기/);assert.match(html,/간병인/);assert.match(html,/흥신소/);assert.doesNotMatch(html,/<h3>[^<]*간병인<\/h3>/);
  const admin=await(await f.call('/admin/services/?q='+encodeURIComponent('중고'))).text();assert.match(admin,/중고가구/);assert.doesNotMatch(admin,/<h2><a[^>]*>[^<]*간판/);
  const rental=await(await f.call('/service/car-rental/')).text();assert.match(rental,/noindex,follow/);assert.match(rental,/<option value="car-rental" selected>렌트카/);assert.doesNotMatch(rental,/샘플 0건/);assert.ok(!(await(await f.call('/sitemap.xml')).text()).includes('/service/car-rental/'));assert.equal((await f.DB.prepare('SELECT COUNT(*) n FROM posts').first()).n,beforePosts);
 }finally{f.DB.close();}
});
