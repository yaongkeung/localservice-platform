// Self-contained: injected into the upload and editor browser scripts.
export function operationUi(button,title,steps=[]){
 let panel=document.getElementById('cms-operation');
 if(panel?.dataset.busy==='true')return null;
 if(panel)panel.remove();
 panel=document.createElement('section');panel.id='cms-operation';panel.className='cms-operation';panel.dataset.busy='true';panel.dataset.state='working';panel.setAttribute('aria-label','작업 진행 안내');
 const heading=document.createElement('h2'),spinner=document.createElement('span'),status=document.createElement('p'),timer=document.createElement('span'),list=document.createElement('ol'),help=document.createElement('p');
 spinner.className='operation-spinner';spinner.setAttribute('aria-hidden','true');heading.append(spinner,document.createTextNode(title));status.setAttribute('role','status');status.setAttribute('aria-live','polite');status.className='operation-status';timer.className='operation-time';timer.setAttribute('aria-live','off');help.className='operation-help';help.textContent='처리 중입니다. 버튼을 다시 누르지 않아도 됩니다.';
 const items=steps.map(text=>{const item=document.createElement('li');item.textContent=text;list.append(item);return item;});panel.append(heading,status,list,timer,help);document.body.append(panel);
 const buttons=[...document.querySelectorAll('.cms button')].map(item=>({item,disabled:item.disabled})),oldText=button?.textContent;
 for(const {item} of buttons)item.disabled=true;
 if(button){button.textContent=title+'…';button.classList.add('is-working');button.setAttribute('aria-busy','true');}
 const started=Date.now(),tick=()=>{const seconds=Math.floor((Date.now()-started)/1000);timer.textContent='경과 '+(seconds<60?seconds+'초':Math.floor(seconds/60)+'분 '+seconds%60+'초');if(seconds>=20)help.textContent='서버의 응답을 기다리고 있습니다. 사진 수와 처리량에 따라 수 분 걸릴 수 있습니다.';};tick();const interval=setInterval(tick,1000);
 const step=(index,text)=>{items.forEach((item,i)=>{item.dataset.state=i<index?'done':i===index?'current':'pending';if(i===index)item.setAttribute('aria-current','step');else item.removeAttribute('aria-current');});status.textContent=text||steps[index]||title;};step(0);
 const finish=(state,text,href,label)=>{clearInterval(interval);tick();panel.dataset.busy='false';panel.dataset.state=state;status.textContent=text;spinner.textContent=state==='success'?'✓':'!';heading.lastChild.textContent=state==='success'?'처리 완료':'확인이 필요합니다';help.textContent=state==='success'?'완료 상태를 확인해 주세요.':'입력 내용은 화면에 남아 있습니다. 저장 결과를 확인한 후 다시 시도해 주세요.';for(const {item,disabled} of buttons)item.disabled=disabled;if(button){button.textContent=oldText;button.classList.remove('is-working');button.removeAttribute('aria-busy');}if(state==='success')items.forEach(item=>{item.dataset.state='done';item.removeAttribute('aria-current');});if(href){const link=document.createElement('a');link.href=href;link.textContent=label||'저장된 글 확인하기 →';panel.append(link);}const close=document.createElement('button');close.type='button';close.className='operation-close';close.textContent='닫기';close.addEventListener('click',()=>panel.remove());panel.append(close);};
 return {step,success:(text,href,label)=>finish('success',text,href,label),error:(text,href)=>finish('error',text,href)};
}
