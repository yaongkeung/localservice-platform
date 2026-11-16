export function uploadClient(){
 let unsaved=false;
 const editor=document.querySelector('[data-simple-editor]');
 const changed=event=>{if(event.target.form===editor)unsaved=true;};
 document.addEventListener('input',changed);document.addEventListener('change',changed);
 const updateVersions=version=>{for(const field of document.querySelectorAll('[name=version]'))field.value=version;};
 const saveEditor=async()=>{
  if(!editor)return;
  if(!editor.reportValidity())throw Error('업체·지역·업무 키워드를 확인해 주세요.');
  if(!unsaved)return;
  const response=await fetch(editor.action,{method:'POST',body:new URLSearchParams(new FormData(editor)),credentials:'same-origin',headers:{'x-editor-save':'1'}});
  if(!response.ok||!response.headers.get('content-type')?.includes('application/json'))throw Error('기본 정보를 저장하지 못했습니다. 입력 내용을 확인하거나 화면을 다시 열어 주세요.');
  const saved=await response.json();updateVersions(saved.version);unsaved=false;
 };
 const generate=async(form,version)=>{
  const body=new URLSearchParams({csrf:form.querySelector('[name=csrf]').value,version:version??form.querySelector('[name=version]').value});
  const response=await fetch(form.dataset.generateUrl||form.action,{method:'POST',body,credentials:'same-origin',headers:{'x-draft-generation':'1'}});
  if(!response.headers.get('content-type')?.includes('application/json'))throw Error('로그인 상태를 확인하고 페이지를 다시 열어 주세요.');
  const result=await response.json();if(!response.ok)throw Error(result.error||'초안을 작성하지 못했습니다.');location.assign(result.location);
 };
 const prepare=async file=>{
  const bitmap=await createImageBitmap(file);
  try{
   const scale=Math.min(1,1280/Math.max(bitmap.width,bitmap.height)),canvas=document.createElement('canvas');
   canvas.width=Math.max(1,Math.round(bitmap.width*scale));canvas.height=Math.max(1,Math.round(bitmap.height*scale));
   const context=canvas.getContext('2d');context.fillStyle='#fff';context.fillRect(0,0,canvas.width,canvas.height);context.drawImage(bitmap,0,0,canvas.width,canvas.height);
   const thumbScale=Math.min(1,240/canvas.width,160/canvas.height),thumb=document.createElement('canvas');thumb.width=Math.max(1,Math.round(canvas.width*thumbScale));thumb.height=Math.max(1,Math.round(canvas.height*thumbScale));thumb.getContext('2d').drawImage(canvas,0,0,thumb.width,thumb.height);
   const [blob,preview]=await Promise.all([new Promise(resolve=>canvas.toBlob(resolve,'image/jpeg',.88)),new Promise(resolve=>thumb.toBlob(resolve,'image/jpeg',.75))]);
   if(!blob||!preview)throw Error('사진 변환에 실패했습니다.');
   if(blob.size>5*1024*1024||preview.size>256*1024)throw Error('사진 용량이 큽니다. 더 작은 사진으로 다시 시도해 주세요.');
   return {blob,preview};
  }finally{bitmap.close();}
 };
 for(const form of document.querySelectorAll('form[data-photo-upload]'))form.addEventListener('submit',async event=>{
  event.preventDefault();const files=Array.from(form.querySelector('input[type=file]').files),message=form.querySelector('[role=status]'),button=form.querySelector('button');
  if((!files.length&&!(form.dataset.generateUrl&&Number(form.dataset.existingPhotos)>0))||files.length>8){message.textContent='사진을 1~8장 선택해 주세요.';return;}
  if(files.some(file=>!['image/jpeg','image/png'].includes(file.type)||file.size>20*1024*1024)){message.textContent='각 20MB 이하의 JPG 또는 PNG 사진을 선택해 주세요.';return;}
  button.disabled=true;let saved=0,locationAfterSave;
  try{
   message.textContent='기본 정보를 저장하고 사진을 준비하고 있습니다…';await saveEditor();
   let version=form.querySelector('[name=version]').value;
   for(const file of files){
    message.textContent='사진 '+(saved+1)+' / '+files.length+'장을 등록하고 있습니다…';
    const {blob,preview}=await prepare(file),body=new FormData(form);body.set('photo',blob,'photo.jpg');body.set('thumbnail',preview,'thumbnail.jpg');body.set('version',version);
    const response=await fetch(form.action,{method:'POST',body,credentials:'same-origin',headers:{'x-photo-upload':'1'}});
    if(!response.headers.get('content-type')?.includes('application/json'))throw Error('로그인 상태를 확인한 뒤 페이지를 새로 열어 주세요.');
    const result=await response.json();if(!response.ok)throw Error(result.error||'사진을 등록하지 못했습니다.');
    saved++;version=result.version;updateVersions(version);locationAfterSave=result.location;
   }
   if(form.dataset.generateUrl){message.textContent='사진을 읽고 본문과 사진 설명을 자동으로 작성하고 있습니다…';await generate(form,version);}
   else location.assign(locationAfterSave);
  }catch(error){
   message.textContent=(saved?saved+'장은 저장됐습니다. ':'')+(error.message||'사진 등록에 실패했습니다.');
   if(locationAfterSave){const link=document.createElement('a');link.href=locationAfterSave;link.textContent=' 저장한 사진 확인하기 →';message.append(link);if(saved===files.length){form.dataset.existingPhotos=Number(form.dataset.existingPhotos||0)+saved;form.querySelector('input[type=file]').value='';button.disabled=false;}}else button.disabled=false;
  }
 });
}
