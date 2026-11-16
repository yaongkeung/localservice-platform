import {all,first} from './store.js';
import {isAdmin,randomToken,session} from './auth.js';
import {page,csrf,e,redirect} from './admin-ui.js';
import {boundedBytes} from './uploads.js';
import {processPhoto} from './image-processing.js';
const ordered=images=>[...images].filter(i=>!i.excluded).sort((a,b)=>a.sort_order-b.sort_order||a.id-b.id);
export function companyGallery(company,images=[]){
 const rows=ordered(images.filter(i=>i.company_id===company.id));if(!rows.length)return '';
 return `<section class="section company-gallery" aria-labelledby="company-gallery-heading"><div class="section-head"><h2 id="company-gallery-heading">업체 제공 사진</h2><span class="count">${rows.length}장</span></div><p class="muted">업체에서 제공한 사진을 살펴보세요. 사진별 현장 위치와 작업일은 별도 표기하지 않았습니다.</p><div class="company-photo-grid">${rows.map((i,index)=>`<figure class="company-photo ${index?'':'company-photo-lead'}"><a href="${e(i.storage_key)}" aria-label="${e(i.alt_text)} 크게 보기"><img src="${e(i.storage_key)}" alt="${e(i.alt_text)}" width="${i.width}" height="${i.height}" loading="lazy" decoding="async"></a><figcaption>${e(i.alt_text)}</figcaption></figure>`).join('')}</div></section>`;
}
export function companyCover(company,images=[]){
 const image=ordered(images.filter(i=>i.company_id===company.id))[0];return image?`<a class="company-cover" href="/company/${company.id}/#company-gallery-heading"><img src="${e(image.storage_key)}" alt="${e(image.alt_text)}" width="${image.width}" height="${image.height}" loading="lazy" decoding="async"></a>`:'';
}
export async function companyPhotoPanel(db,user,company){
 const images=await all(db,'SELECT * FROM company_images WHERE company_id=? ORDER BY sort_order,id',company.id),active=ordered(images),base='/admin/companies/'+company.id+'/photos/';
 const action=(image,op,label)=>`<form method="post" action="${base}">${csrf(user)}<input type="hidden" name="version" value="${company.version}"><input type="hidden" name="image_id" value="${image.id}"><button class="secondary" name="action" value="${op}">${label}</button></form>`;
 return `<section class="panel" style="margin:24px 0"><h2>📷 업체 사진 · ${active.length} / 8장</h2><p class="cms-help">활성 업체의 사진은 저장 즉시 프로필과 메인 업체 안내에 표시됩니다. 첫 사진이 대표입니다. 게시글·계약 수량과는 별개이며 사진의 게시 권한을 확인해 주세요.</p><div class="cms-photos">${images.map(i=>`<article><img src="${e(i.thumbnail_key)}" alt="${e(i.alt_text)}" width="240" height="160" style="max-width:100%;object-fit:contain"><p>${i.excluded?'제외됨':i.id===active[0]?.id?'⭐ 대표 사진':'업체 사진'} · ${e(i.alt_text)}</p><div class="cms-actions">${i.excluded?action(i,'restore','복원'):action(i,'representative','대표로')+action(i,'exclude','사진 제외')}</div></article>`).join('')}</div><form method="post" action="${base}" enctype="multipart/form-data" data-photo-upload>${csrf(user)}<input type="hidden" name="version" value="${company.version}"><label>업체 사진<input type="file" name="photo" accept="image/jpeg,image/png" required></label><label>사진 설명<input name="alt_text" minlength="2" maxlength="160" required></label><p class="cms-help">JPG·PNG, 20MB 이하 · 원본 위치 정보는 저장하지 않습니다.</p><button>＋ 업체 사진 등록</button><p class="cms-help" role="status" aria-live="polite"></p></form></section>`;
}
export async function companyPhotoActions(request,env,user,id){
 const base='/admin/companies/'+id+'/',fail=(error,status=409)=>request.headers.get('x-photo-upload')==='1'?Response.json({error},{status,headers:{'cache-control':'no-store'}}):page('업체 사진 확인',`<p class="cms-error">${e(error)}</p><a href="${base}">업체로 돌아가기</a>`,user,status);
 if(!isAdmin(user))return fail('관리자만 업체 사진을 변경할 수 있습니다.',403);
 if(request.method!=='POST')return fail('업체 수정 화면에서 사진을 등록해 주세요.',405);
 const db=env.DB,company=await first(db,'SELECT * FROM companies WHERE id=?',id);if(!company)return fail('업체를 찾을 수 없습니다.',404);
 let saved=[];
 try{
  const type=request.headers.get('content-type')||'',bytes=await boundedBytes(request,6*1024*1024);
  const form=type.startsWith('multipart/form-data')?await new Request(request.url,{method:'POST',headers:{'content-type':type},body:bytes}).formData():type.startsWith('application/x-www-form-urlencoded')?new URLSearchParams(new TextDecoder().decode(bytes)):null;
  if(!form)throw Error('올바른 사진 양식이 아닙니다.');if(form.get('csrf')!==user.csrf)return fail('요청 확인에 실패했습니다.',403);
  const version=Number(form.get('version'));if(version!==company.version)throw Error('다른 화면에서 변경되었습니다. 업체 화면을 다시 열어 주세요.');
  const token=randomToken(),statements=[db.prepare('UPDATE companies SET version=version+1,photo_mutation_token=? WHERE id=? AND version=?').bind(token,id,version)],op=form.get('action');
  if(op){
   const image=await first(db,'SELECT * FROM company_images WHERE company_id=? AND id=?',id,Number(form.get('image_id')));if(!image||!['representative','exclude','restore'].includes(op))throw Error('사진 요청을 확인해 주세요.');if(op==='representative'&&image.excluded)throw Error('제외된 사진을 먼저 복원해 주세요.');
   const sql=op==='representative'?'UPDATE company_images SET sort_order=(SELECT COALESCE(MIN(sort_order),0)-1 FROM company_images WHERE company_id=?) WHERE id=? AND EXISTS(SELECT 1 FROM companies WHERE id=? AND photo_mutation_token=?)':'UPDATE company_images SET excluded=? WHERE id=? AND EXISTS(SELECT 1 FROM companies WHERE id=? AND photo_mutation_token=?)';
   statements.push(db.prepare(sql).bind(op==='representative'?id:op==='exclude'?1:0,image.id,id,token));
  }else{
   const file=form.get('photo'),thumbnail=form.get('thumbnail'),alt=(form.get('alt_text')||'').trim();
   if(!file||typeof file.arrayBuffer!=='function'||!file.size||file.size>5*1024*1024||!thumbnail||typeof thumbnail.arrayBuffer!=='function'||!thumbnail.size||thumbnail.size>256*1024)throw Error('사진을 다시 선택하고 페이지를 새로 열어 등록해 주세요.');
   if(alt.length<2||alt.length>160)throw Error('사진 설명은 2~160자로 입력해 주세요.');
   const {cover,thumb,width,height}=processPhoto(new Uint8Array(await file.arrayBuffer()),new Uint8Array(await thumbnail.arrayBuffer())),hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',cover)),b=>b.toString(16).padStart(2,'0')).join('');
   if(await first(db,'SELECT id FROM company_images WHERE company_id=? AND content_hash=? AND excluded=0',id,hash))throw Error('이미 등록된 업체 사진입니다.');
   if((await first(db,'SELECT count(*) n FROM company_images WHERE company_id=? AND excluded=0',id)).n>=8)throw Error('사진은 최대 8장까지 등록할 수 있습니다.');
   const key='company-'+id+'/'+randomToken();saved=[key+'-cover.jpg',key+'-thumb.jpg'];
   await env.PHOTOS.put(saved[0],cover,{httpMetadata:{contentType:'image/jpeg'}});await env.PHOTOS.put(saved[1],thumb,{httpMetadata:{contentType:'image/jpeg'}});
   const path=key=>key.replace('company-','/company-photos/');
   statements.push(db.prepare('INSERT INTO company_images(company_id,storage_key,thumbnail_key,alt_text,sort_order,content_hash,width,height) SELECT id,?,?,?,(SELECT COALESCE(MAX(sort_order),-1)+1 FROM company_images WHERE company_id=?),?,?,? FROM companies WHERE id=? AND photo_mutation_token=?').bind(path(saved[0]),path(saved[1]),alt,id,hash,width,height,id,token));
  }
  const result=await db.batch(statements);if(!result[0].meta.changes)throw Error('다른 화면에서 변경되었습니다. 업체 화면을 다시 열어 주세요.');
  return request.headers.get('x-photo-upload')==='1'?Response.json({location:base},{headers:{'cache-control':'no-store'}}):redirect(base);
 }catch(error){if(saved.length)try{await env.PHOTOS.delete(saved);}catch{/* Unreferenced objects are never served. */}return fail(/^(사진|올바른|요청|다른|이미|제외된)/.test(error.message)?error.message:'사진을 저장하지 못했습니다. 수량과 중복 여부를 확인해 주세요.');}
}
export async function companyPhotoResponse(request,env){
 const path=new URL(request.url).pathname,match=path.match(/^\/company-photos\/(\d+)\/([a-f0-9]{64}-(?:cover|thumb)\.jpg)$/),notFound=()=>new Response('Not found',{status:404,headers:{'cache-control':'no-store'}});
 if(!match||!env.DB||!env.PHOTOS)return notFound();
 const image=await first(env.DB,'SELECT i.excluded,c.status FROM company_images i JOIN companies c ON c.id=i.company_id WHERE i.company_id=? AND (i.storage_key=? OR i.thumbnail_key=?)',Number(match[1]),path,path);
 if(!image)return notFound();if(image.excluded||image.status!=='ACTIVE'){const user=await session(env.DB,request);if(!user||user.must_change_password||!isAdmin(user))return notFound();}
 const object=await env.PHOTOS.get('company-'+match[1]+'/'+match[2]);if(!object)return notFound();
 return new Response(request.method==='HEAD'?null:object.body,{headers:{'content-type':'image/jpeg','cache-control':'private, no-store','x-content-type-options':'nosniff','content-disposition':'inline','vary':'Cookie'}});
}
