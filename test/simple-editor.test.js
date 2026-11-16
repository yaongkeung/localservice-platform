import {test} from 'node:test';
import assert from 'node:assert/strict';
import worker from '../src/worker.js';
import {sqliteDatabase,migrate} from '../scripts/sqlite.mjs';
import {seed} from '../scripts/seed.mjs';
import {digest,randomToken} from '../src/auth.js';
import {regionData} from '../src/regions-data.js';
import {townshipGroups,townshipName} from '../src/township-groups.js';
import {registerRegion} from '../src/cms-regions.js';
import {titleFor} from '../src/editor-title.js';
const origin='https://gongsa8282.xyz';
async function fixture(){
 const DB=sqliteDatabase();await migrate(DB);await seed(DB);const token=randomToken(),csrf=randomToken();
 await DB.prepare("INSERT INTO users(id,name,login_id,password_hash,role) VALUES(1,'간단 작성 시험','simple-test','not-a-password','ADMIN')").run();
 await DB.prepare('INSERT INTO sessions(token_hash,user_id,csrf,expires_at) VALUES(?,?,?,?)').bind(await digest(token),1,csrf,Date.now()+600000).run();
 const call=(path,form)=>worker.fetch(new Request(origin+path,{method:form?'POST':'GET',headers:{cookie:'ls_session='+token,...(form?{origin,'content-type':'application/x-www-form-urlencoded'}:{})},body:form?new URLSearchParams({csrf,...form}):undefined}),{DB});
 const row=id=>DB.prepare('SELECT * FROM posts WHERE id=?').bind(id).first();return {DB,call,row};
}
test('every original dong remains in exactly one local group; only numbered dong suffixes merge',()=>{
 let count=0;
 for(const [district,items] of Object.entries(regionData.dongs)){
  const groups=townshipGroups(district),codes=groups.flatMap(item=>item.members);assert.deepEqual([...codes].sort(),items.map(item=>item.code).sort());count+=codes.length;
  assert.equal(groups.length,new Set(groups.map(item=>item.name)).size);assert.ok(groups.every(item=>!/(?:제)?\d+(?:[·.,ㆍ]\d+)*동$/.test(item.name)));
  for(const item of items.filter(item=>/[읍면]$/.test(item.name)))assert.ok(groups.some(group=>group.name===item.name&&group.code===item.code));
 }
 assert.equal(count,3559);assert.equal(townshipName('응암2동'),'응암동');assert.equal(townshipName('상계3.4동'),'상계동');assert.equal(townshipName('가평읍'),'가평읍');assert.equal(townshipName('북면'),'북면');
});
test('group storage has no fabricated official code and grouped search includes each original member',async()=>{
 const f=await fixture();try{
  const groupId=await registerRegion(f.DB,new URLSearchParams({province:'11',district:'11380',dong:'11380:응암동'}));
  const group=await f.DB.prepare('SELECT * FROM regions WHERE id=?').bind(groupId).first();assert.equal(group.admin_code,null);assert.equal(group.group_key,'11380:응암동');
  const id1=await registerRegion(f.DB,new URLSearchParams({province:'11',district:'11380',dong:'11380580'}));
  const id2=await registerRegion(f.DB,new URLSearchParams({province:'11',district:'11380',dong:'11380590'}));
  await f.DB.prepare('UPDATE posts SET region_id=? WHERE id=101').bind(id1).run();await f.DB.prepare('UPDATE posts SET region_id=? WHERE id=102').bind(id2).run();
  const html=await(await f.call('/?province=11&district=11380&dong='+encodeURIComponent('11380:응암동'))).text();assert.match(html,/href="\/post\/101\/"/);assert.match(html,/href="\/post\/102\/"/);assert.doesNotMatch(html,/>응암[123]동<\/option>/);
  assert.equal((await f.DB.prepare('SELECT admin_code FROM regions WHERE id=?').bind(id1).first()).admin_code,'11380580');
 }finally{f.DB.close();}
});
test('simple editor derives service/title/summary without visible management fields and preserves publication contracts',async()=>{
 const f=await fixture();try{
  const html=await(await f.call('/admin/posts/new/')).text();assert.doesNotMatch(html,/<(?:select|input)[^>]+name="(?:contract_id|service_id|post_type|summary)"/);assert.match(html,/name="search_region"/);assert.match(html,/name="search_keyword"/);
  const result=await f.call('/admin/posts/new/',{simple_editor:1,company_id:2,region_mode:'catalog',province:'11',district:'11380',dong:'11380:응암동',search_region:'응암동',search_keyword:'조명 교체',title:'이전 잘못된 제목',content:'거실 조명의 상태를 살펴보기 위한 안내입니다. 조명의 모델과 증상을 확인하고, 전원 연결은 전문가에게 점검을 맡기는 과정을 설명합니다. 실제 시공 결과나 가격은 상담 후 확인할 수 있습니다.'});assert.equal(result.status,303,await result.clone().text());
  const id=Number(result.headers.get('location').split('/')[3]),saved=await f.row(id);assert.equal(saved.service_id,2);assert.equal(saved.post_type,'서비스안내');assert.equal(saved.title,titleFor('응암동','조명 교체'));assert.ok(saved.summary.length>=10);assert.equal(saved.contract_id,null);
  await f.DB.prepare("INSERT INTO contracts(id,company_id,package_name,contract_quantity,published_quantity,status) VALUES(90,2,'기존 계약',1,0,'ACTIVE')").run();
  await f.DB.prepare('UPDATE posts SET contract_id=90 WHERE id=?').bind(id).run();
  for(const action of ['submit','approve','publish'])assert.equal((await f.call('/admin/posts/'+id+'/status/',{action,version:(await f.row(id)).version})).status,303);
  await f.DB.prepare("UPDATE contracts SET status='CLOSED' WHERE id=90").run();
  // Existing published post keeps its first company/contract through the normal withdrawal flow.
  const old=await f.row(id);await f.call('/admin/posts/'+id+'/status/',{action:'withdraw',version:old.version});const draft=await f.row(id);
  const response=await f.call('/admin/posts/'+id+'/',{simple_editor:1,company_id:2,region_id:draft.region_id,region_mode:'keep',search_region:'응암동',search_keyword:'조명 교체',title:draft.title,content:JSON.parse(draft.content).join('\n\n'),version:draft.version});assert.equal(response.status,303,await response.clone().text());assert.equal((await f.row(id)).contract_id,90);
 }finally{f.DB.close();}
});
