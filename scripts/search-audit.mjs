import {mkdir,writeFile} from 'node:fs/promises';
import {siteOrigin} from '../src/seo.js';
import {sitemapChecks} from './sitemap-checks.mjs';

// Read-only public checks. A successful response is not proof of indexing.
const origin=siteOrigin,errors=[],pages=[],resources=new Set(),links=new Set();
const decode=s=>s.replaceAll('&amp;','&').replaceAll('&quot;','"').replaceAll('&#39;',"'");
const read=async(url,options={})=>{
 const start=performance.now(),response=await fetch(url,{redirect:'manual',signal:AbortSignal.timeout(30000),...options});
 const body=await response.text();return {response,body,ms:Math.round(performance.now()-start)};
};
const {response:mapResponse,body:map}=await read(origin+'/sitemap.xml');
if(mapResponse.status!==200||!mapResponse.headers.get('content-type')?.includes('xml')||/noindex/i.test(mapResponse.headers.get('x-robots-tag')||''))throw Error('Sitemap is not accessible XML.');
const {response:textResponse,body:textMap}=await read(origin+'/sitemap.txt');
if(textResponse.status!==200||!textResponse.headers.get('content-type')?.startsWith('text/plain')||/noindex/i.test(textResponse.headers.get('x-robots-tag')||''))throw Error('Text sitemap is not accessible.');
const checked=sitemapChecks(map,textMap,origin);if(checked.errors.length)throw Error('Sitemap standards check failed: '+JSON.stringify(checked.errors));
const urls=checked.urls;
for(const url of urls){
 const {response:r,body:html,ms}=await read(url),title=html.match(/<title>([^<]+)<\/title>/)?.[1],description=html.match(/name="description" content="([^"]*)"/)?.[1],canonical=html.match(/rel="canonical" href="([^"]+)"/)?.[1],robots=html.match(/name="robots" content="([^"]+)"/)?.[1],h1=(html.match(/<h1\b/g)||[]).length,titleCount=(html.match(/<title\b[^>]*>/gi)||[]).length;
 if(titleCount!==1)errors.push({url,issue:'Expected one title element',titleCount});
 if(r.status!==200||canonical!==url||!title||!description||h1!==1||/noindex/.test(robots+' '+r.headers.get('x-robots-tag')))errors.push({url,issue:'HTML/status/canonical/metadata'});
 for(const [,href]of html.matchAll(/href="([^"#]+)"/g)){
  const target=new URL(decode(href),url);if(target.origin===origin&&!target.search&&!target.pathname.startsWith('/admin/')){target.hash='';links.add(target.href);}
 }
 for(const [,src]of html.matchAll(/(?:src|href)="((?:\/media\/|\/uploads\/|\/company-photos\/|\/assets\/)[^"<>]+)"/g))resources.add(new URL(decode(src),origin).href);
 for(const [,src]of html.matchAll(/url\(["']?(\/media\/[^)"']+)/g))resources.add(new URL(decode(src),origin).href);
 pages.push({url,status:r.status,title:decode(title||''),description:decode(description||''),h1,titleCount,canonical,robots,ms,bytes:Buffer.byteLength(html)});
}
for(const key of ['title','description']){const byValue=new Map();for(const page of pages){const value=page[key];if(byValue.has(value))errors.push({url:page.url,issue:'Duplicate '+key,other:byValue.get(value)});byValue.set(value,page.url);}}
const extraLinks=[];for(const url of links){if(urls.includes(url)||resources.has(url))continue;const {response,body}=await read(url);extraLinks.push({url,status:response.status});if(response.status>=400)errors.push({url,issue:'Linked non-public/empty page',status:response.status});}
const resourceResults=[];for(const url of resources){const {response,ms}=await read(url,{method:'HEAD'});resourceResults.push({url,status:response.status,type:response.headers.get('content-type'),ms});if(response.status!==200)errors.push({url,issue:'Resource inaccessible',status:response.status});}
const {response:robotsResponse,body:robotsText}=await read(origin+'/robots.txt');if(robotsResponse.status!==200||['sitemap.xml','sitemap.txt','rss.xml'].some(path=>!robotsText.includes('Sitemap: '+origin+'/'+path))||/Disallow:\s*\/\s*(?:\n|$)/.test(robotsText))errors.push({issue:'Robots rules'});
const compatibility=[];for(const id of [113,117,118,119,120]){const {response:r}=await read(origin+'/post/'+id+'/');const target=r.headers.get('location'),absolute=target?new URL(target,origin).href:'';compatibility.push({id,status:r.status,target});if(r.status!==301||!urls.includes(absolute))errors.push({id,issue:'Published legacy URL redirect'});}
for(const id of [114,116])if((await read(origin+'/post/'+id+'/')).response.status!==404)errors.push({id,issue:'Private post exposed'});
const result={checkedAt:new Date().toISOString(),indexingConfirmed:false,actualNaverBotVisitConfirmed:false,databaseWrites:false,sitemapUrls:urls.length,pages,extraLinks,resources:resourceResults,compatibility,errors};
await mkdir('.local',{recursive:true});await writeFile('.local/search-audit.json',JSON.stringify(result,null,2));
console.log(JSON.stringify({checkedAt:result.checkedAt,sitemapUrls:urls.length,resources:resources.size,extraLinks:extraLinks.length,errors,indexingConfirmed:false,databaseWrites:false}));
if(errors.length)process.exitCode=1;
