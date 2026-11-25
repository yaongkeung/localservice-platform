// Captions are observations of the supplied image, not new work experiences.
// Reusing a photo must not force the model to invent a different observation.
export function editorialBlocks(post){
 const blocks=Array.isArray(post.content)?post.content:JSON.parse(post.content||'[]');
 return blocks.filter((part,index)=>!/^\[사진:\d+\]$/.test(String(part).trim())&&!(!/^## /.test(String(part))&&/^\[사진:\d+\]$/.test(String(blocks[index+1]||'').trim())));
}
