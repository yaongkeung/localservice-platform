import {test} from 'node:test';
import assert from 'node:assert/strict';
import {runInNewContext} from 'node:vm';
import worker from '../src/worker.js';
import {cleanEditorialText,cleanEditorialFields,hasEditorialArtifacts,cleanPhotoAdvice} from '../src/editorial-text.js';
import {validatePageWriting,pageWritingInput} from '../src/page-writer.js';
import {titleFor} from '../src/editor-title.js';
import {primaryWorkKeyword} from '../src/work-keyword.js';
import {publicStylePath} from '../src/public-style.js';
import {postArticle} from '../src/post-article.js';
import {sqliteDatabase,migrate} from '../scripts/sqlite.mjs';
import {seed} from '../scripts/seed.mjs';
import {digest,randomToken} from '../src/auth.js';
import {publicDataset} from '../src/store.js';
import {windowCopy} from './page-copy-fixture.js';
const origin='https://gongsa8282.xyz',paragraph='흰색 프레임과 손잡이의 연결 부분을 보여주는 사진입니다. 실제 치수와 재질은 사진만으로 확정하지 않고 창이 있는 위치와 열리는 방향을 업체와 구분해 상담합니다.';
test('copied photo-advice instructions are omitted without altering genuine preparation or measurements',()=>{
 assert.equal(cleanPhotoAdvice('유리문의 설치 위치와 관련된 구체적인 정보나 확인 항목을 안내하는 문장 1~2개'),'');
 assert.equal(cleanPhotoAdvice('손잡이와 경첩 사진을 1~2개 함께 준비해 주세요.'),'손잡이와 경첩 사진을 1~2개 함께 준비해 주세요.');
});
test('generation scaffolding is removed throughout copy while work measurements and contact details survive',()=>{
 const raw={overview:paragraph+' (70~120자)\u200b',preparation:paragraph,details:['망 가장자리','손잡이 방향','모서리 연결부'].map(title=>({title,text:paragraph+' (70-120자)'})),faq:['창문 바깥쪽도 필요한가요?','모서리 사진은 어떻게 찍나요?','손잡이가 가려져 있어도 되나요?'].map(question=>({question,answer:paragraph+' (55~100자)'})),copy:{...windowCopy,closing:windowCopy.closing+' (60~100자)',steps:windowCopy.steps.map(step=>({...step,text:step.text+' (35~65자)'}))}};
 const value=validatePageWriting(raw,{requireCopy:true});assert.equal(hasEditorialArtifacts(value),false);assert.equal(value.overview,paragraph);
 assert.equal(cleanEditorialText('유리 두께 (5~10mm), 비용 35,000원, 010-1234-5678, 11월 21일'), '유리 두께 (5~10mm), 비용 35,000원, 010-1234-5678, 11월 21일');
 assert.equal(hasEditorialArtifacts(raw),true);assert.equal(cleanEditorialFields({advice:'사진을 함께 준비해 주세요. (35~65자)\u200b'}).advice,'사진을 함께 준비해 주세요.');
});
test('classification can identify a primary service while titles preserve the entered keyword phrase',()=>{
 for(const keyword of ['방충망 교체','녹취 속기사무소','중고 사무용 가구','화장실 누수 탐지'])assert.equal(primaryWorkKeyword(keyword),keyword);
 assert.equal(primaryWorkKeyword('배관누수 화장실누수 확실하게 잡는업체'),'배관누수');
 const title=titleFor('서울시 은평구 불광동','강화유리 유리가게 유리집','강화도어','유리문 프레임 및 개폐 방식 점검 문의 전 알아둘 내용');
 assert.ok(title.startsWith('서울시 은평구 불광동 강화유리 유리가게 유리집 | 강화도어'));assert.ok(title.length<=56);
 assert.equal(titleFor('서울시 종로구 사직동','방충망 교체','방충망'),'서울시 종로구 사직동 방충망 교체');
});
test('public styling is cached separately and the serialized editor still executes the title helper',async()=>{
 const html=await(await worker.fetch(new Request(origin+'/'))).text();assert.ok(html.includes('href="'+publicStylePath+'"'));assert.doesNotMatch(html,/<style>/);assert.ok(Buffer.byteLength(html)<60000);
 const response=await worker.fetch(new Request(origin+publicStylePath));assert.equal(response.status,200);assert.match(response.headers.get('content-type'),/^text\/css/);assert.match(response.headers.get('cache-control'),/immutable/);assert.match(await response.text(),/consultation-hero/);
 const code=await(await worker.fetch(new Request(origin+'/assets/editor.js'))).text();const title={value:''},region={value:'서울시 은평구 불광동',addEventListener(){}},keyword={value:'강화유리 유리집',addEventListener(){}},form={querySelector:selector=>selector==='[name=search_region]'?region:selector==='[name=search_keyword]'?keyword:selector==='[name=title]'?title:null};
 runInNewContext(code,{document:{querySelectorAll:()=>[form]}},{timeout:1000});assert.equal(title.value,'서울시 은평구 불광동 강화유리 유리집');
 const generated='서울시 은평구 불광동 강화유리 | 강화도어 · 프레임과 여닫힘 상담';title.value=generated;runInNewContext(code,{document:{querySelectorAll:()=>[form]}},{timeout:1000});assert.equal(title.value,generated);
});
test('provided photos appear before service cards once, retaining text/photo order and phone promotion',()=>{
 const html=postArticle({id:1,search_region:'서울시 종로구 사직동',search_keyword:'강화유리 유리집',summary:paragraph,content:['## 사진에서 살펴볼 부분',paragraph,'[사진:2]','사진 다음에 남겨 둔 설명입니다.']},[{id:2,post_id:1,storage_key:'/uploads/1/photo.jpg',alt_text:'확인된 제공 사진'}],{id:1,name:'시험 업체',phone:'01012345678',phone_verified:1});
 assert.equal((html.match(/src="\/uploads\/1\/photo.jpg"/g)||[]).length,1);assert.ok(html.indexOf('class="post-photo"')<html.indexOf('id="service-details-1"'));assert.ok(html.indexOf('class="post-photo"')<html.indexOf('사진 다음에'));assert.ok(html.includes('AI 제작 홍보 이미지'));assert.ok(html.includes('tel:01012345678'));assert.match(html,/>강화유리 유리집</);
});
test('optional work notes round-trip privately and older edit requests preserve them',async()=>{
 const DB=sqliteDatabase();await migrate(DB);await seed(DB);try{
 const token=randomToken(),csrf=randomToken();await DB.prepare("INSERT INTO users(id,name,login_id,password_hash,role) VALUES(50,'시험','quality-test','not-a-password','ADMIN')").run();await DB.prepare('INSERT INTO sessions(token_hash,user_id,csrf,expires_at) VALUES(?,?,?,?)').bind(await digest(token),50,csrf,Date.now()+600000).run();
 const call=(path,form)=>worker.fetch(new Request(origin+path,{method:form?'POST':'GET',headers:{cookie:'ls_session='+token,...(form?{origin,'content-type':'application/x-www-form-urlencoded'}:{})},body:form?new URLSearchParams({csrf,...form}):undefined}),{DB});
 const values={company_id:1,region_id:2,service_id:1,post_type:'서비스안내',title:'메모 비공개 저장과 발행 연결 확인',summary:paragraph,content:paragraph,work_notes:'내부 메모 <script>지시문처럼 보여도 실행하지 않음</script>'};
 const created=await call('/admin/posts/new/',values);assert.equal(created.status,303,await created.clone().text());const id=Number(created.headers.get('location').split('/')[3]);
 let row=await DB.prepare('SELECT * FROM posts WHERE id=?').bind(id).first();assert.equal(row.work_notes,values.work_notes);
 const edit=await(await call('/admin/posts/'+id+'/')).text();assert.ok(edit.includes('name="work_notes"'));assert.ok(edit.includes('&lt;script&gt;지시문'));assert.ok(!edit.includes('<script>지시문'));
 const {work_notes,...older}=values;const saved=await call('/admin/posts/'+id+'/',{...older,version:row.version,confirm_publish:'1'});assert.equal(saved.status,303,await saved.clone().text());row=await DB.prepare('SELECT * FROM posts WHERE id=?').bind(id).first();assert.equal(row.work_notes,work_notes);assert.equal(row.status,'PUBLISHED');
 const dataset=await publicDataset(DB);assert.ok(!('work_notes' in dataset.published.find(post=>post.id===id)));const publicPath=await DB.prepare('SELECT path FROM post_urls WHERE post_id=?').bind(id).first();const html=await(await call(publicPath.path)).text();assert.ok(!html.includes(work_notes));
 const input=pageWritingInput({...row,search_keyword:'강화유리 유리집'}, {},{}, {photos:[]});const user=JSON.parse(input.messages[1].content);assert.equal(user.provided_work_notes,work_notes);assert.equal(user.requested_service,'강화유리 유리집');assert.equal(user.work_performed_verified,false);
 const withdrawn=await call('/admin/posts/'+id+'/status/',{action:'withdraw',version:row.version});assert.equal(withdrawn.status,303);const snapshot=await DB.prepare('SELECT snapshot FROM post_snapshots WHERE post_id=? ORDER BY id DESC LIMIT 1').bind(id).first();assert.equal(JSON.parse(snapshot.snapshot).work_notes,work_notes);
 }finally{DB.close();}
});
