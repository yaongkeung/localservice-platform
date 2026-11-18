import {test} from 'node:test';
import assert from 'node:assert/strict';
import worker from '../src/worker.js';
import {sqliteDatabase,migrate} from '../scripts/sqlite.mjs';
import {seed} from '../scripts/seed.mjs';
import {sitemap,sitemapText,siteOrigin} from '../src/seo.js';
import {sitemapChecks} from '../scripts/sitemap-checks.mjs';

test('full text and XML sitemaps share canonical URLs and escape XML without changing text URLs',()=>{
 const data={published:[{id:1,public_path:'/유리/안내.html',updated_at:'2026-01-01 00:00:00',company_id:1,region_id:1,service_id:1}],companies:[{id:1}],regions:[{id:1,slug:'town'}],services:[{id:1,slug:'glass'}]};
 const map=sitemap(data),txt=sitemapText(data);assert.equal(sitemapChecks(map,txt,siteOrigin).errors.length,0);assert.ok(txt.includes(encodeURI('/유리/안내.html')));assert.equal(txt.split('\n').filter(Boolean).length,6);
 const escaped={...data,published:[{...data.published[0],public_path:'/guide.html?a=1&b=2'}]};assert.ok(sitemap(escaped).includes('&amp;b=2'));assert.ok(sitemapText(escaped).includes('&b=2'));assert.equal(sitemapChecks(sitemap(escaped),sitemapText(escaped),siteOrigin).errors.length,0);
});

test('standards audit rejects stale inventories, duplicate/foreign/private/fragment URLs and invalid dates',()=>{
 const wrap=(url,date='')=>'<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>'+url+'</loc>'+date+'</url></urlset>',home=siteOrigin+'/';
 assert.deepEqual(sitemapChecks(wrap(home),home+'\n',siteOrigin).errors,[]);
 for(const bad of ['https://other.example/','/relative/',siteOrigin+'/admin/',home+'#part',' https://gongsa8282.xyz/'])assert.ok(sitemapChecks(wrap(bad),bad+'\n',siteOrigin).errors.length,bad);
 assert.ok(sitemapChecks(wrap(home),home+'extra/\n',siteOrigin).errors.length);
 assert.ok(sitemapChecks(wrap(home).replace('</urlset>','<url><loc>'+home+'</loc></url></urlset>'),home+'\n'+home+'\n',siteOrigin).errors.length);
 for(const date of ['not-a-date','2099-01-01','2026-02-31','2026-01-01T10:00:00'])assert.ok(sitemapChecks(wrap(home,'<lastmod>'+date+'</lastmod>'),home+'\n',siteOrigin).errors.length,date);
 assert.ok(sitemapChecks(wrap(home).replace('sitemap/0.9','sitemap/.9'),home+'\n',siteOrigin).errors.length);
});

test('text route excludes sample and private records and preserves HEAD, staged noindex and immediate withdrawal',async()=>{
 const DB=sqliteDatabase();await migrate(DB);await seed(DB);
 const env={DB,APP_ENV:'production',SEARCH_INDEXING:'enabled',PHOTOS:{get(){},put(){}},ASSETS:{fetch(){}}};
 const call=(path,method='GET',extra={})=>worker.fetch(new Request(siteOrigin+path,{method}),{...env,...extra});
 try{
  await DB.prepare('UPDATE companies SET sample=0 WHERE id=1').run();await DB.prepare('UPDATE posts SET sample=0 WHERE id=101').run();
  let r=await call('/sitemap.txt');assert.equal(r.status,200);assert.equal(r.headers.get('content-type'),'text/plain; charset=utf-8');assert.equal(r.headers.get('x-robots-tag'),null);const text=await r.text(),xml=await(await call('/sitemap.xml')).text();assert.deepEqual(sitemapChecks(xml,text,siteOrigin).errors,[]);assert.ok(text.includes('/post/101/'));assert.ok(!text.includes('/post/102/'));
  r=await call('/sitemap.txt','HEAD');assert.equal(r.status,200);assert.equal(await r.text(),'');assert.equal(r.headers.get('content-type'),'text/plain; charset=utf-8');
  r=await call('/sitemap.txt','GET',{APP_ENV:'staging'});assert.match(r.headers.get('x-robots-tag'),/noindex/);assert.equal(await(await call('/robots.txt','GET',{APP_ENV:'staging'})).text(),'User-agent: *\nDisallow: /\n');
  await DB.prepare("INSERT INTO users(id,name,login_id,password_hash,role) VALUES(1,'시험 관리자','sitemap-test','not-a-login-password','ADMIN')").run();
  await DB.prepare("UPDATE posts SET status='DRAFT',last_actor_id=1,version=version+1 WHERE id=101").run();assert.ok(!(await(await call('/sitemap.txt')).text()).includes('/post/101/'));assert.ok(!(await(await call('/sitemap.xml')).text()).includes('/post/101/'));
  const robots=await(await call('/robots.txt')).text();for(const path of ['sitemap.xml','sitemap.txt','rss.xml'])assert.ok(robots.includes('Sitemap: '+siteOrigin+'/'+path));
 }finally{DB.close();}
});
