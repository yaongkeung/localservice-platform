import {all,first,run,decodePost} from './store.js';
import {session,login,isAdmin,digest,sessionCookie} from './auth.js';
import {seoulDate} from './photos.js';
import {css} from './styles.js';
const e=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const labels={DRAFT:'초안',REVIEW:'검수 대기',APPROVED:'승인 완료',PUBLISHED:'공개 중'};
const kinds=['작업사례','서비스안내','지역정보','작업팁'];
const adminCss=`.cms{max-width:1000px;margin:32px auto;padding:0 18px}.cms-head{display:flex;align-items:center;justify-content:space-between;gap:15px;flex-wrap:wrap;margin-bottom:28px}.cms-head h1{font-size:26px;margin:0}.cms-nav{display:flex;gap:18px;align-items:center;flex-wrap:wrap}.cms form{margin:0}.cms-grid{display:grid;grid-template-columns:1fr 1fr;gap:18px}.cms label{display:block;font-weight:650;margin:0 0 18px}.cms input,.cms select,.cms textarea{display:block;width:100%;padding:12px;border:1px solid #c7d6de;border-radius:7px;background:white;margin-top:7px;font:inherit;color:#19364c}.cms textarea{resize:vertical;min-height:230px;line-height:1.8}.cms .full{grid-column:1/-1}.cms-actions{display:flex;gap:12px;flex-wrap:wrap;align-items:center;margin:22px 0}.cms button{padding:12px 18px;border:0;border-radius:7px;font:inherit;font-weight:700;background:#246d83;color:white;cursor:pointer}.cms .secondary{background:#eef4f8;color:#24435a}.cms-error{padding:16px;background:#fff0ec;border-left:4px solid #e4805e;line-height:1.7;margin:20px 0}.cms-note{padding:16px;background:#eaf7f5;color:#275f64;border-radius:7px;line-height:1.7;margin:20px 0}.cms-list{display:grid;gap:12px}.cms-item{border:1px solid #dce6eb;border-radius:10px;padding:18px;background:#fff}.cms-item h2{font-size:17px;margin:10px 0}.cms-status{display:inline-block;background:#e9f3fb;color:#276681;border-radius:20px;padding:5px 12px;font-size:12px}.cms-status.REVIEW{background:#fff0d7;color:#855f21}.cms-status.APPROVED{background:#e1f6ec;color:#277056}.cms-status.PUBLISHED{background:#eae4fa;color:#615384}.cms-login{max-width:430px;margin:70px auto}.cms-help{font-size:13px;color:#647887;line-height:1.7}.cms-counts{display:flex;gap:12px;flex-wrap:wrap;margin:24px 0}.cms-counts a{border:1px solid #d7e4ea;padding:10px 16px;border-radius:8px;background:white}.cms .panel{padding:24px}.cms-preview{white-space:pre-wrap;line-height:1.9;overflow-wrap:anywhere}@media(max-width:600px){.cms{margin-top:22px}.cms-grid{grid-template-columns:1fr}.cms-head h1{font-size:23px}.cms .panel{padding:18px}.cms-nav{font-size:14px}}`;
function page(title,body,user,status=200){return new Response(`<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>${e(title)} · 공사8282 관리</title><style>${css}${adminCss}</style></head><body><main class="cms"><header class="cms-head"><a class="brand" href="/admin/">공사<span>8282</span><small>콘텐츠 관리</small></a><nav class="cms-nav"><a href="/">포털 보기 ↗</a>${user?`<span>${e(user.name)} · ${isAdmin(user)?'관리자':'작업자'}</span><form method="post" action="/admin/logout/">${csrf(user)}<button class="secondary">로그아웃</button></form>`:''}</nav></header>${body}</main></body></html>`,{status,headers:{'content-type':'text/html; charset=utf-8','cache-control':'no-store','x-robots-tag':'noindex, nofollow','x-content-type-options':'nosniff','referrer-policy':'same-origin','content-security-policy':"default-src 'none'; style-src 'unsafe-inline'; img-src 'self'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'"}});}
const csrf=user=>`<input type="hidden" name="csrf" value="${e(user.csrf)}">`;
const redirect=path=>new Response(null,{status:303,headers:{location:path,'cache-control':'no-store'}});
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
 return {title,summary,content:text.split(/\n\s*\n/).map(t=>t.trim()).filter(Boolean),company_id:Number(form.get('company_id')),region_id:Number(form.get('region_id')),service_id:Number(form.get('service_id')),post_type,title_hash:await digest(normalize(title)),content_hash:await digest(normalize(text))};
}
async function choices(db,user){
 return {companies:await all(db,isAdmin(user)?"SELECT * FROM companies WHERE status='ACTIVE'":"SELECT c.* FROM companies c JOIN company_assignments a ON a.company_id=c.id WHERE a.user_id=? AND c.status='ACTIVE'",...(isAdmin(user)?[]:[user.id])),regions:await all(db,'SELECT * FROM regions ORDER BY slug'),services:await all(db,'SELECT * FROM services ORDER BY id')};
}
async function canAccess(db,user,post){return isAdmin(user)||post.writer_id===user.id&&!!await first(db,'SELECT id FROM company_assignments WHERE user_id=? AND company_id=?',user.id,post.company_id);}
async function validateRelations(db,user,values){
 const data=await choices(db,user);
 for(const [key,list] of [['company_id','companies'],['region_id','regions'],['service_id','services']])if(!data[list].some(x=>x.id===values[key]))throw Error('접근 가능한 업체·지역·업종을 선택해 주세요.');
}
async function duplicate(db,post){
 const other=await first(db,'SELECT id FROM posts WHERE id!=? AND (title_hash=? OR content_hash=?) LIMIT 1',post.id,post.title_hash,post.content_hash);
 if(other)throw Error(`제목 또는 본문이 기존 글 #${other.id}와 같습니다. 고유한 작업 내용으로 수정해 주세요.`);
 const same=await first(db,'SELECT a.id FROM post_images a JOIN post_images b ON a.content_hash=b.content_hash WHERE a.post_id=? AND b.post_id!=a.post_id AND a.content_hash IS NOT NULL LIMIT 1',post.id);
 if(same)throw Error('다른 글과 동일한 사진이 있습니다. 사진을 확인해 주세요.');
}
function editPage(user,data,post={},message='',status=200){
 const editable=!post.id||post.status==='DRAFT';
 const opts=(rows,selected,label='name')=>rows.map(x=>`<option value="${x.id}" ${x.id===Number(selected)?'selected':''}>${e(x[label])}</option>`).join('');
 const values={...post,content:Array.isArray(post.content)?post.content.join('\n\n'):post.content};
 const regionOptions=data.regions.map(region=>{const parts=[region.name],seen=new Set([region.id]);let current=region;while(current.parent_id){current=data.regions.find(r=>r.id===current.parent_id);if(!current||seen.has(current.id))break;seen.add(current.id);parts.unshift(current.name);}return {...region,label:parts.join(' > ')};});
 const transition=(action,label)=>`<form method="post" action="/admin/posts/${post.id}/status/">${csrf(user)}<input type="hidden" name="version" value="${post.version}"><input type="hidden" name="action" value="${action}"><button ${action==='return'?'class="secondary"':''}>${label}</button></form>`;
 return page(post.id?'게시글 관리':'새 글 쓰기',`<a href="/admin/">← 글 목록</a><h1>${post.id?'게시글 #'+post.id:'✍️ 새 글 쓰기'}</h1>${post.status?`<span class="cms-status ${post.status}">${labels[post.status]}</span>`:''}${message?`<p class="cms-error" role="alert">${e(message)}</p>`:''}<p class="cms-note">공개 전에는 포털에 표시되지 않습니다. 사진 업로드는 다음 단계에서 연결합니다.${post.sample?' 이 글은 샘플 콘텐츠입니다.':''}</p>${editable?`<form method="post" action="/admin/posts/${post.id?post.id+'/':'new/'}">${csrf(user)}<input type="hidden" name="version" value="${post.version||0}"><section class="panel cms-grid"><label>업체<select name="company_id" required><option value="">업체 선택</option>${opts(data.companies,post.company_id)}</select></label><label>글 종류<select name="post_type">${kinds.map(k=>`<option ${k===post.post_type?'selected':''}>${k}</option>`).join('')}</select></label><label>지역<select name="region_id" required><option value="">지역 선택</option>${opts(regionOptions,post.region_id,'label')}</select></label><label>업종<select name="service_id" required><option value="">업종 선택</option>${opts(data.services,post.service_id)}</select></label><label class="full">제목<input name="title" value="${e(values.title)}" minlength="5" maxlength="120" required></label><label class="full">요약<input name="summary" value="${e(values.summary)}" minlength="10" maxlength="240" required></label><label class="full">본문<textarea name="content" minlength="50" maxlength="20000" required>${e(values.content)}</textarea><span class="cms-help">실제 작업 내용과 과정, 확인 결과를 작성해 주세요. 문단은 빈 줄로 구분합니다.</span></label></section><div class="cms-actions"><button>💾 초안 저장</button><span class="cms-help">저장 후 검수를 요청할 수 있습니다.</span></div></form>`:`<article class="panel"><h2>${e(post.title)}</h2><strong>${e(post.summary)}</strong><div class="cms-preview">${e(values.content)}</div></article>`}<div class="cms-actions">${post.id&&post.status==='DRAFT'?transition('submit','📨 검수 요청'):''}${isAdmin(user)&&post.status==='REVIEW'?transition('approve','✅ 승인')+transition('return','초안으로 반려'):''}${isAdmin(user)&&post.status==='APPROVED'?transition('publish','🌿 포털에 공개')+transition('return','초안으로 돌리기'):''}${post.status==='PUBLISHED'?`<a class="button" href="/post/${post.id}/">공개 게시글 보기 ↗</a><p class="cms-help">공개 글의 수정·공개 해제는 후속 기능입니다.</p>`:''}</div>`,user,status);
}
async function dashboard(db,user,url){
 const args=isAdmin(user)?[]:[user.id,user.id];
 const posts=await all(db,`SELECT p.*,c.name AS company_name FROM posts p JOIN companies c ON c.id=p.company_id ${isAdmin(user)?'':'WHERE p.writer_id=? AND EXISTS(SELECT 1 FROM company_assignments a WHERE a.user_id=? AND a.company_id=p.company_id)'} ORDER BY p.updated_at DESC,p.id DESC`,...args);
 const filter=url.searchParams.get('status');const list=filter?posts.filter(p=>p.status===filter):posts;
 return page('콘텐츠 관리',`<div class="cms-head"><div><h1>🗂️ 게시글 관리</h1><p class="cms-help">작성부터 공개까지, 단계별로 확인하세요.</p></div><a class="button" href="/admin/posts/new/">＋ 새 글 쓰기</a></div><nav class="cms-counts" aria-label="상태 필터"><a href="/admin/">전체 ${posts.length}</a>${Object.entries(labels).map(([key,label])=>`<a href="/admin/?status=${key}">${label} ${posts.filter(p=>p.status===key).length}</a>`).join('')}</nav><div class="cms-list">${list.map(p=>`<article class="cms-item"><span class="cms-status ${p.status}">${labels[p.status]}</span><h2><a href="/admin/posts/${p.id}/">${e(p.title)}</a></h2><span class="cms-help">#${p.id} · ${e(p.company_name)} · ${e(p.post_type)}${p.sample?' · 샘플':''}</span></article>`).join('')||'<p class="empty">이 단계의 글이 없습니다. 새 글을 작성해 보세요.</p>'}</div>`,user);
}
export async function cms(request,env){
 const url=new URL(request.url),path=url.pathname,db=env.DB;
 if(url.protocol!=='https:'&&!['localhost','127.0.0.1'].includes(url.hostname))return page('보안 연결 필요','<p>HTTPS 주소로 접속해 주세요.</p>',null,403);
 if(!db)return page('관리 준비 중','<h1>관리 기능 준비 중</h1><p>데이터베이스 연결 후 사용할 수 있습니다.</p>',null,503);
 if(!['GET','HEAD','POST'].includes(request.method))return page('허용되지 않은 요청','<p>지원하지 않는 요청입니다.</p>',null,405);
 let form;
 if(request.method==='POST'){
  if(request.headers.get('origin')!==url.origin)return page('요청 확인 실패','<p>페이지를 새로 열고 다시 시도해 주세요.</p>',null,403);
  try{form=await body(request);}catch(error){return page('입력 오류',`<p>${e(error.message)}</p>`,null,400);}
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
 if(form&&form.get('csrf')!==user.csrf)return page('요청 확인 실패','<p>페이지를 새로 열고 다시 시도해 주세요.</p>',user,403);
 if(path==='/admin/logout/'&&form){await run(db,'DELETE FROM sessions WHERE token_hash=?',user.token_hash);const response=redirect('/admin/login/');response.headers.set('set-cookie',sessionCookie(request,'',0));return response;}
 if(path==='/admin/'&&!form)return dashboard(db,user,url);
 const match=path.match(/^\/admin\/posts\/(new|\d+)\/(status\/)?$/);
 if(!match)return page('페이지 없음','<h1>페이지를 찾을 수 없습니다.</h1>',user,404);
 const id=Number(match[1]),data=await choices(db,user);
 let post=id?decodePost(await first(db,'SELECT * FROM posts WHERE id=?',id)):{};
 if(id&&(!post||!await canAccess(db,user,post)))return page('페이지 없음','<h1>게시글을 찾을 수 없습니다.</h1>',user,404);
 if(!form)return match[2]?page('페이지 없음','<h1>페이지를 찾을 수 없습니다.</h1>',user,404):editPage(user,data,post);
 try{
  if(match[2]){
   const actions={submit:['DRAFT','REVIEW'],approve:['REVIEW','APPROVED'],publish:['APPROVED','PUBLISHED'],return:[post.status,'DRAFT']};
   const action=form.get('action'),step=actions[action];
   if(!step||post.status!==step[0]||action==='return'&&!['REVIEW','APPROVED'].includes(post.status))throw Error('현재 상태에서 진행할 수 없는 요청입니다.');
   if(action!=='submit'&&!isAdmin(user))return page('권한 없음','<p>관리자만 승인·공개할 수 있습니다.</p>',user,403);
   if(action!=='return'){
    // Validate persisted fields again at every pre-publication boundary.
    const check=new URLSearchParams({...post,content:post.content.join('\n\n')});
    const values=await postValues(check);await validateRelations(db,user,values);await duplicate(db,post);
   }
   const result=await run(db,"UPDATE posts SET status=?,published_at=?,version=version+1,updated_at=CURRENT_TIMESTAMP,last_actor_id=? WHERE id=? AND version=? AND status=?",step[1],step[1]==='PUBLISHED'?seoulDate():post.published_at,user.id,id,Number(form.get('version')),step[0]);
   if(!result.meta.changes)throw Error('다른 화면에서 변경된 글입니다. 새로고침 후 확인해 주세요.');
  }else{
   if(id&&post.status!=='DRAFT')throw Error('초안 상태의 글만 수정할 수 있습니다.');
   const values=await postValues(form);await validateRelations(db,user,values);
   const args=[values.company_id,values.region_id,values.service_id,values.post_type,values.title,values.summary,JSON.stringify(values.content),values.title_hash,values.content_hash];
   if(id){
    const result=await run(db,"UPDATE posts SET company_id=?,region_id=?,service_id=?,post_type=?,title=?,summary=?,content=?,title_hash=?,content_hash=?,version=version+1,updated_at=CURRENT_TIMESTAMP,last_actor_id=? WHERE id=? AND version=? AND status='DRAFT'",...args,user.id,id,Number(form.get('version')));
    if(!result.meta.changes)throw Error('다른 화면에서 변경된 글입니다. 새로고침 후 확인해 주세요.');
   }else{
    const sample=data.companies.find(c=>c.id===values.company_id)?.sample?1:0;
    const result=await run(db,'INSERT INTO posts(company_id,region_id,service_id,post_type,title,summary,content,title_hash,content_hash,writer_id,sample) VALUES(?,?,?,?,?,?,?,?,?,?,?)',...args,user.id,sample);
    return redirect('/admin/posts/'+result.meta.last_row_id+'/');
   }
  }
  return redirect('/admin/posts/'+id+'/');
 }catch(error){
  const expected=/^(제목|요약|본문|글 종류|접근 가능한|다른 글|현재 상태|다른 화면|초안 상태)/.test(error.message);
  const message=expected?error.message:'저장하지 못했습니다. 입력 내용과 중복 여부를 확인해 주세요.';
  if(!match[2]&&(!id||post.status==='DRAFT'))post={...post,...Object.fromEntries(form),id:post.id,status:post.status};
  return editPage(user,data,post,message,409);
 }
}
