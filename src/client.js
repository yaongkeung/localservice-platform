// Served as a same-origin script. No API credentials or third-party scripts.
export function portalClient() {
  const root=document.querySelector('#region-map');
  if(!root) return;
  const guSelect=root.querySelector('#district-select');
  const dongSelect=root.querySelector('#dong-select');
  const hint=root.querySelector('#map-hint');
  const dongMap=root.querySelector('.dong-map');
  const apply=root.querySelector('#map-apply');
  let districts,active;
  const query=new URLSearchParams(location.search);
  function updateLink() {
    const params=new URLSearchParams(location.search);
    params.delete('region');
    params.set('district',active.code);
    params.delete('dong');
    const dong=active.dongs.find(d=>d.code===dongSelect.value);
    if(dong) params.set('dong',dong.code);
    apply.href='/?'+params.toString()+'#cases';
    apply.textContent=active.name+(dong?' '+dong.name:'')+' 글 보기';
    dongMap.querySelectorAll('[data-dong]').forEach(p=>p.setAttribute('aria-pressed',String(p.dataset.dong===dongSelect.value)));
  }
  function selectDong(code) {
    dongSelect.value=code;
    const dong=active.dongs.find(d=>d.code===code);
    hint.textContent=dong?active.name+' · '+dong.name:'동에 마우스를 올리면 해당 경계가 강조됩니다.';
    updateLink();
  }
  function activate(code) {
    const district=districts.find(d=>d.code===code);
    if(!district || active?.code===code) return;
    active=district;
    guSelect.value=code;
    root.querySelector('#district-title').textContent=active.name;
    root.querySelectorAll('[data-district]').forEach(p=>{
      const selected=p.dataset.district===code;
      p.classList.toggle('active',selected);
      p.setAttribute('aria-pressed',String(selected));
    });
    dongMap.setAttribute('aria-label',active.name+' 행정동 선택 지도');
    dongMap.replaceChildren();
    dongSelect.replaceChildren(new Option('구 전체',''));
    for(const dong of active.dongs) {
      const path=document.createElementNS('http://www.w3.org/2000/svg','path');
      path.setAttribute('d',dong.path);
      path.dataset.dong=dong.code;
      path.setAttribute('role','button');
      path.setAttribute('tabindex','0');
      path.setAttribute('aria-label',dong.name+' 선택');
      path.setAttribute('aria-pressed','false');
      path.setAttribute('fill-rule','evenodd');
      dongMap.append(path);
      dongSelect.add(new Option(dong.name,dong.code));
    }
    selectDong('');
  }
  async function start() {
    try {
      const response=await fetch('/assets/boundaries.json');
      if(!response.ok) throw new Error('boundary load');
      districts=(await response.json()).districts;
      activate(guSelect.value);
      if(query.get('dong')) selectDong(query.get('dong'));
      root.addEventListener('pointerover',event=>{
        if(event.pointerType==='touch') return;
        const gu=event.target.closest('[data-district]');
        const dong=event.target.closest('[data-dong]');
        if(gu) activate(gu.dataset.district);
        if(dong) hint.textContent=active.name+' · '+active.dongs.find(d=>d.code===dong.dataset.dong).name;
      });
      root.addEventListener('click',event=>{
        const gu=event.target.closest('[data-district]');
        const dong=event.target.closest('[data-dong]');
        if(gu) activate(gu.dataset.district);
        if(dong) selectDong(dong.dataset.dong);
      });
      root.addEventListener('keydown',event=>{
        if(event.key!=='Enter'&&event.key!==' ') return;
        if(event.target.matches('[data-district],[data-dong]')){event.preventDefault();event.target.dispatchEvent(new MouseEvent('click',{bubbles:true}));}
      });
      guSelect.addEventListener('change',()=>activate(guSelect.value));
      dongSelect.addEventListener('change',()=>selectDong(dongSelect.value));
    } catch {
      hint.textContent='지역 경계를 불러오지 못했습니다. 상단 지역 검색을 이용해주세요.';
      guSelect.disabled=true;
      dongSelect.disabled=true;
    }
  }
  start();
}
