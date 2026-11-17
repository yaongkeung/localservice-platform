import {operationUi} from './operation-ui.js';
export function editorActions(){
 const updateVersions=version=>{for(const field of document.querySelectorAll('[name=version]'))field.value=version;};
 const responseData=async response=>{if(!response.headers.get('content-type')?.includes('application/json'))throw Error('로그인 상태를 확인한 뒤 저장 결과를 다시 확인해 주세요.');const data=await response.json();if(!response.ok)throw Error(data.error||'처리하지 못했습니다. 입력 내용을 확인해 주세요.');return data;};
 for(const form of document.querySelectorAll('form[data-simple-editor]'))form.addEventListener('submit',async event=>{
  const button=event.submitter;if(form.dataset.postId){
   event.preventDefault();const data=new URLSearchParams(new FormData(form));const publish=['confirm_publish','publish_now'].includes(button?.name);
   if(publish&&form.querySelector('[name=generation_reviewed]')&&!form.querySelector('[name=generation_reviewed]').checked){const checkbox=form.querySelector('[name=generation_reviewed]');checkbox.setCustomValidity('사진과 내용이 맞는지 확인한 뒤 체크해 주세요.');checkbox.reportValidity();checkbox.setCustomValidity('');return;}
   if(publish)data.set(button.name,'1');
   const operation=operationUi(button,publish?'확인하고 발행하는 중':'작성 내용을 저장하는 중',publish?['작성 내용 저장','발행 처리','메인 반영 확인']:['입력 내용 저장','저장 결과 확인']);if(!operation)return;
   try{operation.step(0,publish?'입력 내용과 공개 조건을 확인하고 있습니다.':'입력 내용을 저장하고 있습니다.');const pending=fetch(form.action,{method:'POST',body:data,credentials:'same-origin',headers:{'x-editor-action':'1'}});if(publish)operation.step(1,'내용을 저장하고 메인에 발행하고 있습니다.');const result=await responseData(await pending);updateVersions(result.version);form.dispatchEvent(new CustomEvent('editor-saved'));
    if(result.status==='PUBLISHED'){operation.step(2);operation.success(result.visible?'공개 완료! 메인·지역·업종 게시판에 반영됐습니다.':'시험용으로 공개됐습니다. 메인에는 표시되지 않습니다.',result.visible?result.publicUrl:result.location,result.visible?'공개된 글 보기 →':'공개 상태 확인하기 →');location.assign(result.location);}
    else operation.success('작성 내용을 저장했습니다. 확인하고 발행해 주세요.',result.previewUrl,'저장한 내용 미리보기 →');
   }catch(error){operation.error(error.message||'응답을 확인하지 못했습니다. 저장된 글을 다시 확인해 주세요.',form.action);}
  }else{const operation=operationUi(button,'글을 준비하는 중',['기본 정보 저장','사진 등록 화면 열기']);if(!operation)event.preventDefault();}
 });
 for(const form of document.querySelectorAll('form[data-status-action]'))form.addEventListener('submit',async event=>{
  event.preventDefault();const button=event.submitter,data=new URLSearchParams(new FormData(form)),operation=operationUi(button,'상태를 변경하는 중',['요청 처리','결과 확인']);if(!operation)return;
  try{const result=await responseData(await fetch(form.action,{method:'POST',body:data,credentials:'same-origin',headers:{'x-editor-action':'1'}}));updateVersions(result.version);operation.success(result.message||'상태를 변경했습니다.');location.assign(result.location);}catch(error){operation.error(error.message||'상태 변경 결과를 확인하지 못했습니다.',location.pathname);}
 });
}
