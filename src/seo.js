import {descendantServiceIds} from './services.js';
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
export function sitemap(data){
 const entries=[{path:'/'}];
 for(const p of data.published)entries.push({path:'/post/'+p.id+'/',lastmod:isoDate(p.updated_at||p.published_at)});
 for(const c of data.companies)if(data.published.some(p=>p.company_id===c.id))entries.push({path:'/company/'+c.id+'/'});
 for(const r of data.regions)if(data.published.some(p=>{const area=data.regions.find(a=>a.id===p.region_id);return area&&(area.id===r.id||area.slug.startsWith(r.slug+'/'));}))entries.push({path:'/region/'+r.slug+'/'});
 for(const s of data.services)if(data.published.some(p=>descendantServiceIds(s,data.services).includes(p.service_id)))entries.push({path:'/service/'+s.slug+'/'});
 return '<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'+entries.map(item=>`<url><loc>${xml(absolute(item.path))}</loc>${item.lastmod?`<lastmod>${item.lastmod}</lastmod>`:''}</url>`).join('')+'</urlset>';
}
export function rss(data){
 const posts=[...data.published].sort((a,b)=>(isoDate(b.updated_at||b.published_at)||'').localeCompare(isoDate(a.updated_at||a.published_at)||'')||b.id-a.id).slice(0,50);
 const newest=posts[0]&&isoDate(posts[0].updated_at||posts[0].published_at);
 return `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:media="http://search.yahoo.com/mrss/"><channel><title>공사8282 · 작업 이야기</title><link>${siteOrigin}/</link><description>지역 출장서비스의 작업사례와 서비스 안내</description><language>ko</language><atom:link href="${siteOrigin}/rss.xml" rel="self" type="application/rss+xml"/>${newest?`<lastBuildDate>${new Date(newest).toUTCString()}</lastBuildDate>`:''}${posts.map(p=>{
 const link=absolute('/post/'+p.id+'/'),image=postImage(p.id,data.postImages),date=isoDate(p.published_at);
 return `<item><title>${xml(p.title)}</title><link>${xml(link)}</link><guid isPermaLink="true">${xml(link)}</guid><description>${xml(p.summary)}</description>${date?`<pubDate>${new Date(date).toUTCString()}</pubDate>`:''}${image?`<media:thumbnail url="${xml(absolute(image.thumbnail_key||image.storage_key))}"/>`:''}</item>`;
 }).join('')}</channel></rss>`;
}
export const robots=()=>`User-agent: *\nDisallow: /admin/\nSitemap: ${siteOrigin}/sitemap.xml\n`;
