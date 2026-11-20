import {writingModel} from '../src/page-writer.js';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import worker from '../src/worker.js';
import {sqliteDatabase,migrate} from '../scripts/sqlite.mjs';
import {seed} from '../scripts/seed.mjs';
import {digest,randomToken} from '../src/auth.js';
import {assembleDraft,searchFields,visionInput,draftModel} from '../src/draft-assistant.js';
import {localContext} from '../src/local-context.js';
import {postContent} from '../src/post-content.js';
import {windowCopy} from './page-copy-fixture.js';
const origin='https://gongsa8282.xyz';
const page={copy:windowCopy,overview:'흰색 창틀 안에 보이는 망과 테두리를 중심으로 상담할 항목을 안내합니다. 창문을 여는 방향과 틀 주변의 공간을 함께 설명하면 망 교체와 개폐 부품 점검을 구분하는 데 도움이 됩니다. 사진에서 확인되지 않는 재질이나 치수는 업체와 별도로 확인해야 합니다.',preparation:'창 전체를 담은 사진과 테두리, 손잡이 부분을 가까이 찍은 사진을 함께 준비하세요. 망에 틈이 생기는 위치와 창문을 움직일 때 걸리는 방향을 알려주면 상담 내용을 정리하기 쉽습니다. 높거나 위험한 위치는 직접 분리하지 말고 업체에 확인을 요청하세요.',details:['틀과 망의 상태','개폐 방향과 주변 공간','측정과 방문 조건'].map(title=>({title,text:'사진에 보이는 흰색 프레임과 망의 연결 부분을 기준으로 상담 내용을 정리합니다. 틈이 보이는 위치와 사용 중 불편한 점을 설명하고, 망만 교체할지 틀이나 부품도 점검할지는 전체 모습과 현장 상태를 확인한 뒤 상담하세요.'})),faq:['틀은 어떤 사진으로 보여주면 좋나요?','망만 교체할 수 있는지 어떻게 확인하나요?','높은 곳의 창문은 어떻게 상담하나요?'].map(question=>({question,answer:'창문의 전체 모습과 테두리, 불편한 부위를 가까이 찍은 사진을 함께 보여주세요. 크기와 여는 방향, 사용 중 관찰한 점을 전달하고 현장에서 추가로 확인할 범위를 업체에 상담해 주세요.'}))};
const output={page,title_suffix:'창틀과 망 상태를 사진으로 살펴보기',summary:'사진에 보이는 창틀과 망의 상태를 살펴보고 상담 준비에 필요한 사항을 안내합니다.',intro:'사진 속 창문과 망을 살펴보며 **방충망 교체** 상담에 필요한 확인 사항을 정리합니다.',photos:[{id:1,description:'흰색 틀 안에 망이 보입니다. 사진만으로 재질과 손상 여부를 단정하기는 어렵습니다.',advice:'**창틀의 가로·세로 크기**와 열리는 방향을 확인해 상담할 때 알려주세요.'}],closing:'문의할 창문 전체 모습과 불편한 부분을 가까이 찍어 함께 전달해 주세요.'};
async function fixture(){
 const DB=sqliteDatabase();await migrate(DB);await seed(DB);
 const token=randomToken(),csrf=randomToken();
 await DB.prepare("INSERT INTO users(id,name,login_id,password_hash,role) VALUES(1,'작성 시험','draft-test','not-used','EDITOR')").run();
 await DB.prepare('INSERT INTO company_assignments(user_id,company_id) VALUES(1,1)').run();
 await DB.prepare('INSERT INTO sessions(token_hash,user_id,csrf,expires_at) VALUES(?,?,?,?)').bind(await digest(token),1,csrf,Date.now()+600000).run();
 let input;
 const AI={async run(model,payload){assert.ok([draftModel,writingModel].includes(model));input=payload;return {response:JSON.stringify(output)};}};
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
 assert.match(html,/<h2>업무 안내<\/h2>/);assert.match(html,/<strong>방충망 교체<\/strong>/);assert.ok(!html.includes('<script>'));assert.match(html,/&lt;script&gt;/);assert.match(html,/rel="noopener noreferrer ugc nofollow"/);assert.ok(!html.includes('href="javascript:'));assert.ok(!html.includes('href="https://user:'));
});
test('regional facts require an exact supported locality inside Gimpo and target inputs reject markup',()=>{
 assert.ok(localContext('사우동','41570540').length);assert.deepEqual(localContext('사우동','11110'),[]);assert.deepEqual(localContext('모르는동','41570'),[]);assert.throws(()=>searchFields(new URLSearchParams({search_region:'<img>',search_keyword:'유리'})));assert.throws(()=>searchFields(new URLSearchParams({search_region:'사우동'})));
 const draft=assembleDraft(output,{search_region:'사우동',search_keyword:'방충망 교체'},{name:'시험업체',area:'김포'}, {name:'사우동',admin_code:'41570540'},[{id:1}]);assert.ok(draft.title.startsWith('사우동 방충망 교체'));assert.ok(draft.content.includes('[사진:1]'));assert.ok(draft.content.some(t=>t.includes('gimpo.go.kr')));const neutral=assembleDraft({...output,page:{...page,overview:'응암동에서 강화유리 상담이 필요하신가요? 서비스 지역은 아니지만, 상담을 도와드리겠습니다. 건물의 용도와 작업할 위치를 함께 알려주세요.'}},{search_region:'응암동',search_keyword:'강화유리'},{},{},[{id:1}]);assert.doesNotMatch(neutral.summary,/서비스 지역은 아니/);assert.match(neutral.summary,/업체에 직접 확인/);assert.throws(()=>assembleDraft({...output,photos:[{...output.photos[0],id:99}]},{search_region:'사우동',search_keyword:'방충망 교체'},{},{},[{id:1}]));
});
test('photo generation uses private image bytes and saves a reviewable draft with an immutable prior copy',async()=>{
 const f=await fixture();try{
  f.env.AI.run=async(model,payload)=>{f.input=payload;if(Array.isArray(payload.messages[1].content))f.vision=payload;return {response:JSON.stringify({...output,photos:[{...output.photos[0],id:9001}]})};};
  const before=await f.row();const result=await f.generate();assert.equal(result.status,200,await result.clone().text());const after=await f.row();assert.ok(after.title.startsWith('사우동 방충망 교체'));assert.equal(after.generation_reviewed,0);assert.equal(after.version,before.version+1);assert.ok(f.vision.messages[1].content.some(p=>p.image_url?.url.startsWith('data:image/jpeg;base64,')));assert.ok(!JSON.stringify(f.input).includes('https://gongsa8282.xyz/uploads'));
  assert.equal(after.related_keyword,'창틀 점검');assert.equal(JSON.parse(after.page_copy).hero_heading,windowCopy.hero_heading);
  const history=await f.DB.prepare('SELECT * FROM draft_generations WHERE post_id=?').bind(f.id).first();assert.equal(history.state,'SAVED');assert.equal(JSON.parse(history.previous_content).content.join('\n\n'),JSON.parse(before.content).join('\n\n'));
  const page=await(await f.call(`/admin/posts/${f.id}/`)).text();assert.equal((page.match(/id="generated-post"/g)||[]).length,1);assert.match(page,/완성된 페이지 확인/);assert.match(page,/form="post-editor"/);assert.doesNotMatch(page,/사진으로 본문 작성/);
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


test('a second-stage writing failure preserves the previous draft and photos',async()=>{
 const f=await fixture();try{
  const before=await f.row();let calls=0;
  f.env.AI.run=async()=>{if(++calls===1)return {response:JSON.stringify({...output,photos:[{...output.photos[0],id:9001}]})};return {response:JSON.stringify({overview:'미완성',details:[],faq:[]})};};
  assert.equal((await f.generate()).status,409);assert.equal(calls,2);const after=await f.row();assert.equal(after.content,before.content);assert.equal(after.version,before.version);assert.equal((await f.DB.prepare('SELECT COUNT(*) n FROM post_images WHERE post_id=?').bind(f.id).first()).n,1);assert.equal((await f.DB.prepare('SELECT state FROM draft_generations WHERE post_id=?').bind(f.id).first()).state,'FAILED');
 }finally{f.DB.close();}
});

test('a public title from another company informs ending diversity without extra inference or changing prior posts',async()=>{
 const f=await fixture();try{
  await f.DB.prepare('UPDATE companies SET sample=0 WHERE id=3').run();
  await f.DB.prepare("UPDATE posts SET sample=0,title='수원시 · 흰 틀 상담 전 살펴보기' WHERE id=103").run();
  const before=await f.DB.prepare('SELECT * FROM posts WHERE id=103').first();let calls=0,input;
  f.env.AI.run=async(model,payload)=>{calls++;if(model===writingModel)input=JSON.parse(payload.messages[1].content);return {response:JSON.stringify({...output,photos:[{...output.photos[0],id:9001}]})};};
  const result=await f.generate();assert.equal(result.status,200,await result.clone().text());assert.equal(calls,2);
  assert.ok(input.title_variety.recent_endings.includes('흰 틀 상담 전 살펴보기'));const after=await f.row();assert.match(after.title,/사우동 방충망 교체/);assert.doesNotMatch(after.title,/살펴보기$/);assert.match(after.title,/틀과 망의 상태/);assert.equal(JSON.parse(after.page_copy).title_suffix,after.title.split(' · ').at(-1));
  assert.deepEqual(await f.DB.prepare('SELECT * FROM posts WHERE id=103').first(),before);
 }finally{f.DB.close();}
});

test('repeated headings and closing copy from an earlier page cannot overwrite the saved draft',async()=>{
 const f=await fixture();try{
  await f.DB.prepare('UPDATE posts SET page_copy=?,related_keyword=? WHERE id=101').bind(JSON.stringify(windowCopy),windowCopy.related_keyword).run();
  f.env.AI.run=async()=>({response:JSON.stringify({...output,photos:[{...output.photos[0],id:9001}]})});const before=await f.row(),response=await f.generate();assert.equal(response.status,409);assert.match(await response.text(),/반복/);const after=await f.row();assert.equal(after.content,before.content);assert.equal(after.title,before.title);assert.equal(after.page_copy,before.page_copy);
 }finally{f.DB.close();}
});

test('substantially recycled generated body is rejected before saving even without a prior page-copy record',async()=>{
 const f=await fixture();try{
  const before=await f.row(),company=await f.DB.prepare('SELECT * FROM companies WHERE id=?').bind(before.company_id).first(),region=await f.DB.prepare('SELECT * FROM regions WHERE id=?').bind(before.region_id).first(),photos=[{...output.photos[0],id:9001}];
  const candidate=assembleDraft({...output,photos},before,company,region,[{id:9001}]);
  await f.DB.prepare("UPDATE posts SET content=?,search_region=?,search_keyword=?,page_copy='{}' WHERE id=101").bind(JSON.stringify(candidate.content),before.search_region,before.search_keyword).run();
  f.env.AI.run=async()=>({response:JSON.stringify({...output,photos})});
  const result=await f.generate();assert.equal(result.status,409);assert.match(await result.text(),/매우 비슷/);
  const after=await f.row();assert.equal(after.content,before.content);assert.equal(after.version,before.version);assert.equal(after.title,before.title);assert.equal((await f.DB.prepare('SELECT state FROM draft_generations WHERE post_id=?').bind(f.id).first()).state,'FAILED');
 }finally{f.DB.close();}
});
