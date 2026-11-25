import {test} from 'node:test';
import assert from 'node:assert/strict';
import {titleVariety,diversifyTitleSuffix} from '../src/title-variety.js';
import {pageWritingInput} from '../src/page-writer.js';
test('different inspection/confirmation titles share one ending family; low-use forms are preferred across legacy and structured history',()=>{
 const history=[{id:1,title:'송도동 관 연결 확인 포인트'},{id:2,title:'원당동 · 밸브 점검 포인트',page_copy:'invalid'},{id:3,page_copy:JSON.stringify({title_suffix:'창틀 사진 점검 포인트'})}];
 const plan=titleVariety(history);assert.equal(plan.ending_usage.find(item=>item.ending==='포인트').count,3);assert.equal(plan.recent_endings.length,3);
 assert.equal(titleVariety([{id:4,title:'유리 · 직접 수정한 창틀 구조',page_copy:{title_suffix:'창틀 점검 포인트'}}]).ending_usage[0].ending,'구조');
 const result=diversifyTitleSuffix('흰 프레임 확인 포인트',['흰 프레임과 망의 연결'],history);assert.match(result,/흰 프레임과 망의 연결/);assert.doesNotMatch(result,/포인트$/);
 assert.equal(diversifyTitleSuffix('여는 방향에 따른 접근 공간',['흰 프레임'],history),'여는 방향에 따른 접근 공간');
 const payload=pageWritingInput({search_region:'김포시',search_keyword:'방충망'},{name:'업체',description:'방충망 교체'},{},{photos:[]},[],history),input=JSON.parse(payload.messages[1].content);
 assert.equal(input.title_variety.ending_usage.find(item=>item.ending==='포인트').count,3);assert.match(payload.messages[0].content,/끝 단어만 같은 표현/);assert.match(payload.messages[0].content,/확인된 작업 사실이 있을 때만/);
});
test('persistent model repetition is repaired with topic-based balanced endings and never mutates existing history',()=>{
 const prior=[{id:1,title:'관 위치 점검 포인트'}],snapshot=structuredClone(prior),generated=[];
 for(let i=0;i<30;i++){const title=diversifyTitleSuffix('관 위치 확인 포인트',['벽면 관과 연결부'],prior);assert.match(title,/벽면 관과 연결부|관 위치/);assert.ok(title.length<=55);assert.doesNotMatch(title,/시공 완료|누수 해결|성공|전문업체|케이스/);generated.push(title);prior.push({id:i+2,title:'송도동 · '+title,page_copy:{title_suffix:title}});}
 assert.deepEqual(prior[0],snapshot[0]);assert.ok(new Set(generated.slice(0,12)).size>=11);assert.ok(generated.filter(title=>/포인트$/.test(title)).length<=2);
 const plan=titleVariety(prior);for(const key of ['살펴보기','정리','구조','질문','기록','예시'])assert.ok(plan.ending_usage.some(item=>item.ending===key));
});
