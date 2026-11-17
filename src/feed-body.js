import {postArticle} from './post-article.js';
// Render the same complete article as the public page, without decorative SVG.
// Feed readers have no page base URL, so all local images and links are absolute.
export function feedBody(post,data,origin){
 const company=data.companies.find(company=>company.id===post.company_id)||{};
 const body=postArticle(post,data.postImages,company,false,{region:data.regions.find(region=>region.id===post.region_id),service:data.services.find(service=>service.id===post.service_id)});
 return body.replace(/<svg\b[\s\S]*?<\/svg>/gi,'').replace(/\b(href|src)="(\/[^"\s]*)"/g,(_,attribute,path)=>`${attribute}="${origin}${path}"`).replace(/\bhref="#([^"]*)"/g,(_,fragment)=>`href="${origin}${post.public_path||'/post/'+post.id+'/'}#${fragment}"`);
}
