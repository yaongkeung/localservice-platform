import {test} from 'node:test';
import assert from 'node:assert/strict';
import worker from '../src/worker.js';
import {published} from '../src/data.js';
import {sampleDataset} from '../src/store.js';
import {collectionIndex,homeIndex} from '../src/collection-index.js';
import {sitemapEntries} from '../src/seo.js';
import {relatedPosts} from '../src/related-posts.js';
import {pageWritingInput} from '../src/page-writer.js';

test('pagination has self canonicals, real next links and sitemap coverage; filters stay noindex',async()=>{
 const originals=[...published];
 try{
  const base=originals[0];published.splice(0,published.length,...Array.from({length:44},(_,i)=>({...base,id:500+i,title:'사진 작업 안내 '+i,published_at:'2026-11-17'})));
  const call=path=>worker.fetch(new Request('https://gongsa8282.xyz'+path));
  const first=await(await call('/')).text(),second=await(await call('/?page=2')).text(),third=await(await call('/?page=3')).text();
  assert.match(first,/href="\/\?page=2#cases"/);assert.match(second,/href="\/\?page=3#cases"/);
  for(const [page,html] of [[2,second],[3,third]]){assert.ok(html.includes('rel="canonical" href="https://gongsa8282.xyz/?page='+page+'"'));assert.doesNotMatch(html,/content="noindex/);assert.ok(html.includes('· '+page+'페이지'));}
  const all=[first,second,third].map(html=>html.match(/<div class="post-board">[\s\S]*?<\/table><\/div>/)[0]).join('');
  for(const post of published)assert.ok(all.includes('href="/post/'+post.id+'/"'));
  const map=await(await call('/sitemap.txt')).text();assert.ok(map.includes('https://gongsa8282.xyz/?page=2\n'));assert.ok(map.includes('https://gongsa8282.xyz/?page=3\n'));
  for(const [query,target] of [['page=1','/'],['page=0','/'],['page=abc','/'],['page=02','/?page=2'],['page=999','/?page=3'],['page=2&page=3','/?page=2']]){const response=await call('/?'+query);assert.equal(response.status,301);assert.equal(response.headers.get('location'),target);assert.equal((await call(target)).status,200);}
  assert.match(await(await call('/?kind=guide&page=2')).text(),/content="noindex,follow"/);
  assert.equal(homeIndex(new URL('https://gongsa8282.xyz/?page=2'),44).noindex,false);
 }finally{published.splice(0,published.length,...originals);}
});

test('only identical public collections consolidate and sitemap/rendering use the same representative',async()=>{
 const data=sampleDataset(),policy=collectionIndex(data),entries=sitemapEntries(data).map(item=>item.path);
 const groups=new Set();
 for(const item of policy.values()){
  if(!item.posts.length){assert.ok(!entries.includes(item.path));continue;}
  const target=policy.get(item.canonical);assert.deepEqual(item.posts.map(p=>p.id),target.posts.map(p=>p.id));assert.equal(target.canonical,target.path);
  const html=await(await worker.fetch(new Request('https://gongsa8282.xyz'+item.path))).text();
  assert.ok(html.includes('rel="canonical" href="https://gongsa8282.xyz'+item.canonical+'"'));
  assert.equal(entries.includes(item.path),item.path===item.canonical);groups.add(item.path.split('/')[1]+':'+item.posts.map(p=>p.id).sort().join(','));
 }
 assert.equal(entries.filter(path=>/^\/(region|service)\//.test(path)).length,groups.size);
 const changed={...data,published:[...data.published,{...data.published[0],id:999,region_id:1}]};
 const next=collectionIndex(changed);assert.notEqual(next.get('/region/seoul/').canonical,next.get('/region/seoul/mapo/').canonical);
});

test('related links prefer relevant recent publications and never include a draft or the current article',()=>{
 const post={id:1,company_id:1,service_id:1,region_id:1};
 const rows=[{...post,id:2,published_at:'2026-11-01'},{...post,id:3,published_at:'2026-11-25'},{...post,id:4,status:'DRAFT',published_at:'2026-11-26'},post,{id:5,company_id:2,service_id:1,region_id:2,published_at:'2026-11-24'}];
 assert.deepEqual(relatedPosts(post,rows).map(p=>p.id),[3,2,5]);
});

test('writing distinguishes requested locations, work notes and observed photos from unverified outcomes',()=>{
 const make=notes=>JSON.parse(pageWritingInput({search_region:'삼산동',search_keyword:'보일러누수',work_notes:notes},{name:'업체'},{},{photos:[{id:1,description:'분배기와 연결관이 보입니다.'},{id:2,observation_unavailable:true}]}).messages[1].content);
 const empty=make('');assert.equal(empty.evidence_scope.work_notes_available,false);assert.equal(empty.evidence_scope.observed_photo_count,1);assert.match(empty.evidence_scope.decision_topics[0].topic,/본체|배관/);assert.equal(empty.work_performed_verified,false);assert.equal(empty.photo_location_verified,false);
 const provided=make('업체가 확인한 분배기 주변 물 흔적');assert.equal(provided.provided_work_notes,'업체가 확인한 분배기 주변 물 흔적');assert.equal(provided.evidence_scope.work_notes_available,true);assert.equal(provided.work_performed_verified,false);
});
