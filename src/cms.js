import {postDashboard,postArchiveOperation} from './post-admin.js';
import {searchCheckPage} from './search-checks.js';
import {postUrl,publicationUrlStatement} from './post-urls.js';
import {scheduleIndexNow} from './indexnow.js';
import {pageCopy,repeatedPageCopy,repeatedParagraphs} from './page-copy.js';
import {localContext} from './local-context.js';
import {normalizeContactPhone} from './page-contact.js';
import {similarContent} from './content-similarity.js';
import {initialDraftText,waitingForPhotos} from './draft-state.js';
import {editPage} from './post-editor.js';
import {simplePostForm} from './editor-values.js';
import {titleFor} from './editor-title.js';
import {postArticle} from './post-article.js';
import {sortServices} from './services.js';
import {searchReadiness} from './search-readiness.js';
import {searchFields,composePage,generateDraft,targetRegionMatches} from './draft-assistant.js';
import {accountPage,resetWorkerPassword} from './account.js';
import {registerRegion} from './cms-regions.js';
import {all,first,run,decodePost} from './store.js';
import {session,login,isAdmin,digest,sessionCookie,randomToken} from './auth.js';
import {seoulDate} from './photos.js';
import {page,csrf,redirect,e} from './admin-ui.js';
import {management} from './management.js';
import {photoActions} from './uploads.js';
const labels={DRAFT:'작성 중',REVIEW:'작성 중',APPROVED:'작성 중',PUBLISHED:'발행 완료'};
const kinds=['작업사례','서비스안내','지역정보','작업팁'];
const loginPage=(message='',status=200)=>page('관리자 로그인',`<section class="cms-login panel"><h1>🔐 관리자 로그인</h1><p class="cms-help">발급받은 계정으로 로그인하세요.</p>${message?`<p class="cms-error" role="alert">${e(message)}</p>`:''}<form method="post" action="/admin/login/"><label>아이디<input name="login_id" autocomplete="username" maxlength="80" required></label><label>비밀번호<input name="password" type="password" autocomplete="current-password" maxlength="128" required></label><button>로그인</button></form><p class="cms-help">고객을 선택하고 글·사진을 작성한 뒤, 확인하고 바로 발행하세요.</p></section>`,null,status);
async function body(request){
 if(!request.headers.get('content-type')?.startsWith('application/x-www-form-urlencoded'))throw Error('올바른 입력 양식이 아닙니다.');
 const reader=request.body?.getReader();let length=0;const chunks=[];
 if(reader)while(true){const {done,value}=await reader.read();if(done)break;length+=value.byteLength;if(length>64000){await reader.cancel();throw Error('입력 용량이 너무 큽니다.');}chunks.push(value);}
 const bytes=new Uint8Array(length);let offset=0;for(const c of chunks){bytes.set(c,offset);offset+=c.length;}
 return new URLSearchParams(new TextDecoder().decode(bytes));
}
const normalize=text=>text.normalize('NFKC').replace(/\s+/g,'').toLowerCase();
export async function postValues(form){
 const title=(form.get('title')||'').trim(),summary=(form.get('summary')||'').trim(),text=(form.get('content')||'').trim();
 if(title.length<5||title.length>120)throw Error('제목은 5~120자로 입력해 주세요.');
 if(summary.length<10||summary.length>240)throw Error('요약은 10~240자로 입력해 주세요.');
 if(text.length<50||text.length>20000)throw Error('본문은 50~20,000자로 입력해 주세요.');
 const post_type=form.get('post_type');if(!kinds.includes(post_type))throw Error('글 종류를 선택해 주세요.');
 return {...searchFields(form),contact_phone:normalizeContactPhone(form.get('contact_phone')),title,summary,content:text.split(/\n\s*\n/).map(t=>t.trim()).filter(Boolean),company_id:Number(form.get('company_id')),region_id:Number(form.get('region_id')),service_id:Number(form.get('service_id')),post_type,contract_id:Number(form.get('contract_id'))||null,title_hash:await digest(normalize(title)),content_hash:await digest(normalize(text))};
}
async function choices(db,user){
 return {companies:await all(db,isAdmin(user)?"SELECT * FROM companies WHERE status='ACTIVE'":"SELECT c.* FROM companies c JOIN company_assignments a ON a.company_id=c.id WHERE a.user_id=? AND c.status='ACTIVE'",...(isAdmin(user)?[]:[user.id])),regions:await all(db,'SELECT * FROM regions ORDER BY slug'),services:sortServices(await all(db,'SELECT * FROM services WHERE deleted_at IS NULL'))};
}
async function canAccess(db,user,post){return isAdmin(user)||post.writer_id===user.id&&!!await first(db,'SELECT id FROM company_assignments WHERE user_id=? AND company_id=?',user.id,post.company_id);}
async function validateRelations(db,user,values,post={}){
 const data=await choices(db,user);
 if(values.search_region&&!targetRegionMatches(values.search_region,data.regions.find(r=>r.id===values.region_id)||{},data.companies.find(c=>c.id===values.company_id)||{}))throw Error('지역명은 선택한 작업 지역 안에서 입력해 주세요.');
 for(const [key,list] of [['company_id','companies'],['region_id','regions'],['service_id','services']])if(!data[list].some(x=>x.id===values[key]))throw Error('접근 가능한 업체·지역·업종을 선택해 주세요.');
}
async function duplicate(db,post){
 const other=await first(db,'SELECT id FROM posts WHERE deleted_at IS NULL AND id!=? AND (title_hash=? OR content_hash=?) LIMIT 1',post.id,post.title_hash,post.content_hash);
 if(other)throw Error(`제목 또는 본문이 기존 글 #${other.id}와 같습니다. 고유한 작업 내용으로 수정해 주세요.`);
 const previous=await all(db,'SELECT id,company_id,search_region,search_keyword,related_keyword,page_copy,content FROM posts WHERE deleted_at IS NULL AND company_id=? AND id!=?',post.company_id,post.id),similar=similarContent(post,previous);
 if(similar.length)throw Error(`본문이 같은 업체의 글 #${similar[0].id}와 매우 비슷합니다. 사진별 설명과 업무에 맞는 고유 내용을 보강해 주세요.`);
 const copy=pageCopy(post);if(copy){const region=await first(db,'SELECT admin_code,group_key FROM regions WHERE id=?',post.region_id);if(repeatedPageCopy(copy,previous,post.search_region,post.search_keyword).length||repeatedParagraphs(post,previous,localContext(post.search_region,region?.admin_code||region?.group_key)))throw Error('본문의 제목·구성 문구 또는 주요 문단이 기존 글과 반복됩니다. 사진과 업무에 맞는 고유 내용을 보강해 주세요.');}
}
export async function cms(request,env,ctx){
 const url=new URL(request.url),path=url.pathname,db=env.DB;
 const actionJson=request.headers.get('x-editor-action')==='1';
 const photoMatch=path.match(/^\/admin\/posts\/(\d+)\/photos\/$/);
 if(url.protocol!=='https:'&&!['localhost','127.0.0.1'].includes(url.hostname))return page('보안 연결 필요','<p>HTTPS 주소로 접속해 주세요.</p>',null,403);
 if(!db)return page('관리 준비 중','<h1>관리 기능 준비 중</h1><p>데이터베이스 연결 후 사용할 수 있습니다.</p>',null,503);
 if(!['GET','HEAD','POST'].includes(request.method))return page('허용되지 않은 요청','<p>지원하지 않는 요청입니다.</p>',null,405);
 let form;
 if(request.method==='POST'){
  if(request.headers.get('origin')!==url.origin)return page('요청 확인 실패','<p>페이지를 새로 열고 다시 시도해 주세요.</p>',null,403);
  try{if(!photoMatch)form=await body(request);}catch(error){return page('입력 오류',`<p>${e(error.message)}</p>`,null,400);}
 }
 if(path==='/admin/login/'){
  if(request.method!=='POST')return loginPage();
  const loginId=(form.get('login_id')||'').slice(0,80),password=(form.get('password')||'').slice(0,128);
  const token=await login(db,request,loginId,password);
  if(!token)return loginPage('로그인 정보를 확인해 주세요. 여러 번 실패했다면 15분 후 다시 시도해 주세요.',401);
  const response=redirect('/admin/');response.headers.set('set-cookie',sessionCookie(request,token));return response;
 }
 const user=await session(db,request);
 if(!user)return request.method==='POST'?page('로그인 필요','<p>다시 로그인해 주세요.</p>',null,401):redirect('/admin/login/');
 if(user.must_change_password&&!['/admin/account/','/admin/logout/'].includes(path))return request.method==='POST'?page('비밀번호 변경 필요','<p>임시 비밀번호를 변경한 후 이용해 주세요.</p><a href="/admin/account/">비밀번호 변경</a>',user,403):redirect('/admin/account/');
 if(photoMatch)return photoActions(request,env,user,Number(photoMatch[1]));
 if(form&&form.get('csrf')!==user.csrf)return page('요청 확인 실패','<p>페이지를 새로 열고 다시 시도해 주세요.</p>',user,403);
 if(path==='/admin/logout/'&&form){await run(db,'DELETE FROM sessions WHERE token_hash=?',user.token_hash);const response=redirect('/admin/login/');response.headers.set('set-cookie',sessionCookie(request,'',0));return response;}
 if(path==='/admin/account/')return accountPage(request,db,user,form);
 if(path==='/admin/search-readiness/')return searchReadiness(request,env,user);
 const archive=await postArchiveOperation(db,user,url,form,env,ctx);if(archive)return archive;
 const searchCheck=path.match(/^\/admin\/posts\/(\d+)\/search-check\/$/);if(searchCheck)return searchCheckPage(db,user,url,form,Number(searchCheck[1]));
 const resetMatch=path.match(/^\/admin\/users\/(\d+)\/reset-password\/$/);if(resetMatch)return resetWorkerPassword(db,user,Number(resetMatch[1]),form);
 if(/^\/admin\/(companies|users|services|contracts)\//.test(path))return management(db,user,url,form);
 if(path==='/admin/'&&!form)return postDashboard(db,user,url);
 if(path==='/admin/compose/'&&!form)return composePage(user,await choices(db,user));
 const generateMatch=path.match(/^\/admin\/posts\/(\d+)\/generate\/$/);if(generateMatch)return generateDraft(request,env,user,Number(generateMatch[1]),form);
 const match=path.match(/^\/admin\/posts\/(new|\d+)\/(status\/|history\/|preview\/|generations\/)?$/);
 if(!match)return page('페이지 없음','<h1>페이지를 찾을 수 없습니다.</h1>',user,404);
 const id=Number(match[1]),data=await choices(db,user);data.aiAvailable=!!env.AI?.run;
 let post=id?decodePost(await first(db,'SELECT p.*,u.path AS public_path FROM posts p LEFT JOIN post_urls u ON u.post_id=p.id WHERE p.id=?',id)):{};
 if(id&&(!post||post.deleted_at||!await canAccess(db,user,post)))return page('페이지 없음','<h1>게시글을 찾을 수 없습니다.</h1>',user,404);
 if(match[2]==='preview/'){
  if(form)return page('허용되지 않은 요청','<p>미리보기는 조회만 가능합니다.</p>',user,405);
  const images=await all(db,'SELECT * FROM post_images WHERE post_id=? AND excluded=0 ORDER BY sort_order,id',id);
  return page('포스팅 미리보기',`<a href="/admin/posts/${id}/">← 글 편집으로</a><h1>포스팅 미리보기</h1><p class="cms-note">마지막으로 저장한 제목·본문·사진입니다. 공개 전 글은 로그인한 관리자와 배정된 작성자만 볼 수 있습니다.</p><article class="panel prose"><h2>${e(post.title)}</h2><strong>${e(post.summary)}</strong>${postArticle(post,images,data.companies.find(company=>company.id===post.company_id),isAdmin(user))}</article>`,user);
 }
 if(match[2]==='generations/'){
  if(form)return page('허용되지 않은 요청','<p>작성 기록은 조회만 가능합니다.</p>',user,405);
  const rows=await all(db,'SELECT * FROM draft_generations WHERE post_id=? ORDER BY id DESC LIMIT 20',id);
  return page('자동 작성 기록',`<a href="/admin/posts/${id}/">← 글로 돌아가기</a><h1>자동 작성 전 내용</h1>${rows.map(row=>{const saved=JSON.parse(row.previous_content);return `<article class="cms-item"><p>${e(row.created_at)} UTC · ${e(row.state)}</p><h2>${e(saved.title)}</h2><p>${e(saved.summary)}</p><div class="cms-preview">${e(saved.content.join('\n\n'))}</div></article>`;}).join('')||'<p>작성 기록이 없습니다.</p>'}`,user);
 }
 if(match[2]==='history/'){
  if(form)return page('허용되지 않은 요청','<p>이력은 조회만 가능합니다.</p>',user,405);
  const snapshots=await all(db,'SELECT * FROM post_snapshots WHERE post_id=? ORDER BY id DESC LIMIT 20',id);
  return page('이전 공개 내용',`<a href="/admin/posts/${id}/">← 게시글로</a><h1>이전 공개 내용</h1><p class="cms-help">공개 해제 시 보관한 최근 20개 기록입니다. 원문은 변경하지 않습니다.</p>${snapshots.map(row=>{const saved=JSON.parse(row.snapshot);return `<article class="cms-item"><span class="cms-help">${e(new Intl.DateTimeFormat('ko-KR',{timeZone:'Asia/Seoul',dateStyle:'medium',timeStyle:'short'}).format(new Date(row.created_at.replace(' ','T')+'Z')))} (한국시간) · 버전 ${row.post_version}</span><h2>${e(saved.title)}</h2><p>${e(saved.summary)}</p><div class="cms-preview">${e(saved.content.join('\n\n'))}</div></article>`;}).join('')||'<p class="empty">이전 공개 기록이 없습니다.</p>'}`,user);
 }
 if(id)data.images=await all(db,'SELECT * FROM post_images WHERE post_id=? ORDER BY sort_order,id',id);
 if(!form)return match[2]?page('페이지 없음','<h1>페이지를 찾을 수 없습니다.</h1>',user,404):editPage(user,data,post,url.searchParams.has('published')?'공개 처리를 완료했습니다. 아래에서 메인 표시 상태를 확인하세요.':url.searchParams.has('saved')?'작성 내용이 저장되었습니다. 내용을 확인하고 발행해 주세요.':url.searchParams.has('generated')?'자동 작성 완료! 사진과 내용을 확인하고 발행해 주세요.':'');
 try{
  if(match[2]){
   const actions={submit:['DRAFT','REVIEW'],approve:['REVIEW','APPROVED'],publish:['APPROVED','PUBLISHED'],withdraw:['PUBLISHED','DRAFT'],return:[post.status,'DRAFT']};
   const action=form.get('action'),step=actions[action];
   if(!step||post.status!==step[0]||action==='return'&&!['REVIEW','APPROVED'].includes(post.status))throw Error('현재 상태에서 진행할 수 없는 요청입니다.');
   if(action!=='submit'&&!isAdmin(user))return page('권한 없음','<p>관리자만 승인·공개할 수 있습니다.</p>',user,403);
   if(!['return','withdraw'].includes(action)){
    if(waitingForPhotos(post))throw Error('본문은 사진을 등록하면 자동으로 생성됩니다. 사진을 먼저 등록해 주세요.');
    if(post.generation_reviewed===0)throw Error('본문 자동 작성 내용을 확인하고 확인란에 체크한 뒤 저장해 주세요.');
    // Validate persisted fields again at every pre-publication boundary.
    const check=new URLSearchParams({...post,contact_phone:post.contact_phone||'',content:post.content.join('\n\n')});
    const values=await postValues(check);await validateRelations(db,user,values,post);await duplicate(db,post);
   }
   const token=randomToken(),statement=db.prepare("UPDATE posts SET status=?,published_at=?,version=version+1,updated_at=CURRENT_TIMESTAMP,last_actor_id=?,mutation_token=? WHERE id=? AND version=? AND status=?").bind(step[1],step[1]==='PUBLISHED'?(post.published_once?post.published_at:seoulDate()):post.published_at,user.id,token,id,Number(form.get('version')),step[0]);
   const result=step[1]==='PUBLISHED'?(await db.batch([statement,await publicationUrlStatement(db,post,token)]))[0]:await statement.run();
   if(!result.meta.changes)throw Error('다른 화면에서 변경된 글입니다. 새로고침 후 확인해 주세요.');
   if(step[1]==='PUBLISHED'&&!post.sample&&data.companies.some(c=>c.id===post.company_id&&!c.sample))scheduleIndexNow(ctx,env,db,id);
   if(actionJson)return Response.json({status:step[1],version:Number(form.get('version'))+1,location:'/admin/posts/'+id+'/?'+(step[1]==='PUBLISHED'?'published=1':'updated=1'),message:step[1]==='PUBLISHED'?'공개 처리를 완료했습니다.':'상태를 변경했습니다.'},{headers:{'cache-control':'no-store'}});
  }else{
   if(id&&post.status!=='DRAFT')throw Error('작성 중인 글만 수정할 수 있습니다.');
   if(form.get('simple_editor')==='1')simplePostForm(form,data,post);
   const preparing=!id&&form.get('action')==='prepare';
   if(preparing){const target=searchFields(form);if(!target.search_region||!target.search_keyword)throw Error('지역명과 업무 키워드를 입력해 주세요.');form.set('title',titleFor(target.search_region,target.search_keyword));form.set('summary','등록할 사진을 바탕으로 지역 서비스 안내를 작성하는 중입니다.');form.set('content',initialDraftText);}
   if(id&&!form.has('contact_phone'))form.set('contact_phone',post.contact_phone||'');
   form.set('contract_id',String(id&&Number(form.get('company_id'))===post.company_id?post.contract_id||'':''));
   const values=await postValues(form);if(form.get('region_mode')==='catalog')values.region_id=await registerRegion(db,form);
   if(post.published_once&&(values.company_id!==post.company_id||values.contract_id!==post.contract_id))throw Error('기존 공개 글의 업체는 변경할 수 없습니다.');
   await validateRelations(db,user,values,post);
   const targetChanged=values.company_id!==post.company_id||values.search_region!==post.search_region||values.search_keyword!==post.search_keyword;
   const related=targetChanged?'':post.related_keyword||'',copy=targetChanged?'{}':post.page_copy||'{}';
   const args=[values.company_id,values.region_id,values.service_id,values.post_type,values.title,values.summary,JSON.stringify(values.content),values.title_hash,values.content_hash,values.contract_id,values.search_region,values.search_keyword,values.contact_phone];
   if(id){
    const confirmed=form.get('confirm_publish')==='1',publish=confirmed||form.get('publish_now')==='1',reviewed=confirmed?1:post.generation_reviewed===0&&form.get('generation_reviewed')!=='1'?0:1,company=data.companies.find(c=>c.id===values.company_id),token=randomToken();
    if(publish){
     if(!isAdmin(user))return actionJson?Response.json({error:'관리자만 메인에 공개할 수 있습니다.'},{status:403,headers:{'cache-control':'no-store'}}):page('권한 없음','<p>관리자만 공개할 수 있습니다.</p>',user,403);
     const candidate={...post,...values,related_keyword:related,page_copy:copy,generation_reviewed:reviewed};
     if(waitingForPhotos(candidate))throw Error('본문은 사진을 등록하면 자동으로 생성됩니다. 사진을 먼저 등록해 주세요.');
     if(!reviewed)throw Error('본문과 사진을 확인한 뒤 확인란에 체크해 주세요.');
     await duplicate(db,candidate);
    }
    const statement=db.prepare("UPDATE posts SET company_id=?,region_id=?,service_id=?,post_type=?,title=?,summary=?,content=?,title_hash=?,content_hash=?,contract_id=?,search_region=?,search_keyword=?,contact_phone=?,related_keyword=?,page_copy=?,generation_reviewed=?,sample=?,mutation_token=?,version=version+1,updated_at=CURRENT_TIMESTAMP,last_actor_id=? WHERE id=? AND version=? AND status='DRAFT' AND EXISTS(SELECT 1 FROM users WHERE id=? AND status='ACTIVE' AND credential_version=? AND role=?) AND EXISTS(SELECT 1 FROM companies WHERE id=? AND status='ACTIVE' AND version=?)").bind(...args,related,copy,reviewed,company.sample?1:0,token,user.id,id,Number(form.get('version')),user.id,user.credential_version,user.role,company.id,company.version);
    let result;
    if(publish){
     const publishStatement=db.prepare("UPDATE posts SET status='PUBLISHED',published_at=?,version=version+1,updated_at=CURRENT_TIMESTAMP,last_actor_id=? WHERE id=? AND mutation_token=? AND status='DRAFT'").bind(post.published_once?post.published_at:seoulDate(),user.id,id,token);
     const results=await db.batch([statement,publishStatement,await publicationUrlStatement(db,{...post,...values},token)]);result=results[0];
    }else result=await statement.run();
    if(!result.meta.changes)throw Error('다른 화면에서 변경된 글입니다. 새로고침 후 확인해 주세요.');
    if(publish){const visible=!company.sample,publicPath=(await first(db,'SELECT path FROM post_urls WHERE post_id=?',id))?.path;if(visible&&publicPath)scheduleIndexNow(ctx,env,db,id);return actionJson?Response.json({status:'PUBLISHED',version:Number(form.get('version'))+2,visible,location:'/admin/posts/'+id+'/?published=1',publicUrl:visible?postUrl({id,public_path:publicPath}):null},{headers:{'cache-control':'no-store'}}):redirect('/admin/posts/'+id+'/?published=1');}
    if(actionJson)return Response.json({status:'DRAFT',version:Number(form.get('version'))+1,previewUrl:'/admin/posts/'+id+'/preview/',location:'/admin/posts/'+id+'/?saved=1#generated-post'},{headers:{'cache-control':'no-store'}});
    if(request.headers.get('x-editor-save')==='1')return Response.json({location:'/admin/posts/'+id+'/',version:Number(form.get('version'))+1},{headers:{'cache-control':'no-store'}});
    return redirect('/admin/posts/'+id+'/?saved=1#generated-post');
   }else{
    const sample=data.companies.find(c=>c.id===values.company_id)?.sample?1:0;
    const result=await run(db,'INSERT INTO posts(company_id,region_id,service_id,post_type,title,summary,content,title_hash,content_hash,contract_id,search_region,search_keyword,contact_phone,generation_reviewed,writer_id,sample) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)',...args,preparing?0:1,user.id,sample);
    return redirect('/admin/posts/'+result.meta.last_row_id+'/');
   }
  }
  return redirect('/admin/posts/'+id+'/');
 }catch(error){
  const expected=/^(제목|요약|본문|글 종류|접근 가능한|다른 글|현재 상태|다른 화면|작성 중|지역|기존 공개|상담 전화)/.test(error.message);
  const message=expected?error.message:'저장하지 못했습니다. 로그인 상태와 중복 내용, 다른 화면에서 변경했는지 확인해 주세요.';
  if(actionJson)return Response.json({error:message,status:post.status,version:post.version},{status:409,headers:{'cache-control':'no-store'}});
  if(!match[2]&&(!id||post.status==='DRAFT'))post={...post,...Object.fromEntries(form),id:post.id,status:post.status};
  return editPage(user,data,post,message,409);
 }
}
