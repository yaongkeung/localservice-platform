import {regions,services,companies,posts} from '../src/data.js';
import {postImages} from '../src/photos.js';
import {digest} from '../src/auth.js';
export async function seed(db){
 if(await db.prepare('SELECT id FROM companies LIMIT 1').first())return;
 const inserts=[];
 const add=(table,row)=>{const keys=Object.keys(row);inserts.push(db.prepare(`INSERT INTO ${table}(${keys.join(',')}) VALUES(${keys.map(()=>'?').join(',')})`).bind(...Object.values(row)));};
 for(const r of regions)add('regions',{...r,level:r.parent_id?2:1,admin_code:r.admin_code||null});
 for(const s of services)add('services',s);
 for(const c of companies)add('companies',{...c,sample:1});
 for(const p of posts)add('posts',{...p,content:JSON.stringify(p.content),sample:1,title_hash:await digest(p.title.normalize('NFKC').replace(/\s+/g,'').toLowerCase()),content_hash:await digest(p.content.join('\n\n').normalize('NFKC').replace(/\s+/g,'').toLowerCase())});
 for(const image of postImages)add('post_images',{...image,sample:1});
 await db.batch(inserts);
}
