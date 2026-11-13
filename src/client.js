// Client ID is loaded from runtime configuration, never embedded in tracked code.
export function portalClient() {
  const root=document.querySelector('#region-map');
  if(!root) return;
  const guSelect=root.querySelector('#district-select');
  const dongSelect=root.querySelector('#dong-select');
  const hint=root.querySelector('#map-hint');
  const dongMap=root.querySelector('.dong-map');
  const apply=root.querySelector('#map-apply');
  let districts,active,mapAdapter;
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
    mapAdapter?.style();
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
    mapAdapter?.district();
  }
  async function loadNaver() {
    const status=root.querySelector('#map-status');
    const container=root.querySelector('#naver-map');
    const fallback=root.querySelector('.area-map');
    const reset=root.querySelector('#map-reset');
    let failed=false,rejectInitialization;
    function restore(message,reason='auth') {
      failed=true;
      root.dataset.mapState=reason;
      mapAdapter=undefined;
      container.hidden=true;
      reset.hidden=true;
      fallback.removeAttribute('hidden');
      rejectInitialization?.(Error(reason));
      status.textContent=message;
    }
    try {
      const configResponse=await fetch('/assets/map-config.json',{cache:'no-store'});
      if(!configResponse.ok) throw Error('config');
      const {clientId}=await configResponse.json();
      if(!clientId) return;
      root.dataset.mapState='loading';
      status.textContent='네이버 지도를 불러오는 중입니다.';
      const sdk=new Promise((resolve,reject)=>{
        const timer=setTimeout(()=>reject(Error('timeout')),12000);
        const finish=(error)=>{clearTimeout(timer);error?reject(error):resolve();};
        window.portalNaverReady=()=>finish();
        window.navermap_authFailure=()=>{
          restore('네이버 지도를 연결하지 못했습니다. 아래 지역 지도로 계속 이용할 수 있습니다.');
          finish(Error('auth'));
        };
        const script=document.createElement('script');
        script.src='https://oapi.map.naver.com/openapi/v3/maps.js?ncpKeyId='+encodeURIComponent(clientId)+'&callback=portalNaverReady';
        script.async=true;
        script.onerror=()=>finish(Error('network'));
        document.head.append(script);
      });
      const [geometry]=await Promise.all([
        fetch('/assets/map-geometry.json').then(response=>{
          if(!response.ok) throw Error('geometry');
          return response.json();
        }),
        sdk
      ]);
      if(failed) return;
      const maps=window.naver.maps;
      container.hidden=false;
      const map=new maps.Map(container,{center:new maps.LatLng(37.5665,126.978),zoom:11,zoomControl:true,scrollWheel:false,scaleControl:true,logoControl:true,mapDataControl:true});
      await new Promise((resolve,reject)=>{
        const timer=setTimeout(()=>reject(Error('map-init-timeout')),12000);
        rejectInitialization=error=>{clearTimeout(timer);reject(error);};
        maps.Event.once(map,'init',()=>{clearTimeout(timer);rejectInitialization=undefined;resolve();});
      });
      if(failed) return;
      const guLayer=new maps.Data();
      const dongLayer=new maps.Data();
      guLayer.setMap(map);
      dongLayer.setMap(map);
      const collection=features=>({type:'FeatureCollection',features});
      guLayer.addGeoJson(collection(geometry.features.filter(f=>f.properties.level==='district')));
      let currentDongs;
      function styles() {
        guLayer.setStyle(feature=>({fillColor:feature.getId()===active.code?'#173e62':'#93b8cf',fillOpacity:0.18,strokeColor:'#173e62',strokeWeight:1.5,clickable:true,zIndex:1}));
        dongLayer.setStyle(feature=>({fillColor:feature.getId()===dongSelect.value?'#ffd166':'#79dfed',fillOpacity:0.35,strokeColor:'#245d78',strokeWeight:1,clickable:true,zIndex:2}));
      }
      function showDistrict() {
        if(currentDongs) dongLayer.removeGeoJson(currentDongs);
        currentDongs=collection(geometry.features.filter(f=>f.properties.district===active.code));
        dongLayer.addGeoJson(currentDongs);
        styles();
      }
      function focus(layer,code) {
        const bounds=layer.getFeatureById(code)?.getBounds();
        if(bounds) map.fitBounds(bounds,{top:32,right:32,bottom:32,left:32});
      }
      mapAdapter={style:styles,district:showDistrict,focusDistrict:()=>focus(guLayer,active.code),focusDong:()=>focus(dongLayer,dongSelect.value)};
      guLayer.addListener('mouseover',event=>{
        activate(String(event.feature.getId()));
        guLayer.overrideStyle(event.feature,{strokeColor:'#d68f10',strokeWeight:3});
      });
      guLayer.addListener('mouseout',event=>guLayer.revertStyle(event.feature));
      guLayer.addListener('click',event=>{activate(String(event.feature.getId()));mapAdapter?.focusDistrict();});
      dongLayer.addListener('mouseover',event=>{
        hint.textContent=active.name+' · '+event.feature.getProperty('name');
        dongLayer.overrideStyle(event.feature,{fillColor:'#ffd166',fillOpacity:0.6,strokeWeight:3});
      });
      dongLayer.addListener('mouseout',event=>dongLayer.revertStyle(event.feature));
      dongLayer.addListener('click',event=>{selectDong(String(event.feature.getId()));mapAdapter?.focusDong();});
      reset.addEventListener('click',()=>{selectDong('');map.setCenter(new maps.LatLng(37.5665,126.978));map.setZoom(11);});
      showDistrict();
      fallback.setAttribute('hidden','');
      reset.hidden=false;
      status.textContent='구를 누르면 확대됩니다. 동을 선택한 뒤 지역 글 보기를 눌러주세요.';
      root.dataset.mapState='ready';
      new ResizeObserver(()=>{if(!container.hidden)map.setSize(new maps.Size(container.clientWidth,container.clientHeight));}).observe(container);
    } catch(error) {
      restore('네이버 지도를 연결하지 못했습니다. 아래 지역 지도로 계속 이용할 수 있습니다.',error.message);
    }
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
        if(dong) {selectDong(dong.dataset.dong);mapAdapter?.focusDong();}
      });
      root.addEventListener('keydown',event=>{
        if(event.key!=='Enter'&&event.key!==' ') return;
        if(event.target.matches('[data-district],[data-dong]')){event.preventDefault();event.target.dispatchEvent(new MouseEvent('click',{bubbles:true}));}
      });
      guSelect.addEventListener('change',()=>{activate(guSelect.value);mapAdapter?.focusDistrict();});
      dongSelect.addEventListener('change',()=>{selectDong(dongSelect.value);dongSelect.value?mapAdapter?.focusDong():mapAdapter?.focusDistrict();});
      const observer=new IntersectionObserver(entries=>{if(entries.some(e=>e.isIntersecting)){observer.disconnect();loadNaver();}},{rootMargin:'200px'});
      observer.observe(root);
    } catch {
      hint.textContent='지역 경계를 불러오지 못했습니다. 상단 지역 검색을 이용해주세요.';
      guSelect.disabled=true;
      dongSelect.disabled=true;
    }
  }
  start();
}
