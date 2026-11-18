import {test} from 'node:test';
import assert from 'node:assert/strict';
import {formatTitleRegion,titleRegionForCode} from '../src/title-region.js';
import {regionData} from '../src/regions-data.js';
import {targetRegionMatches,assembleDraft} from '../src/draft-assistant.js';
import {titleFor} from '../src/editor-title.js';
import {pageWritingInput,validatePageWriting} from '../src/page-writer.js';
import {repeatedPageCopy,repeatedParagraphs,relatedCandidates} from '../src/page-copy.js';
import {postArticle} from '../src/post-article.js';
import {windowCopy} from './page-copy-fixture.js';
test('qualified title regions follow the supplied national examples, with 서울시 as confirmed',()=>{
 const cases=[['전남광주통합특별시','여수시','광림동','여수시 광림동'],['서울특별시','종로구','사직동','서울시 종로구 사직동'],['세종특별자치시','세종시','연기면','세종시 연기면'],['경기도','평택시','통복동','평택시 통복동'],['경기도','용인시 처인구','마평동','용인시 처인구 마평동'],['서울특별시','서대문구','천연동','서울시 서대문구 천연동'],['강원특별자치도','속초시','청학동','강원 속초시 청학동'],['경상남도','거제시','상동동','거제시 상동동'],['경상남도','의령군','가례면','경남 의령군 가례면'],['경상남도','창원시 의창구','내리동','창원시 의창구 내리동'],['경상남도','함안군','군북면','경남 함안군 군북면'],['경상북도','경주시','신평동','경주시 신평동'],['전남광주통합특별시','광산구','운남동','광주 광산구 운남동'],['대구광역시','동구','진인동','대구 동구 진인동'],['대전광역시','대덕구','삼정동','대전 대덕구 삼정동'],['부산광역시','북구','금곡동','부산 북구 금곡동'],['세종특별자치시','세종시','가람동','세종시 가람동'],['울산광역시','북구','화봉동','울산 북구 화봉동'],['전남광주통합특별시','강진군','마량면','전남 강진군 마량면'],['전남광주통합특별시','나주시','과원동','나주시 과원동'],['전남광주통합특별시','목포시','동명동','목포시 동명동'],['전남광주통합특별시','영암군','삼호읍','전남 영암군 삼호읍'],['제주특별자치도','서귀포시','천지동','제주 서귀포시 천지동'],['충청남도','금산군','복수면','충남 금산군 복수면'],['충청남도','공주시','주미동','공주시 주미동'],['충청북도','제천시','자작동','제천시 자작동'],['충청북도','옥천군','군북면','충북 옥천군 군북면']];
 for(const [p,d,t,expected] of cases)assert.equal(formatTitleRegion(p,d,t),expected);
});
test('the paragraph check detects recycled card text after removing different target labels, while preserving verified citations',()=>{
 const shared='배관이 벽 안쪽으로 이어지는 사진을 기준으로 노출된 연결부와 보이지 않는 구간을 구분합니다. 물이 보이는 지점은 기록하되 배관을 직접 분리하지 않고 현장에서 확인할 범위를 상담합니다.';
 const candidate={search_region:'서울시 종로구 사직동',search_keyword:'보일러누수',content:['서울시 종로구 사직동 보일러누수 '+shared]},prior={search_region:'여수시 광림동',search_keyword:'옥상누수',content:['여수시 광림동 옥상누수 '+shared]};assert.equal(repeatedParagraphs(candidate,[prior]),1);
 assert.equal(repeatedParagraphs(candidate,[prior],candidate.content),0);
});

test('short generic section headings cannot slip through the per-page copy comparison',()=>{
 const copy={...windowCopy,services_heading:'주요 점검 항목',closing_heading:'다음 단계 결정'};
 const prior={search_region:'여수시 광림동',search_keyword:'강화유리',page_copy:JSON.stringify(copy)};
 const repeated=repeatedPageCopy(copy,[prior],'서울시 종로구 사직동','방충망 교체');
 assert.ok(repeated.includes('services_heading'));assert.ok(repeated.includes('closing_heading'));
});

