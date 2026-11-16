import {postContent} from './post-content.js';
import {searchFields,composePage,assistantPanel,generateDraft,targetRegionMatches} from './draft-assistant.js';
import {accountPage,resetWorkerPassword} from './account.js';
import {cmsRegionPicker,registerRegion} from './cms-regions.js';
import {all,first,run,decodePost} from './store.js';
import {session,login,isAdmin,digest,sessionCookie} from './auth.js';
import {seoulDate} from './photos.js';
import {page,csrf,redirect,e} from './admin-ui.js';
import {management} from './management.js';
import {photoActions,photoPanel} from './uploads.js';
const labels={DRAFT:'초안',REVIEW:'검수 대기',APPROVED:'승인 완료',PUBLISHED:'공개 중'};
const kinds=['작업사례','서비스안내','지역정보','작업팁'];
const loginPage=(message='',status=200)=>page('관리자 로그인',`<section class="cms-login panel"><h1>🔐 관리자 로그인</h1><p class="cms-help">발급받은 계정으로 로그인하세요.</p>${message?`<p class="cms-error" role="alert">${e(message)}</p>`:''}<form method="post" action="/admin/login/"><label>아이디<input name="login_id" autocomplete="username" maxlength="80" required></label><label>비밀번호<input name="password" type="password" autocomplete="current-password" maxlength="128" required></label><button>로그인</button></form><p class="cms-help">초안 → 검수 → 승인 → 공개 순서로 콘텐츠를 관리합니다.</p></section>`,null,status);
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
 return {...searchFields(form),title,summary,content:text.split(/\n\s*\n/).map(t=>t.trim()).filter(Boolean),company_id:Number(form.get('company_id')),region_id:Number(form.get('region_id')),service_id:Number(form.get('service_id')),post_type,contract_id:Number(form.get('contract_id'))||null,title_hash:await digest(normalize(title)),content_hash:await digest(normalize(text))};
}
async function choices(db,user){
 return {companies:await all(db,isAdmin(user)?"SELECT * FROM companies WHERE status='ACTIVE'":"SELECT c.* FROM companies c JOIN company_assignments a ON a.company_id=c.id WHERE a.user_id=? AND c.status='ACTIVE'",...(isAdmin(user)?[]:[user.id])),regions:await all(db,'SELECT * FROM regions ORDER BY slug'),services:await all(db,'SELECT * FROM services ORDER BY id'),contracts:await all(db,'SELECT * FROM contracts ORDER BY id DESC')};
}
async function canAccess(db,user,post){return isAdmin(user)||post.writer_id===user.id&&!!await first(db,'SELECT id FROM company_assignments WHERE user_id=? AND company_id=?',user.id,post.company_id);}
async function validateRelations(db,user,values,post={}){
 const data=await choices(db,user);
 if(values.contract_id&&!data.contracts.some(c=>c.id===values.contract_id&&c.company_id===values.company_id&&(c.status==='ACTIVE'||post.published_once&&post.contract_id===c.id)))throw Error('접근 가능한 업체의 진행 중 계약을 선택해 주세요.');
 if(values.search_region&&!targetRegionMatches(values.search_region,data.regions.find(r=>r.id===values.region_id)||{},data.companies.find(c=>c.id===values.company_id)||{}))throw Error('지역명은 선택한 작업 지역 안에서 입력해 주세요.');
 for(const [key,list] of [['company_id','companies'],['region_id','regions'],['service_id','services']])if(!data[list].some(x=>x.id===values[key]))throw Error('접근 가능한 업체·지역·업종을 선택해 주세요.');
}
async function duplicate(db,post){
 const other=await first(db,'SELECT id FROM posts WHERE id!=? AND (title_hash=? OR content_hash=?) LIMIT 1',post.id,post.title_hash,post.content_hash);
 if(other)throw Error(`제목 또는 본문이 기존 글 #${other.id}와 같습니다. 고유한 작업 내용으로 수정해 주세요.`);
 const same=await first(db,'SELECT a.id FROM post_images a JOIN post_images b ON a.content_hash=b.content_hash WHERE a.post_id=? AND b.post_id!=a.post_id AND a.excluded=0 AND b.excluded=0 AND a.content_hash IS NOT NULL LIMIT 1',post.id);
 if(same)throw Error('다른 글과 동일한 사진이 있습니다. 사진을 확인해 주세요.');
}
function editPage(user,data,post={},message='',status=200){
 const editable=!post.id||post.status==='DRAFT';
 const opts=(rows,selected,label='name')=>rows.map(x=>`<option value="${x.id}" ${x.id===Number(selected)?'selected':''}>${e(x[label])}</option>`).join('');
 const values={...post,content:Array.isArray(post.content)?post.content.join('\n\n'):post.content};
 const transition=(action,label)=>`<form method="post" action="/admin/posts/${post.id}/status/">${csrf(user)}<input type="hidden" name="version" value="${post.version}"><input type="hidden" name="action" value="${action}"><button ${action==='return'?'class="secondary"':''}>${label}</button></form>`;
 return page(post.id?'게시글 관리':'새 글 쓰기',`<a href="/admin/">← 글 목록</a><h1>${post.id?'게시글 #'+post.id:'✍️ 새 글 쓰기'}</h1>${post.status?`<span class="cms-status ${post.status}">${labels[post.status]}</span>`:''}${message?`<p class="cms-error" role="alert">${e(message)}</p>`:''}<p class="cms-note">공개 전에는 포털에 표시되지 않습니다. 사진과 계약 정보를 확인한 후 검수를 요청해 주세요.${post.sample?' 이 글은 샘플 콘텐츠입니다.':''}</p>${editable?`<form method="post" action="/admin/posts/${post.id?post.id+'/':'new/'}">${csrf(user)}<input type="hidden" name="version" value="${post.version||0}">${post.published_once?`<input type="hidden" name="company_id" value="${post.company_id}"><input type="hidden" name="contract_id" value="${post.contract_id||''}"><p class="cms-note">기존 글 주소와 최초 업체·계약을 유지합니다. 재공개 시 계약 수량을 추가로 차감하지 않습니다.</p>`:''}<section class="panel cms-grid"><label>업체<select name="company_id" required ${post.published_once?'disabled':''}><option value="">업체 선택</option>${opts(data.companies,post.company_id)}</select></label><label>계약<select name="contract_id" ${post.published_once?'disabled':''}><option value="">계약 미지정 (샘플 또는 작성 중)</option>${(data.contracts||[]).filter(c=>data.companies.some(x=>x.id===c.company_id)&&(c.status==='ACTIVE'||post.contract_id===c.id)).map(c=>`<option value="${c.id}" ${Number(post.contract_id)===c.id?'selected':''}>${e(data.companies.find(x=>x.id===c.company_id)?.name)} · ${e(c.package_name)} (${c.published_quantity}/${c.contract_quantity})</option>`).join('')}</select></label><label>글 종류<select name="post_type">${kinds.map(k=>`<option ${k===post.post_type?'selected':''}>${k}</option>`).join('')}</select></label>${cmsRegionPicker(post,data.regions)}<label>업종<select name="service_id" required><option value="">업종 선택</option>${opts(data.services,post.service_id)}</select></label><label>제목에 쓸 지역명<input name="search_region" value="${e(post.search_region)}" placeholder="예: 사우동" minlength="2" maxlength="40"></label><label>대표 업무 키워드<input name="search_keyword" value="${e(post.search_keyword)}" placeholder="예: 방충망 교체" minlength="2" maxlength="40"></label><label class="full">제목<input name="title" value="${e(values.title)}" minlength="5" maxlength="120" required></label><label class="full">요약<input name="summary" value="${e(values.summary)}" minlength="10" maxlength="240" required></label><label class="full">본문<textarea name="content" minlength="50" maxlength="20000" required>${e(values.content)}</textarea><span class="cms-help">실제 작업 내용과 과정, 확인 결과를 작성해 주세요. 문단은 빈 줄로 구분합니다. **업무명**은 굵게, ## 소제목은 제목으로 표시합니다. 사진을 등록한 뒤 ‘본문에 넣기’를 누르면 커서 위치에 사진을 배치합니다.</span></label>${post.generation_reviewed===0?'<label class="full"><input style="width:auto;display:inline" type="checkbox" name="generation_reviewed" value="1"> 자동 작성 내용을 읽고 사진·지역·업무 사실을 확인했습니다.</label>':''}</section><div class="cms-actions"><button>💾 초안 저장</button><span class="cms-help">저장 후 검수를 요청할 수 있습니다.</span></div></form>`:`<article class="panel"><h2>${e(post.title)}</h2><strong>${e(post.summary)}</strong>${postContent(post,data.images||[])}</article>`}${post.id?`<p><a href="/admin/posts/${post.id}/preview/">저장된 글 미리보기</a> · <a href="/admin/posts/${post.id}/history/">이전 공개 내용 보기</a></p>`:''}${photoPanel(user,post,data.images||[],data.aiAvailable)}${assistantPanel(user,post,data.aiAvailable)}<div class="cms-actions">${post.id&&post.status==='DRAFT'?transition('submit','📨 검수 요청'):''}${isAdmin(user)&&post.status==='REVIEW'?transition('approve','✅ 승인')+transition('return','초안으로 반려'):''}${isAdmin(user)&&post.status==='APPROVED'?transition('publish','🌿 포털에 공개')+transition('return','초안으로 돌리기'):''}${post.status==='PUBLISHED'?`<a class="button" href="/post/${post.id}/">공개 게시글 보기 ↗</a>${isAdmin(user)?transition('withdraw','공개 해제하고 수정'):''}<p class="cms-help">공개 해제 시 포털에서 숨기고 초안으로 돌립니다. 이전 내용은 보관하며 계약 사용 수량은 유지합니다.</p>`:''}</div>`,user,status);
}
async function dashboard(db,user,url){
 const args=isAdmin(user)?[]:[user.id,user.id];
 const posts=await all(db,`SELECT p.*,c.name AS company_name FROM posts p JOIN companies c ON c.id=p.company_id ${isAdmin(user)?'':'WHERE p.writer_id=? AND EXISTS(SELECT 1 FROM company_assignments a WHERE a.user_id=? AND a.company_id=p.company_id)'} ORDER BY p.updated_at DESC,p.id DESC`,...args);
 const filter=url.searchParams.get('status');const list=filter?posts.filter(p=>p.status===filter):posts;
 return page('콘텐츠 관리',`<div class="cms-head"><div><h1>🗂️ 게시글 관리</h1><p class="cms-help">작성부터 공개까지, 단계별로 확인하세요.</p></div><a class="button" href="/admin/compose/">✨ 사진으로 새 글 쓰기</a><a href="/admin/posts/new/">직접 작성</a></div><nav class="cms-counts" aria-label="상태 필터"><a href="/admin/">전체 ${posts.length}</a>${Object.entries(labels).map(([key,label])=>`<a href="/admin/?status=${key}">${label} ${posts.filter(p=>p.status===key).length}</a>`).join('')}</nav><div class="cms-list">${list.map(p=>`<article class="cms-item"><span class="cms-status ${p.status}">${labels[p.status]}</span><h2><a href="/admin/posts/${p.id}/">${e(p.title)}</a></h2><span class="cms-help">#${p.id} · ${e(p.company_name)} · ${e(p.post_type)}${p.sample?' · 샘플':''}</span></article>`).join('')||'<p class="empty">이 단계의 글이 없습니다. 새 글을 작성해 보세요.</p>'}</div>`,user);
}
export async function cms(request,env){
 const url=new URL(request.url),path=url.pathname,db=env.DB;
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
 const resetMatch=path.match(/^\/admin\/users\/(\d+)\/reset-password\/$/);if(resetMatch)return resetWorkerPassword(db,user,Number(resetMatch[1]),form);
 if(/^\/admin\/(companies|users|services|contracts)\//.test(path))return management(db,user,url,form);
 if(path==='/admin/'&&!form)return dashboard(db,user,url);
 if(path==='/admin/compose/'&&!form)return composePage(user,await choices(db,user));
 const generateMatch=path.match(/^\/admin\/posts\/(\d+)\/generate\/$/);if(generateMatch)return generateDraft(request,env,user,Number(generateMatch[1]),form);
 const match=path.match(/^\/admin\/posts\/(new|\d+)\/(status\/|history\/|preview\/|generations\/)?$/);
 if(!match)return page('페이지 없음','<h1>페이지를 찾을 수 없습니다.</h1>',user,404);
 const id=Number(match[1]),data=await choices(db,user);data.aiAvailable=!!env.AI?.run;
 let post=id?decodePost(await first(db,'SELECT * FROM posts WHERE id=?',id)):{};
 if(id&&(!post||!await canAccess(db,user,post)))return page('페이지 없음','<h1>게시글을 찾을 수 없습니다.</h1>',user,404);
 if(match[2]==='preview/'){
  if(form)return page('허용되지 않은 요청','<p>미리보기는 조회만 가능합니다.</p>',user,405);
  const images=await all(db,'SELECT * FROM post_images WHERE post_id=? AND excluded=0 ORDER BY sort_order,id',id);
  return page('포스팅 미리보기',`<a href="/admin/posts/${id}/">← 글 편집으로</a><h1>포스팅 미리보기</h1><p class="cms-note">마지막으로 저장한 제목·본문·사진입니다. 공개 전 글은 로그인한 관리자와 배정된 작성자만 볼 수 있습니다.</p><article class="panel prose"><h2>${e(post.title)}</h2><strong>${e(post.summary)}</strong>${postContent(post,images)}</article>`,user);
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
 if(!form)return match[2]?page('페이지 없음','<h1>페이지를 찾을 수 없습니다.</h1>',user,404):editPage(user,data,post);
 try{
  if(match[2]){
   const actions={submit:['DRAFT','REVIEW'],approve:['REVIEW','APPROVED'],publish:['APPROVED','PUBLISHED'],withdraw:['PUBLISHED','DRAFT'],return:[post.status,'DRAFT']};
   const action=form.get('action'),step=actions[action];
   if(!step||post.status!==step[0]||action==='return'&&!['REVIEW','APPROVED'].includes(post.status))throw Error('현재 상태에서 진행할 수 없는 요청입니다.');
   if(action!=='submit'&&!isAdmin(user))return page('권한 없음','<p>관리자만 승인·공개할 수 있습니다.</p>',user,403);
   if(!['return','withdraw'].includes(action)){
    if(post.generation_reviewed===0)throw Error('본문 자동 작성 내용을 확인하고 확인란에 체크한 뒤 저장해 주세요.');
    if(action==='publish'&&!data.companies.find(c=>c.id===post.company_id)?.sample&&!post.contract_id)throw Error('접근 가능한 업체의 진행 중 계약을 지정해 주세요.');
    // Validate persisted fields again at every pre-publication boundary.
    const check=new URLSearchParams({...post,content:post.content.join('\n\n')});
    const values=await postValues(check);await validateRelations(db,user,values,post);await duplicate(db,post);
   }
   const result=await run(db,"UPDATE posts SET status=?,published_at=?,version=version+1,updated_at=CURRENT_TIMESTAMP,last_actor_id=? WHERE id=? AND version=? AND status=?",step[1],step[1]==='PUBLISHED'?(post.published_once?post.published_at:seoulDate()):post.published_at,user.id,id,Number(form.get('version')),step[0]);
   if(!result.meta.changes)throw Error('다른 화면에서 변경된 글입니다. 새로고침 후 확인해 주세요.');
  }else{
   if(id&&post.status!=='DRAFT')throw Error('초안 상태의 글만 수정할 수 있습니다.');
   const preparing=!id&&form.get('action')==='prepare';
   if(preparing){const target=searchFields(form);if(!target.search_region||!target.search_keyword)throw Error('지역명과 업무 키워드를 입력해 주세요.');form.set('title',target.search_region+' '+target.search_keyword+' · 사진 등록 후 작성할 초안');form.set('summary','등록할 사진을 바탕으로 지역 서비스 안내를 작성하는 중입니다.');form.set('content','사진을 등록한 뒤 사진으로 본문 작성을 진행해 주세요. 자동 작성한 제목과 본문, 사진에 대한 설명을 확인하고 사실에 맞게 수정한 후에 검수를 요청할 수 있습니다.');}
   const values=await postValues(form);if(form.get('region_mode')==='catalog')values.region_id=await registerRegion(db,form);
   if(post.published_once&&(values.company_id!==post.company_id||values.contract_id!==post.contract_id))throw Error('기존 공개 글의 업체와 계약은 변경할 수 없습니다.');
   await validateRelations(db,user,values,post);
   const args=[values.company_id,values.region_id,values.service_id,values.post_type,values.title,values.summary,JSON.stringify(values.content),values.title_hash,values.content_hash,values.contract_id,values.search_region,values.search_keyword];
   if(id){
    const result=await run(db,"UPDATE posts SET company_id=?,region_id=?,service_id=?,post_type=?,title=?,summary=?,content=?,title_hash=?,content_hash=?,contract_id=?,search_region=?,search_keyword=?,generation_reviewed=?,sample=?,version=version+1,updated_at=CURRENT_TIMESTAMP,last_actor_id=? WHERE id=? AND version=? AND status='DRAFT'",...args,post.generation_reviewed===0&&form.get('generation_reviewed')!=='1'?0:1,data.companies.find(c=>c.id===values.company_id)?.sample?1:0,user.id,id,Number(form.get('version')));
    if(!result.meta.changes)throw Error('다른 화면에서 변경된 글입니다. 새로고침 후 확인해 주세요.');
   }else{
    const sample=data.companies.find(c=>c.id===values.company_id)?.sample?1:0;
    const result=await run(db,'INSERT INTO posts(company_id,region_id,service_id,post_type,title,summary,content,title_hash,content_hash,contract_id,search_region,search_keyword,generation_reviewed,writer_id,sample) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)',...args,preparing?0:1,user.id,sample);
    return redirect('/admin/posts/'+result.meta.last_row_id+'/');
   }
  }
  return redirect('/admin/posts/'+id+'/');
 }catch(error){
  const expected=/^(제목|요약|본문|글 종류|접근 가능한|다른 글|현재 상태|다른 화면|초안 상태|지역|기존 공개)/.test(error.message);
  const message=expected?error.message:'저장하지 못했습니다. 중복 여부와 계약 기간·잔여 수량을 확인해 주세요.';
  if(!match[2]&&(!id||post.status==='DRAFT'))post={...post,...Object.fromEntries(form),id:post.id,status:post.status};
  return editPage(user,data,post,message,409);
 }
}
