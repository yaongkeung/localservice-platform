// Sample content only. A real company phone must be verified before enabling calls.
export const regions = [
  {id:1,name:'서울',slug:'seoul',parent_id:null,admin_code:'11'},
  {id:2,name:'마포구',slug:'seoul/mapo',parent_id:1,admin_code:'11440'},
  {id:3,name:'강남구',slug:'seoul/gangnam',parent_id:1,admin_code:'11680'},
  {id:4,name:'경기',slug:'gyeonggi',parent_id:null,admin_code:'41'},
  {id:5,name:'수원시',slug:'gyeonggi/suwon',parent_id:4}
];
export const services = [
  {id:1,name:'배관·누수',slug:'plumbing',icon:'↗',description:'누수 점검부터 배관 수리까지'},
  {id:2,name:'전기·조명',slug:'electrical',icon:'ϟ',description:'안전한 전기 점검과 조명 교체'},
  {id:3,name:'에어컨·청소',slug:'cleaning',icon:'✧',description:'쾌적한 공간을 위한 관리'}
];
export const companies = [
  {id:1,name:'우리동네 설비',phone:null,description:'원인을 먼저 살피고 필요한 작업을 설명하는 배관·누수 전문 업체입니다.',area:'서울 마포구·인근 지역',hours:'평일 09:00–18:00',sample:true},
  {id:2,name:'바른 전기',phone:null,description:'가정과 상가의 조명, 스위치, 전기 설비를 점검합니다.',area:'서울 강남구',hours:'평일 09:00–18:00',sample:true},
  {id:3,name:'맑은 공간 케어',phone:null,description:'에어컨 상태를 확인하고 오염 정도에 맞춰 세척합니다.',area:'경기 수원시',hours:'월–토 09:00–18:00',sample:true}
];
export const posts = [
  {id:101,company_id:1,region_id:2,service_id:1,title:'싱크대 아래 물 고임, 연결 부위부터 점검했어요',summary:'마포구 주방 배관의 연결 부위를 확인하고 패킹을 교체한 작업사례입니다.',content:['싱크대 하부장 안에 물이 고인다는 상황을 가정한 샘플 작업사례입니다. 물 사용을 멈추고 연결 부위와 바닥의 상태부터 확인했습니다.','연결부 패킹의 노후를 확인한 뒤 교체하고, 물을 흘려보내며 재누수 여부를 점검하는 과정을 소개합니다. 실제 현장에서는 원인과 수리 범위가 달라질 수 있습니다.','누수가 의심되면 무리하게 부품을 분리하지 말고 업체에 증상과 사진을 전달해 상담하세요.'],status:'PUBLISHED',post_type:'작업사례',published_at:'2026-11-10'},
  {id:102,company_id:2,region_id:3,service_id:2,title:'깜빡이는 거실 조명, 교체 전 확인할 것',summary:'조명 증상을 확인하고 안전하게 점검하는 순서를 정리했습니다.',content:['거실 조명이 깜빡이는 상황을 설명하기 위한 샘플 안내입니다. 조명 기구와 전원 연결 상태를 전문 작업자가 확인하는 절차를 소개합니다.','전기 작업은 감전 위험이 있으므로 직접 배선을 만지지 말고 전문가에게 점검을 요청하세요. 필요한 자재와 작업 범위는 현장 확인 후 결정합니다.'],status:'PUBLISHED',post_type:'작업팁',published_at:'2026-11-09'},
  {id:103,company_id:3,region_id:5,service_id:3,title:'사용을 마친 에어컨, 내부 오염 점검과 관리',summary:'수원시 에어컨 관리 과정을 예시로 살펴보세요.',content:['계절 사용을 마친 에어컨을 점검하는 샘플 사례입니다. 기기 상태와 오염 정도를 확인하고 부품에 맞는 세척 방법을 선택합니다.','세척 후에는 충분히 건조하고 작동 상태를 확인합니다. 기기 모델과 설치 환경에 따라 작업 시간과 비용은 달라집니다.'],status:'PUBLISHED',post_type:'작업사례',published_at:'2026-11-08'}
];
export const published = posts.filter(p=>p.status==='PUBLISHED');
export const regionIds = region => regions.filter(r=>r.id===region.id || r.slug.startsWith(region.slug+'/')).map(r=>r.id);
