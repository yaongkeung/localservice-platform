import {first} from './store.js';
import {hashPassword,verifyPassword,randomToken,isAdmin,sessionCookie,consumeAttempt} from './auth.js';
import {page,csrf,e,redirect} from './admin-ui.js';
export async function rotateCredential(db,target,actor,password,action,mustChange){
 const token=randomToken(),hash=await hashPassword(password);
 const result=await db.batch([
  db.prepare("UPDATE users SET password_hash=?,must_change_password=?,credential_version=credential_version+1,password_changed_at=CURRENT_TIMESTAMP,version=version+1,mutation_token=? WHERE id=? AND credential_version=? AND version=? AND status='ACTIVE' AND EXISTS(SELECT 1 FROM users actor WHERE actor.id=? AND actor.status='ACTIVE' AND actor.credential_version=? AND (?!='RESET' OR actor.role IN ('SUPER_ADMIN','ADMIN')))").bind(hash,mustChange?1:0,token,target.id,target.credential_version,target.version,actor.id,actor.credential_version,action),
  db.prepare('DELETE FROM sessions WHERE user_id=? AND EXISTS(SELECT 1 FROM users WHERE id=? AND mutation_token=?)').bind(target.id,target.id,token),
  db.prepare('INSERT INTO credential_events(user_id,actor_id,action,credential_version) SELECT id,?,?,credential_version FROM users WHERE id=? AND mutation_token=?').bind(actor.id,action,target.id,token)
 ]);
 if(!result[0].meta.changes)throw Error('계정이 다른 화면에서 변경되었습니다. 새로 로그인한 후 다시 시도해 주세요.');
}
async function reauthenticate(db,user,password){
 if(!await consumeAttempt(db,'reauth:'+user.id,5))throw Error('확인 시도가 많습니다. 15분 후 다시 시도해 주세요.');
 const current=await first(db,"SELECT * FROM users WHERE id=? AND status='ACTIVE'",user.id);
 if(!current||current.credential_version!==user.credential_version||!await verifyPassword(password,current.password_hash))throw Error('현재 비밀번호를 확인해 주세요.');
 return current;
}
export async function accountPage(request,db,user,form){
 let error='';
 if(form)try{
  const current=form.get('current_password')||'',next=form.get('new_password')||'',again=form.get('confirm_password')||'';
  if(current.length>128||next.length<15||next.length>128)throw Error('새 비밀번호는 15~128자로 입력해 주세요.');
  if(next!==again)throw Error('새 비밀번호와 확인 입력이 일치하지 않습니다.');
  if(next===current)throw Error('현재 비밀번호와 다른 비밀번호를 입력해 주세요.');
  const target=await reauthenticate(db,user,current);
  await rotateCredential(db,target,user,next,'CHANGE',false);
  const response=page('비밀번호 변경 완료','<section class="panel"><h1>비밀번호를 변경했습니다.</h1><p>모든 기기의 기존 로그인을 종료했습니다. 새 비밀번호로 다시 로그인해 주세요.</p><a class="button" href="/admin/login/">다시 로그인</a></section>',null);
  response.headers.set('set-cookie',sessionCookie(request,'',0));return response;
 }catch(err){error=/^(계정|확인|현재|새 비밀번호)/.test(err.message)?err.message:'비밀번호를 변경하지 못했습니다. 다시 시도해 주세요.';}
 return page('내 계정',`<h1>🔐 내 계정·비밀번호</h1><p>${e(user.name)}</p>${user.must_change_password?'<p class="cms-note">임시 비밀번호로 로그인했습니다. 새 비밀번호로 변경한 뒤 관리 기능을 사용할 수 있습니다.</p>':''}${error?`<p class="cms-error" role="alert">${e(error)}</p>`:''}<section class="panel"><form method="post" action="/admin/account/">${csrf(user)}<label>현재 비밀번호<input name="current_password" type="password" autocomplete="current-password" maxlength="128" required></label><label>새 비밀번호<input name="new_password" type="password" autocomplete="new-password" minlength="15" maxlength="128" required></label><label>새 비밀번호 확인<input name="confirm_password" type="password" autocomplete="new-password" minlength="15" maxlength="128" required></label><p class="cms-help">15~128자로 설정해 주세요. 변경하면 다른 기기를 포함한 기존 로그인이 모두 종료됩니다.</p><button>비밀번호 변경</button></form></section>`,user,error?409:200);
}
export async function resetWorkerPassword(db,user,id,form){
 if(!isAdmin(user))return page('권한 없음','<p>관리자만 재발급할 수 있습니다.</p>',user,403);
 const target=await first(db,"SELECT * FROM users WHERE id=? AND role='EDITOR'",id);
 if(!target)return page('계정 없음','<p>작업자 계정을 찾을 수 없습니다.</p>',user,404);
 if(!form)return redirect('/admin/users/'+id+'/');
 try{
  if(target.status!=='ACTIVE')throw Error('계정이 비활성 상태입니다. 먼저 활성 상태로 변경해 주세요.');
  if(Number(form.get('version'))!==target.version)throw Error('계정이 다른 화면에서 변경되었습니다. 새로고침 후 확인해 주세요.');
  const password=form.get('current_password')||'';if(password.length>128)throw Error('현재 비밀번호를 확인해 주세요.');
  await reauthenticate(db,user,password);
  const temporary=randomToken();await rotateCredential(db,target,user,temporary,'RESET',true);
  return page('임시 비밀번호 재발급',`<h1>임시 비밀번호를 재발급했습니다.</h1><section class="panel"><p>아이디: <strong>${e(target.login_id)}</strong></p><code style="overflow-wrap:anywhere;user-select:all">${temporary}</code><p class="cms-note">지금 한 번만 표시합니다. 기존 로그인은 모두 종료됐으며 작업자는 로그인 후 비밀번호를 변경해야 합니다. 안전한 방법으로 직접 전달해 주세요.</p></section><p><a href="/admin/users/${id}/">작업자 계정으로 돌아가기</a></p>`,user);
 }catch(err){const message=/^(계정|확인|현재)/.test(err.message)?err.message:'재발급하지 못했습니다. 페이지를 새로 열고 다시 시도해 주세요.';return page('재발급 확인',`<h1>비밀번호 재발급 확인</h1><p class="cms-error" role="alert">${e(message)}</p><a href="/admin/users/${id}/">작업자 계정으로 돌아가기</a>`,user,409);}
}
