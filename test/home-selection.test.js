import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomSample} from '../src/random-selection.js';
import {registeredCompanies} from '../src/companies.js';
import {randomHighlights} from '../src/photos.js';
const companies=Array.from({length:14},(_,i)=>({id:i+1,name:'업체 '+(i+1),customer_name:'PRIVATE-CUSTOMER-'+i,area:'서울',description:'업체 서비스 안내',status:'ACTIVE',sample:0}));
const posts=companies.flatMap(company=>[0,1].map(n=>({id:company.id*10+n,company_id:company.id,service_id:1,status:'PUBLISHED',sample:0,published_at:'2026-11-16',title:'공개 안내 '+company.id+' '+n})));
const images=posts.map(post=>({id:post.id,post_id:post.id,storage_key:'/uploads/'+post.id+'/cover.jpg',sort_order:0}));
const categories=[{id:1,name:'유리',tone:'mint',icon:'🪟'}];
test('registered company selection caps at ten and varies fairly without changing source order',()=>{
 const before=structuredClone(companies),html=registeredCompanies(companies,new URLSearchParams(),posts,images,()=>0);
 assert.equal((html.match(/class="registered-company"/g)||[]).length,10);assert.doesNotMatch(html,/PRIVATE-CUSTOMER/);assert.notEqual(html,registeredCompanies(companies,new URLSearchParams(),posts,images,()=>.999));assert.deepEqual(companies,before);
 const invalid=[{...companies[0],sample:1},{...companies[1],status:'DISABLED'}];assert.equal(registeredCompanies(invalid),'');assert.equal((registeredCompanies(companies.slice(0,3)).match(/class="registered-company"/g)||[]).length,3);
 assert.deepEqual(randomSample([1,2,3],2,()=>0),[2,3]);
});
test('photo highlights cap at six different real companies and exclude private, future, excluded and sample photos',()=>{
 const active=companies.slice(0,10),picks=randomHighlights(active,posts,categories,images,6,()=>0,'2026-11-17');
 assert.equal(picks.length,6);assert.equal(new Set(picks.map(pick=>pick.post.company_id)).size,6);
 assert.notDeepEqual(picks,randomHighlights(active,posts,categories,images,6,()=>.999,'2026-11-17'));
 const blockedPosts=posts.map(post=>({...post,status:post.id%2?'DRAFT':'PUBLISHED',published_at:'2030-01-01'}));assert.deepEqual(randomHighlights(active,blockedPosts,categories,images),[]);
 assert.deepEqual(randomHighlights(active,posts,categories,images.map(image=>({...image,excluded:1}))),[]);
 assert.deepEqual(randomHighlights(active,posts,categories,images.map(image=>({...image,sample:1}))),[]);
 assert.deepEqual(randomHighlights(active.map(company=>({...company,sample:1})),posts,categories,images),[]);
 assert.deepEqual(randomHighlights(active.map(company=>({...company,status:'DISABLED'})),posts,categories,images),[]);
 const one=randomHighlights(active.slice(0,1),posts,categories,images,6,()=>0,'2026-11-17');assert.equal(one.length,1);
});
