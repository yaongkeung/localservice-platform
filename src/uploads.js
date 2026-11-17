import {all,first} from './store.js';
import {isAdmin,randomToken,session} from './auth.js';
import {seoulDate} from './photos.js';
import {page,csrf,redirect,e} from './admin-ui.js';
import {processPhoto} from './image-processing.js';
export const canManagePost=async(db,user,post)=>isAdmin(user)||post.writer_id===user.id&&!!await first(db,"SELECT a.id FROM company_assignments a JOIN companies c ON c.id=a.company_id WHERE a.user_id=? AND a.company_id=? AND c.status='ACTIVE'",user.id,post.company_id);
const pathFor=key=>'/uploads/'+key;
export {photoPanel} from './photo-panel.js';
export async function boundedBytes(request,max){
 const reader=request.body?.getReader();const parts=[];let size=0;
 if(reader)while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>max){await reader.cancel();throw Error('사진 용량이 너무 큽니다. 크기를 줄여 다시 시도해 주세요.');}parts.push(value);}
 const bytes=new Uint8Array(size);let offset=0;for(const p of parts){bytes.set(p,offset);offset+=p.length;}return bytes;
}
const errorPage=(request,user,id,error,status)=>request.headers.get('x-photo-upload')==='1'?Response.json({error},{status,headers:{'cache-control':'no-store'}}):page('사진 등록 확인',`<h1>사진을 저장하지 못했습니다.</h1><p class="cms-error">${e(error)}</p><a href="/admin/posts/${id}/">게시글로 돌아가기</a>`,user,status);
export async function photoActions(request,env,user,id){
 if(request.method!=='POST')return page('페이지 없음','<h1>사진은 게시글 화면에서 관리해 주세요.</h1>',user,405);
 const db=env.DB,post=await first(db,'SELECT * FROM posts WHERE id=?',id);
 if(!post||!await canManagePost(db,user,post))return errorPage(request,user,id,'게시글을 찾을 수 없습니다.',404);
 if(post.status!=='DRAFT')return errorPage(request,user,id,'작성 내용 상태에서만 사진을 변경할 수 있습니다.',409);
 let savedKeys=[];
 try{
  const type=request.headers.get('content-type')||'',bytes=await boundedBytes(request,6*1024*1024);
  let form;
  if(type.startsWith('multipart/form-data'))form=await new Request(request.url,{method:'POST',headers:{'content-type':type},body:bytes}).formData();
  else if(type.startsWith('application/x-www-form-urlencoded'))form=new URLSearchParams(new TextDecoder().decode(bytes));
  else throw Error('올바른 사진 양식이 아닙니다.');
  if(form.get('csrf')!==user.csrf)return errorPage(request,user,id,'요청 확인에 실패했습니다. 페이지를 새로 열어 주세요.',403);
  const version=Number(form.get('version'));if(version!==post.version)throw Error('다른 화면에서 변경된 글입니다. 새로고침 후 다시 시도해 주세요.');
  const token=randomToken(),statements=[db.prepare("UPDATE posts SET version=version+1,mutation_token=?,updated_at=CURRENT_TIMESTAMP WHERE id=? AND version=? AND status='DRAFT'").bind(token,id,version)];
  const op=form.get('action');
  if(op){
   const image=await first(db,'SELECT * FROM post_images WHERE id=? AND post_id=?',Number(form.get('image_id')),id);if(!image)throw Error('사진을 찾을 수 없습니다.');
   if(!['representative','exclude','restore'].includes(op))throw Error('사진 요청을 확인해 주세요.');
   if(op==='representative'&&image.excluded)throw Error('제외된 사진을 먼저 복원해 주세요.');
   const sql=op==='representative'?"UPDATE post_images SET sort_order=(SELECT COALESCE(MIN(sort_order),0)-1 FROM post_images WHERE post_id=?) WHERE id=? AND EXISTS(SELECT 1 FROM posts WHERE id=? AND mutation_token=?)":"UPDATE post_images SET excluded=? WHERE id=? AND EXISTS(SELECT 1 FROM posts WHERE id=? AND mutation_token=?)";
   statements.push(db.prepare(sql).bind(op==='representative'?id:op==='exclude'?1:0,image.id,id,token));
  }else{
   if(!env.PHOTOS)throw Error('사진 저장소 연결이 필요합니다.');
   const file=form.get('photo'),thumbnail=form.get('thumbnail'),alt=(form.get('alt_text')||'업체 제공 사진').trim();
   if(!file||typeof file.arrayBuffer!=='function'||!file.size||file.size>5*1024*1024)throw Error('5MB 이하의 변환된 JPG 사진을 등록해 주세요.');
   if(!thumbnail||typeof thumbnail.arrayBuffer!=='function'||!thumbnail.size||thumbnail.size>256*1024)throw Error('사진 변환이 필요합니다. 페이지를 새로 열고 사진을 다시 선택해 주세요.');
   if(alt.length<2||alt.length>160)throw Error('사진 설명은 2~160자로 입력해 주세요.');
   if((await first(db,'SELECT COUNT(*) AS n FROM post_images WHERE post_id=? AND excluded=0',id)).n>=8)throw Error('사진은 최대 8장까지 등록할 수 있습니다.');
   const {cover,thumb,width,height}=processPhoto(new Uint8Array(await file.arrayBuffer()),new Uint8Array(await thumbnail.arrayBuffer()));
   const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',cover)),b=>b.toString(16).padStart(2,'0')).join('');
   if(await first(db,'SELECT id FROM post_images WHERE content_hash=? AND excluded=0',hash))throw Error('이미 등록된 사진과 동일합니다. 다른 작업 사진을 선택해 주세요.');
   const key=id+'/'+randomToken();savedKeys=[key+'-cover.jpg',key+'-thumb.jpg'];
   // All objects remain private; only the authenticated/publication-aware route can serve them.
   await env.PHOTOS.put(savedKeys[0],cover,{httpMetadata:{contentType:'image/jpeg'}});await env.PHOTOS.put(savedKeys[1],thumb,{httpMetadata:{contentType:'image/jpeg'}});
   statements.push(db.prepare("INSERT INTO post_images(post_id,storage_key,thumbnail_key,alt_text,sort_order,sample,content_hash,width,height) SELECT id,?,?,?,(SELECT COALESCE(MAX(sort_order),-1)+1 FROM post_images WHERE post_id=?),sample,?,?,? FROM posts WHERE id=? AND mutation_token=?").bind(pathFor(savedKeys[0]),pathFor(savedKeys[1]),alt,id,hash,width,height,id,token));
  }
  const result=await db.batch(statements);if(!result[0].meta.changes)throw Error('다른 화면에서 변경된 글입니다. 새로고침 후 다시 시도해 주세요.');
  const location='/admin/posts/'+id+'/';return request.headers.get('x-photo-upload')==='1'?Response.json({location,version:version+1},{headers:{'cache-control':'no-store'}}):redirect(location);
 }catch(error){
  // Delete only new random objects owned by this failed request, never a user's existing objects.
  if(savedKeys.length)try{await env.PHOTOS.delete(savedKeys);}catch{/* Orphan cleanup must be retried operationally; no DB row exposes these objects. */}
  const expected=/^(사진|정상|작성 내용|다른|올바른|요청|이미|제외된)/.test(error.message);
  return errorPage(request,user,id,expected?error.message:'사진을 저장하지 못했습니다. 수량·중복 여부를 확인하고 다시 시도해 주세요.',409);
 }
}
export async function uploadedPhoto(request,env){
 const path=new URL(request.url).pathname;if(!/^\/(?:uploads|company-photos)\/\d+\/[a-f0-9]{64}-(?:cover|thumb)\.jpg$/.test(path)||!env.DB||!env.PHOTOS)return new Response('Not found',{status:404,headers:{'cache-control':'no-store'}});
 const image=await first(env.DB,'SELECT i.*,p.writer_id,p.company_id,p.status,p.published_at,c.status AS company_status,c.sample AS company_sample FROM post_images i JOIN posts p ON p.id=i.post_id JOIN companies c ON c.id=p.company_id WHERE i.storage_key=? OR i.thumbnail_key=?',path,path);
 const publicImage=image&&!image.excluded&&image.status==='PUBLISHED'&&image.published_at<=seoulDate()&&image.company_status==='ACTIVE'&&(env.APP_ENV!=='production'||!image.sample&&!image.company_sample);
 if(!publicImage){const user=await session(env.DB,request);if(!image||!user||user.must_change_password||!await canManagePost(env.DB,user,image))return new Response('Not found',{status:404,headers:{'cache-control':'no-store'}});}
 const object=await env.PHOTOS.get(path.startsWith('/uploads/')?path.slice('/uploads/'.length):path.replace(/^\/company-photos\/(\d+)\//,'company-$1/'));if(!object)return new Response('Not found',{status:404});
 return new Response(request.method==='HEAD'?null:object.body,{headers:{'content-type':'image/jpeg','cache-control':'private, no-store','x-content-type-options':'nosniff','content-disposition':'inline','vary':'Cookie'}});
}
