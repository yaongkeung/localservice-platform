import {reviewValues,reviewText} from './customer-reviews.js';
import {normalizePlaceUrl} from './place.js';
import {all,first,run} from './store.js';
import {isAdmin,randomToken,hashPassword,digest} from './auth.js';
import {serviceIcons,sortServices,normalServiceName} from './services.js';
import {page,csrf,redirect,e} from './admin-ui.js';
const kinds={companies:'업체',users:'작업자·배정',services:'업종',contracts:'계약'};
const tones={sky:'하늘색',mint:'민트',peach:'살구색',lilac:'라일락'};
const icons=serviceIcons;
const input=(name,label,value='',type='text',extra='')=>`<label>${label}<input name="${name}" type="${type}" value="${e(value)}" ${extra}></label>`;
const select=(name,label,rows,value)=>`<label>${label}<select name="${name}">${rows.map(([v,label])=>`<option value="${e(v)}" ${String(v)===String(value)?'selected':''}>${e(label)}</option>`).join('')}</select></label>`;
const checkbox=(name,label,checked=false)=>`<label style="display:flex;gap:10px;align-items:center"><input style="width:auto;margin:0" type="checkbox" name="${name}" value="1" ${checked?'checked':''}>${label}</label>`;
const text=(form,key,min,max)=>{const value=(form.get(key)||'').trim();if(value.length<min||value.length>max)throw Error(`${({name:'이름',description:'소개',area:'서비스 지역',hours:'상담 시간',phone:'전화번호',slug:'주소용 이름',login_id:'아이디',package_name:'계약 이름'})[key]||'입력 내용'}은 ${min}~${max}자로 입력해 주세요.`);return value;};
const integer=(form,key,min,max)=>{const raw=form.get(key)||'';if(!/^\d+$/.test(raw)||Number(raw)<min||Number(raw)>max)throw Error('수량과 금액을 올바르게 입력해 주세요.');return Number(raw);};
const companyOptions=companies=>companies.map(c=>[c.id,c.name+(c.status==='ACTIVE'?'':' (비활성)')]);
function fields(kind,row,data){
 if(kind==='companies')return input('name','업체명',row.name,'text','maxlength="80" required')+input('description','업체 소개',row.description,'text','maxlength="1000" required')+input('area','서비스 지역',row.area,'text','maxlength="200" required')+input('hours','상담 시간',row.hours,'text','maxlength="120"')+input('phone','상담 전화번호',row.phone,'tel','maxlength="25" placeholder="미등록 시 전화 버튼 비활성"')+input('naver_place_url','네이버플레이스 주소 (선택)',row.naver_place_url,'url','maxlength="500" placeholder="https://naver.me/공유주소"')+input('naver_place_name','플레이스 등록명 (선택)',row.naver_place_name,'text','maxlength="160"')+input('naver_place_address','플레이스 등록 주소 (선택)',row.naver_place_address,'text','maxlength="300"')+input('naver_place_hours','플레이스 영업 안내 (선택)',row.naver_place_hours,'text','maxlength="200"')+'<p class="cms-help full">같은 업체의 플레이스인지 확인한 주소를 등록해 주세요. 등록하면 이 업체의 포스팅과 프로필에 함께 표시됩니다. 기존 상담 번호와 서비스 지역은 유지됩니다.</p>'+checkbox('phone_verified','상담 번호를 직접 확인했습니다.',!!row.phone_verified)+select('status','운영 상태',[['ACTIVE','활성'],['DISABLED','비활성']],row.status||'ACTIVE')+checkbox('sample','시험용 업체로 표시',row.id?!!row.sample:false)+`<details class="full"><summary>고객 후기 등록 (선택)</summary><p class="cms-help">실제 고객이 남긴 후기만 원문으로 등록하세요. 고객 이름과 연락처는 넣지 않습니다. 빈 줄로 나누면 최대 6개의 후기 카드로 표시합니다. 후기가 없으면 페이지에 이 영역을 표시하지 않습니다.</p><label>후기 원문<textarea name="customer_reviews" maxlength="7300">${e(reviewText(row.customer_reviews))}</textarea></label>${input('review_source_url','후기 출처 주소 (선택)',row.review_source_url,'url','maxlength="500" placeholder="https://"')}${checkbox('reviews_confirmed','실제 후기 원문과 출처, 게시 가능 여부를 확인했습니다.',!!row.reviews_confirmed)}</details>`;
 if(kind==='services')return input('name','업종명',row.name,'text','maxlength="60" placeholder="예: 간판, 렌트카, 컴퓨터수리" required')+'<p class="cms-help full">업종명만 입력하고 저장하면 됩니다. 새 업종은 가나다순으로 자동 배치됩니다.</p><details class="full"><summary>추가 설정 (선택)</summary><div class="cms-grid" style="margin-top:18px">'+input('description','설명',row.description,'text','maxlength="300"')+select('parent_id','상위 업종',[['','없음 (대표 업종)'],...data.services.filter(s=>s.id!==row.id).map(s=>[s.id,s.name])],row.parent_id||'')+select('icon','표시 아이콘',icons.map(v=>[v,v]),row.icon||icons[0])+select('tone','포인트 색상',Object.entries(tones),row.tone||'sky')+input('slug','게시판 주소 이름 (자동 생성)',row.slug,'text',`pattern="[a-z][a-z0-9-]{1,59}" maxlength="60" placeholder="비워두면 자동 생성" ${row.id?'readonly':''}`)+'</div></details><p class="cms-help full">저장한 업종은 메인 업종 선택과 게시판에 반영됩니다. 기존 게시판 주소는 유지합니다.</p>';
 if(kind==='users')return input('name','작업자 이름',row.name,'text','maxlength="60" required')+input('login_id','로그인 아이디',row.login_id,'text',`pattern="[a-zA-Z0-9_-]{3,40}" maxlength="40" required ${row.id?'readonly':''}`)+select('status','계정 상태',[['ACTIVE','활성'],['DISABLED','비활성']],row.status||'ACTIVE')+`<fieldset class="full"><legend>배정 업체</legend>${data.companies.map(c=>checkbox('company_ids',e(c.name)+(c.status==='ACTIVE'?'':' (비활성)'),data.assignments.includes(c.id)).replace('value="1"',`value="${c.id}"`)).join('')||'<p>먼저 업체를 등록해 주세요.</p>'}</fieldset><p class="cms-help full">작업자 권한으로 발급합니다. 새 계정의 임시 비밀번호는 저장 직후 한 번만 표시하며 첫 로그인에서 변경해야 합니다. 비활성화하면 기존 로그인도 차단됩니다.</p>`;
 return select('company_id','업체',companyOptions(data.companies),row.company_id)+input('package_name','계약 이름',row.package_name,'text','maxlength="100" required')+input('contract_quantity','계약 게시 수량',row.contract_quantity??1,'number','min="1" max="100000" required')+input('price','계약 금액 (원)',row.price??0,'number','min="0" max="1000000000" required')+input('start_date','시작일',row.start_date,'date','required')+input('end_date','종료일',row.end_date,'date','required')+select('status','계약 상태',[['ACTIVE','진행 중'],['CLOSED','종료']],row.status||'ACTIVE')+`<p class="cms-note full">공개 완료 ${row.published_quantity||0}건 / 계약 ${row.contract_quantity||1}건 · 공개 시 자동 집계합니다. 저장·검수·승인은 수량을 차감하지 않습니다.</p>`;
}
async function validate(kind,form,row,data){
 if(kind==='companies'){
  const phone=text(form,'phone',0,25).replace(/[\s()-]/g,'');
  if(phone&&(!/^(?:0\d{8,10}|1[568]\d{6}|\+82\d{8,10})$/.test(phone)||form.get('phone_verified')!=='1'))throw Error('상담 번호 형식과 번호 확인 항목을 확인해 주세요.');
  const naver_place_url=normalizePlaceUrl(form.has('naver_place_url')?form.get('naver_place_url'):row.naver_place_url);
  const placeFields={naver_place_url};for(const [key,max]of [['naver_place_name',160],['naver_place_address',300],['naver_place_hours',200]])placeFields[key]=form.has(key)?text(form,key,0,max):row[key]||'';
  return {...reviewValues(form,row),...placeFields,name:text(form,'name',2,80),description:text(form,'description',10,1000),area:text(form,'area',2,200),hours:text(form,'hours',0,120),phone:phone||null,phone_verified:phone?1:0,status:form.get('status'),sample:form.get('sample')==='1'?1:0};
 }
 if(kind==='services'){
  const name=text(form,'name',2,60);if(data.services.some(service=>service.id!==row.id&&normalServiceName(service.name)===normalServiceName(name)))throw Error('이미 등록된 업종입니다. 기존 업종을 선택해 주세요.');
  const slug=row.id?row.slug:(text(form,'slug',0,60)||'service-'+(await digest(normalServiceName(name))).slice(0,12));if(!/^[a-z][a-z0-9-]{1,59}$/.test(slug))throw Error('주소용 이름은 영문 소문자·숫자·하이픈으로 입력해 주세요.');
  const parent_id=form.has('parent_id')?Number(form.get('parent_id'))||null:row.parent_id||null;let cursor=parent_id;const seen=new Set(row.id?[row.id]:[]);
  while(cursor){if(seen.has(cursor))throw Error('상위 업종이 순환하지 않도록 선택해 주세요.');seen.add(cursor);const p=data.services.find(s=>s.id===cursor);if(!p)throw Error('상위 업종을 확인해 주세요.');cursor=p.parent_id;}
  const icon=form.get('icon')||row.icon||icons[0],tone=form.get('tone')||row.tone||'sky';if(!icons.includes(icon)||!Object.hasOwn(tones,tone))throw Error('아이콘과 색상을 선택해 주세요.');
  return {name,slug,description:form.has('description')?text(form,'description',0,300):row.description||'',parent_id,icon,tone};
 }
 if(kind==='users'){
  const login_id=row.id?row.login_id:text(form,'login_id',3,40);if(!/^[a-zA-Z0-9_-]{3,40}$/.test(login_id))throw Error('아이디는 영문·숫자·밑줄·하이픈 3~40자로 입력해 주세요.');
  return {name:text(form,'name',2,60),login_id,status:form.get('status')};
 }
 const company_id=Number(form.get('company_id'));if(!data.companies.some(c=>c.id===company_id))throw Error('업체를 선택해 주세요.');
 if(row.id&&row.company_id!==company_id)throw Error('기존 계약의 업체는 바꿀 수 없습니다. 새 계약을 등록해 주세요.');
 const start_date=form.get('start_date'),end_date=form.get('end_date');
 const validDate=v=>/^\d{4}-\d{2}-\d{2}$/.test(v||'')&&Number.isFinite(Date.parse(v))&&new Date(v).toISOString().slice(0,10)===v;
 if(!validDate(start_date)||!validDate(end_date)||start_date>end_date)throw Error('계약 시작일과 종료일을 확인해 주세요.');
 const contract_quantity=integer(form,'contract_quantity',1,100000);if(contract_quantity<(row.published_quantity||0))throw Error('이미 공개한 수량보다 적게 계약 수량을 줄일 수 없습니다.');
 return {company_id,package_name:text(form,'package_name',2,100),contract_quantity,start_date,end_date,price:integer(form,'price',0,1000000000),status:form.get('status')};
}
export async function management(db,user,url,form){
 if(!isAdmin(user))return page('권한 없음','<h1>관리자만 사용할 수 있습니다.</h1>',user,403);
 const match=url.pathname.match(/^\/admin\/(companies|users|services|contracts)\/(?:(new|\d+)\/)?$/);if(!match)return page('페이지 없음','<h1>페이지를 찾을 수 없습니다.</h1>',user,404);
 const [,kind,key]=match,label=kinds[kind];
 if(!key){
  if(form)return page('잘못된 요청','<h1>등록 화면에서 저장해 주세요.</h1>',user,405);
  let rows=await all(db,`SELECT * FROM ${kind} ${kind==='users'?"WHERE role='EDITOR'":''} ORDER BY id DESC`);
  if(kind==='services'){
   rows=sortServices(rows);const total=rows.length,query=(url.searchParams.get('q')||'').trim().slice(0,60),list=rows.filter(row=>normalServiceName(row.name).includes(normalServiceName(query)));
   return page('업종 관리',`<div class="cms-head"><div><h1>업종 관리</h1><p class="cms-help">가나다순 · 전체 ${total}개 · 필요할 때 계속 추가할 수 있습니다.</p></div><a class="button" href="/admin/services/new/">＋ 업종 추가</a></div><form method="get" class="cms-actions"><label style="flex:1;margin:0">업종 찾기<input name="q" value="${e(query)}" maxlength="60" placeholder="업종명을 입력하세요"></label><button>검색</button></form><div class="cms-list">${list.map(row=>`<article class="cms-item"><h2><a href="/admin/services/${row.id}/">${e(row.icon)} ${e(row.name)}</a></h2><span class="cms-help">${row.parent_id?'상위 업종: '+e(rows.find(parent=>parent.id===row.parent_id)?.name||'미지정'):'대표 업종'}</span></article>`).join('')||'<p class="empty">검색한 업종이 없습니다. 새 업종을 추가할 수 있습니다.</p>'}</div>`,user);
  }
  return page(label+' 관리',`<div class="cms-head"><h1>${label} 관리</h1><a class="button" href="/admin/${kind}/new/">＋ ${label} 등록</a></div><div class="cms-list">${rows.map(r=>`<article class="cms-item"><h2><a href="/admin/${kind}/${r.id}/">${e(r.name||r.package_name)}</a></h2><span class="cms-help">#${r.id}${r.login_id?' · '+e(r.login_id):''}${r.status?' · '+({ACTIVE:'활성',DISABLED:'비활성',CLOSED:'종료'}[r.status]||e(r.status)):''}${kind==='contracts'?` · 공개 ${r.published_quantity} / ${r.contract_quantity}건`:''}${r.slug?' · '+e(r.slug):''}</span></article>`).join('')||'<p class="empty">등록된 항목이 없습니다.</p>'}</div>`,user);
 }
 let row=key==='new'?{}:await first(db,`SELECT * FROM ${kind} WHERE id=?`,Number(key));
 if(!row||kind==='users'&&row.id&&row.role!=='EDITOR')return page('항목 없음','<h1>항목을 찾을 수 없습니다.</h1>',user,404);
 const data={companies:await all(db,'SELECT * FROM companies ORDER BY name'),services:sortServices(await all(db,'SELECT * FROM services')),assignments:row.id&&kind==='users'?(await all(db,'SELECT company_id FROM company_assignments WHERE user_id=?',row.id)).map(r=>r.company_id):[]};
 let error='';
 if(form)try{
  const values=await validate(kind,form,row,data);
  if(values.status&&!((kind==='contracts'?['ACTIVE','CLOSED']:['ACTIVE','DISABLED']).includes(values.status)))throw Error('상태를 선택해 주세요.');
  if(kind!=='services'&&!values.status)throw Error('상태를 선택해 주세요.');
  let password;
  if(kind==='users'&&!row.id){password=randomToken();values.password_hash=await hashPassword(password);values.role='EDITOR';values.must_change_password=1;}
  const keys=Object.keys(values);
  if(kind==='users'){
   const ids=[...new Set(form.getAll('company_ids').map(Number))];if(ids.some(id=>!data.companies.some(c=>c.id===id)))throw Error('배정 업체를 확인해 주세요.');
   // Compare-and-swap the user and assignments in one atomic batch. The random token is scoped to this mutation.
   if(row.id){
    const version=Number(form.get('version')),token=randomToken();const statements=[db.prepare(`UPDATE users SET ${keys.map(k=>k+'=?').join(',')},version=version+1,mutation_token=? WHERE id=? AND version=?`).bind(...Object.values(values),token,row.id,version)];
    statements.push(db.prepare('DELETE FROM company_assignments WHERE user_id=? AND EXISTS(SELECT 1 FROM users WHERE id=? AND mutation_token=?)').bind(row.id,row.id,token));
    for(const id of ids)statements.push(db.prepare('INSERT INTO company_assignments(user_id,company_id) SELECT id,? FROM users WHERE id=? AND mutation_token=?').bind(id,row.id,token));
    const result=await db.batch(statements);if(!result[0].meta.changes)throw Error('다른 화면에서 변경되었습니다. 새로고침 후 다시 확인해 주세요.');
   }else{
    // login_id uniqueness also guards concurrent creations; all assignments are part of this batch.
    const statements=[db.prepare(`INSERT INTO users(${keys.join(',')}) VALUES(${keys.map(()=>'?').join(',')})`).bind(...Object.values(values))];
    for(const id of ids)statements.push(db.prepare('INSERT INTO company_assignments(user_id,company_id) SELECT id,? FROM users WHERE login_id=?').bind(id,values.login_id));
    await db.batch(statements);
   }
   if(password)return page('작업자 계정 발급',`<h1>작업자 계정을 만들었습니다.</h1><section class="panel"><p>아이디: <strong>${e(values.login_id)}</strong></p><p>임시 비밀번호:</p><code style="overflow-wrap:anywhere;user-select:all">${password}</code><p class="cms-note">이 비밀번호는 지금 한 번만 표시됩니다. 안전한 방법으로 해당 작업자에게 전달해 주세요.</p></section><p><a href="/admin/users/">작업자 목록으로</a></p>`,user);
  }else if(row.id){
   const result=await run(db,`UPDATE ${kind} SET ${keys.map(k=>k+'=?').join(',')},version=version+1 WHERE id=? AND version=?`,...Object.values(values),row.id,Number(form.get('version')));
   if(!result.meta.changes)throw Error('다른 화면에서 변경되었습니다. 새로고침 후 다시 확인해 주세요.');
  }else await run(db,`INSERT INTO ${kind}(${keys.join(',')}) VALUES(${keys.map(()=>'?').join(',')})`,...Object.values(values));
  return redirect('/admin/'+kind+'/');
 }catch(err){error=err.message.includes('자로 입력')||/^(네이버플레이스|고객 후기|상담|주소용|상위|아이콘|아이디|업체|기존|계약|이미|배정|상태|다른)/.test(err.message)?err.message:'저장하지 못했습니다. 중복 아이디·주소나 다른 화면의 변경 여부를 확인해 주세요.';row={...row,...Object.fromEntries(form),id:row.id,version:row.version};if(kind==='users')data.assignments=form.getAll('company_ids').map(Number);}
 return page(label+' '+(row.id?'수정':'등록'),`<a href="/admin/${kind}/">← ${label} 목록</a><h1>${label} ${row.id?'수정':'등록'}</h1>${error?`<p class="cms-error" role="alert">${e(error)}</p>`:''}<form method="post">${csrf(user)}<input type="hidden" name="version" value="${row.version||0}"><section class="panel cms-grid">${fields(kind,row,data)}</section><div class="cms-actions"><button>💾 저장</button></div></form>${kind==='users'&&row.id?`<section class="panel"><h2>임시 비밀번호 재발급</h2><p class="cms-help">기존 로그인을 모두 종료하고 새 임시 비밀번호를 발급합니다. 작업자는 로그인 후 변경해야 합니다.</p><form method="post" action="/admin/users/${row.id}/reset-password/">${csrf(user)}<input type="hidden" name="version" value="${row.version}"><label>관리자 비밀번호 확인<input type="password" name="current_password" autocomplete="current-password" maxlength="128" required></label><button>임시 비밀번호 재발급</button></form></section>`:''}`,user,error?409:200);
}
