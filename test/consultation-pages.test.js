import {test} from 'node:test';
import assert from 'node:assert/strict';
import worker from '../src/worker.js';
import {sqliteDatabase,migrate} from '../scripts/sqlite.mjs';
import {seed} from '../scripts/seed.mjs';
import {digest,randomToken} from '../src/auth.js';
import {postArticle} from '../src/post-article.js';
import {similarContent} from '../src/content-similarity.js';
import {reviewValues} from '../src/customer-reviews.js';
import {validatePageWriting,pageWritingInput} from '../src/page-writer.js';
const origin='https://gongsa8282.xyz';
async function fixture(){
 const DB=sqliteDatabase();await migrate(DB);await seed(DB);const token=randomToken(),csrf=randomToken();
 await DB.prepare("INSERT INTO users(id,name,login_id,password_hash,role) VALUES(50,'상담 페이지 시험','landing-test','no-login','ADMIN')").run();
 await DB.prepare('INSERT INTO sessions(token_hash,user_id,csrf,expires_at) VALUES(?,?,?,?)').bind(await digest(token),50,csrf,Date.now()+600000).run();
 const call=(path,form)=>worker.fetch(new Request(origin+path,{method:form?'POST':'GET',headers:{cookie:'ls_session='+token,...(form?{origin,'content-type':'application/x-www-form-urlencoded'}:{})},body:form?new URLSearchParams({csrf,...form}):undefined}),{DB});
 return {DB,call};
}
const body='사진의 문틀은 넓은 창과 출입 공간을 나누고 있습니다. 안쪽에서 바라본 모습과 외부에서 확인한 모습을 함께 준비하면 상담할 대상을 구분하기 쉽습니다. 손잡이를 잡고 여닫을 때 어느 방향에서 걸리는지 설명하고 문 전체의 모서리도 함께 보여주세요. 유리의 투명한 모습만으로 종류나 두께를 확정할 수 없으므로 제품 표시가 있으면 전달합니다. 창 주변 공간은 자재를 반입할 수 있는지 확인하는 자료가 됩니다. 층수와 승강기 이용 여부, 출입구 폭도 상담에 도움이 됩니다. 파손된 부분은 직접 분리하거나 만지지 말고 현재 보이는 범위를 업체에 알려주세요. 필요 범위를 정하기 전에는 기존 틀을 그대로 사용할 수 있는지 확인하는 것이 좋습니다. 상가에서 상담한다면 영업 중 작업 가능 시간과 공용 공간 사용 조건도 함께 정리해 주세요. 교체와 부품 점검 중 어떤 항목이 필요한지 현장에서 추가 확인할 수 있습니다. 최종 견적에는 자재와 운반, 작업과 마감 중 포함되는 항목을 구분해 안내받으세요. 작업 후 확인할 부분과 사용 시 주의할 점은 합의한 범위에 맞춰 상담합니다.';
test('page phone is saved separately, survives edits and appears in a shared banner/preview without changing company phone',async()=>{
 const f=await fixture();try{
  const company=await f.DB.prepare('SELECT * FROM companies WHERE id=1').first();
  const values={company_id:1,region_id:1,service_id:1,post_type:'서비스안내',title:'페이지 연락처를 확인하는 독립 상담 안내',summary:'사진과 업무를 바탕으로 상담할 내용을 정리하는 안내입니다.',content:body,contact_phone:'010-1234-5678'};
  const response=await f.call('/admin/posts/new/',values);assert.equal(response.status,303);const path=response.headers.get('location'),id=Number(path.split('/')[3]),post=await f.DB.prepare('SELECT * FROM posts WHERE id=?').bind(id).first();assert.equal(post.contact_phone,'01012345678');
  const badReview=await f.call('/admin/companies/1/',{...company,phone:'',customer_reviews:'상담해 주셔서 도움이 됐습니다.',reviews_confirmed:''});assert.equal(badReview.status,409);assert.match(await badReview.text(),/후기/);
  const preview=await(await f.call(path+'preview/')).text();assert.match(preview,/class="contact-graphic"/);assert.match(preview,/010-1234-5678/);assert.match(preview,/href="tel:01012345678"/);assert.match(preview,/상담부터 진행까지/);assert.doesNotMatch(preview,/<h2>고객 후기<\/h2>|24시간|별점/);
  assert.equal((await f.call(path,{...values,version:post.version,contact_phone:'javascript:alert(1)'})).status,409);
  const edited={...values,version:post.version,title:'전화번호를 유지한 수정 상담 페이지'};delete edited.contact_phone;assert.equal((await f.call(path,edited)).status,303);assert.equal((await f.DB.prepare('SELECT contact_phone FROM posts WHERE id=?').bind(id).first()).contact_phone,'01012345678');assert.equal((await f.DB.prepare('SELECT phone FROM companies WHERE id=1').first()).phone,company.phone);
 }finally{f.DB.close();}
});
test('real optional reviews require confirmation and render safely without invented ratings; photos remain in authored order',()=>{
 const form=new URLSearchParams({customer_reviews:'상담 내용을 자세히 설명해 주셨습니다.\n\n일정을 미리 확인할 수 있어서 좋았습니다.',review_source_url:'https://naver.me/Example'});
 assert.throws(()=>reviewValues(form),/확인/);form.set('reviews_confirmed','1');const reviews=reviewValues(form);assert.equal(JSON.parse(reviews.customer_reviews).length,2);
 form.set('review_source_url','javascript:alert(1)');assert.throws(()=>reviewValues(form),/HTTPS/);
 const post={id:7,title:'창문 상담 안내',search_region:'사우동',search_keyword:'유리',content:['## 사진 안내','사진 앞 문장','[사진:1]','사진 뒤 문장','[사진:1]','[사진:2]']},images=[{id:1,post_id:7,storage_key:'/uploads/a.jpg',alt_text:'창문',sort_order:0},{id:2,post_id:7,storage_key:'/uploads/b.jpg',excluded:1,sort_order:1},{id:3,post_id:8,storage_key:'/uploads/secret.jpg'}];
 const html=postArticle(post,images,{id:1,name:'시험 업체',...reviews});assert.equal((html.match(/src="\/uploads\/a.jpg"/g)||[]).length,1);assert.doesNotMatch(html,/src="\/uploads\/(b|secret)/);assert.ok(html.indexOf('사진 앞 문장')<html.indexOf('<figure class="post-photo"'));assert.ok(html.indexOf('<figure class="post-photo"')<html.indexOf('사진 뒤 문장'));assert.match(html,/<h2>고객 후기<\/h2>/);assert.doesNotMatch(html,/5\.0|★★★★★/);
 assert.doesNotMatch(postArticle(post,images,{id:1,...reviews,reviews_confirmed:0}),/<h2>고객 후기<\/h2>/);
});
test('near-identical pages cannot enter review merely by changing region labels, including a catalogue of 300 pages',async()=>{
 const f=await fixture();try{
  const values={company_id:1,region_id:1,service_id:1,post_type:'서비스안내',title:'첫 번째 고유 상담 페이지입니다',summary:'현장 조건과 상담할 내용을 함께 정리한 서비스 안내입니다.',content:body};
  const one=await f.call('/admin/posts/new/',values),two=await f.call('/admin/posts/new/',{...values,title:'두 번째 고유 상담 페이지입니다',content:body+' 원하는 시간을 알려주세요.'});assert.equal(one.status,303);assert.equal(two.status,303);const id=Number(two.headers.get('location').split('/')[3]);
  const review=await f.call(`/admin/posts/${id}/status/`,{action:'submit',version:1});assert.equal(review.status,409);assert.match(await review.text(),/매우 비슷/);
  const source={id:999,company_id:1,search_region:'사우동',search_keyword:'유리',content:[body+' 사우동 유리 상담']},other={id:1,company_id:1,search_region:'응암동',search_keyword:'창호',content:[body+' 응암동 창호 상담']};
  const pages=Array.from({length:300},(_,i)=>({...other,id:i+1}));assert.equal(similarContent(source,pages).length,300);assert.deepEqual(similarContent(source,[{...other,company_id:2}]),[]);
 }finally{f.DB.close();}
});
test('page-specific writing requires substantive structured guidance and retains photo evidence as data',()=>{
 const input=pageWritingInput({search_region:'사우동',search_keyword:'유리'},{name:'시험 업체',area:'김포'},{admin_code:'41570540'},{photos:[{id:3,description:'검은 창틀과 유리가 보입니다.',advice:'개폐 방향을 알려주세요.'}]});assert.match(input.messages[1].content,/검은 창틀/);assert.match(input.messages[1].content,/김포/);assert.throws(()=>validatePageWriting({overview:'단문',details:[],faq:[]}),/자동 작성/);
});
