import {regionData} from './regions-data.js';
import {townshipName} from './township-groups.js';
export function formatTitleRegion(province,district='',dong=''){
 province=String(province||'').trim();district=String(district||'').trim();dong=String(dong||'').trim();
 const short=province.replace('서울특별시','서울시').replace('세종특별자치시','세종시').replace('전남광주통합특별시','전남').replace('전라남도','전남').replace('전라북도','전북').replace('충청남도','충남').replace('충청북도','충북').replace('경상남도','경남').replace('경상북도','경북').replace(/특별자치도|특별시|통합특별시|광역시|도$/g,'');
 if(!district)return [short,dong].filter(Boolean).join(' ');
 if(/세종/.test(province))return ['세종시',dong].filter(Boolean).join(' ');
 const metro=/서울|광역시/.test(province),merged=/전남광주/.test(province),gwangju=merged&&/구$/.test(district)&&!district.includes('시 ');
 const keep=metro||gwangju||/강원|제주/.test(province)||/군$/.test(district)&&!/경기/.test(province);
 return [keep?(gwangju?'광주':short):'',district,dong].filter(Boolean).join(' ');
}
export function titleRegionForCode(code){
 code=String(code||'');const province=regionData.provinces.find(p=>p.code===code.slice(0,2)),district=regionData.districts.find(d=>d.code===code.slice(0,5));
 const dong=code.includes(':')?code.split(':').slice(1).join(':'):(regionData.dongs[district?.code]||[]).find(d=>d.code===code)?.name||'';
 return province?formatTitleRegion(province.name,district?.name,townshipName(dong)):'';
}
