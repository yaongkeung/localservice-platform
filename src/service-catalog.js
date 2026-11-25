import {normalServiceName,sortServices} from './services.js';
// Initial operator-requested catalogue. Applied explicitly once, never synced over edits.
const entries=[
 ['간판','signboards','🏷️'],['렌트카','car-rental','🚗'],['흥신소','private-investigation','🕵️'],
 ['에어컨설치','aircon-installation','❄️','cleaning'],['에어컨수리','aircon-repair','❄️','cleaning'],
 ['중고피아노','used-pianos','🎹'],['용달','small-moving','🚚'],['이삿짐센터','moving-services','📦'],
 ['폐기물','waste-removal','♻️'],['고물상','scrap-dealers','♻️'],['보일러수리','boiler-repair','♨️','plumbing'],
 ['헌옷','used-clothes','👕'],['하수구','drains','🔧','plumbing'],['생수배달','bottled-water','💧'],
 ['스카이차','aerial-lift','🏗️'],['누수탐지','leak-detection','💧','plumbing'],['사다리차','ladder-truck','🏗️'],
 ['중고가전','used-appliances','♻️'],['중고사무용가구','used-office-furniture','🪑'],['중고가구','used-furniture','🪑'],
 ['데이터복구','data-recovery','💻'],['재활용센터','recycling-centers','♻️'],['퀵서비스','courier','🚚'],
 ['중고차','used-cars','🚗'],['자동차유리복원','auto-glass-repair','🪟'],['썬팅','window-tinting','🚗'],
 ['수출중고차','used-car-export','🚗'],['포크레인','excavators','🏗️'],['미니포크레인','mini-excavators','🏗️'],
 ['유리','glass','🪟','glass-windows'],['방수업체','waterproofing','💧'],['샷시','window-frames','🪟','glass-windows'],
 ['녹취 속기사무소','transcription','📝'],['컴퓨터수리','computer-repair','💻'],['인력업체','staffing','🤝'],
 ['간병인','caregivers','🤝'],['쇼파천갈이','sofa-reupholstery','🛋️'],['닥트','ducts','🛠️'],
 ['열쇠','locksmiths','🔑'],['철거','demolition','🛠️'],['인테리어','interior','🏠'],
 ['청소','cleaning-services','🧹','cleaning'],['도배장판','wallpaper-flooring','🎨'],['마루시공','flooring-installation','🏠'],
 ['폐차장','vehicle-scrapping','🚗'],['화장실칸막이','toilet-partitions','🚪'],['개인회생','debt-rehabilitation','⚖️'],
 ['유품정리','estate-cleanout','📦'],['자동문','automatic-doors','🚪'],['자동차밧데리','car-batteries','🚗'],
 ['조립식칸막이','modular-partitions','🚪'],['커튼','curtains','🧵'],['솜틀집','cotton-recarding','🧵'],
 ['골동품','antiques','🏷️'],['인쇄','printing','🖨️'],['소방시설','fire-safety','🧯']
];
export const initialServiceCatalog=entries.map(([name,slug,icon,parentSlug],index)=>({name,slug,icon,parentSlug,tone:['sky','mint','peach','lilac'][index%4]}));
export function catalogAdditions(existing){
 const names=new Set(existing.map(service=>normalServiceName(service.name)));
 return sortServices(initialServiceCatalog.filter(service=>!names.has(normalServiceName(service.name))).map(({parentSlug,...service})=>{
  if(existing.some(row=>row.slug===service.slug))throw Error('업종 주소가 기존 항목과 겹칩니다: '+service.name);
  return {...service,parent_id:existing.find(row=>row.slug===parentSlug)?.id||null,description:''};
 }));
}
