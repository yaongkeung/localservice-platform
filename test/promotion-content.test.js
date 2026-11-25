import {test} from 'node:test';
import assert from 'node:assert/strict';
import {promotionGraphic,promotionFamily,has24HourConsultation} from '../src/promotion-graphic.js';
import {postContent} from '../src/post-content.js';
import {postArticle} from '../src/post-article.js';
import {pageWritingInput} from '../src/page-writer.js';
import {homePage,filterUrl} from '../src/home.js';
import {sampleDataset} from '../src/store.js';
import {localMedia} from '../scripts/local-media.mjs';

test('promotion uses the page phone and task-matched worker without making unsupported availability claims',()=>{
 const company={name:'등록 업체',phone:'01099999999',phone_verified:1,hours:'평일 09:00~18:00'},post={id:123,contact_phone:'07081632908'};
 const html=promotionGraphic(post,company,'인천 연수구 송도동','보일러누수');assert.match(html,/070-8163-2908/);assert.doesNotMatch(html,/010-9999-9999|24시 상담/);assert.match(html,/data-promotion-family="plumbing"/);assert.match(html,/service-workers-a.jpg/);
 assert.equal(has24HourConsultation('24시간'),true);assert.equal(has24HourConsultation('24시 상담 · 연중무휴'),true);
 for(const hours of ['', '연중무휴', '24시간 상담이 아닙니다', '24시 이전 예약', '평일 09:00~18:00'])assert.equal(has24HourConsultation(hours),false,hours);
 assert.match(promotionGraphic(post,{...company,hours:'24시간'},'송도동','보일러누수'),/24시 상담/);
 assert.doesNotMatch(promotionGraphic(post,{phone:'01099999999',phone_verified:0},'송도동','유리'),/010-9999-9999/);
 const escaped=promotionGraphic(post,{...company,name:'<script>bad</script>'},'"<script>bad</script>','유리');assert.doesNotMatch(escaped,/<script>/);assert.match(escaped,/&lt;script&gt;/);
});
test('worker families cover service-specific trades and both real image assets load',async()=>{
 const cases={'유리':'glass','에어컨설치':'aircon','전기':'electrical','용달':'moving','컴퓨터수리':'computer','청소':'cleaning','개인회생':'consultation','자동차유리복원':'automotive','자동차밧데리':'automotive','미니포크레인':'construction','간판':'signage','쇼파천갈이':'fabric','생수배달':'delivery','간병인':'care','열쇠':'locksmith','인쇄':'printing'};
 for(const [keyword,family]of Object.entries(cases))assert.equal(promotionFamily(keyword).name,family,keyword);
 for(const name of ['a','b']){const response=await localMedia.fetch(new Request('https://gongsa8282.xyz/media/service-workers-'+name+'.jpg'));assert.equal(response.status,200);assert.equal(response.headers.get('content-type'),'image/jpeg');const bytes=new Uint8Array(await response.arrayBuffer());assert.equal(bytes[0],255);assert.equal(bytes[1],216);}
});
test('photo descriptions are visible once while accessible alt and original data remain intact',()=>{
 const description='검은 창틀의 모서리와 손잡이 위치가 보입니다. 전체 개폐 방향은 추가 사진으로 확인합니다.',image={id:1,post_id:7,storage_key:'/media/example.jpg',alt_text:'이전 설명'},post={id:7,content:[description,'[사진:1]',description]},before=structuredClone({post,image});
 const html=postContent(post,[image]);assert.equal((html.match(/<p>/g)||[]).length,1);assert.doesNotMatch(html,/<figcaption>/);assert.ok(html.includes('alt="'+description+'"'));assert.deepEqual({post,image},before);
 assert.match(postContent({...post,content:[]},[image]),/<figcaption>이전 설명<\/figcaption>/);
 const sample=postContent(post,[{...image,sample:1}]);assert.match(sample,/AI 생성 샘플 이미지/);
});
test('article does not repeat its opening summary and puts the labelled promotion after the phone CTA',()=>{
 const summary='실내 벽면에 연결된 관의 위치와 주변 바닥 모습을 살펴보며 추가로 확인할 사진을 구분합니다.',post={id:7,title:'송도동 보일러누수',search_region:'인천 연수구 송도동',search_keyword:'보일러누수',summary,content:['## 관과 벽면 살펴보기',summary,'각 연결부의 위치를 구분해 전체 사진과 가까운 사진을 준비합니다.']},company={id:5,name:'공개 업체',phone:'07081632908',phone_verified:1,hours:'24시간'};
 const html=postArticle(post,[],company),visible=html.replace(/<[^>]+>/g,'');assert.equal(visible.split(summary).length-1,1);assert.ok(html.indexOf('class="consultation-call"')<html.indexOf('class="promotion-image"'));assert.equal((html.match(/data-promotion-family/g)||[]).length,1);assert.match(html,/AI 제작 홍보 이미지/);assert.doesNotMatch(postArticle(post,[],company,false,{feed:true}),/promotion-image|<svg/);
});
test('compact rows omit service-kind and provider metadata while preserving full subject links and dates',()=>{
 const html=homePage(new URLSearchParams(),sampleDataset().published,sampleDataset()),board=html.match(/<div class="post-board">[\s\S]*?<\/table><\/div>/)[0];assert.doesNotMatch(board,/post-kind|board-category|\/company\/|\/region\//);assert.match(board,/class="post-date"/);assert.match(board,/width="40" height="40"/);assert.match(board,/11\.10/);
});
test('writing receives previous substantive excerpts, not only recycled headings',()=>{
 const input=pageWritingInput({search_region:'김포시 사우동',search_keyword:'방충망'},{},{},{photos:[{id:1,description:'프레임에 연결된 망이 보입니다.'}]},[{title:'이전 안내',content:['## 이전 소제목','기존 글에만 있는 창틀과 손잡이 상담 문단입니다.','[사진:1]']}]),data=JSON.parse(input.messages[1].content);
 assert.equal(data.previous_examples[0].excerpts[0],'기존 글에만 있는 창틀과 손잡이 상담 문단입니다.');assert.ok(input.messages[0].content.includes('분량을 늘리거나 다른 현장 경험을 꾸미지'));
});

test('large main boards show twenty rows per page and filters reset pagination',()=>{
 const data=sampleDataset(),posts=Array.from({length:44},(_,i)=>({...data.published[0],id:400+i,title:'시험 목록 '+i,published_at:'2026-11-17'})),render=params=>homePage(new URLSearchParams(params),posts,{...data,published:posts}).match(/<div class="post-board">[\s\S]*?<\/table><\/div>/)[0];
 const first=render(''),second=render('page=2');assert.equal((first.match(/class="post-date"/g)||[]).length,20);assert.match(first,/href="\/post\/443\/"/);assert.doesNotMatch(first,/href="\/post\/423\/"/);assert.match(second,/href="\/post\/423\/"/);assert.doesNotMatch(second,/href="\/post\/443\/"/);assert.equal((render('page=999').match(/class="post-date"/g)||[]).length,4);
 assert.equal(filterUrl(new URLSearchParams('page=3&kind=guide'),{service:'plumbing'}),'/?kind=guide&service=plumbing#cases');assert.match(homePage(new URLSearchParams('kind=guide&page=2'),posts,{...data,published:posts}),/kind=guide&amp;page=3#cases/);
});
