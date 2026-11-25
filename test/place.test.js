import {test} from 'node:test';
import assert from 'node:assert/strict';
import {normalizePlaceUrl,placeCard} from '../src/place.js';
test('place URLs accept Naver sharing and canonical place pages while rejecting unsafe destinations',()=>{
 assert.equal(normalizePlaceUrl('  https://naver.me/Test1234  '),'https://naver.me/Test1234');
 assert.equal(normalizePlaceUrl('https://map.naver.com/v5/entry/place/123?placePath=%2Fhome&tracking=test#x'),'https://map.naver.com/p/entry/place/123');
 assert.equal(normalizePlaceUrl('https://m.place.naver.com/place/123/review/visitor?from=map'),'https://m.place.naver.com/place/123/home');
 assert.equal(normalizePlaceUrl('https://pcmap.place.naver.com/place/123/home'),'https://pcmap.place.naver.com/place/123/home');assert.equal(normalizePlaceUrl(''),null);
 for(const value of ['javascript:alert(1)','data:text/html,test','http://naver.me/Test1234','https://naver.me.evil.example/Test1234','https://evil.example/?next=https://naver.me/Test1234','https://user:pass@naver.me/Test1234','https://naver.me:444/Test1234','https://naver.me/Test1234?redirect=elsewhere','https://naver.me/Test\n1234','https://map.naver.com/p/search/test','https://m.place.naver.com/place/123/home/../../login'])assert.throws(()=>normalizePlaceUrl(value),/네이버플레이스/);
});
test('place cards escape copied business details and contain only a deliberate external link',()=>{
 const html=placeCard({name:'시험 업체',naver_place_url:'https://naver.me/Test1234',naver_place_name:'업체 <script>alert(1)</script>',naver_place_address:'주소 & 안내',naver_place_hours:'상담 "안내"'});
 assert.match(html,/&lt;script&gt;/);assert.match(html,/주소 &amp; 안내/);assert.match(html,/rel="noopener noreferrer nofollow"/);assert.match(html,/target="_blank"/);assert.doesNotMatch(html,/<script|<iframe|<img|<form/);assert.equal(placeCard({naver_place_url:'https://evil.example/'}),'');assert.equal(placeCard({}), '');
});
