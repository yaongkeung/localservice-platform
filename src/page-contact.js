export function normalizeContactPhone(value){
 const phone=String(value==='null'?'':value||'').replace(/[\s()-]/g,'');
 if(phone&&!/^(?:0\d{8,10}|1[568]\d{6}|\+82\d{8,10})$/.test(phone))throw Error('상담 전화번호를 확인해 주세요. 숫자와 하이픈으로 입력할 수 있습니다.');
 return phone||null;
}
export function pagePhone(post,company){
 try{return normalizeContactPhone(post.contact_phone||(Number(company.phone_verified)===1?company.phone:''));}catch{return null;}
}
export function prettyPhone(value){
 const phone=String(value||'');
 if(/^02\d{7,8}$/.test(phone))return phone.replace(/^(02)(\d{3,4})(\d{4})$/,'$1-$2-$3');
 if(/^1\d{7}$/.test(phone))return phone.replace(/^(\d{4})(\d{4})$/,'$1-$2');
 return phone.replace(/^(\d{3})(\d{3,4})(\d{4})$/,'$1-$2-$3');
}
export function phoneField(post={},company={}){
 const value=prettyPhone(pagePhone(post,company)||'');
 return `<label>상담 전화번호<input type="tel" name="contact_phone" value="${value}" maxlength="25" placeholder="예: 010-9444-4087"><span class="cms-help">이 페이지의 전화 안내 이미지와 상담 버튼에 표시됩니다. 비워두면 확인된 업체 번호를 사용합니다.</span></label>`;
}
