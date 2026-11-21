import {provinceForPost} from './regions.js';
import {townshipName} from './township-groups.js';
const provinces={'11':'서울','12':'전남광주','26':'부산','27':'대구','28':'인천','30':'대전','31':'울산','36':'세종','41':'경기','43':'충북','44':'충남','47':'경북','48':'경남','50':'제주','51':'강원','52':'전북'};
const slug=(value,fallback,max=70)=>String(value||'').normalize('NFKC').replace(/[^\p{L}\p{N}]+/gu,'-').slice(0,max).replace(/^-+|-+$/g,'')||fallback;
export const postUrl=post=>post.public_path||`/post/${post.id}/`;
export function readablePostPaths(post,regions,services){
 const region=regions.find(region=>region.id===post.region_id)||{};
 let service=services.find(service=>service.id===post.service_id),root=service;const seen=new Set();
 while(root?.parent_id&&!seen.has(root.id)){seen.add(root.id);root=services.find(service=>service.id===root.parent_id)||root;if(seen.has(root.id))break;}
 let category=slug(root?.name.split(/[·/]/)[0],'서비스',35);
 if(['admin','assets','uploads','company-photos','media','healthz'].includes(category.toLowerCase()))category='서비스-'+category;
 const province=slug(provinces[provinceForPost(post,regions)]||'전국','전국',20);
 const place=slug(post.search_region?.trim().split(/\s+/).at(-1)||townshipName(region.name||''),'지역',40),keyword=slug(post.search_keyword||service?.name,'서비스',50);
 const prefix=[category,province,place].map(encodeURIComponent).join('/'),file=encodeURIComponent(place+'-'+keyword);
 // A double hyphen is reserved for collisions: normalized input has only single
 // hyphens, so another post's natural filename can never occupy this suffix.
 return {base:`/${prefix}/${file}.html`,collision:`/${prefix}/${file}--${post.id}.html`};
}
export function normalizedPath(path){
 try{return path.split('/').map(part=>encodeURIComponent(decodeURIComponent(part))).join('/');}catch{return null;}
}
export async function publicationUrlStatement(db,post,token){
 const [regions,services]=await Promise.all([db.prepare('SELECT * FROM regions').all(),db.prepare('SELECT * FROM services').all()]);
 const {base,collision}=readablePostPaths(post,regions.results,services.results);
 return db.prepare("INSERT INTO post_urls(post_id,path) SELECT id,CASE WHEN EXISTS(SELECT 1 FROM post_urls WHERE path=?) THEN ? ELSE ? END FROM posts WHERE id=? AND status='PUBLISHED' AND mutation_token=? AND NOT EXISTS(SELECT 1 FROM post_urls WHERE post_id=posts.id)").bind(base,collision,base,post.id,token);
}
