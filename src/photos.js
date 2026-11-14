import {published,services} from './data.js';
// Illustrative sample imagery. Replace with verified post uploads when CMS is added.
export const postImages=[
  {id:1,post_id:101,storage_key:'/media/plumbing-cover.jpg',thumbnail_key:'/media/plumbing-thumb.jpg',alt_text:'싱크대 아래 배관 연결 부위를 점검하는 샘플 이미지',sort_order:0,sample:true},
  {id:2,post_id:102,storage_key:'/media/electrical-cover.jpg',thumbnail_key:'/media/electrical-thumb.jpg',alt_text:'분리한 LED 조명 커버를 살펴보는 샘플 이미지',sort_order:0,sample:true},
  {id:3,post_id:103,storage_key:'/media/cleaning-cover.jpg',thumbnail_key:'/media/cleaning-thumb.jpg',alt_text:'에어컨에서 분리한 필터를 청소하는 샘플 이미지',sort_order:0,sample:true}
];
export function postImage(id,images=postImages){return images.filter(image=>image.post_id===id&&image.storage_key).sort((a,b)=>a.sort_order-b.sort_order||a.id-b.id)[0];}
export function seoulDate(now=new Date()){
  const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(now);
  return ['year','month','day'].map(type=>parts.find(p=>p.type===type).value).join('-');
}
export function dailyHighlights(date=seoulDate(),posts=published,categories=services,images=postImages){
  const day=Math.floor(Date.parse(date+'T00:00:00+09:00')/86400000);
  if(!Number.isFinite(day))throw Error('Invalid highlight date');
  return categories.flatMap(service=>{
    const candidates=posts.filter(post=>post.status==='PUBLISHED'&&post.service_id===service.id&&post.published_at<=date&&postImage(post.id,images)).sort((a,b)=>b.published_at.localeCompare(a.published_at)||b.id-a.id);
    if(!candidates.length)return [];
    const post=candidates[(day+service.id)%candidates.length];
    return [{service,post,image:postImage(post.id,images)}];
  });
}
