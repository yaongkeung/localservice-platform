import {repeatedParagraphs} from './page-copy.js';

// An editorial warning, never an assertion about a search engine's decision.
export function repeatedContentWarnings(post,previous,verified=[]){
 return previous.filter(other=>other.id!==post.id&&other.company_id===post.company_id).map(other=>({id:other.id,count:repeatedParagraphs(post,[other],verified)})).filter(item=>item.count>=2).map(item=>`#${item.id} 글과 지역명·업무명을 제외한 문단 ${item.count}개가 같습니다. 문장 치환 대신 이번 사진·요청에만 해당하는 사실을 보강해 주세요.`);
}
