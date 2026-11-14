// Runtime configuration supplies the public browser Client ID; no secrets in source.
export function portalClient(){
  const root=document.querySelector('#region-map');
  if(!root)return;
  const $=selector=>root.querySelector(selector);
  const provinceSelect=$('#province-select'),districtSelect=$('#district-select'),leafSelect=$('#dong-select');
  const hint=$('#map-hint'),status=$('#map-status'),overview=$('.area-map'),detail=$('.dong-map');
  const ns='http://www.w3.org/2000/svg',cache=new Map();
  let index,nationwide,province='',district='',provinceData=null,leafData=null,adapter,revision=0;
  const json=path=>{
    if(!cache.has(path))cache.set(path,fetch(path).then(r=>{if(!r.ok)throw Error('지역 자료를 불러오지 못했습니다.');return r.json();}).catch(error=>{cache.delete(path);throw error;}));
    return cache.get(path);
  };
  const provinceInfo=()=>index.provinces.find(p=>p.code===province);
  const districtInfo=()=>index.districts.find(d=>d.code===district);
  function options(select,first,areas,value=''){
    select.replaceChildren(new Option(first,''),...areas.map(a=>new Option(a.name,a.code)));
    select.value=value;
  }
  function shapes(svg,areas,level,selected=''){
    svg.replaceChildren();
    for(const area of areas){
      const group=document.createElementNS(ns,'g'),path=document.createElementNS(ns,'path');
      path.setAttribute('d',area.path);path.setAttribute('fill-rule','evenodd');
      path.setAttribute('role','button');path.setAttribute('tabindex','0');
      path.setAttribute('aria-label',area.name+' 선택');path.setAttribute('aria-pressed',String(area.code===selected));
      path.setAttribute('class','district-shape'+(area.code===selected?' active':''));
      path.dataset.level=level;path.dataset.code=area.code;
      group.append(path);
      if(area.label){const label=document.createElementNS(ns,'text');label.textContent=area.name;label.setAttribute('x',area.label[0]);label.setAttribute('y',area.label[1]);label.setAttribute('class','svg-area-label');group.append(label);}
      svg.append(group);
    }
  }
  function update(){
    const leaf=leafData?.areas.find(a=>a.code===leafSelect.value);
    const name=[provinceInfo()?.name,districtInfo()?.name,leaf?.name].filter(Boolean).join(' ')||'전국';
    $('#district-title').textContent=districtInfo()?.name||provinceInfo()?.name||'전국';
    $('#map-area-title').textContent=[provinceInfo()?.name,districtInfo()?.name].filter(Boolean).join(' ')||'전국';
    const params=new URLSearchParams(location.search);
    for(const key of ['region','province','district','dong'])params.delete(key);
    if(province)params.set('province',province);
    if(district)params.set('district',district);
    if(leaf)params.set('dong',leaf.code);
    $('#map-apply').href='/?'+params.toString()+'#cases';
    $('#map-apply').textContent=name+' 글 보기';
    hint.textContent=leaf?name:district?'읍·면·동 이름을 누르거나 선택해 주세요.':province?'시·군·구를 선택하면 읍·면·동이 표시됩니다.':'시·도부터 선택해 주세요.';
    for(const path of detail.querySelectorAll('[data-level="dong"]')){const selected=path.dataset.code===leaf?.code;path.classList.toggle('active',selected);path.setAttribute('aria-pressed',String(selected));}
    adapter?.style();
  }
  function render(){
    provinceSelect.value=province;
    options(districtSelect,'시·군·구 전체',index.districts.filter(d=>d.province===province),district);
    options(leafSelect,'읍·면·동 전체',leafData?.areas||[]);
    districtSelect.disabled=!province;leafSelect.disabled=!district;
    shapes(overview,provinceData?.areas||index.provinces,province?'district':'province',district||province);
    shapes(detail,leafData?.areas||provinceData?.areas||index.provinces,district?'dong':province?'district':'province');
    detail.setAttribute('aria-label',(districtInfo()?.name||provinceInfo()?.name||'전국')+' 경계와 지역 이름');
    $('#map-back').hidden=!province;
    update();adapter?.render();
  }
  async function chooseProvince(code,fit=true){
    if(code&&!index.provinces.some(p=>p.code===code))return;
    const token=++revision;districtSelect.disabled=true;leafSelect.disabled=true;
    try{
      const data=code?await json('/maps/province/'+code+'.json'):null;
      if(token!==revision)return;
      province=code;district='';provinceData=data;leafData=null;render();
      if(fit)adapter?.focus('province',code);
    }catch(error){if(token===revision){provinceSelect.value=province;districtSelect.disabled=!province;leafSelect.disabled=!district;hint.textContent=error.message;}}
  }
  async function chooseDistrict(code,fit=true){
    if(code&&!index.districts.some(d=>d.code===code&&d.province===province))return;
    const token=++revision;leafSelect.disabled=true;
    try{
      const data=code?await json('/maps/district/'+code+'.json'):null;
      if(token!==revision)return;
      district=code;leafData=data;render();
      if(fit)adapter?.focus(code?'district':'province',code||province);
    }catch(error){if(token===revision){districtSelect.value=district;leafSelect.disabled=!district;hint.textContent=error.message;}}
  }
  function chooseLeaf(code,fit=true){
    leafSelect.value=leafData?.areas.some(a=>a.code===code)?code:'';update();
    if(fit)adapter?.focus(leafSelect.value?'dong':'district',leafSelect.value||district);
  }
  function choose(level,code,fit=true){
    if(level==='province')return chooseProvince(code,fit);
    if(level==='district')return chooseDistrict(code,fit);
    return chooseLeaf(code,fit);
  }
  async function loadNaver(){
    const container=$('#naver-map'),reset=$('#map-reset');
    let failed=false,rejectInit;
    const restore=reason=>{failed=true;adapter=undefined;root.dataset.mapState=reason;container.hidden=true;overview.removeAttribute('hidden');reset.hidden=true;rejectInit?.(Error(reason));status.textContent='네이버 지도를 연결하지 못했습니다. 지역 지도로 계속 이용할 수 있습니다.';};
    try{
      const response=await fetch('/assets/map-config.json',{cache:'no-store'});
      if(!response.ok)throw Error('config');
      const {clientId}=await response.json();if(!clientId)return;
      root.dataset.mapState='loading';status.textContent='네이버 전국 지도를 불러오는 중입니다.';
      await new Promise((resolve,reject)=>{
        const timer=setTimeout(()=>reject(Error('sdk-timeout')),12000);
        const finish=error=>{clearTimeout(timer);error?reject(error):resolve();};
        window.portalNaverReady=()=>finish();
        window.navermap_authFailure=()=>{restore('auth');finish(Error('auth'));};
        const script=document.createElement('script');script.async=true;
        script.src='https://oapi.map.naver.com/openapi/v3/maps.js?ncpKeyId='+encodeURIComponent(clientId)+'&callback=portalNaverReady';
        script.onerror=()=>finish(Error('network'));document.head.append(script);
      });
      if(failed)return;
      const maps=window.naver.maps;container.hidden=false;
      const map=new maps.Map(container,{center:new maps.LatLng(36.3,127.8),zoom:6,zoomControl:true,scrollWheel:false,scaleControl:true,logoControl:true,mapDataControl:true});
      await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('map-init-timeout')),12000);rejectInit=error=>{clearTimeout(timer);reject(error);};maps.Event.once(map,'init',()=>{clearTimeout(timer);rejectInit=undefined;resolve();});});
      if(failed)return;
      const layers={},collections={};let markers=[];
      const selected=level=>level==='province'?province:level==='district'?district:leafSelect.value;
      function style(){
        for(const [level,layer] of Object.entries(layers))layer.setStyle(feature=>({fillColor:feature.getId()===selected(level)?'#20c4d8':'#70dce7',fillOpacity:level==='province'?(province?0.008:0.025):level==='district'?(district?0.008:0.035):feature.getId()===selected(level)?0.13:0.045,strokeColor:feature.getId()===selected(level)?'#089db8':'#3cbbce',strokeWeight:level==='dong'?1.1:1.3,strokeOpacity:level==='dong'?0.85:0.6,clickable:true,zIndex:level==='province'?5:level==='district'?10:20}));
        for(const m of markers)m.button.classList.toggle('selected',m.code===selected(m.level));
        layoutLabels();
      }
      function layoutLabels(){
        const occupied=[],projection=map.getProjection();
        for(const item of [...markers].sort((a,b)=>Number(b.code===selected(b.level))-Number(a.code===selected(a.level)))){
          const p=projection.fromCoordToOffset(item.position),w=item.name.length*11+16,h=23;
          const rect={x:p.x-w/2,y:p.y-h/2,w,h};
          const within=p.x>8&&p.y>8&&p.x<container.clientWidth-8&&p.y<container.clientHeight-8;
          const overlaps=occupied.some(r=>rect.x<r.x+r.w&&rect.x+w>r.x&&rect.y<r.y+r.h&&rect.y+h>r.y);
          const show=within&&(!overlaps||item.code===selected(item.level));item.marker.setVisible(show);if(show)occupied.push(rect);
        }
      }
      function showLabels(){
        for(const item of markers)item.marker.setMap(null);markers=[];
        const features=leafData?.features||provinceData?.features||nationwide.features;
        for(const feature of features){
          const {code,name,level,label}=feature.properties;
          const button=document.createElement('button');button.type='button';button.className='area-label';button.textContent=name;button.setAttribute('aria-label',name+' 선택');
          button.addEventListener('click',event=>{event.stopPropagation();choose(level,code);});
          const position=new maps.LatLng(label[1],label[0]);
          const marker=new maps.Marker({map,position,icon:{content:button,anchor:new maps.Point(0,0)},zIndex:100,clickable:true});
          markers.push({code,name,level,button,position,marker});
        }
        layoutLabels();
      }
      for(const level of ['province','district','dong']){
        const layer=new maps.Data();layer.setMap(map);layers[level]=layer;
        layer.addListener('mouseover',event=>{
          layer.overrideStyle(event.feature,{fillColor:'#36d5e5',fillOpacity:0.13,strokeColor:'#008eae',strokeWeight:2});
          hint.textContent=event.feature.getProperty('name');
        });
        layer.addListener('mouseout',event=>layer.revertStyle(event.feature));
        layer.addListener('click',event=>choose(level,String(event.feature.getId())));
      }
      function renderLayers(){
        const data={province:nationwide,district:provinceData,dong:leafData};
        for(const level of ['province','district','dong']){
          if(collections[level])layers[level].removeGeoJson(collections[level]);
          collections[level]={type:'FeatureCollection',features:data[level]?.features||[]};
          layers[level].addGeoJson(collections[level]);
        }
        showLabels();style();
      }
      function focus(level,code){
        if(!code){map.setCenter(new maps.LatLng(36.3,127.8));map.setZoom(6);return;}
        const bounds=layers[level]?.getFeatureById(code)?.getBounds();if(bounds)map.fitBounds(bounds,{top:32,right:32,bottom:32,left:32});
      }
      adapter={render:renderLayers,style,focus};renderLayers();
      if(district)focus('district',district);else if(province)focus('province',province);
      maps.Event.addListener(map,'idle',layoutLabels);
      reset.addEventListener('click',()=>chooseProvince(''));
      overview.setAttribute('hidden','');reset.hidden=false;
      root.dataset.mapState='ready';status.textContent='시·도 → 시·군·구 → 읍·면·동 순서로 선택해 주세요. 확대하면 더 많은 이름이 보입니다.';
      new ResizeObserver(()=>{if(!container.hidden){map.setSize(new maps.Size(container.clientWidth,container.clientHeight));layoutLabels();}}).observe(container);
    }catch(error){restore(error.message);}
  }
  async function start(){
    try{
      [index,nationwide]=await Promise.all([json('/assets/boundaries.json?v=nation-20261001'),json('/maps/provinces.json')]);
      render();
      const initialProvince=root.dataset.provinceInitial,initialDistrict=root.dataset.districtInitial;
      if(initialProvince)await chooseProvince(initialProvince,false);
      if(initialDistrict)await chooseDistrict(initialDistrict,false);
      const initialLeaf=new URLSearchParams(location.search).get('dong');if(initialLeaf)chooseLeaf(initialLeaf,false);
      provinceSelect.addEventListener('change',()=>chooseProvince(provinceSelect.value));
      districtSelect.addEventListener('change',()=>chooseDistrict(districtSelect.value));
      leafSelect.addEventListener('change',()=>chooseLeaf(leafSelect.value));
      $('#map-back').addEventListener('click',()=>district?chooseDistrict(''):chooseProvince(''));
      root.addEventListener('click',event=>{const target=event.target.closest('[data-level]');if(target)choose(target.dataset.level,target.dataset.code);});
      root.addEventListener('keydown',event=>{if((event.key==='Enter'||event.key===' ')&&event.target.matches('[data-level]')){event.preventDefault();choose(event.target.dataset.level,event.target.dataset.code);}});
      const observer=new IntersectionObserver(entries=>{if(entries.some(e=>e.isIntersecting)){observer.disconnect();loadNaver();}},{rootMargin:'200px'});observer.observe(root);
    }catch(error){hint.textContent=error.message;}
  }
  start();
}