test('recycled labels are grounded in actual detail topics without hiding repeated substantive text',()=>{
 const post={search_region:'서울시 종로구 사직동',search_keyword:'방충망 교체'},prior={search_region:'여수시 광림동',search_keyword:'유리 교체',page_copy:JSON.stringify(windowCopy)};
 const text='프레임 안쪽의 망과 모서리를 함께 볼 수 있는 사진입니다. 사진에 보이는 부분과 보이지 않는 뒷면을 구분해서 상담할 정보를 준비해 주세요.';
 const written={copy:windowCopy,overview:text,preparation:text,details:['망 가장자리','손잡이 방향','모서리 연결부'].map(title=>({title,text})),faq:['창문 바깥쪽도 필요한가요?','모서리 사진은 어떻게 찍나요?','손잡이가 가려져 있어도 되나요?'].map(question=>({question,answer:text}))};
 const draft=assembleDraft({page:written,photos:[{id:1,description:text}]},post,{}, {},[{id:1}],[prior]),copy=JSON.parse(draft.page_copy);
 assert.ok(copy.services_heading.includes('망 가장자리'));assert.ok(copy.services_heading.includes('손잡이 방향'));
 assert.ok(!repeatedPageCopy(copy,[prior],post.search_region,post.search_keyword).includes('services_heading'));
 assert.ok(repeatedPageCopy(copy,[prior],post.search_region,post.search_keyword).includes('closing'));
 assert.ok(repeatedParagraphs({...post,...draft},[{...post,...draft}])>0);
});
test('all national catalogue title labels validate against their own branch and wrong places do not',()=>{
 let checked=0;for(const district of regionData.districts)for(const dong of regionData.dongs[district.code]||[]){const label=titleRegionForCode(dong.code);assert.ok(targetRegionMatches(label,{name:dong.name,admin_code:dong.code},{}),label);checked++;}assert.equal(checked,3559);
 assert.equal(targetRegionMatches('서울시 종로구 사직동',{name:'응암동',admin_code:'11380510'},{}),false);
 assert.equal(titleRegionForCode('11380:응암동'),'서울시 은평구 응암동');
});
test('title waits for photo-specific copy, adds its automatic related keyword and does not recycle the old ending',()=>{
 assert.ok(relatedCandidates('강화유리',{description:'강화유리 식탁유리 힌지교체 방충망 상가유리'}).includes('상가유리'));assert.ok(!relatedCandidates('보일러누수',{description:'누수탐지 옥상누수 전기설치'}).includes('전기설치'));
 assert.equal(titleFor('거제시 상동동','강화유리'),'거제시 상동동 강화유리');
 assert.equal(titleFor('거제시 상동동','강화유리','상가유리','문틀과 유리 규격을 확인하는 시공 상담'),'거제시 상동동 강화유리 상가유리 · 문틀과 유리 규격을 확인하는 시공 상담');
 const draft=assembleDraft({page:{copy:windowCopy,overview:'흰색 창틀에 끼워진 망과 손잡이 주변을 살펴봅니다. 망이 보이는 부분과 프레임의 개폐 상태는 따로 확인할 항목이며 사진만으로 치수와 재질을 확정하지 않습니다.',preparation:'손잡이를 움직일 때 어느 방향에서 걸리는지 정리해 주세요. 창문 외부가 보이지 않는 사진에서는 외부 접근 조건을 추정하지 않고 방문 전에 추가 확인할 사항으로 남겨 둡니다.',details:['망이 보이는 테두리','손잡이와 여는 방향','프레임 주변 접근 공간'].map(title=>({title,text:'흰색 창틀의 전체 모습과 모서리가 보이는 사진을 기준으로 확인할 부분을 구분합니다. 망의 상태와 손잡이 주변에서 관찰한 점을 전달하고 실제 치수는 안전하게 확인 가능한 범위에서 상담합니다.'})),faq:['손잡이가 어느 방향으로 움직이나요?','프레임 바깥쪽도 보여드려야 하나요?','망과 유리 사진은 어떻게 구분하나요?'].map(question=>({question,answer:'사진에서 구분되는 창틀과 망의 위치를 먼저 설명하고, 보이지 않는 바깥쪽이나 위험한 위치는 직접 분리하지 말고 추가 점검할 조건으로 업체에 전달해 주세요.'}))},photos:[{id:1,description:'흰색 프레임과 망이 연결된 창문이 보입니다.',advice:'손잡이와 테두리의 위치를 구분해 주세요.'}]},{search_region:'김포시 사우동',search_keyword:'방충망 교체'},{},{admin_code:'41570540'},[{id:1}]);
 const post={id:1,search_region:'김포시 사우동',search_keyword:'방충망 교체',...draft},html=postArticle(post,[],{});assert.ok(draft.title.includes('창틀 점검'));assert.doesNotMatch(html,/사진으로 먼저 만나|어떤 내용을 상담할까요|상담 내용을 정리하는 방법/);assert.equal((html.match(/망이 보이는 테두리/g)||[]).length,1);assert.ok(draft.content.some(text=>text.includes('gimpo.go.kr')));
 const prior={id:2,search_region:'서울시 은평구 응암동',search_keyword:'방충망 교체',related_keyword:'창틀 점검',page_copy:JSON.stringify(windowCopy),title:'기존 창문 글',content:[]};assert.ok(repeatedPageCopy(windowCopy,[prior],'김포시 사우동','방충망 교체').includes('title_suffix'));
 const input=pageWritingInput(post,{},{}, {photos:[]},[prior]);assert.match(input.messages[1].content,/previous_examples/);assert.match(input.messages[0].content,/random synonym rotation/);assert.throws(()=>validatePageWriting({overview:'a'.repeat(50),preparation:'b'.repeat(50),details:Array(3).fill({title:'abc',text:'c'.repeat(50)}),faq:Array(3).fill({question:'d'.repeat(10),answer:'e'.repeat(40)})},{requireCopy:true}),/자동 작성/);
});
