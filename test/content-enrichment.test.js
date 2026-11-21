import {test} from 'node:test';
import assert from 'node:assert/strict';
import {assembleDraft} from '../src/draft-assistant.js';
import {postArticle} from '../src/post-article.js';
import {enrichExistingContent} from '../src/content-enrichment.js';
import {regionalSection} from '../src/local-context.js';
const company={id:4,name:'시험 유리 업체',phone:'01012345678',phone_verified:1,description:'창문과 출입문에 대해 상담하는 업체입니다.',area:'김포시',naver_place_url:'https://naver.me/Test1234',naver_place_name:'플레이스 등록명',naver_place_address:'등록된 주소',naver_place_hours:'영업 안내'};
const post={id:116,company_id:4,search_region:'응암동',search_keyword:'강화유리'},region={name:'응암동',group_key:'11380:응암동'};
const images=[{id:29,post_id:116,sort_order:0,storage_key:'/uploads/test.jpg',alt_text:'흰색 프레임 모습'}];
const raw={photos:[{id:29,description:'흰색 프레임 여러 개가 놓인 모습이 보입니다.',advice:'**틀과 고정부품**의 상태를 함께 알려주시면 상담에 도움이 됩니다.'}]};
test('rich drafts retain source-backed locality, service details, photo observations and FAQ without fabricated job facts',()=>{
 const result=assembleDraft(raw,post,company,region,images),body=result.content.join('\n\n');
 for(const text of ['응암동 지역 소개','은평문화원','epculture.or.kr','center.ep.go.kr','강화유리 상담에서 확인할 내용','설치 위치와 규격','[사진:29]','흰색 프레임 여러 개','자주 묻는 질문'])assert.ok(body.includes(text),text);
 assert.doesNotMatch(body,/응암동에서.*(?:시공을 완료|설치를 완료)|199\d년|최저가|상위 노출 보장/);assert.ok(body.length>1000);
 const fallback=regionalSection('가평읍','41820250','방충망').join(' ');assert.match(fallback,/가평읍/);assert.match(fallback,/상담/);assert.doesNotMatch(fallback,/매바위|백련산/);
});
test('one article renderer keeps the same verified Place card in public and management output without exposing admin links publicly',()=>{
 const saved={...post,content:assembleDraft(raw,post,company,region,images).content};
 for(const manage of [false,true]){const html=postArticle(saved,images,company,manage);assert.equal((html.match(/id="place-info"/g)||[]).length,1);assert.match(html,/https:\/\/naver.me\/Test1234/);assert.match(html,/플레이스 등록명/);assert.match(html,/등록된 주소/);assert.match(html,/010-1234-5678/);assert.ok(html.includes('흰색 프레임 여러 개'));if(!manage)assert.doesNotMatch(html,/href="\/admin\//);}
 assert.doesNotMatch(postArticle(saved,images,{...company,phone_verified:0}),/tel:/);
});
test('enriching an existing draft preserves authored/photo text and is idempotent',()=>{
 const original=['## 응암동 강화유리 안내','직접 남긴 현장 메모입니다.',raw.photos[0].description,'[사진:29]',raw.photos[0].advice,'## 상담 전에 알려주세요','별도로 작성한 안내입니다.'];
 const first=enrichExistingContent({...post,content:original},company,region),second=enrichExistingContent({...post,content:first},company,region);assert.deepEqual(second,first);
 for(const value of original)assert.ok(first.includes(value));assert.equal(first.filter(part=>part==='## 응암동 지역 소개').length,1);
});
