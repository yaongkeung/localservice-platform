// Summarised from Gimpo City's cultural-tourism place-name guide, checked 2026-11-16.
// Only exact local names within Gimpo are eligible. Never invent a history for other regions.
const names={
 '사우동':'사우동의 이름은 한강변에 모래가 쌓인 지형을 가리키던 마을 이름에서 비롯됐다고 김포시가 소개합니다.',
 '북변동':'김포시는 북변동을 옛 김포군청의 북쪽에 자리한 마을에서 유래한 이름으로 소개합니다.',
 '운양동':'김포시의 지명 안내에는 운양동의 이름에 대해 옛 포구인 운양포와 운양산 주변 마을에서 유래했다는 두 가지 설명이 실려 있습니다.'
};
export function localContext(region,adminCode){
 if(!String(adminCode||'').startsWith('41570')||!names[region])return [];
 return [`## ${region} 지역 안내`,names[region] ,'출처: [김포시 문화관광 · 지명유래](https://gimpo.go.kr/culture/contents.do?key=6848)'];
}
