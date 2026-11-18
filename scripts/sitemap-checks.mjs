// Checks the site's generated format. Full XML schema validation is a separate check.
const unescapeXml=s=>s.replace(/&(amp|quot|apos|lt|gt);/g,(_,key)=>({amp:'&',quot:'"',apos:"'",lt:'<',gt:'>'}[key]));
export function sitemapChecks(xml,text,origin,now=Date.now()){
 const errors=[],urls=[...xml.matchAll(/<loc>([^<]*)<\/loc>/g)].map(m=>unescapeXml(m[1])),lines=text.endsWith('\n')?text.slice(0,-1).split('\n'):text.split('\n');
 const fail=issue=>errors.push({issue});
 if(!xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>')||!/<urlset xmlns=["']http:\/\/www\.sitemaps\.org\/schemas\/sitemap\/0\.9["']>/.test(xml)||!xml.endsWith('</urlset>'))fail('XML declaration or namespace');
 if(!urls.length||urls.length>50000||Buffer.byteLength(xml)>50*1024*1024||Buffer.byteLength(text)>50*1024*1024)fail('Sitemap size or URL count');
 if((xml.match(/<url>/g)||[]).length!==urls.length||new Set(urls).size!==urls.length)fail('Missing or duplicate URL');
 for(const value of [...new Set([...urls,...lines])]){
  try{const u=new URL(value);if(value!==u.href||u.origin!==origin||u.username||u.password||u.hash||value.length>=2048||/\s|[<>"]/.test(value)||/^\/(?:admin|uploads|company-photos|assets|media)(?:\/|$)/.test(u.pathname))fail('Non-canonical or private sitemap URL');}catch{fail('Invalid absolute sitemap URL');}
 }
 if(lines.length!==urls.length||lines.some((url,i)=>url!==urls[i]))fail('Text sitemap differs from XML inventory');
 for(const [,date]of xml.matchAll(/<lastmod>([^<]+)<\/lastmod>/g)){
  const day=date.slice(0,10),calendar=Date.parse(day+'T00:00:00Z');
  if(!/^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2}))?$/.test(date)||!Number.isFinite(Date.parse(date))||!Number.isFinite(calendar)||new Date(calendar).toISOString().slice(0,10)!==day||Date.parse(date)>now)fail('Invalid or future lastmod');
 }
 return {urls,errors};
}
