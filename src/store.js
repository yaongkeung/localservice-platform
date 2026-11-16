import {townshipName} from './township-groups.js';
import * as sample from './data.js';
import {postImages,seoulDate} from './photos.js';
export const sampleDataset=()=>({...sample,postImages});
export const all=async(db,sql,...args)=>(await db.prepare(sql).bind(...args).all()).results;
export const first=(db,sql,...args)=>db.prepare(sql).bind(...args).first();
export const run=(db,sql,...args)=>db.prepare(sql).bind(...args).run();
export function decodePost(row){return row?{...row,content:JSON.parse(row.content),sample:!!row.sample}:null;}
export async function publicDataset(db){
 const [regions,services,companies,posts,images]=await Promise.all([
  all(db,'SELECT * FROM regions'),all(db,'SELECT * FROM services'),all(db,"SELECT * FROM companies WHERE status='ACTIVE'"),
  all(db,"SELECT p.* FROM posts p JOIN companies c ON c.id=p.company_id WHERE p.status='PUBLISHED' AND p.published_at<=? AND c.status='ACTIVE' ORDER BY p.published_at DESC,p.id DESC",seoulDate()),
  all(db,"SELECT i.* FROM post_images i JOIN posts p ON p.id=i.post_id WHERE p.status='PUBLISHED' AND p.published_at<=? AND i.excluded=0",seoulDate())
 ]);
 const visible=new Set();for(const post of posts){let region=regions.find(r=>r.id===post.region_id);while(region&&!visible.has(region.id)){visible.add(region.id);region=regions.find(r=>r.id===region.parent_id);}}
 return {regions:regions.filter(r=>visible.has(r.id)).map(r=>({...r,name:townshipName(r.name)})),services,companies:companies.map(c=>({...c,phone:c.phone_verified?c.phone:null})),published:posts.map(decodePost),postImages:images.map(i=>({...i,thumbnail_key:i.thumbnail_key||i.storage_key,sample:!!i.sample}))};
}
