import {test} from 'node:test';
import assert from 'node:assert/strict';
import {rss,siteOrigin} from '../src/seo.js';
const unxml=text=>text.replace(/&(amp|lt|gt|quot|apos);/g,(_,key)=>({amp:'&',lt:'<',gt:'>',quot:'"',apos:"'"}[key]));
const post={id:1,company_id:1,region_id:1,service_id:1,status:'PUBLISHED',public_path:'/service/area/place/page.html',search_region:'원당동',search_keyword:'누수점검',title:'원당동 누수점검 안내',summary:'이 문장은 요약입니다.',published_at:'2026-11-17',content:['## 사진과 업무 안내','사진을 보기 전 실제 본문의 첫 문단입니다.','[사진:2]','사진 사이에 들어가는 **중요 업무** 설명입니다.','[사진:1]','마지막 상담 준비 내용입니다. <script>unsafe</script>']};
const company={id:1,name:'공개 업체명',customer_name:'PRIVATE-CUSTOMER',phone:'01000000000',phone_verified:1,area:'원당동',hours:'상담 시간 확인',naver_place_url:'https://naver.me/Test1234'};
const data={companies:[company],regions:[{id:1,name:'원당동'}],services:[{id:1,name:'배관'}],published:[post],postImages:[{id:1,post_id:1,storage_key:'/uploads/1/one-cover.jpg',alt_text:'첫 사진',sort_order:0},{id:2,post_id:1,storage_key:'/uploads/1/two-cover.jpg',alt_text:'둘째 사진',sort_order:1},{id:3,post_id:1,storage_key:'/uploads/1/excluded.jpg',excluded:1},{id:9,post_id:99,storage_key:'/uploads/99/private.jpg'}]};
test('RSS contains the complete public article with absolute photo links, preserved order and safe XML/HTML',()=>{
 const xml=rss(data),item=xml.match(/<item>([\s\S]*?)<\/item>/)[1],body=unxml(item.match(/<description>([\s\S]*?)<\/description>/)[1]);
 for(const text of ['사진을 보기 전 실제 본문','사진 사이에 들어가는','마지막 상담 준비','공개 업체명','상담부터 진행까지','네이버플레이스'])assert.ok(body.includes(text),text);
 assert.equal((body.match(/<figure/g)||[]).length,2);assert.ok(body.indexOf('two-cover.jpg')<body.indexOf('one-cover.jpg'));assert.ok(body.indexOf('사진을 보기 전')<body.indexOf('two-cover.jpg'));assert.ok(body.indexOf('one-cover.jpg')<body.indexOf('마지막 상담 준비'));
 assert.ok(body.includes('src="'+siteOrigin+'/uploads/1/one-cover.jpg"'));assert.ok(body.includes('href="https://naver.me/Test1234"'));assert.match(body,/<strong>중요 업무<\/strong>/);assert.ok(body.includes('href="'+siteOrigin+post.public_path+'#service-details-1"'));
 assert.doesNotMatch(body,/<svg|<script>|PRIVATE-CUSTOMER|excluded\.jpg|private\.jpg|\/admin\/|(?:src|href)="\//);assert.match(body,/&lt;script&gt;unsafe&lt;\/script&gt;/);assert.doesNotMatch(item,/<figure/);
});
test('full RSS stays below the 10MB submission limit and omits older whole items rather than truncating a body',()=>{
 const large={...data,companies:[{...company,reviews_confirmed:1,customer_reviews:JSON.stringify(Array.from({length:6},()=> '&'.repeat(1200)))}],postImages:[],published:Array.from({length:55},(_,i)=>({...post,id:i+1,public_path:'/service/area/place/page-'+i+'.html',content:['&'.repeat(20000)]}))};
 const xml=rss(large),items=xml.match(/<item>/g)||[];assert.ok(items.length>0&&items.length<50);assert.ok(new TextEncoder().encode(xml).byteLength<10*1024*1024);assert.equal(items.length,(xml.match(/<\/item>/g)||[]).length);assert.ok(xml.endsWith('</channel></rss>'));
 const bodies=[...xml.matchAll(/<item>[\s\S]*?<description>([\s\S]*?)<\/description>/g)];assert.ok(bodies.every(match=>unxml(match[1]).includes('&amp;'.repeat(20000))));
});
