// Progressive enhancement for the national region selects. No map SDK or API key.
export function portalClient(){
  const form=document.querySelector('#region-filter');if(!form)return;
  const province=form.querySelector('[name="province"]'),district=form.querySelector('[name="district"]'),dong=form.querySelector('[name="dong"]'),status=form.querySelector('[role="status"]');
  let indexPromise,revision=0;
  const cache=new Map();
  function options(select,placeholder,items){select.replaceChildren(new Option(placeholder,''),...items.map(item=>new Option(item.name,item.code)));}
  async function json(url){const response=await fetch(url);if(!response.ok)throw Error('지역 목록을 불러오지 못했습니다. 지역 적용을 눌러 이어서 선택해주세요.');return response.json();}
  province.addEventListener('change',async()=>{
    const token=++revision;
    options(district,'전체 시·군·구',[]);options(dong,'전체 읍·면·동',[]);district.disabled=true;dong.disabled=true;status.textContent='';
    if(!province.value)return;
    try{
      if(!indexPromise)indexPromise=json('/assets/regions.json').catch(error=>{indexPromise=undefined;throw error;});
      const index=await indexPromise;if(token!==revision)return;
      options(district,'전체 시·군·구',index.districts.filter(d=>d.province===province.value));district.disabled=false;
    }catch(error){if(token===revision)status.textContent=error.message;}
  });
  district.addEventListener('change',async()=>{
    const token=++revision;options(dong,'전체 읍·면·동',[]);dong.disabled=true;status.textContent='';
    if(!district.value)return;
    const code=district.value;
    try{
      if(!cache.has(code))cache.set(code,json('/assets/regions/'+code+'.json').catch(error=>{cache.delete(code);throw error;}));
      const items=await cache.get(code);if(token!==revision)return;
      options(dong,'전체 읍·면·동',items);dong.disabled=false;
    }catch(error){if(token===revision)status.textContent=error.message;}
  });
}
