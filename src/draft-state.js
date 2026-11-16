export const initialDraftText='사진을 등록한 뒤 사진으로 본문 작성을 진행해 주세요. 자동 작성한 제목과 본문, 사진에 대한 설명을 확인하고 사실에 맞게 수정한 후에 검수를 요청할 수 있습니다.';
export function waitingForPhotos(post={}){
 const content=Array.isArray(post.content)?post.content.join('\n\n'):String(post.content||'');
 return !post.id||!content.trim()||content.trim()===initialDraftText;
}
