import {test} from 'node:test';
import assert from 'node:assert/strict';
import worker from '../src/worker.js';
import {sqliteDatabase,migrate} from '../scripts/sqlite.mjs';
import {seed} from '../scripts/seed.mjs';
import {digest,randomToken} from '../src/auth.js';
import {assembleDraft,searchFields,visionInput,draftModel} from '../src/draft-assistant.js';
import {localContext} from '../src/local-context.js';
import {postContent} from '../src/post-content.js';
const origin='https://gongsa8282.xyz';
const output={title_suffix:'창틀과 망 상태를 사진으로 살펴보기',summary:'사진에 보이는 창틀과 망의 상태를 살펴보고 상담 준비에 필요한 사항을 안내합니다.',intro:'사진 속 창문과 망을 살펴보며 **방충망 교체** 상담에 필요한 확인 사항을 정리합니다.',photos:[{id:1,description:'흰색 틀 안에 망이 보입니다. 사진만으로 재질과 손상 여부를 단정하기는 어렵습니다.',advice:'**창틀의 가로·세로 크기**와 열리는 방향을 확인해 상담할 때 알려주세요.'}],closing:'문의할 창문 전체 모습과 불편한 부분을 가까이 찍어 함께 전달해 주세요.'};
async function fixture(){
 const DB=sqliteDatabase();await migrate(DB);await seed(DB);
 const token=randomToken(),csrf=randomToken();
 await DB.prepare("INSERT INTO users(id,name,login_id,password_hash,role) VALUES(1,'작성 시험','draft-test','not-used','EDITOR')").run();
 await DB.prepare('INSERT INTO company_assignments(user_id,company_id) VALUES(1,1)').run();
 await DB.prepare('INSERT INTO sessions(token_hash,user_id,csrf,expires_at) VALUES(?,?,?,?)').bind(await digest(token),1,csrf,Date.now()+600000).run();
 let input;
 const AI={async run(model,payload){assert.equal(model,draftModel);input=payload;return {response:JSON.stringify(output)};}};
 const PHOTOS={async get(){const bytes=new Uint8Array([255,216,255,217]);return {size:bytes.length,arrayBuffer:async()=>bytes.buffer};}};
 const env={DB,AI,PHOTOS};
 const call=(path,form,extra={})=>worker.fetch(new Request(origin+path,{method:form?'POST':'GET',headers:{cookie:'ls_session='+token,...(form?{origin,'content-type':'application/x-www-form-urlencoded'}:{}),...extra},body:form?new URLSearchParams({csrf,...form}):undefined}),env);
 const start=await call('/admin/posts/new/',{action:'prepare',company_id:1,service_id:1,region_mode:'catalog',province:'41',district:'41570',dong:'41570540',post_type:'서비스안내',search_region:'사우동',search_keyword:'방충망 교체'});assert.equal(start.status,303,await start.clone().text());
 const id=Number(start.headers.get('location').split('/')[3]);
 // Use a separate test ID; seed images retain their original IDs.
 await DB.prepare('INSERT INTO post_images(id,post_id,storage_key,thumbnail_key,alt_text,sort_order) VALUES(9001,?,?,?,?,0)').bind(id,'/uploads/'+id+'/'+ 'a'.repeat(64)+'-cover.jpg','/uploads/'+id+'/'+ 'a'.repeat(64)+'-thumb.jpg','업체 제공 사진').run();
 const row=()=>DB.prepare('SELECT * FROM posts WHERE id=?').bind(id).first();
 const generate=async()=>call(`/admin/posts/${id}/generate/`,{version:(await row()).version},{'x-draft-generation':'1'});
 return {DB,call,env,id,row,generate,getInput:()=>input,csrf};
}
test('safe bold/headings and source links preserve photo order and never permit HTML or script links',()=>{
 const html=postContent({id:1,content:['## 업무 안내','**방충망 교체** <script>alert(1)</script>','[출처](https://gimpo.go.kr/?a=1&b=2)','[실행](javascript:alert(1))','[위장](https://user:pass@example.com/)']});
 assert.match(html,/<h2>업무 안내<\/h2>/);assert.match(html,/<strong>방충망 교체<\/strong>/);assert.ok(!html.includes('<script>'));assert.match(html,/&lt;script&gt;/);assert.match(html,/rel="noopener noreferrer"/);assert.ok(!html.includes('href="javascript:'));assert.ok(!html.includes('href="https://user:'));
});
test('regional facts require an exact supported locality inside Gimpo and target inputs reject markup',()=>{
 assert.ok(localContext('사우동','41570540').length);assert.deepEqual(localContext('사우동','11110'),[]);assert.deepEqual(localContext('모르는동','41570'),[]);assert.throws(()=>searchFields(new URLSearchParams({search_region:'<img>',search_keyword:'유리'})));assert.throws(()=>searchFields(new URLSearchParams({search_region:'사우동'})));
 const draft=assembleDraft(output,{search_region:'사우동',search_keyword:'방충망 교체'},{name:'시험업체',area:'김포'}, {name:'사우동',admin_code:'41570540'},[{id:1}]);assert.ok(draft.title.startsWith('사우동 방충망 교체'));assert.ok(draft.content.includes('[사진:1]'));assert.ok(draft.content.some(t=>t.includes('gimpo.go.kr')));assert.throws(()=>assembleDraft({...output,photos:[{...output.photos[0],id:99}]},{search_region:'사우동',search_keyword:'방충망 교체'},{},{},[{id:1}]));
});
test('photo generation uses private image bytes and saves a reviewable draft with an immutable prior copy',async()=>{
 const f=await fixture();try{
  f.env.AI.run=async(model,payload)=>{f.input=payload;return {response:JSON.stringify({...output,photos:[{...output.photos[0],id:9001}]})};};
  const before=await f.row();const result=await f.generate();assert.equal(result.status,200,await result.clone().text());const after=await f.row();assert.ok(after.title.startsWith('사우동 방충망 교체'));assert.equal(after.generation_reviewed,0);assert.equal(after.version,before.version+1);assert.ok(f.input.messages[1].content.some(p=>p.image_url?.url.startsWith('data:image/jpeg;base64,')));assert.ok(!JSON.stringify(f.input).includes('https://gongsa8282.xyz/uploads'));
  const history=await f.DB.prepare('SELECT * FROM draft_generations WHERE post_id=?').bind(f.id).first();assert.equal(history.state,'SAVED');assert.equal(JSON.parse(history.previous_content).content.join('\n\n'),JSON.parse(before.content).join('\n\n'));
  assert.equal((await f.call(`/admin/posts/${f.id}/status/`,{version:after.version,action:'submit'})).status,409);
  assert.throws(()=>f.DB.raw.exec(`UPDATE posts SET status='REVIEW' WHERE id=${f.id}`));
  const save=await f.call(`/admin/posts/${f.id}/`,{...after,content:JSON.parse(after.content).join('\n\n'),generation_reviewed:1});assert.equal(save.status,303);assert.equal((await f.row()).generation_reviewed,1);
  assert.equal((await f.call(`/admin/posts/${f.id}/status/`,{version:(await f.row()).version,action:'submit'})).status,303);
 }finally{f.DB.close();}
});
test('AI failures, revoked access and stale versions cannot overwrite saved content; daily retry caps apply',async()=>{
 const f=await fixture();try{
  const before=await f.row();f.env.AI.run=async()=>{throw Error('provider details must stay private');};const failure=await f.generate();assert.equal(failure.status,409);assert.ok(!(await failure.text()).includes('provider details'));assert.equal((await f.row()).content,before.content);
  f.env.AI.run=async()=>{await f.DB.prepare('UPDATE posts SET version=version+1 WHERE id=?').bind(f.id).run();return {response:JSON.stringify({...output,photos:[{...output.photos[0],id:9001}]})};};assert.equal((await f.generate()).status,409);assert.equal((await f.row()).content,before.content);
  f.env.AI.run=async()=>{await f.DB.prepare('DELETE FROM company_assignments WHERE user_id=1').run();return {response:JSON.stringify({...output,photos:[{...output.photos[0],id:9001}]})};};assert.equal((await f.generate()).status,409);assert.equal((await f.row()).content,before.content);
  await f.DB.prepare('INSERT INTO company_assignments(user_id,company_id) VALUES(1,1)').run();const cap=await f.generate();assert.equal(cap.status,409);assert.match(await cap.text(),/한도/);
 }finally{f.DB.close();}
});
test('generation rejects CSRF, published posts and missing AI without exposing photos or changing the draft',async()=>{
 const f=await fixture();try{
  const bad=await f.call(`/admin/posts/${f.id}/generate/`,{csrf:'invalid',version:1});assert.equal(bad.status,403);
  delete f.env.AI;assert.equal((await f.generate()).status,503);assert.equal((await f.DB.prepare('SELECT COUNT(*) AS n FROM draft_generations').first()).n,0);
  await f.DB.prepare("UPDATE posts SET generation_reviewed=1,status='REVIEW',last_actor_id=1 WHERE id=?").bind(f.id).run();assert.equal((await f.generate()).status,409);
 }finally{f.DB.close();}
});
