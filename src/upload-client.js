export function uploadClient(){
 for(const form of document.querySelectorAll('form[data-photo-upload]'))form.addEventListener('submit',async event=>{
  event.preventDefault();const file=form.querySelector('input[type=file]').files[0],message=form.querySelector('[role=status]'),button=form.querySelector('button');
  if(!file){message.textContent='사진을 선택해 주세요.';return;}
  if(!['image/jpeg','image/png'].includes(file.type)||file.size>20*1024*1024){message.textContent='20MB 이하의 JPG 또는 PNG 사진을 선택해 주세요.';return;}
  button.disabled=true;message.textContent='사진 크기를 맞춰 등록하고 있습니다…';
  let bitmap;
  try{
   bitmap=await createImageBitmap(file);const scale=Math.min(1,1280/Math.max(bitmap.width,bitmap.height));
   const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(bitmap.width*scale));canvas.height=Math.max(1,Math.round(bitmap.height*scale));
   const context=canvas.getContext('2d');context.fillStyle='#fff';context.fillRect(0,0,canvas.width,canvas.height);context.drawImage(bitmap,0,0,canvas.width,canvas.height);
   const thumbScale=Math.min(1,240/canvas.width,160/canvas.height),thumb=document.createElement('canvas');thumb.width=Math.max(1,Math.round(canvas.width*thumbScale));thumb.height=Math.max(1,Math.round(canvas.height*thumbScale));thumb.getContext('2d').drawImage(canvas,0,0,thumb.width,thumb.height);
   const [blob,preview]=await Promise.all([new Promise(resolve=>canvas.toBlob(resolve,'image/jpeg',.88)),new Promise(resolve=>thumb.toBlob(resolve,'image/jpeg',.75))]);if(!blob||!preview)throw Error('사진 변환에 실패했습니다.');
   if(blob.size>5*1024*1024||preview.size>256*1024)throw Error('사진 용량이 큽니다. 더 작은 사진으로 다시 시도해 주세요.');
   const body=new FormData(form);body.set('photo',blob,'photo.jpg');body.set('thumbnail',preview,'thumbnail.jpg');
   const response=await fetch(form.action,{method:'POST',body,credentials:'same-origin',headers:{'x-photo-upload':'1'}});
   if(!response.headers.get('content-type')?.includes('application/json'))throw Error('로그인 상태를 확인한 뒤 페이지를 새로 열어 주세요.');
   const result=await response.json();if(!response.ok)throw Error(result.error||'사진을 등록하지 못했습니다.');location.assign(result.location);
  }catch(error){message.textContent=error.message||'사진 등록에 실패했습니다. 다시 시도해 주세요.';button.disabled=false;}finally{bitmap?.close();}
 });
}
