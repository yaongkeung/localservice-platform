import {regionData} from './regions-data.js';
// Source-checked local facts are separate from service advice. Never infer the
// condition of a customer's building from a neighbourhood's history.
const names={
 '사우동':'사우동의 이름은 한강변에 모래가 쌓인 지형을 가리키던 마을 이름에서 비롯됐다고 김포시가 소개합니다.',
 '북변동':'김포시는 북변동을 옛 김포군청의 북쪽에 자리한 마을에서 유래한 이름으로 소개합니다.',
 '운양동':'김포시의 지명 안내에는 운양동의 이름에 대해 옛 포구인 운양포와 운양산 주변 마을에서 유래했다는 두 가지 설명이 실려 있습니다.'
};
export function localContext(region,adminCode){
 if(String(adminCode||'').startsWith('11380')&&region==='응암동')return [
  '## 응암동 지역 소개',
  '은평문화원은 응암동의 이름을 마을 뒤 산자락에 있던 매 모양의 바위와 연결해 설명합니다. 지역의 옛 이름과 생활권을 이해할 때 **백련산과 매바위**가 함께 등장하는 이유입니다.',
  '은평구 응암1동 주민센터의 지명 자료에는 매바위와 연결된 포수마을 이야기도 소개되어 있습니다. 응암동을 찾아가는 이름에는 이런 마을의 흔적이 남아 있지만, 방문 상담에 필요한 작업 조건은 각 건물을 따로 확인해야 합니다.',
  '지역 자료: [은평문화원 · 응암동 지명](https://epculture.or.kr/sub02/sub02.php) · [은평구 응암1동 주민센터 · 지명유래](https://center.ep.go.kr/dong/contents.do?key=4132)'
 ];
 if(!String(adminCode||'').startsWith('41570')||!names[region])return [];
 return [`## ${region} 지역 안내`,names[region] ,'출처: [김포시 문화관광 · 지명유래](https://gimpo.go.kr/culture/contents.do?key=6848)'];
}
export function regionalSection(region,code,keyword){
 const verified=localContext(region,code),district=regionData.districts.find(item=>item.code===String(code||'').slice(0,5)),province=regionData.provinces.find(item=>item.code===String(code||'').slice(0,2));
 const area=[province?.name,district?.name].filter(name=>name&&name!==region).join(' ');
 const intro=area?`${area} ${region}에서 ${keyword} 상담을 준비할 때는 **건물의 용도와 작업할 위치**를 함께 알려주세요. 같은 동네에서도 출입문·창문·실내 공간의 조건이 다르므로 정확한 방문 주소와 대상 사진을 기준으로 상담하는 것이 좋습니다.`:`${region}에서 ${keyword} 상담을 준비할 때는 **작업할 대상과 방문 주소**를 함께 알려주세요. 지역명만으로 자재나 작업 범위를 정하지 않고 사진과 현장 조건을 확인해야 합니다.`;
 return verified.length?[...verified,intro]:[`## ${region} 지역과 방문 상담 안내`,intro];
}
