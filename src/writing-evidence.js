import {primaryWorkKeyword} from './work-keyword.js';
import {servicePlan} from './service-plan.js';

// These are questions to explain, not findings to attribute to the photographed job.
export function writingEvidence(post,observations){
 return {
  article_type:'서비스 상담 안내',
  location_scope:'상담 요청 지역이며 촬영·시공 장소로 확인되지 않음',
  work_notes_available:Boolean(post.work_notes?.trim()),
  observed_photo_count:observations.photos.filter(photo=>!photo.observation_unavailable).length,
  decision_topics:servicePlan(primaryWorkKeyword(post.search_keyword)).map(([topic,preparation])=>({topic,preparation})),
  unknown_facts:['사진의 촬영 지역·날짜','업체의 실제 시공 여부','고장·누수의 원인','수리·교체 여부와 작업 결과'],
 };
}
