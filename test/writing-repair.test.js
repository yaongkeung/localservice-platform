import {test} from 'node:test';import assert from 'node:assert/strict';
import {repeatedParagraphs,repeatedPublishedCopy} from '../src/page-copy.js';import {similarContent} from '../src/content-similarity.js';import {applyWritingRepair} from '../src/writing-repair.js';import {windowCopy} from './page-copy-fixture.js';
test('reused factual captions do not count as recycled editorial paragraphs, but repeated guidance still does',()=>{
 const caption='흰색 프레임의 창문 한쪽이 열려 있고 손잡이와 망 테두리가 함께 보입니다. 사진에는 뒤쪽의 공간과 창틀이 이어지는 방향도 담겨 있습니다.',shared='안전한 범위에서 창문을 여닫으며 걸리는 위치와 움직이는 방향을 구분해 기록하고 방문할 업체에 요청할 범위를 정리해 전달해 주세요. 예상하지 못한 분해나 치수 측정은 하지 않습니다.';
 const a={id:1,company_id:1,content:[caption,'[사진:1]','첫 글은 창의 여는 방향에 맞춰 접근할 공간과 사다리 반입 여부를 준비합니다. 내부 사진으로 확인할 구간과 외부 협의가 필요한 구간을 따로 안내합니다.']},b={id:2,company_id:1,content:[caption,'[사진:2]','두 번째 글은 손잡이 부근의 가림 상태와 망 끝부분이 닿는 위치를 설명합니다. 촬영 각도가 달라 확인할 수 없는 모서리는 추가로 살펴볼 자료를 정리합니다.']};
 assert.equal(repeatedParagraphs(a,[b]),0);assert.deepEqual(similarContent(a,[b]),[]);assert.equal(repeatedParagraphs({...a,content:[...a.content,shared]},[{...b,content:[...b.content,shared]}]),1);
 assert.deepEqual(repeatedPublishedCopy({...windowCopy,hero_heading:'같은 보이지 않는 제목',services_intro:'같은 보이지 않는 도입문으로 충분한 길이를 맞추어 이 항목에 보관합니다.'},[{page_copy:{...windowCopy,hero_heading:'같은 보이지 않는 제목',services_intro:'같은 보이지 않는 도입문으로 충분한 길이를 맞추어 이 항목에 보관합니다.'}}]).filter(key=>['hero_heading','services_intro'].includes(key)),[]);
});
test('a repair cannot change unrequested paths or unsafe object keys',()=>{
 assert.throws(()=>applyWritingRepair({},JSON.parse('{"__proto__":{"polluted":true}}'),['copy.closing']),/보완/);assert.throws(()=>applyWritingRepair({},JSON.parse('{"__proto__":{"polluted":true}}'),['__proto__']),/보완/);assert.equal({}.polluted,undefined);
});
