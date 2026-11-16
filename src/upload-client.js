export function uploadClient(){
 let unsaved=false;
 const editor=document.querySelector('textarea[name=content]')?.form;
 editor?.addEventListener('input',()=>{unsaved=true;});editor?.addEventListener('change',()=>{unsaved=true;});
 const generate=async(form,version)=>{
  const body=new URLSearchParams({csrf:form.querySelector('[name=csrf]').value,version:version??form.querySelector('[name=version]').value});
  const response=await fetch(form.action,{method:'POST',body,credentials:'same-origin',headers:{'x-draft-generation':'1'}});
  if(!response.headers.get('content-type')?.includes('application/json'))throw Error('로그인 상태를 확인하고 페이지를 다시 열어 주세요.');
  const result=await response.json();if(!response.ok)throw Error(result.error||'초안을 작성하지 못했습니다.');location.assign(result.location);
 };
 for(const form of document.querySelectorAll('[data-generate-draft]'))form.addEventListener('submit',async event=>{
  event.preventDefault();const message=form.querySelector('[role=status]'),button=form.querySelector('button');
  if(unsaved){message.textContent='수정한 글을 먼저 저장해 주세요. 저장한 사진·지역·키워드로 작성합니다.';return;}
  button.disabled=true;message.textContent='사진을 읽고 제목과 본문을 작성하고 있습니다…';
  try{await generate(form);}catch(error){message.textContent=error.message;button.disabled=false;}
 });
 for(const button of document.querySelectorAll('[data-insert-photo]'))button.addEventListener('click',()=>{
  const content=document.querySelector('textarea[name=content]');if(!content)return;
  content.setRangeText('\n\n[사진:'+button.dataset.insertPhoto+']\n\n',content.selectionStart,content.selectionEnd,'end');content.focus();content.dispatchEvent(new Event('input',{bubbles:true}));
 });
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
  if(!files.length||files.length>8){message.textContent='사진을 1~8장 선택해 주세요.';return;}
  if(unsaved){message.textContent='작성 중인 글을 먼저 저장한 뒤 사진을 등록해 주세요.';return;}
  if(files.some(file=>!['image/jpeg','image/png'].includes(file.type)||file.size>20*1024*1024)){message.textContent='각 20MB 이하의 JPG 또는 PNG 사진을 선택해 주세요.';return;}
  button.disabled=true;let saved=0,locationAfterSave;
  try{
   let version=form.querySelector('[name=version]').value;
   for(const file of files){
    message.textContent='사진 '+(saved+1)+' / '+files.length+'장을 등록하고 있습니다…';
    const {blob,preview}=await prepare(file),body=new FormData(form);body.set('photo',blob,'photo.jpg');body.set('thumbnail',preview,'thumbnail.jpg');body.set('version',version);
    const response=await fetch(form.action,{method:'POST',body,credentials:'same-origin',headers:{'x-photo-upload':'1'}});
    if(!response.headers.get('content-type')?.includes('application/json'))throw Error('로그인 상태를 확인한 뒤 페이지를 새로 열어 주세요.');
    const result=await response.json();if(!response.ok)throw Error(result.error||'사진을 등록하지 못했습니다.');
    saved++;version=result.version;locationAfterSave=result.location;
   }
   const generator=document.querySelector('[data-generate-draft]');
   if(form.querySelector('[name=auto_generate]')?.checked&&generator){message.textContent=saved+'장을 등록했습니다. 사진을 읽고 제목과 본문을 작성하고 있습니다…';await generate(generator,version);}
   else location.assign(locationAfterSave);
  }catch(error){
   message.textContent=(saved?saved+'장은 저장됐습니다. ':'')+(error.message||'사진 등록에 실패했습니다.');
   if(locationAfterSave){const link=document.createElement('a');link.href=locationAfterSave;link.textContent=' 저장한 사진 확인하기 →';message.append(link);}else button.disabled=false;
  }
 });
}
