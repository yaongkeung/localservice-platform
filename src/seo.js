import {postUrl} from './post-urls.js';
import {feedBody} from './feed-body.js';
import {collectionIndex,boardPageSize} from './collection-index.js';
import {siteName} from './brand.js';
import {postImage} from './photos.js';
export const siteOrigin='https://gongsa8282.xyz';
export const absolute=path=>new URL(path,siteOrigin).href;
const xml=value=>String(value??'').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g,'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
export function isoDate(value){
 if(!value)return null;
 const normalized=/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(value)?value.replace(' ','T')+'Z':/^\d{4}-\d{2}-\d{2}$/.test(value)?value+'T00:00:00+09:00':value;
 const date=new Date(normalized);return Number.isFinite(date.valueOf())?date.toISOString():null;
}
export function breadcrumbSchema(items){return {'@context':'https://schema.org','@type':'BreadcrumbList',itemListElement:items.map((item,i)=>({'@type':'ListItem',position:i+1,name:item.name,item:absolute(item.url)}))};}
export function sitemapEntries(data){
 const entries=[{path:'/'},{path:'/about/'}];
 for(let page=2;page<=Math.ceil(data.published.length/boardPageSize);page++)entries.push({path:`/?page=${page}`});
 for(const p of data.published)entries.push({path:postUrl(p),lastmod:isoDate(p.updated_at||p.published_at)});
 for(const c of data.companies)if(data.published.some(p=>p.company_id===c.id))entries.push({path:'/company/'+c.id+'/'});
 for(const item of collectionIndex(data).values())if(item.posts.length&&item.path===item.canonical)entries.push({path:item.path});
 return entries;
}
export function sitemap(data){
 return '<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'+sitemapEntries(data).map(item=>`<url><loc>${xml(absolute(item.path))}</loc>${item.lastmod?`<lastmod>${item.lastmod}</lastmod>`:''}</url>`).join('')+'</urlset>';
}
// The supported plain-text format covers the full inventory, unlike a recent-post RSS feed.
export const sitemapText=data=>sitemapEntries(data).map(item=>absolute(item.path)).join('\n')+'\n';
export function rss(data){
 const posts=[...data.published].sort((a,b)=>(isoDate(b.updated_at||b.published_at)||'').localeCompare(isoDate(a.updated_at||a.published_at)||'')||b.id-a.id).slice(0,50);
 const newest=posts[0]&&isoDate(posts[0].updated_at||posts[0].published_at);
 let bytes=0;const items=[];
 for(const p of posts){
 const link=absolute(postUrl(p)),image=postImage(p.id,data.postImages),date=isoDate(p.published_at);
 const item=`<item><title>${xml(p.title)}</title><link>${xml(link)}</link><guid isPermaLink="true">${xml(link)}</guid><description>${xml(feedBody(p,data,siteOrigin))}</description>${date?`<pubDate>${new Date(date).toUTCString()}</pubDate>`:''}${image?`<media:thumbnail url="${xml(absolute(image.thumbnail_key||image.storage_key))}"/>`:''}</item>`;
 const size=new TextEncoder().encode(item).byteLength;if(bytes+size>1024*1024)break;items.push(item);bytes+=size;
 }
 return `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:media="http://search.yahoo.com/mrss/"><channel><title>${xml(siteName)} · 작업 이야기</title><link>${siteOrigin}/</link><description>지역 출장서비스의 작업사례와 서비스 안내</description><language>ko</language><atom:link href="${siteOrigin}/rss.xml" rel="self" type="application/rss+xml"/>${newest?`<lastBuildDate>${new Date(newest).toUTCString()}</lastBuildDate>`:''}${items.join('')}</channel></rss>`;
}
export const robots=(blocked=false)=>blocked?'User-agent: *\nDisallow: /\n':`User-agent: *\nDisallow: /admin/\nSitemap: ${siteOrigin}/sitemap.xml\nSitemap: ${siteOrigin}/sitemap.txt\nSitemap: ${siteOrigin}/rss.xml\n`;
